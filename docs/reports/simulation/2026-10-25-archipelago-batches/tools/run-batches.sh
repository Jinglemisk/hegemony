#!/bin/zsh
# The Archipelago batches (#145): one at a time, two workers, lowest priority. Run from the
# repo root at 4fdf564 (main + #144 + the board):
#   masters, hop 4 · masters, any shore · mixed, hop 4 · mixed on Continental (same code)
# The Continental masters control is #144's batch at 9d47850, the same command with
# --board continental and no patch (conti-masters).
set -e
OUT=docs/reports/simulation/2026-10-25-archipelago-batches
PATCH=$OUT/patches/hop4.ruleset.json
stamp() { echo "$(date +%H:%M:%S) $*" | tee -a $OUT/logs/progress.log; }
stamp "code $(git rev-parse --short HEAD)"
COMMON=(batch --turns 56 --seed 1000 --jobs 2)
MASTERS=(--games 40 --policy master --without-ideas all)
MIXED=(--games 10 --seats slaver,civic,trader,master --rotate)
run() {
  local name=$1; shift
  stamp "start $name: $*"
  nice -n 19 node --import tsx src/sim/cli.ts $COMMON "$@" --report $OUT/$name.json --csv $OUT/$name.csv > $OUT/logs/$name.log 2>&1
  stamp "done $name"
}
run archi-masters-hop4 --board archipelago $MASTERS --ruleset-patch $PATCH
run archi-masters-anyshore --board archipelago $MASTERS
run archi-mixed-hop4 --board archipelago $MIXED --ruleset-patch $PATCH
run conti-mixed --board continental $MIXED
