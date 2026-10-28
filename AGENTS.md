# Agent guide

Read this before editing. This is the only agent guide in the repo (there is no `CLAUDE.md`).

## What this game is

An ASCII adventure card game for a phone. Travel is one 25×25 zone you move around by swiping. The game menu opens the deck and settings. Stepping on the village trades cards. Stepping on the ruin can find or lose cards. Rules and coordinates live in `NOTES.md`.

### Code layout

Plain scripts, loaded by `index.html` through `app.js`. No build step.

- `game.js` - zone, coordinates, travel
- `cards.js` - card definitions, tags, coin, trade, ruin pile, creature cards
- `combat.js` - fights, random encounters, going down
- `art.js` - ASCII pictures and card text wrapping (not stored on the card)
- `settings.js` - movement toggles and `localStorage`
- `save.js` - the inn's save
- `sound.js` - synthesized tones (no audio files)
- `direction.js` - swipes and arrow keys
- `dungeon.js` - ruin maps
- `time.js` - the watch and the day
- `shapes.js` - hitboxes, stamps, rotation, and where a blow lands
- `render.js` - map and card drawing
- `mount.js` - screens and input
- `app.js` - starts the game on `#app`
- `styles.css` - colour
- `NOTES.md` - rules

### Hard rules

- **Pure ASCII.** It is a stylistic choice. Everything on screen, including the map, menus, buttons, and cards, is drawn with ASCII characters. No images, emoji, icon fonts, or canvas art. Coloured ASCII (see task 2) is fine. One deliberate exception: the `×` corners of the map's compass border are the user's choice. Keep them; do not replace them.
- **Plain static site.** `index.html`, `styles.css`, `app.js`. No npm, no build step, no frameworks, no `gh-pages` branch.
- **`NOTES.md` is the rulebook.** Any change to game rules or behaviour updates `NOTES.md` in the same commit. If the code and `NOTES.md` disagree, that is a bug; fix one so they match.

## Where the game is going: everything is a card

Everything a character or monster has or can do is a card. That includes items, abilities, attacks, spells, and traits. The point is that any of them can be lost, added, or altered during play.

- **The player and every monster each hold a deck of cards.**
- **Each card has properties**, at least: `name`, `weight`, `value`, and whether it is usable in combat, out of combat, or both. Add properties as needed and document them in `NOTES.md`.
- **Cards are useful both in and out of combat.**
- **The player's deck can be opened from the adventure map.**
- **Cards are shown as ASCII during interaction menus**, such as exploring a ruin (finding or losing cards) or trading at a village (buying, selling, or swapping cards by `value`).
- Keep card data separate from drawing code so cards are easy to create, remove, and change.

## Task list (do these roughly in order)

1. **Done. Lay out the scripts.** See "Code layout" above. Behaviour of travel is unchanged: one square, cardinal only, player drawn on top of the ground.
2. **Done. Colour.** White, orange, green, red, yellow, and blue, mapped in `styles.css`. See `NOTES.md`. The reference below is kept for any further colour work (for example the time-of-day shading in task 21).

   Reference only (not required implementation): the old Pydroid Python Rubik's cube solver (`rubiks-cube-solver` commit `cef84f3`, `cube.py` lines 9-15, April 2025) used these terminal codes. This game is JavaScript in a browser, so treat them as a guide for which colours to aim for, not as codes to paste in:

   - White: `\033[97m`
   - Orange: `\033[38;5;208m` (256-colour)
   - Green: `\033[92m`
   - Red: `\033[91m`
   - Yellow: `\033[93m`
   - Blue: `\033[94m`
   - Reset: `\033[0m`

   That project's `utils.py` (`display_coloured_row`) printed each square as `f"{colour}[]{RESET}"`, resetting after every square.
