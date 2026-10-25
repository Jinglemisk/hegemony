#!/bin/zsh
# The replays: setups for all four arms (no games), then the two controls' games again to
# find where colonies were founded. Run from the repo root after the batches.
D=docs/reports/simulation/2026-10-25-leapfrog-off
T=$D/tools
for arm in control leapfrog-off bf1 bf1-leapfrog-off; do
  caffeinate -is nice -n 19 node --import tsx $T/setups.mts $arm $D/setups-$arm.json > $D/logs/setups-$arm.log 2>&1
done
caffeinate -is nice -n 19 node --import tsx $T/foundings.mts control \
  /Users/jinglemisk/Desktop/hegemony-code-health/docs/reports/simulation/2026-10-25-no-base-income/masters.json \
  $D/foundings-control.json > $D/logs/foundings-control.log 2>&1 &
caffeinate -is nice -n 19 node --import tsx $T/foundings.mts bf1 \
  docs/reports/simulation/2026-10-24-balance-lines/masters-shuffled.json \
  $D/foundings-bf1.json > $D/logs/foundings-bf1.log 2>&1 &
wait
echo "replays done" >> $D/logs/foundings-control.log
