// Node module `load` hook: rewrites `const NAME = ...;` declarations (exported or not) in
// repo modules after tsx has compiled them. Values come from the LEVER_CONSTS env var, keyed
// "<path suffix>:<NAME>", e.g.
//   LEVER_CONSTS='{"src/sim/policies.ts:TRADE_MARGIN":2,"src/game/assembly/laws.ts:GROWS_PER_TURN":2}'
// A value may be any JSON (number, array, object: DEFAULT_WEIGHTS takes a whole object).
// Forked batch workers inherit both the env var and the --import flags, so the rewrite holds
// for --jobs N. A key whose declaration is not found throws, so a typo fails loudly.
const REPL = JSON.parse(process.env.LEVER_CONSTS ?? "{}");
const CHECK = process.env.LEVER_CHECK === "1";
const byFile = new Map();
for (const [key, value] of Object.entries(REPL)) {
  const cut = key.lastIndexOf(":");
  const file = key.slice(0, cut);
  const name = key.slice(cut + 1);
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push([name, value]);
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  const entry = [...byFile].find(([file]) => url.endsWith(file));
  if (!entry) return result;
  let src =
    typeof result.source === "string" ? result.source : Buffer.from(result.source).toString();
  for (const [name, value] of entry[1]) {
    // tsx emits minified declarations (`const TRADE_MARGIN=1;`); allow either spacing.
    const re = new RegExp(`const ${name}\\s*=\\s*[^;]+;`);
    if (!re.test(src)) throw new Error(`const-hook: const ${name} not found in ${entry[0]}`);
    src = src.replace(re, `const ${name}=${JSON.stringify(value)};`);
  }
  if (CHECK)
    src += `\n(globalThis.__leverCheck ??= {})[${JSON.stringify(entry[0])}] = { ${entry[1].map(([n]) => n).join(", ")} };\n`;
  return { ...result, source: src };
}
