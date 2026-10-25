import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { SaveFile } from "./io";
import type { BatchReport } from "./telemetry";

const CLI = fileURLToPath(new URL("./cli.ts", import.meta.url));

/** Runs the real CLI in a process of its own, as `npm run sim` does. Two seeds through
 *  four seatings on the one-ply policies: eight full games that all finish. */
function batch(dir: string, jobs: number) {
  const reportPath = join(dir, `jobs-${jobs}.json`);
  const csvPath = join(dir, `jobs-${jobs}.csv`);
  const args = `batch --games 2 --seats random,greedy,smart,political --rotate --seed 1000 --jobs ${jobs}`;
  // The limit is on the process: the test's own timeout cannot stop a call that blocks.
  // A run takes about 22 seconds on one job and 12 on two; the room is for slow machines.
  const stdout = execFileSync(
    process.execPath,
    ["--import", "tsx", CLI, ...args.split(" "), "--report", reportPath, "--csv", csvPath],
    { encoding: "utf8", timeout: 240_000 },
  );
  const text = readFileSync(reportPath, "utf8");

  return {
    stdout,
    report: JSON.parse(text) as BatchReport,
    // The file as written, less the one line that holds the time of writing.
    text: text.replace(/"generatedAt": "[^"]*"/, ""),
    csv: readFileSync(csvPath, "utf8"),
  };
}

describe("batch --jobs", () => {
  // The cap is the cores less one, so a machine with two cores would play both runs
  // in one process and prove nothing.
  it.skipIf(availableParallelism() < 3)(
    "writes the same report and CSV from two worker processes as from one process",
    () => {
      const dir = mkdtempSync(join(tmpdir(), "hegemony-batch-"));

      try {
        const serial = batch(dir, 1);
        const parallel = batch(dir, 2);

        expect(serial.stdout).not.toContain("worker processes");
        expect(parallel.stdout).toContain("Playing 8 games on 2 worker processes.");
        // Finished games, so the win splits and the tiebreak figures are compared too.
        expect(serial.report.terminations.turnCap).toBe(0);

        // Field by field first, for a diff that names the field.
        expect(parallel.report).toEqual({
          ...serial.report,
          meta: { ...serial.report.meta, generatedAt: parallel.report.meta.generatedAt },
        });
        // Then the files themselves, which also fixes the order of the keys.
        expect(parallel.text).toBe(serial.text);
        expect(parallel.csv).toBe(serial.csv);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    500_000,
  );
});

describe("--board archipelago", () => {
  it("hops 3 hexes unless the ruleset patch sets the reach, and records the patch", () => {
    const dir = mkdtempSync(join(tmpdir(), "hegemony-board-"));
    const saved = (...args: string[]) => {
      const file = join(dir, "save.json");
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          CLI,
          "new",
          "--seed",
          "7",
          "--manual-setup",
          "--board",
          "archipelago",
        ].concat(args, ["--file", file]),
        { encoding: "utf8", timeout: 60_000 },
      );
      return JSON.parse(readFileSync(file, "utf8")) as SaveFile;
    };

    try {
      const board = saved();
      expect(board.rulesetPatch).toEqual({ placement: { seaReach: 3 } });
      expect(board.state.ruleset.placement.seaReach).toBe(3);

      const anyShore = join(dir, "any-shore.json");
      writeFileSync(anyShore, JSON.stringify({ placement: { seaReach: null } }));
      expect(saved("--ruleset-patch", anyShore).state.ruleset.placement.seaReach).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
