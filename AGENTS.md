# Agent guide

`AGENTS.md` and `CLAUDE.md` are the same document. Read this before editing.

## Phone list (all nyanpiggle projects)

The home screen is <https://nyanpiggle.github.io/app-hub/>, repo [app-hub](https://github.com/nyanpiggle/app-hub). It lists public repos that are not forks. `app-hub` itself is not a card. Private repos never appear.

A card opens, in order:

1. the repo Homepage / website URL, if one is set
2. otherwise `https://nyanpiggle.github.io/<repo>/` when GitHub Pages is on
3. otherwise the GitHub repo, which is the source, not the app

A change to an app is not finished when its source branch moves. The same turn must update the URL that card opens, then confirm the live page is the new one. Do not clear Homepage, turn Pages off, or make the repo private if it should stay on the phone. Repos do not all publish the same way. Copy this phone section into `AGENTS.md` and `CLAUDE.md` on any new project, then add how that repo publishes. Setting up a new repo is not done until that repo is on the phone: make it public, publish the URL the card opens, and confirm the live hub lists it. Leave a repo off the phone only when the user said to keep it private.

## This repo on the phone

No Homepage is set, so the card opens <https://nyanpiggle.github.io/adventure-card-game/>.

The site is static: `index.html`. There is no npm build and no `gh-pages` branch. Do not add either. Pushing `main` is the publish. `.github/workflows/pages.yml` deploys the repo root on every push to `main`. The repo stays public so the phone can list it.

Before you say it is done, open <https://nyanpiggle.github.io/adventure-card-game/> and <https://nyanpiggle.github.io/app-hub/> and confirm the card is there and opens that page. A commit that never reached `main` is not on the phone.