3. **Done. Settings menu.** An ASCII settings menu, reached from the game menu (task 11). Movement inputs are two separate toggles: on-screen ASCII arrow buttons (north, west, south, east; each tap moves one square, same as a swipe or arrow key) and swipe controls. Either or both can be on, but never both off, because then you could not move. The remaining toggle is greyed out so it cannot be switched off while it is the only one on. Settings are remembered between visits (`localStorage`). Controls and settings are documented in `NOTES.md`.
4. **Done. Card system.** Card data, the player deck, and an ASCII deck view from the menu. Rules are in `NOTES.md`.
5. **Done. Village trading menu.** Stepping onto `V` opens it. Buy and sell by `value`. A swap is a sell and then a buy.
6. **Done. Ruin exploration menu.** Stepping onto `R` opens it. Sift to find a card. Cast a card in to lose it, sometimes getting one back.
7. **Done. Monsters.** Wolf and slime, each with a deck. Combat uses combat cards. Rules are in `NOTES.md`.
8. **Done. Portrait and landscape layouts.** Portrait stacks the map over the arrows. A wide landscape screen puts the map on the left and the arrows on the right. Menus use the full width.
9. **Done. Sound effects for the current controls.** Synthesize simple sound effects for swipes and other interactions using the Web Audio API: pure synthesized tones, like a triangle or square wave with a quick decay. No audio files.
10. **Done. Some sort of library for future sound effects.** A reusable sound module so sounds can be shared and new sound effects added later without duplicating code. See `sound.js`.
11. **Done. A game menu.** `[ Menu ]` or the `M` key. It holds the deck, the settings, you, and clearing the save.
12. **Done. Inn at the village, and saving.** From the village, a bed costs 2 coin, fills health, and writes one `localStorage` save (`save.js`). Opening the page loads it. Dying loads it. With no save, dying ends the run on the death screen.
13. **Done. Cards.** The starter set of card data is in `cards.js` and listed in `NOTES.md`. New cards go there too.
14. **Done. Display cards as ASCII art.** Name, a 5×21 picture, then the function text, inside a border. The picture is drawn by `art.js`, not stored on the card.
15. **Done. Card tags.** Cards have tags, like `attack` and `metal`. A metal card used on an acid creature is destroyed and deals no harm.
16. **Done. Creature cards.** The wolf and the slime each have a creature card. You attack that card. Their decks are separate.
17. **Done. Player card.** The player card holds health and deck size. It is not in the deck. Open it from the game menu.
18. **Done. Monsters and combat.** Starter monsters are a wolf and a slime. See `NOTES.md`.
19. **Done. Random encounters.** Plains, wolf only, 1 in 10 on a move onto open ground, and not again until five moves have passed. The slime is a map marker, not a random encounter.
20. **Done. Random dungeon generator for the ruins.** Stepping on `R` enters a generated ruin: rooms joined by corridors of length 3 to 10. Wolves and slimes are room markers, `W` and `S`. `<` climbs out. `*` is the old rubble pile. The layout is kept, and the inn saves it.
21. **Done. Time system.** A day is 60 watches (`time.js`). Moves and ruin steps advance it by 1. Sleep advances it by 30. Dawn, day, dusk, and night recolour the map. Wolf odds are 1 in 10, 1 in 8, and 1 in 5. The watch is saved.
22. **Done. Village daily trade reset.** When the watch crosses into a new day, `villageStock` is replaced by the starting list. Sold cards from yesterday are gone.
23. **Done. Bug fixes from review.**
    - **Village keyboard bug.** In `mount.js` `onKey`, the trade branch picks a buy letter with `event.key.toLowerCase().charCodeAt(0) - 97`, so named keys like `ArrowUp`, `Enter`, `Escape`, and `Shift` count as letters and open buy prompts. Only accept single-character keys (`event.key.length === 1`). The same pattern is in `onFightKey` when choosing a spoil after a win; fix it there too.
    - **Non-ASCII `·` in the status line.** `placeLine` and the deck info line in `mount.js` use `·` as a separator. Replace it with an ASCII character (for example `|` or `-`).
    - **Selling by keyboard stops at 9 cards.** The trade screen uses single digits, so cards 10 and up cannot be sold from the keyboard. Give them a way (paging, or another key scheme).
    - **Redundant ternary in `draw()`.** `game.screen === "map" ? game.message || placeLine() : game.message || placeLine()` has identical branches; simplify it.
    - **Cut-off rules text.** `renderCard` in `render.js` keeps only 4 lines of rules text (`.slice(0, 4)`) with no sign that text was cut. Show an indicator (for example ending the last line with `...`) when it is truncated.
