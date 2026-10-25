#!/bin/zsh
# The starting-bonus batch: the confirming batch's table (main, no base income), with +1 stone
# for each place a seat picks its founding colony after the first (seat 0 +3, 1 +2, 2 +1).
# Run from the repo root: zsh <this file>
D=docs/reports/simulation/2026-10-25-starting-bonus
mkdir -p $D/logs
caffeinate -is nice -n 19 node --import tsx src/sim/cli.ts batch --turns 56 --seed 1000 --jobs 2 \
  --board shuffled --games 40 --policy master --without-ideas all \
  --seat-bonus $D/stone-by-colony-pick.json \
  --report $D/masters.json --csv $D/masters.csv > $D/logs/masters.log 2>&1
echo "exit $?" >> $D/logs/masters.log
