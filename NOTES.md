# Adventure card game

ASCII game. One zone of a larger world, for now. Travel is the phase you are in on the map. Menus replace the map until you leave them.

## Symbols

Each map cell is five characters so the columns line up.

| Thing | Symbol |
| --- | --- |
| Player | `  P  ` |
| Village | `  V  ` |
| Ruin | `  R  ` |
| Slime | `  S  ` |
| Empty ground | `  .  ` |

## Colour

Text colour follows the old terminal palette: white, orange, green, red, yellow, and blue, on a near-black ground.

| Thing | Colour |
| --- | --- |
| Player, card names | white |
| Compass letters, on-screen arrows | orange |
| Village, field cards, your health | green |
| Ruin, monsters, combat cards | red |
| Coin, card value | yellow |
| Cards usable both in and out of combat | blue |
| Empty ground, rules text, tags | dim |

## World and zone

The world map is a grid of zones. Only one zone exists: zone `(0, 0)`, 25 by 25 squares. The header calls it Zone 1. The whole zone is plains. That does not change.

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
| Slime | `x: 6`, `y: 6` |

The village, ruin, and slime symbols are written into the array at those coordinates. The player is not. A wolf is not on the map. Wolves are random encounters.

The player also starts with 8 health, 4 coin, and three cards: Walking Staff, Trail Bread, Belt Knife. Health and deck size are on the player card, which is not in the deck. Open it from the game menu as You.

## What you see

The square the player is standing on is drawn as `  P  `. That only changes the picture. The array still holds the ground that was there.

When the player moves off that square, the picture shows the array again (`  .  `, `  V  `, `  R  `, or `  S  `).

The window follows the player. The status line shows the ground under you, your coordinates, your coin, your health, and the watch, separated by `|`. A trip starts at dawn on day 1.

## Travel

Phase: travel. The phase label changes when a menu is open.

One swipe moves one square, and only in a cardinal direction:

- swipe up: north (`y` decreases)
- swipe down: south (`y` increases)
- swipe left: west (`x` decreases)
- swipe right: east (`x` increases)

A diagonal swipe does not move. You cannot leave the 25×25 zone. A blocked step says "The zone ends here." Arrow keys do the same four moves. Each move advances the turn count by one, and the watch by one.

## Time

Time is a watch, not an hour, and not the real clock. A day is 60 watches long. 60 stays under 100 and has many factors (2, 3, 4, 5, 6, 10, 12, 15, 20, 30). The day can be changed later. The count is saved with the inn.

The day is four watches of 15:

| Watch | Numbers | Map |
| --- | --- | --- |
| Dawn | 0 to 14 | a little warmer |
| Day | 15 to 29 | brighter |
| Dusk | 30 to 44 | dimmer |
| Night | 45 to 59 | darker and flatter |

A move on the plains or in the ruin advances the watch by one. Sleeping at the inn advances it by 30. When the count crosses 60, it is a new day. The status says so, and the village sets out fresh goods.

Wolves on open ground still need five moves since the last one. The chance depends on the watch: 1 in 10 by day, 1 in 8 at dawn and dusk, and 1 in 5 at night.

## Controls and settings

Open the game menu with the `[ Menu ]` button or the `M` key. From a menu, `0` or Escape goes back one screen. A fight is not a menu: `0` there flees, or leaves the spoil, or wakes you.

Movement inputs are two separate toggles, remembered in `localStorage` under `adventure-card-game:settings`:

- on-screen arrows (`N`, `W`, `S`, `E`): each tap moves one square
- swipe

Either or both can be on. Both cannot be off. The last one left on is locked, so it cannot be switched off.

Named keys such as `ArrowUp`, `Enter`, and `Shift` are never treated as letters. A buy or a spoil pick only accepts a single character (`a` to `z`).

## Sound

Tones are synthesized in the browser. There are no audio files. `sound.js` is the only place that makes them, so later effects are added there. The first tap or key unlocks sound. A step, a blocked step, opening the menu, coin changing hands, a strike, casting a card into the ruin, and going down each have a short tone.

## Cards

Every card has `id`, `name`, `weight`, `value`, `damage`, `use`, `tags`, and `text`.

`use` is `combat`, `field`, or `both`. `value` is the price. `damage` is the harm in a fight. Price climbs faster than harm: a Pitch Torch is worth more than the bruise it leaves. Weight is shown and stored. It does not limit the deck yet. The deck stores ids only. Pictures are not part of the card data. Tags are words such as `attack` and `metal`.

| Card | Use | Harm | Value | Weight | Tags | Where it starts |
| --- | --- | --- | --- | --- | --- | --- |
| Walking Staff | both | 2 | 3 | 2 | wood | your deck |
| Trail Bread | field | 0 | 2 | 1 | food | your deck |
| Belt Knife | combat | 3 | 6 | 1 | metal, attack | your deck |
| Coil of Rope | field | 0 | 4 | 3 | fiber | village |
| Pitch Torch | both | 1 | 5 | 1 | fire | village, and the ruin pile |
| Copper Charm | both | 1 | 8 | 1 | trinket | village |
| Ash Shard | combat | 1 | 6 | 1 | stone, attack | ruin pile |
| Fang | combat | 3 | 4 | 1 | attack, beast | a wolf's deck |
| Acid Spit | combat | 2 | 3 | 1 | attack, acid | a slime's deck |

Open the deck from the game menu. A card is drawn as ASCII: a border, the name, a picture of 5 rows by 21 characters, the rules text, then use, tags, harm, value, and weight. The shop lists the price. A fight lists the harm.

