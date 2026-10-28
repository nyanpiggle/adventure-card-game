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

The player also starts with 8 health, 4 coin, and three cards: Walking Staff, Trail Bread, Belt Knife. Health is a shape of cells, not a bar. Yours is four rows of `##`. The player card says "A traveller." Open it from the game menu as You.

## What you see

The square the player is standing on is drawn as `  P  `. That only changes the picture. The array still holds the ground that was there.

When the player moves off that square, the picture shows the array again (`  .  `, `  V  `, `  R  `, or `  S  `).

The window follows the player. The status line shows the ground under you, your coordinates, your coin, how many health cells are still standing, and the watch, separated by `|`. A trip starts at dawn on day 1.

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

From the map or the ruin, `.` or the `[ . ]` button waits one watch. Waiting is not a move. It does not roll a wolf, and it does not count toward the five-move cooldown.

A finished sale, a finished purchase, a sift that finds a card, a cast, and a finished craft each advance the watch by one as well. A failed attempt does not. Uncraft does not.

## Controls and settings

Open the game menu with the `[ Menu ]` button or the `M` key. From a menu, `0` or Escape goes back one screen. While you are laying a heal shape, `0` puts that shape down first. A fight is not a menu: `0` there flees, or leaves that foe's cards, or wakes you. Leaving one foe's cards does not skip the next foe.

Movement inputs are two separate toggles, remembered in `localStorage` under `adventure-card-game:settings`:

- on-screen arrows (`N`, `W`, `S`, `E`): each tap moves one square
- swipe

Either or both can be on. Both cannot be off. The last one left on is locked, so it cannot be switched off.

Portrait stacks the map above the arrows. On a wide landscape screen the map stays on the left and the arrows sit on the right. A menu still uses the full width.

Named keys such as `ArrowUp`, `Enter`, and `Shift` are never treated as letters. A buy or a spoil pick only accepts a single character (`a` to `z`).

## Sound

Tones are synthesized in the browser. There are no audio files. `sound.js` is the only place that makes them, so later effects are added there. The first tap or key unlocks sound. A step, a blocked step, opening the menu, coin changing hands, a strike, casting a card into the ruin, waiting, a bell when the day turns, and going down each have a short tone.

## Cards

Every card has `id`, `name`, `weight`, `value`, `damage`, `use`, `tags`, `text`, and `shape`.

`use` is `combat`, `field`, or `both`. `value` is the price. `damage` is how many `#` cells the strike shape holds. Price climbs faster than harm: a Pitch Torch is worth more than the bruise it leaves. A cell of the shape that does not land on a living body cell does nothing, so the number is the most it can cut, not a promise. Weight is shown and stored. It does not limit the deck yet. The deck stores ids only. Pictures are not part of the card data. Tags are words such as `attack` and `metal`.

| Card | Use | Harm | Value | Weight | Tags | Where it starts |
| --- | --- | --- | --- | --- | --- | --- |
| Walking Staff | both | 2 | 3 | 2 | wood | your deck |
| Trail Bread | field | 0 | 2 | 1 | food | your deck, and the village |
| Belt Knife | combat | 4 | 6 | 1 | metal, attack | your deck |
| Coil of Rope | field | 0 | 4 | 3 | fiber | village |
| Pitch Torch | both | 1 | 5 | 1 | fire | village, and the ruin pile |
| Copper Charm | both | 1 | 8 | 1 | trinket | village |
| Ashen Shard | combat | 1 | 6 | 1 | stone, attack | ruin pile |
| Fang | combat | 3 | 4 | 1 | attack, beast | a wolf's deck |
| Acid Spit | combat | 3 | 3 | 1 | attack, acid | a slime's deck |
| Stone Spear | combat | 6 | 8 | 3 | stone, wood, attack | crafted |
| Glass Bottle | field | 0 | 25 | 1 | container | village |
| Rare Herbs | field | 0 | 10 | 1 | medicine | village |
| Staff of Fireballs | combat | 17 | 40 | 4 | fire, attack | crafted |
| Healing Potion | field | 0 | 40 | 1 | medicine | crafted |

