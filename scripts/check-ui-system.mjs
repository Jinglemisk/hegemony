/**
 * check-ui-system — the design-system ratchet.
 *
 * Three habits made the pre-overhaul UI what it was: 47 ad-hoc font sizes, raw
 * hexes sprinkled anywhere a colour was needed, and mechanics explained in
 * printed chrome via `title=` sentences. All three are counted here.
 *
 * This is a RATCHET, not a gate. Every existing violation is grandfathered by
 * COUNT in `budgets` below; the run fails when a count RISES, and prints the new
 * lower number to paste in when a phase drives one down. That way the overhaul
 * can proceed surface by surface without a big-bang rewrite, and no phase can
 * quietly re-add what an earlier phase removed.
 *
 * Usage:  npm run ui:check          fail if any count rose
 *         npm run ui:check -- --list   also print every offending line
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const listMode = process.argv.includes("--list");

/**
 * The ceiling for each rule. Lower these as phases land — never raise one.
 * A count that comes in UNDER budget is reported so the number can be tightened.
 */
const budgets = {
  "font-size": 224,
  "raw-hex": 75,
  "printed-mechanics": 20,
};

/** type.css owns the nine roles; fonts.css declares faces. Sizes are legal there
 *  and nowhere else. tunePanel.css is a dev-only surface the player never sees. */
const FONT_SIZE_EXEMPT = new Set([
  "src/styles/type.css",
  "src/styles/fonts.css",
  "src/dev/tunePanel.css",
]);

/** base.css is where colour is DEFINED; every other sheet must spend a token. */
const RAW_HEX_EXEMPT = new Set(["src/styles/base.css", "src/dev/tunePanel.css"]);

/** The two components whose whole job is explaining a mechanic on demand. */
const MECHANICS_EXEMPT = new Set([
  "src/components/MechanicsDetails.tsx",
  "src/components/overlays/Tooltip.tsx",
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }

  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

/** Strip /* … *\/ comments so a commented-out rule never counts as a violation. */
function stripBlockComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "));
}

const violations = { "font-size": [], "raw-hex": [], "printed-mechanics": [] };

function record(rule, file, lineNumber, line) {
  violations[rule].push(`${relative(file)}:${lineNumber}  ${line.trim()}`);
}

const files = [...(await walk(path.join(root, "src")))];

for (const file of files) {
  const name = relative(file);
  const extension = path.extname(file);

  if (![".css", ".ts", ".tsx"].includes(extension)) {
    continue;
  }

  const raw = await readFile(file, "utf8");
  const source = extension === ".css" ? stripBlockComments(raw) : raw;
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // (a) a size declared outside the role sheet
    if (extension === ".css" && !FONT_SIZE_EXEMPT.has(name) && /\bfont-size\s*:/.test(line)) {
      record("font-size", file, lineNumber, line);
    }

    // (b) a colour spelled out instead of spent from the token table. Data-URI
    //     SVGs carry %23-escaped hexes; those are inline art, counted the same,
    //     because art that hard-codes clay drifts from clay just as easily.
    if (!RAW_HEX_EXEMPT.has(name)) {
      const hexes = line.match(/(?:#|%23)[0-9a-fA-F]{3,8}\b/g);

      for (let count = 0; count < (hexes?.length ?? 0); count += 1) {
        record("raw-hex", file, lineNumber, line);
      }
    }

    // (c) a mechanic explained in printed chrome. A `title=` holding a SENTENCE
    //     (a space and more than a couple of words) is chrome doing a tooltip's
    //     job; short titles naming a thing are fine.
    if (extension === ".tsx" && !MECHANICS_EXEMPT.has(name)) {
      const title = /\btitle=(?:"([^"]{16,})"|\{`([^`]{16,})`\})/.exec(line);

      if (title && /\s\S+\s\S+\s/.test(title[1] ?? title[2] ?? "")) {
        record("printed-mechanics", file, lineNumber, line);
      }
    }
  });
}

let failed = false;
const tightenable = [];

for (const [rule, budget] of Object.entries(budgets)) {
  const found = violations[rule].length;

  if (found > budget) {
    failed = true;
    console.error(`✗ ${rule}: ${found} (budget ${budget}) — the ratchet only turns down.`);

    if (!listMode) {
      console.error(`  run with --list to see them`);
    }
  } else if (found < budget) {
    tightenable.push(`  ${rule}: ${budget} → ${found}`);
    console.log(`✓ ${rule}: ${found} (budget ${budget})`);
  } else {
    console.log(`✓ ${rule}: ${found} (at budget)`);
  }

  if (listMode && found > 0) {
    for (const line of violations[rule]) {
      console.log(`    ${line}`);
    }
  }
}

if (tightenable.length > 0) {
  console.log(`\nRatchet down in scripts/check-ui-system.mjs:\n${tightenable.join("\n")}`);
}

process.exit(failed ? 1 : 0);