Trail Bread is the only card you can use from the deck. Using it eats the card and restores 4 health, and never past your maximum. At full health it does nothing.

## Player card

You have a player card. It is not in the deck. It shows your health and how many cards you are carrying. Maximum health is 8.

## Creature cards

A wolf and a slime each have a creature card. You strike that card, not a separate body behind it. The creature card has tags and health. The creature also has a deck, and it fights with those cards.

| Creature | Tags | Health | Coin | Deck |
| --- | --- | --- | --- | --- |
| Wolf | beast | 6 | 2 | Fang, Fang |
| Slime | acid | 5 | 1 | Acid Spit, Acid Spit |

## Tags

If you strike an `acid` creature with a `metal` card, the acid eats that card. The card leaves your deck and deals no harm. The Belt Knife against the slime is that trade. Wood, stone, and fire are not eaten.

## Combat

Stepping onto `S` starts a fight with that slime. A wolf can also stop you on open ground (see Random encounters). Village and ruin squares do not roll an encounter.

You play one card whose use is `combat` or `both`. Field cards cannot be played. The card deals its damage to the creature card. If that drops the creature to 0, it does not hit back.

Otherwise the creature plays the first card of its deck, deals that card's damage to you, and moves that card to the back of its deck.

Then:

- Both still up: continue, and choose again.
- Creature at 0: it breaks. You gain its coin. You may take one card from its deck, or leave them. A slain slime is removed from the map. A wolf was never a square.
- You at 0: you go down. See below.

Fleeing is allowed on your turn. The creature still gets one hit. If you are still up, you are back on the map. If that hit drops you, you go down.

## Going down

If the inn remembers you, you wake on the map as that save left you. The fight is over. You do not lose extra coin or cards. Anything since the last rest is gone, including a slime you killed after that rest.

If the inn does not remember you, you wake one square south of the village with half your maximum health (at least 1) and lose half your coin, rounded up (1 coin costs 1, 3 coin costs 2). If you have 0 coin, going down costs no coin, but you lose one random card from your deck. A slime you did not kill is still on its square.

You lose the game (game over) only when the inn does not remember you and you have no coin and no cards in your deck. The screen says the trip is over. `1` begins again from the start of the zone.

## Inn

The inn is part of the village, not its own square. From the trading screen, the Inn button opens it. The `i` key does the same when that letter is not buying a card.

A bed costs 2 coin. It fills your health, even if you were already well. It writes the save. If you cannot pay, nothing changes and nothing is written. `0` returns to the trading screen.

## Save

One save, in `localStorage` under `adventure-card-game:save`. No cookies. Card stats are not stored, only card ids.

What is saved:

- Player: card ids, health, coin, and coordinates
- World: each known monster (kind, coordinates, and whether it is still there), the village and ruin coordinates, the village stock, the ruin pile, and the ruin map if you have entered it
- Travel: the turn count, the watch, and the turn of the last random encounter

Opening the page loads that save when there is one. You are on the map, not in a menu.

## Random encounters

The zone is plains. On each move onto open ground, if five moves have passed since the last random encounter, a wolf may appear. The chance is 1 in 10 by day, 1 in 8 at dawn and dusk, and 1 in 5 at night. The five-move cooldown starts when the wolf appears, not when a roll misses. It does not apply to the slime, the village, or the ruin. The first move of a trip can already roll.

## Village

Moving onto `V` opens the trading screen. Leave returns you to the map, still standing on the village. Moving onto it again opens the screen again. The inn is reached from this screen.

Buy spends coin equal to the card's value and takes it from the village. Sell adds the card's value to your coin and gives the card to the village. To swap, sell and then buy. Coin covers the difference in value. You cannot buy what you cannot afford.

The village stock returns to Coil of Rope, Pitch Torch, and Copper Charm at the start of each new day. Anything you sold, and anything they had left, is replaced by that list.

Sell keys are `1` to `9` for the nine cards on the current page. When the deck is longer than that, `[` and `]` turn the page. The buttons do the same.

## Ruin

Moving onto `R` takes you into the ruin. The same ruin is kept for this trip: leaving and stepping onto `R` again returns you to where the stairs are, with whatever you already cleared.

The ruin is not an open field. It is rooms of a few squares, joined by straight corridors three to ten squares long. The window follows you, as on the plains.

| Thing | Symbol |
| --- | --- |
| Wall | `  #  ` |
| Floor | `  .  ` |
| Stairs out | `  <  ` |
| Rubble | `  *  ` |
| Wolf | `  W  ` |
| Slime | `  S  ` |

`W` and `S` are the first letter of the monster. Stepping onto one starts a fight with that creature. A wolf in the ruin is a square, not a random encounter. Killing it clears the square. The plains slime is a different creature and stays where it was.

You appear on the stairs. Step off them to explore. Step back onto `<` to climb out to the plains, still standing on `R`. A wall, or the edge, does not move you: "The stone does not give."

`*` opens the rubble. The pile is in order: Ash Shard, then Pitch Torch. It does not refill. Sift to take the next card. When the pile is empty, sifting finds nothing. Cast a card from your deck into the crack to lose it. Half the time, if a card is still in the pile, that card comes back out instead. Otherwise the cast card is simply gone. Leaving the rubble puts you back in the ruin, still standing on `*`.

The ruin is saved with the inn: the rooms, what is still standing in them, and where you were.