The Belt Knife's harm is 4, and Acid Spit's is 3. Both used to be one less. The extra cell is the shape.

Open the deck from the game menu. A card is drawn as ASCII: a border, the name, a picture of 5 rows by 21 characters, the rules text, then use, tags, the shape if it has one, then harm or heal, value, and weight. The shop lists the price. A fight lists the harm, which is the size of the shape.

Trail Bread, Rare Herbs, and a Healing Potion can be used from the deck. Using one lays its shape on your body. `#` on a hurt cell restores that cell. `#` on a standing cell, or off the body, does nothing. Bread and herbs are 4 cells. The potion is your whole body, 8 cells. The card is eaten only when at least one cell is restored. At full health they do nothing. A Glass Bottle cannot be used this way. Arrow keys move the shape, including off the body so a tall shape can be centered. `R` turns it. You can also drag it. `1` or Enter places it.

The shapes:

| Card | Shape |
| --- | --- |
| You | four rows of `##` |
| Wolf | two rows of `###` |
| Slime | ` # ` / `###` / ` # ` |
| Walking Staff | ` #` / `#` |
| Belt Knife | `####` |
| Fang | three rows of `#` |
| Acid Spit | `##` / `#` |
| Stone Spear | `  #`, then ` ##`, then `###` |
| Staff of Fireballs | `# # #` / ` ### ` / `#####` / ` ### ` / `# # #` |
| Trail Bread | two rows of `##` |
| Rare Herbs | `#` then ` #`, twice |
| Healing Potion | four rows of `##` |
| Pitch Torch, Copper Charm, Ashen Shard | one `#` |

Rope and the Glass Bottle have no shape.

## Crafting

Crafting is its own screen, next to the deck on the game menu (`2`). It is not part of the deck.

The bench has two reagent slots and one catalyst slot. Each slot opens the deck so you can set a card into it. A card can only sit in one slot.

`4` tries the three cards against the recipe list. If they are not a recipe, nothing is spent and the bench says "That is not a recipe." An empty slot says "A slot is empty."

The one spear recipe is Ashen Shard and Walking Staff, with a Coil of Rope as the catalyst. It makes a Stone Spear. The two reagents are spent. The rope comes back. Reagent order does not matter. The spear's harm is 6 and its price is 8, more than either reagent alone.

A Staff of Fireballs is a Stone Spear and a Copper Charm, with a Pitch Torch as the catalyst. The spear is the ashen one, made from the shard. The charm is the copper piece on the counter. The torch comes back. The staff's harm is 17 and its price is 40.

A Healing Potion is a Glass Bottle and Rare Herbs, with Acid Spit as the catalyst. The spit comes back. The bottle costs 25 coin at the village, and it is a container. The herbs cost 10, and they are medicine: chewing them can restore up to 4 cells. The potion's shape is your whole body.

`5` opens uncraft. It lists made cards you are carrying. Choosing one returns its two reagents. The catalyst was never spent, so it is not given again.

A finished craft still advances the watch by one. Uncraft does not.

## Player card

You have a player card. It is not in the deck. The card says "A traveller." It also shows your health shape (`#` standing, `.` hurt), how many cells are left out of 8, how many cards you are carrying, and the day and watch. Maximum health is the 8 cells of that shape.

## Creature cards

A wolf and a slime each have a creature card. You strike that card, not a separate body behind it. The creature card has tags. The creature also has a hitbox, and it fights with its deck.

| Creature | Tags | Shape | Cells | Coin | Deck |
| --- | --- | --- | --- | --- | --- |
| Wolf | beast | two rows of `###` | 6 | 2 | Fang, Fang |
| Slime | acid, brave | a diamond, ` # ` / `###` / ` # ` | 5 | 1 | Acid Spit, Acid Spit |

## Tags

If you strike an `acid` creature with a `metal` card, the acid eats that card. The card leaves your deck and deals no harm. The Belt Knife against the slime is that trade. Wood, stone, and fire are not eaten.

