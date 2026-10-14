# Agent guide

Read this before editing. This is the only agent guide in the repo (there is no `CLAUDE.md`).

## What this game is

An ASCII adventure card game for a phone. Today only the travel phase exists: one 25×25 zone you move around by swiping. Rules and coordinates live in `NOTES.md`.

### Hard rules

- **Pure ASCII.** It is a stylistic choice. Everything on screen, including the map, menus, buttons, and cards, is drawn with ASCII characters. No images, emoji, icon fonts, or canvas art. Coloured ASCII (see task 2) is fine.
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

1. **Lay out `app.js`.** Split it into clear sections (or a few plain script files loaded by `index.html`): game state, map and zone data, card data and deck logic, rendering, and input (swipe and arrow keys). Behaviour must stay the same. Describe the layout in this guide when done.
2. **Colour.** Add colour to the ASCII display. ANSI colours can be applied to text in the browser, so use them to make the game more visually interesting.

   Reference only (not required implementation): the old Pydroid Python Rubik's cube solver (`cube.py` lines 9–15, April 2025) used these terminal codes. This game is JavaScript in a browser, so treat them as a guide for which colours to aim for, not as codes to paste in:

   - White: `\033[97m`
   - Orange: `\033[38;5;208m` (256-colour)
   - Green: `\033[92m`
   - Red: `\033[91m`
   - Yellow: `\033[93m`
   - Blue: `\033[94m`
   - Reset: `\033[0m`

   That project's `utils.py` also used the reset code when printing each square.
3. **Settings menu.** An ASCII settings menu reachable from the map (see task 11, the game menu, for where it lives). Movement inputs are two separate toggles: on-screen ASCII arrow buttons (north, west, south, east; each tap moves one square, same as a swipe or arrow key) and swipe controls. Either or both can be on, but never both off, because then you could not move. One way: grey out the remaining toggle so it cannot be switched off while it is the only one on. Remember settings between visits (`localStorage`). Document controls and settings in `NOTES.md`.
4. **Card system.** Card data model, player deck, and an ASCII deck view reachable from the map. Write the card rules into `NOTES.md`.
5. **Village trading menu.** Stepping onto `V` opens an ASCII trading screen using card `value`.
6. **Ruin exploration menu.** Stepping onto `R` opens an ASCII exploration screen where cards can be found or lost.
7. **Monsters.** Monsters with their own decks, and combat using combat cards.
8. **Future: portrait and landscape layouts.** Support both orientations and adapt the layout when the phone rotates, similar to how YouTube switches between portrait and full-screen landscape. Until then, design for portrait first.
9. **Sound effects for the current controls.** Synthesize simple sound effects for swipes and other interactions using the Web Audio API: pure synthesized tones, like a triangle or square wave with a quick decay. No audio files.
10. **Some sort of library for future sound effects.** A reusable sound module so sounds can be shared and new sound effects added later without duplicating code.
11. **A game menu.** We do need a menu: somewhere to put the settings (task 3), including the movement controls toggles.
12. **Inn at the village, and saving.** An inn at the village where you spend money to replenish health. It is also a save point: if you die, you end up back at the inn with everything you had when you were last there. This started as death insurance, but make it a real full save if feasible. Save with the browser's `localStorage` (no cookies, no consent pop-up). What is saved:
    - **Player:** basically a single small array or object. Which cards are in your inventory (card IDs only; card values and stats are baked into the game engine and are not saved), your health, and your coordinates.
    - **World:** the location of any known monsters, and the locations of the villages and ruins in that save file.
13. **Cards.** It is an adventure card game without any cards, so add them: the card data itself, building on task 4's card system. Do this before task 14.
14. **Display cards as ASCII art.** Every card gets a simple ASCII illustration and a nice border. The art is not stored in the card data; it is part of the display function. Layout, inside the frame from top to bottom: the card name just above the picture, the picture, then text below the picture describing how the card functions. Start with an art area of 5 rows of 21 ASCII characters. Those dimensions may not be perfect once the frame, name, and function text are included, so adjust as needed.
15. **Card tags.** Cards have tags, like `attack` and `metal`. Interaction rules can key off tags. Example: slimes have the `acid` tag, and if you hit anything acid with a metal card, the acid dissolves it, so using a metal weapon on a slime is a bad trade.
16. **Creature cards.** Creatures have their own creature card, and you attack the creature card rather than the creature directly. (Whether creatures themselves can have tags is not decided.)
17. **Player card.** The player has their own player card holding their stats, such as health and deck size.
18. **Monsters and combat.** We need combat, and to have combat we need monsters. Add monsters, creating their cards with the existing card rules (tasks 4 and 13). Starter monsters: a wolf and a slime.
19. **Random encounters.** Whenever you swipe to move, there is a chance of a random encounter, depending on the region:
    - Each 25×25 map has one biome for the whole map. (Per-square biomes may come later; for now use the map's biome.)
    - The starting area is always a plains biome, no matter what.
    - In plains, a random encounter can be a wolf.
    - Chance: 1 in 10 per swipe. This is a rough starting figure: not so often that an injured player can't make it back to the village, not so rare you never meet one.
    - Cooldown: in the overworld, you can't get a random encounter within five turns of the previous one. This applies only to overworld random encounters; in dungeons such as the ruins there is no cooldown.
    - Monsters are cards made with the existing card rules (tasks 13 and 18).
20. **Random dungeon generator for the ruins.** When you enter a ruin, it takes you straight into a dungeon map. The important part is that the ruins are a randomly generated map rather than a big open area. Give it corridors of random lengths (around three to ten is a starting idea; do not focus too much on exact corridor size) and random rooms of random sizes. Enemies appear in those rooms as markers on the map, just like the village and the ruin do on the overworld, but with different symbols: the first letter of the monster's name.
21. **Time system.** Turn-based, not real time. Time is an abstract number (not hours) on a scale of at most 100. Good candidate scales are 100 and 36; leave the final choice open for now. Ideally the scale has a lot of different factors. Moving to a new square advances time by one. Other actions can advance it too — for example, sleeping at the inn moves time forward by 30. The map's colours shift with time of day: brighter and more vibrant in daytime, darker and more desaturated at night (ties into task 2). Random encounter probabilities can also vary by time of day (ties into task 19).

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
