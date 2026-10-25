#!/bin/zsh
# The second arm: 1 base food (the 2026-10-24 masters-shuffled table) with the coastal
# leapfrog off. Run from the repo root: zsh <this file>
D=docs/reports/simulation/2026-10-25-leapfrog-off
mkdir -p $D/logs
caffeinate -is nice -n 19 node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 2 \
  --board shuffled --games 40 --policy master --without-ideas all \
  --ruleset-patch $D/bf1-leapfrog-off.patch.json \
  --report $D/masters-bf1.json --csv $D/masters-bf1.csv > $D/logs/masters-bf1.log 2>&1
echo "exit $?" >> $D/logs/masters-bf1.log
