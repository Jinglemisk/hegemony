// Stone and food income a seat collects on its own turns, averaged over 40 games; MAXYEAR=1
// keeps year 1 only.   MAXYEAR=1 node tools/early-income.mjs label=path-without-extension ...
import { readFileSync } from "node:fs";

for (const [label, base] of process.argv.slice(2).map((a) => a.split("="))) {
  const lines = readFileSync(`${base}.csv`, "utf8").trim().split("\n");
  const head = lines[0].split(",");
  const col = (name) => head.indexOf(name);
  const sum = {};
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    if (c[col("final")] === "1" || c[col("player")] !== c[col("actingSeat")]) continue;
    if (process.env.MAXYEAR && Number(c[col("year")]) > Number(process.env.MAXYEAR)) continue;
    const s = (sum[c[col("player")]] ??= { n: 0, stone: 0, food: 0 });
    s.n += 1;
    s.stone += Number(c[col("incomeStone")]);
    s.food += Number(c[col("incomeFood")]);
  }
  const fmt = (k) => [0, 1, 2, 3].map((p) => (sum[p][k] / sum[p].n).toFixed(2)).join(" / ");
  console.log(`${label.padEnd(12)} stone ${fmt("stone")}   food ${fmt("food")}`);
}
