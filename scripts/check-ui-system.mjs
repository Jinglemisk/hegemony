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
  "font-size": 135,
  "raw-hex": 50,
  "printed-mechanics": 0,
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

/**
 * Surfaces whose whole job IS explaining. The tooltip ladder is where a mechanic
 * is supposed to be explained, the rulebook and the Codex are the rulebook, and
 * the tune panel is a dev dashboard the player never opens.
 */
const MECHANICS_EXEMPT = new Set([
  "src/components/MechanicsDetails.tsx",
  "src/components/overlays/Tooltip.tsx",
  "src/components/board/ledger/rulebook.tsx",
  "src/components/board/ledger/CodexTab.tsx",
  "src/dev/TunePanel.tsx",
]);

/** Below this, a string is a label. At or above it, it is prose. */
const SENTENCE_CHARS = 55;

/** A sentence explains; a label names. The tell is a full stop or a clause dash
 *  mid-string, or simply being too long to be a name for something.
 *
 *  Interpolations collapse to a placeholder first: a template literal's SOURCE is
 *  far longer than what it renders, and measuring the source flagged
 *  `${n} ${n === 1 ? "city" : "cities"}` — which renders "3 cities". */
function isSentence(text) {
  const rendered = text.replace(/\$\{[^}]*\}/g, "N");

  return rendered.length >= SENTENCE_CHARS || /[.?!]\s|[.?!]$| — /.test(rendered);
}

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

/** Blank out comments — block and line — preserving line numbers, so a commented
 *  rule or a paragraph of rationale never counts as a violation. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:"'`\\])\/\/.*$/gm,
      (match, lead) => lead + " ".repeat(match.length - lead.length),
    );
}

const violations = { "font-size": [], "raw-hex": [], "printed-mechanics": [] };

function record(rule, file, lineNumber, line) {
  violations[rule].push(`${relative(file)}:${lineNumber}  ${line.trim()}`);
}

const files = [...(await walk(path.join(root, "src")))];

for (const file of files) {
  const name = relative(file);
  const extension = path.extname(file);

  // Tests assert on the strings the UI uses; they are not the UI.
  if (![".css", ".ts", ".tsx"].includes(extension) || /\.(test|spec)\./.test(name)) {
    continue;
  }

  const raw = await readFile(file, "utf8");
  const source = stripComments(raw);
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

    // (c) a mechanic explained in printed chrome: a `title=` holding a SENTENCE
    //     rather than a name for the thing it labels.
    //
    //     Scope note, because this rule is narrower than the habit it targets.
    //     The real quarry is a paragraph of rules printed into a persistent
    //     panel, and there is no reliable way to tell one of those from a status
    //     line in the game's own voice — which the overhaul WANTS more of. A
    //     heuristic that flagged both would fire on "The house has risen" as
    //     loudly as on a scoring lecture, so it would be turned off within a
    //     week. Printed prose is therefore removed by hand, phase by phase, and
    //     recorded in RUN-LOG.md; what this rule guarantees is only that the
    //     tooltip-shaped version of the habit cannot creep back in.
    if (extension === ".tsx" && !MECHANICS_EXEMPT.has(name)) {
      const title = /\btitle=(?:"([^"]+)"|\{`([^`]+)`\})/.exec(line);

      if (title && isSentence(title[1] ?? title[2] ?? "")) {
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