## Combat

Stepping onto `S` starts a fight with that slime. A wolf can also stop you on open ground (see Random encounters). At night that wolf brings a second wolf. Village and ruin squares do not roll an encounter. In the ruin, two wolves on touching squares are one fight (see Ruin).

Health in a fight is the hitbox. A standing cell is `#`. A hurt cell is `.`. A hole in the shape, such as the corners of the slime, is a blank. You go down when none of your cells are left. A foe breaks when none of its cells are left. The fight is won when every foe has broken or got away.

A fight holds one or two enemies. Two is the most. The fight screen mirrors itself top and bottom. At the top, your `Player` card sits to the left of each creature's card, in the same order as the grid. Below them is one shared battlefield: your health on the left under `Player`, then each enemy under its name. One empty ground column sits between you and the first enemy, and between each pair of enemies. You and they stand on the same floor, so the bottom rows line up and a shorter creature sits lower. Dim ground cells surround the bodies. You strike into this grid. A stamp that lands on the empty column cuts nothing. A shape long enough to reach past it cuts both enemies. Two wolves look like this, where `.` is that empty column:

```
###.###
###.###
```

The Belt Knife is four cells in a row, and two wolves are seven cells across, so a knife laid across the middle clips the east wolf. The creatures' strikes land on your cells in the same grid.

You play one card whose use is `combat` or `both`. Field cards cannot be played. A number, or a tap, arms the card and centers its shape on the foes. The shape may hang off any side. Its top-left can sit above or west of the body, on a negative cell, so a long blade or the arms of a cross can be centered even when they are taller or wider than the health. The dim cells around the hitbox are that margin. A `#` drawn there is part of the weapon and cuts nothing. Drag onto a margin cell, or nudge with the arrows. `R` turns the shape a quarter turn clockwise. Strike or Enter swings. Dropping the card on the hitbox swings too. `X` puts the card down without swinging. Cells of the stamp that miss the body, or land on a cell that is already hurt, do nothing. A swing that cuts nothing is still your turn.

A metal card played on a fight where every creature still up is acid is eaten at once. You do not place it. It deals no harm. The Belt Knife against the slime is that trade. In a mixed fight you still place the card. If any cell of the stamp covers an acid body, even a cell that is already hurt, the acid eats the card and the swing cuts nothing, including a beast the shape also covered. Metal that only covers a beast is not eaten.

If every foe's hitbox is empty, none of them hit back.

Otherwise each foe that still has a cell left plays the first card of its own deck, lays that card's shape on you wherever it cuts the most cells, and moves that card to the back of its deck. They go from the west. Ties keep the unturned shape, then a higher cell, then a cell further west. An empty deck scratches your north-most standing cell, and the west-most if several share that row. A foe with no cells left does not swing. A foe that has just started to run does not swing either. If one of them drops you, the ones still waiting do not swing either.

A foe with one cell left runs, unless it has the `brave` tag. A slime is brave and fights until none of its cells are left. The turn a foe starts to run, it does not strike, so the blow that left it at one cell is not answered. On your next turn you can kill it. If it is still up after that turn, it leaves the fight. It pays no coin and offers no card. The others stay, so in a pack you choose: spend the turn finishing the runner, or let it go and keep fighting the rest. A runner that is still up when you flee gets away instead of striking.

Then:

- Anyone still up, on either side: continue, and choose again.
- Every foe at 0 cells, or gone: the fight ends. You gain the coin of each foe that broke, added together. A foe that got away pays nothing. A pack pays for every foe you killed, not once for the fight, and not for a runner. You may take one card from each foe that broke, from that foe's own deck, or leave that foe's cards. The offers come from the west. Leaving one does not leave the others. A foe carrying nothing is skipped. A slain slime on the plains is removed from the map. Wolves from a random encounter were never squares. A slain foe in the ruin clears its own square. A foe that got away leaves its square standing.
- You at 0 cells: you go down. See below.