24. **Done. Card value is not combat damage.** Each card has `damage` as well as `value`. Price climbs faster than harm. The Pitch Torch is worth 5 and hits for 1. Fights use harm. The shop uses price. Torch utility outside a fight is still not decided.
25. **Done. Rename Ash Shard to Ashen Shard.** The id stays `shard`, so old saves still know the card. It is stone: value 6, damage 1.
26. **Done. Crafting.** Its own menu, beside the deck. Two reagent slots and a catalyst slot. The recipe is Ashen Shard + Walking Staff, catalyst Coil of Rope, result Stone Spear (harm 6, value 8). The rope comes back. A wrong set of cards fails. Uncraft lists made cards and returns the reagents.
27. **Done. Village trade rules.** The counter sells Trail Bread. Selling pays three quarters of the price, rounded down. A sold card can be bought back at full price until the day turns, which replaces the counter with the starting goods.
28. **Done. Death with no save ends the run.** `applyDown` matches `NOTES.md`. If the inn remembers you, dying loads that save. If it does not, the death screen is shown and `1` begins again. There is no half-coin wake.
29. **Done. Waiting.** On the map or in the ruin, `.` or `[ . ]` advances the watch by one. It is not a move, so it does not roll a wolf.
30. **Done. Work takes a watch.** A finished sale, purchase, sift, cast, or craft advances the watch by one. A failed attempt does not.
31. **Done. The day has a bell.** When the watch crosses into a new day, a bell plays. The player card shows the day and the watch.
32. **Done. Clear the save.** The game menu (`5`) can forget the inn. It asks first, then deletes the save and starts the zone over. Settings stay.
33. **Done. More recipes.** Staff of Fireballs: Stone Spear + Copper Charm, catalyst Pitch Torch (harm 8, value 20). Healing Potion: Glass Bottle + Rare Herbs, catalyst Acid Spit (heals 7). The village sells the bottle for 25 (tag `container`) and the herbs for 10 (tag `medicine`, heals 4). Catalysts come back.
34. **Done. 2D health bars.** Health is a hitbox of `#` cells. You are four rows of `##` (8). A wolf is two rows of `###` (6). A slime is a diamond of 5. A strike or a heal is a shape laid on that hitbox. Drag the card onto the enemy, or nudge it with the arrows, turn it with `R`, and confirm. Cells that miss do nothing. The count of `#` on a weapon is its harm: the Belt Knife is 4 and Acid Spit is 3. Bread and herbs cover 4. The potion covers the whole body. The inn fills every cell. An old save's health number drops cells from the south-east until the count matches. Rules are in `NOTES.md`.
35. **Done. Fighting several enemies at once.** A fight holds at most two foes. They share one battlefield grid with you: player first, then each enemy, cards in the same order at the top. One empty ground column, drawn as `.` and not as a wall, sits between you and the first enemy, and between each pair of enemies. Bottoms line up on one floor. The gap is not a body cell. A stamp that crosses it can cut both. Two wolves are `###.###`. The Belt Knife, centered on two wolves, clips the east wolf. A foe with no cells left does not swing. The others do, from the west. If one drops you, the rest do not swing. At night a random wolf is a pair. Dawn, day, and dusk are still one wolf. The chance and the five-move cooldown are unchanged. The cooldown starts when the wolf or the pair appears. In a newly entered ruin a wolf room is two wolves on touching squares. Stepping on either fights both, and winning clears both squares. A slime stays alone. An older saved ruin is left as it was. Metal against a fight where every living foe is acid is eaten before you place it. In a mixed fight, metal is eaten only when the stamp covers an acid body, and that swing cuts nothing. Coin is the sum. You still take one card. Rules are in `NOTES.md`.
36. **Wounded enemies run away.** When an enemy is down to 1 health (1 cell left in its health shape), it runs away, unless it has the `brave` tag. Certain mindless enemies, such as slimes, have the `brave` tag and fight to the end.
    When an enemy starts to run away, it does not attack you that turn, so you get a free attack against it, just as an enemy gets a free attack when you flee. If you fail to kill it on your following turn, it disappears from the combat and you get no reward for it. In fights with several enemies this is a deliberate choice: focus the fleeing enemy to bring it down (risking the others surviving another turn), or let it go and lose its reward.
37. **Damage animation.** When cells are knocked out of a health shape, they do not vanish instantly: the struck `#` cells fade through a short series of changing colours (e.g. a gradient toward black or white) and then disappear. This applies both when you hit an enemy and when an enemy hits you, so you watch your own health cells fade where the attack landed. It is fully ASCII: only the text colour changes, with no images or new glyphs.
    The exact colours and timing are not decided yet.

## Version control

- Push straight to `main`. No pull request is needed.
- Every previous version must stay reachable. Never force-push, rebase, amend, or rewrite history on `main`, and never delete branches or tags.
- Make small commits, each with a clear message saying what changed and why (e.g. `Add village trading menu`).
- When a milestone works (e.g. each numbered task above), tag it, e.g. `v0.2-cards`, so that version is easy to find and restore.
- To undo something, use `git revert`, which adds a new commit, instead of deleting history.

## Before you push

Serve the folder locally (e.g. `python3 -m http.server`) and check on a phone-sized portrait screen: the map draws with aligned columns, swipes, arrow keys, and on-screen arrow buttons (when enabled) move one square, the page does not scroll while swiping, and any menu you touched works.

## Phone list (all nyanpiggle projects)

The home screen is <https://nyanpiggle.github.io/app-hub/>, repo [app-hub](https://github.com/nyanpiggle/app-hub). It lists public repos that are not forks. `app-hub` itself is not a card. Private repos never appear.

A card opens, in order:

1. the repo Homepage / website URL, if one is set
2. otherwise `https://nyanpiggle.github.io/<repo>/` when GitHub Pages is on
3. otherwise the GitHub repo, which is the source, not the app

A change to an app is not finished when its source branch moves. The same turn must update the URL that card opens, then confirm the live page is the new one. Do not clear Homepage, turn Pages off, or make the repo private if it should stay on the phone. Repos do not all publish the same way. Copy this phone section into `AGENTS.md` on any new project, then add how that repo publishes. Setting up a new repo is not done until that repo is on the phone: make it public, publish the URL the card opens, and confirm the live hub lists it. Leave a repo off the phone only when the user said to keep it private.

## This repo on the phone

No Homepage is set, so the card opens <https://nyanpiggle.github.io/adventure-card-game/>.

GitHub Pages serves `main` at `/`. Pushing `main` is the publish. Leave `.nojekyll` in place so Pages serves the files as they are.

Before you say it is done, open <https://nyanpiggle.github.io/adventure-card-game/> and confirm the change is there. A commit that never reached `main` is not on the phone. Also confirm <https://nyanpiggle.github.io/app-hub/> lists `adventure-card-game` and the card opens that Pages URL.
