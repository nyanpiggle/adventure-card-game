# Agent guide

Read this before editing. This is the only agent guide in the repo (there is no `CLAUDE.md`).

## What this game is

An ASCII adventure card game for a phone. Travel is one 25×25 zone you move around by swiping. The game menu opens the deck and settings. Stepping on the village trades cards. Stepping on the ruin can find or lose cards. Rules and coordinates live in `NOTES.md`.

### Code layout

Plain scripts, loaded by `index.html` through `app.js`. No build step.

- `game.js` — zone, coordinates, travel
- `cards.js` — card definitions, tags, coin, trade, ruin pile, creature cards
- `combat.js` — fights, random encounters, going down
- `art.js` — ASCII pictures and card text wrapping (not stored on the card)
- `settings.js` — movement toggles and `localStorage`
- `direction.js` — swipes and arrow keys
- `render.js` — map and card drawing
- `mount.js` — screens and input
- `app.js` — starts the game on `#app`
- `styles.css` — colour
- `NOTES.md` — rules

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

1. **Done. Lay out the scripts.** See "Code layout" above. Behaviour of travel is unchanged: one square, cardinal only, player drawn on top of the ground.
2. **Done. Colour.** White, orange, green, red, yellow, and blue, mapped in `styles.css`. See `NOTES.md`.
3. **Done. Settings menu.** Reached from the game menu. On-screen arrows and swipe are separate toggles. One of them must stay on. Remembered in `localStorage`. Documented in `NOTES.md`.
4. **Done. Card system.** Card data, the player deck, and an ASCII deck view from the menu. Rules are in `NOTES.md`.
5. **Done. Village trading menu.** Stepping onto `V` opens it. Buy and sell by `value`. A swap is a sell and then a buy.
6. **Done. Ruin exploration menu.** Stepping onto `R` opens it. Sift to find a card. Cast a card in to lose it, sometimes getting one back.
7. **Done. Monsters.** Wolf and slime, each with a deck. Combat uses combat cards. Rules are in `NOTES.md`.
8. **Future: portrait and landscape layouts.** Support both orientations and adapt the layout when the phone rotates, similar to how YouTube switches between portrait and full-screen landscape. Until then, design for portrait first.
9. **Sound effects for the current controls.** Synthesize simple sound effects for swipes and other interactions using the Web Audio API: pure synthesized tones, like a triangle or square wave with a quick decay. No audio files.
10. **Some sort of library for future sound effects.** A reusable sound module so sounds can be shared and new sound effects added later without duplicating code.
11. **Done. A game menu.** `[ Menu ]` or the `M` key. It holds the deck and the settings.
12. **Inn at the village, and saving.** An inn at the village where you spend money to replenish health. It is also a save point: if you die, you end up back at the inn with everything you had when you were last there. This started as death insurance, but make it a real full save if feasible. Save with the browser's `localStorage` (no cookies, no consent pop-up). What is saved:
    - **Player:** basically a single small array or object. Which cards are in your inventory (card IDs only; card values and stats are baked into the game engine and are not saved), your health, and your coordinates.
    - **World:** the location of any known monsters, and the locations of the villages and ruins in that save file.
13. **Done. Cards.** The starter set is in `cards.js` and `NOTES.md`. Do this before task 14. It is done.
14. **Done. Display cards as ASCII art.** Name, a 5×21 picture, then the function text, inside a border. The picture is drawn by `art.js`, not stored on the card.
15. **Done. Card tags.** Cards have tags, like `attack` and `metal`. A metal card used on an acid creature is destroyed and deals no harm.
16. **Done. Creature cards.** The wolf and the slime each have a creature card. You attack that card. Their decks are separate.
17. **Done. Player card.** The player card holds health and deck size. It is not in the deck. Open it from the game menu.
18. **Done. Monsters and combat.** Starter monsters are a wolf and a slime. See `NOTES.md`.
19. **Done. Random encounters.** Plains, wolf only, 1 in 10 on a move onto open ground, and not again until five moves have passed. The slime is a map marker, not a random encounter.
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
