# Next Mechanics Recommendation

The next mechanics layer should create stakes for choices that already exist:
where to expand, when to upgrade cities, and how aggressively to grow pops.

## Recommended Order

1. Temporary 10-season scoring.
2. First happiness consequences.
3. A small influence sink.
4. More buildings.

## Why Not More Buildings First

More buildings will make the economy wider, but the current game still lacks a
reason to prefer one economic path over another beyond accumulating resources.
Scoring and happiness create pressure around the existing actions before the
building list grows.

## Temporary 10-Season Scoring

At the end of season 10, calculate a prototype score:

- +5 per city.
- +3 per colony.
- +1 per citizen.
- +1 per freeman.
- +1 per 10 material resources, rounded down.
- -1 per negative happiness.

This gives the prototype an end point without pretending the final victory
system is designed.

## First Happiness Consequences

Start with a simple threshold model:

- At -5 happiness, the player receives a warning state.
- At -10 happiness, the player loses 1 gold income per turn.
- At -15 happiness, the player cannot found colonies.
- At -20 happiness, the player loses 1 random pop from their largest settlement,
  then happiness rises by 5.

These thresholds are intentionally simple and testable. They can later become
event cards or political crises.

## First Influence Sink

Add one action:

- Stabilize Province: spend 4 influence to gain 3 happiness.

This gives citizens a strategic role and makes influence useful before the
assembly system exists.

## More Buildings After That

Once scoring, happiness, and influence matter, add a second building tier:

- Aqueduct: +4 population capacity.
- Forum: +2 influence income.
- Barracks: placeholder military value or +1 score.
- Warehouse: +1 to the tile's material income.

At that point, buildings will plug into visible tradeoffs instead of only
inflating production.
