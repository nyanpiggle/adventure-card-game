# Agent guide

Read this before editing. This is the only agent guide in the repo (there is no `CLAUDE.md`).

## What this game is

An ASCII adventure card game for a phone. Today only the travel phase exists: one 25×25 zone you move around by swiping. Rules and coordinates live in `NOTES.md`.

### Hard rules

- **Pure ASCII.** It is a stylistic choice. Everything on screen, including the map, menus, and cards, is drawn with ASCII characters. No images, emoji, icon fonts, or canvas art.
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
2. **Card system.** Card data model, player deck, and an ASCII deck view reachable from the map. Write the card rules into `NOTES.md`.
3. **Village trading menu.** Stepping onto `V` opens an ASCII trading screen using card `value`.
4. **Ruin exploration menu.** Stepping onto `R` opens an ASCII exploration screen where cards can be found or lost.
5. **Monsters.** Monsters with their own decks, and combat using combat cards.
6. **Future: portrait and landscape layouts.** Support both orientations and adapt the layout when the phone rotates, similar to how YouTube switches between portrait and full-screen landscape. Until then, design for portrait first.

## Version control

- Push straight to `main`. No pull request is needed.
- Every previous version must stay reachable. Never force-push, rebase, amend, or rewrite history on `main`, and never delete branches or tags.
- Make small commits, each with a clear message saying what changed and why (e.g. `Add village trading menu`).
- When a milestone works (e.g. each numbered task above), tag it, e.g. `v0.2-cards`, so that version is easy to find and restore.
- To undo something, use `git revert`, which adds a new commit, instead of deleting history.

## Before you push

Serve the folder locally (e.g. `python3 -m http.server`) and check on a phone-sized portrait screen: the map draws with aligned columns, swipes and arrow keys move one square, the page does not scroll while swiping, and any menu you touched works.

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
