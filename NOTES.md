# Adventure card game

ASCII game. One zone of a larger world, for now. Travel is the phase you are in on the map. Menus replace the map until you leave them.

## Symbols

Each map cell is five characters so the columns line up.

| Thing | Symbol |
| --- | --- |
| Player | `  P  ` |
| Village | `  V  ` |
| Ruin | `  R  ` |
| Empty ground | `  .  ` |

## Colour

Text colour follows the old terminal palette: white, orange, green, red, yellow, and blue, on a near-black ground.

| Thing | Colour |
| --- | --- |
| Player, card names | white |
| Compass letters, on-screen arrows | orange |
| Village, field cards | green |
| Ruin, combat cards | red |
| Coin, card value | yellow |
| Cards usable both in and out of combat | blue |
| Empty ground, rules text | dim |

## World and zone

The world map is a grid of zones. Only one zone exists: zone `(0, 0)`, 25 by 25 squares. The header calls it Zone 1.

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

The player also starts with 4 coin and three cards: Walking Staff, Trail Bread, Belt Knife.

## What you see

The square the player is standing on is drawn as `  P  `. That only changes the picture. The array still holds the ground that was there.

When the player moves off that square, the picture shows the array again (`  .  `, `  V  `, or `  R  `).

The window follows the player. The status line shows the ground under you, your coordinates, and your coin.

## Travel

Phase: travel. The phase label changes when a menu is open.

One swipe moves one square, and only in a cardinal direction:

- swipe up: north (`y` decreases)
- swipe down: south (`y` increases)
- swipe left: west (`x` decreases)
- swipe right: east (`x` increases)

A diagonal swipe does not move. You cannot leave the 25×25 zone. A blocked step says "The zone ends here." Arrow keys do the same four moves.

## Controls and settings

Open the game menu with the `[ Menu ]` button or the `M` key. From a menu, `0` or Escape goes back one screen.

Movement inputs are two separate toggles, remembered in `localStorage` under `adventure-card-game:settings`:

- on-screen arrows (`N`, `W`, `S`, `E`): each tap moves one square
- swipe

Either or both can be on. Both cannot be off. The last one left on is locked, so it cannot be switched off.

## Cards

Every card has `id`, `name`, `weight`, `value`, `use`, and `text`.

`use` is `combat`, `field`, or `both`. Weight is shown and stored. It does not limit the deck yet. The deck stores ids only. Pictures are not part of the card data.

| Card | Use | Value | Weight | Where it starts |
| --- | --- | --- | --- | --- |
| Walking Staff | both | 3 | 2 | your deck |
| Trail Bread | field | 2 | 1 | your deck |
| Belt Knife | combat | 4 | 1 | your deck |
| Coil of Rope | field | 3 | 3 | village |
| Pitch Torch | both | 2 | 1 | village, and the ruin pile |
| Copper Charm | both | 5 | 1 | village |
| Ash Shard | combat | 6 | 1 | ruin pile |

Open the deck from the game menu. A card is drawn as ASCII: a border, the name, a picture of 5 rows by 21 characters, the rules text, then use, value, and weight.

## Village

Moving onto `V` opens the trading screen. Leave returns you to the map, still standing on the village. Moving onto it again opens the screen again.

Buy spends coin equal to the card's value and takes it from the village. Sell adds the card's value to your coin and gives the card to the village. To swap, sell and then buy. Coin covers the difference in value. You cannot buy what you cannot afford.

## Ruin

Moving onto `R` opens the ruin. The ruin has a pile, in order: Ash Shard, then Pitch Torch. The pile does not refill.

Sift the rubble to take the next card. When the pile is empty, sifting finds nothing.

Cast a card from your deck into the crack to lose it. Half the time, if a card is still in the pile, that card comes back out instead. Otherwise the cast card is simply gone.
