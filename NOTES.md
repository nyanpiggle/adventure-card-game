# Adventure card game

ASCII game. One zone of a larger world, for now. Travel is the only phase.

## Symbols

Each map cell is five characters so the columns line up.

| Thing | Symbol |
| --- | --- |
| Player | `  P  ` |
| Village | `  V  ` |
| Ruin | `  R  ` |
| Empty ground | `  .  ` |

## World and zone

The world map is a grid of zones. Only one zone exists: zone `(0, 0)`, 25 by 25 squares.

The zone is a two-dimensional array, `zone[y][x]`.

- `x` runs west to east, `0` to `24`
- `y` runs north to south, `0` to `24`
- `y = 0` is the north edge of the zone

The array stores the ground. It never stores the player.

## Objects

Each of these has coordinates inside the zone.

| Object | Starts at |
| --- | --- |
| Player | `x: 12`, `y: 18` |
| Village | `x: 12`, `y: 14` |
| Ruin | `x: 4`, `y: 3` |

The village and ruin symbols are written into the array at those coordinates. The player is not.

## What you see

The square the player is standing on is drawn as `  P  `. That only changes the picture. The array still holds the ground that was there.

When the player moves off that square, the picture shows the array again (`  .  `, `  V  `, or `  R  `).

## Travel

Phase: travel.

One swipe moves one square, and only in a cardinal direction:

- swipe up: north (`y` decreases)
- swipe down: south (`y` increases)
- swipe left: west (`x` decreases)
- swipe right: east (`x` increases)

A diagonal swipe does not move. You cannot leave the 25×25 zone. Arrow keys do the same four moves.
