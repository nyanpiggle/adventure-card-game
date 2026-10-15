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
- `sound.js` - synthesized tones (no audio files)
- `direction.js` - swipes and arrow keys
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
8. **Future: portrait and landscape layouts.** Support both orientations and adapt the layout when the phone rotates, similar to how YouTube switches between portrait and full-screen landscape. Until then, design for portrait first.
9. **Done. Sound effects for the current controls.** Synthesize simple sound effects for swipes and other interactions using the Web Audio API: pure synthesized tones, like a triangle or square wave with a quick decay. No audio files.
10. **Done. Some sort of library for future sound effects.** A reusable sound module so sounds can be shared and new sound effects added later without duplicating code. See `sound.js`.
11. **Done. A game menu.** `[ Menu ]` or the `M` key. It holds the deck and the settings.
12. **Inn at the village, and saving.** An inn at the village where you spend money to replenish health. Resting in the village is part of this task, and it is important. The details of resting are not decided yet. It is also a save point: if you die, you end up back at the inn with everything you had when you were last there. This started as death insurance, but make it a real full save if feasible. Save with the browser's `localStorage` (no cookies, no consent pop-up). What is saved:
    - **Player:** basically a single small array or object. Which cards are in your inventory (card IDs only; card values and stats are baked into the game engine and are not saved), your health, and your coordinates.
    - **World:** the location of any known monsters, and the locations of the villages and ruins in that save file.
13. **Done. Cards.** The starter set of card data is in `cards.js` and listed in `NOTES.md`. New cards go there too.
14. **Done. Display cards as ASCII art.** Name, a 5×21 picture, then the function text, inside a border. The picture is drawn by `art.js`, not stored on the card.
15. **Done. Card tags.** Cards have tags, like `attack` and `metal`. A metal card used on an acid creature is destroyed and deals no harm.
16. **Done. Creature cards.** The wolf and the slime each have a creature card. You attack that card. Their decks are separate.
17. **Done. Player card.** The player card holds health and deck size. It is not in the deck. Open it from the game menu.
18. **Done. Monsters and combat.** Starter monsters are a wolf and a slime. See `NOTES.md`.
19. **Done. Random encounters.** Plains, wolf only, 1 in 10 on a move onto open ground, and not again until five moves have passed. The slime is a map marker, not a random encounter.
20. **Random dungeon generator for the ruins.** When you enter a ruin, it takes you straight into a dungeon map. The important part is that the ruins are a randomly generated map rather than a big open area. Give it corridors of random lengths (around three to ten is a starting idea; do not focus too much on exact corridor size) and random rooms of random sizes. Enemies appear in those rooms as markers on the map, just like the village and the ruin do on the overworld, but with different symbols: the first letter of the monster's name.
21. **Time system.** Turn-based, not real time. Time is an abstract number (not hours) on a scale of at most 100. Good candidate scales are 100 and 36; leave the final choice open for now. Ideally the scale has a lot of different factors. Moving to a new square advances time by one. Other actions can advance it too — for example, sleeping at the inn moves time forward by 30. The map's colours shift with time of day: brighter and more vibrant in daytime, darker and more desaturated at night (ties into task 2). Random encounter probabilities can also vary by time of day (ties into task 19).
22. **Village daily trade reset.** Village trades reset every in-game day, using the established in-game time counter.
23. **Done. Bug fixes from review.**
    - **Village keyboard bug.** In `mount.js` `onKey`, the trade branch picks a buy letter with `event.key.toLowerCase().charCodeAt(0) - 97`, so named keys like `ArrowUp`, `Enter`, `Escape`, and `Shift` count as letters and open buy prompts. Only accept single-character keys (`event.key.length === 1`). The same pattern is in `onFightKey` when choosing a spoil after a win; fix it there too.
    - **Non-ASCII `·` in the status line.** `placeLine` and the deck info line in `mount.js` use `·` as a separator. Replace it with an ASCII character (for example `|` or `-`).
    - **Selling by keyboard stops at 9 cards.** The trade screen uses single digits, so cards 10 and up cannot be sold from the keyboard. Give them a way (paging, or another key scheme).
    - **Redundant ternary in `draw()`.** `game.screen === "map" ? game.message || placeLine() : game.message || placeLine()` has identical branches; simplify it.
    - **Cut-off rules text.** `renderCard` in `render.js` keeps only 4 lines of rules text (`.slice(0, 4)`) with no sign that text was cut. Show an indicator (for example ending the last line with `...`) when it is truncated.
24. **Card value is not combat damage.** A card's `value` (its price in gold) must no longer be the same number as the damage it deals in combat. Give cards a separate damage stat. As a general vibe, value (price) scales exponentially while damage scales linearly. Example: the Pitch Torch should have a higher value than its damage. It does little damage in combat but has some utility outside combat (the exact utility is not decided yet).
25. **Rename Ash Shard to Ashen Shard.** It is a shard of stone, not ash. On its own it has a value of about 6 and a damage of about 1. It should no longer be a cheap source of high damage.
26. **Crafting.** An area in the inventory (deck view) where cards can be combined. First recipe: Ashen Shard + Walking Staff (the walking stick) = Stone Spear. The shard is the spearhead. Stone Spear has damage 6 and a value of about 8, higher than the parts individually.
27. **Village trade rules.**
    - **Food.** One of the village trades should be food.
    - **Buy back.** You can buy back anything you sold to the village, as long as it is the same in-game day.
    - **Selling cut.** Selling to the village pays out 75% of the item's value. The village takes a 25% cut.
28. **Done. Death costs half your gold.** `applyDown` matches `NOTES.md`: half the coin, rounded up; 0 coin also drops one random card; no coin and no cards is game over, and `1` begins again.
    - **Coin.** Going down (dying) costs half the coin you are carrying, rounded up, instead of a flat 2. For example, 1 coin costs 1, 3 coin costs 2, and 0 coin costs nothing.
    - **Broke.** If you go down with 0 coin, you also lose one random card from your deck.
    - **Game over.** You lose the game (game over) if you have no coin and no cards in your deck. `1` begins again. Nothing is saved.

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