Fleeing is allowed on your turn. Every foe that is still up, and not already running, gets one hit, from the west, placed the same way. A runner gets away instead, and pays nothing. If you are still up, you are back on the map. If a hit drops you, you go down, and any foe who had not swung yet does not.

## Going down

If the inn remembers you, you wake on the map as that save left you. The fight is over. You do not lose extra coin or cards. Anything since the last rest is gone, including a slime you killed after that rest.

If the inn does not remember you, the run ends. The death screen says so. `1` begins again from the start of the zone. Nothing is taken off a save, because there is not one.

## Inn

The inn is part of the village, not its own square. From the trading screen, the Inn button opens it. The `i` key does the same when that letter is not buying a card.

A bed costs 2 coin. It fills every cell of your health shape, even if you were already well. It writes the save. If you cannot pay, nothing changes and nothing is written. `0` returns to the trading screen.

## Save

One save, in `localStorage` under `adventure-card-game:save`. No cookies. Card stats are not stored, only card ids.

What is saved:

- Player: card ids, how many cells are standing, which cells are hurt, coin, and coordinates
- World: each known monster (kind, coordinates, and whether it is still there), the village and ruin coordinates, the village stock, the ruin pile, and the ruin map if you have entered it
- Travel: the turn count, the watch, and the turn of the last random encounter

An older save has a health number and no wound list. That number is kept by dropping cells from the south-east of your shape until the count matches. A save from this version stores the hurt cells as `row,column`. Those cells are what load. The count is written beside them.

Opening the page loads that save when there is one. You are on the map, not in a menu.

From the game menu, `5` clears the save. It asks first. Yes starts the zone over from the beginning. Movement settings are a different store and stay. If the inn remembers nothing, the line is locked.

## Random encounters

The zone is plains. On each move onto open ground, if five moves have passed since the last random encounter, a wolf may appear. The chance is 1 in 10 by day, 1 in 8 at dawn and dusk, and 1 in 5 at night. At night the encounter is two wolves. The other watches are still one wolf. The five-move cooldown starts when the wolf or the pair appears, not when a roll misses. It does not apply to the slime, the village, or the ruin. The first move of a trip can already roll.

## Village

Moving onto `V` opens the trading screen. Leave returns you to the map, still standing on the village. Moving onto it again opens the screen again. The inn is reached from this screen.

Buy spends coin equal to the card's value and takes it from the village. Sell pays three quarters of the value, rounded down, and gives the card to the village. The village keeps the other quarter. To swap, sell and then buy. You cannot buy what you cannot afford.

Trail Bread is for sale, and so are Rare Herbs and a Glass Bottle. The bread is food. The herbs are medicine. The bottle is a container.

A card you sold stays on the counter until the day turns, and you can buy it back at full price. At the start of each new day the counter is Trail Bread, Coil of Rope, Pitch Torch, Copper Charm, Rare Herbs, and Glass Bottle again. Yesterday's leftovers are gone.

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

`W` and `S` are the first letter of the monster. Stepping onto one starts a fight with that creature. If another of the same mark touches that square by a side, it joins the fight, up to two. A wolf room is placed as two wolves on touching floor squares, so stepping on either fights both, with one empty ground column between them. Winning clears both squares. A slime is still one square. A ruin you already entered keeps the rooms it had, so an older delve can still hold a lone wolf. A wolf in the ruin is a square, not a random encounter. Killing it clears the square. The plains slime is a different creature and stays where it was.

You appear on the stairs. Step off them to explore. Step back onto `<` to climb out to the plains, still standing on `R`. A wall, or the edge, does not move you: "The stone does not give."

`*` opens the rubble. The pile is in order: Ashen Shard, then Pitch Torch. It does not refill. Sift to take the next card. When the pile is empty, sifting finds nothing. Cast a card from your deck into the crack to lose it. Half the time, if a card is still in the pile, that card comes back out instead. Otherwise the cast card is simply gone. Leaving the rubble puts you back in the ruin, still standing on `*`.

The ruin is saved with the inn: the rooms, what is still standing in them, and where you were.
