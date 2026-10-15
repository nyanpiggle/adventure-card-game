import { buyCard, canUseInField, cardById, castIntoRuin, deckWeight, sellCard, siftRuin, useFieldCard } from "./cards.js";
import { applyDown, beginFight, claimSpoil, fleeFight, hpBar, playCombatCard, rollEncounter } from "./combat.js";
import { DUNGEON, dungeonName, foeKind, generateDungeon, moveInDungeon } from "./dungeon.js";
import { KEYS, directionFromSwipe } from "./direction.js";
import { TILES, createGame, groundName, tileAt, travel } from "./game.js";
import { renderCard, renderCreature, renderMap, renderPlayer } from "./render.js";
import { controlLocked, loadSettings, saveSettings, toggleSetting } from "./settings.js";
import { readSave, restAtInn, writeSaveInto } from "./save.js";
import { play, unlockAudio } from "./sound.js";
import { clockLabel, dayOf, watchName } from "./time.js";

/** @typedef {import("./game.js").Screen} Screen */
/** @typedef {import("./game.js").Dir} Dir */
/** @typedef {{ kind: "sell" | "buy" | "cast", index: number }} Pending */

const PHASE = {
  map: "Travel",
  menu: "Menu",
  deck: "Deck",
  settings: "Settings",
  trade: "Village",
  ruin: "Ruin",
  you: "You",
  fight: "Fight",
  over: "Over",
  inn: "Inn",
  dungeon: "Delve",
};

/**
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
  let game = createGame();
  const remembered = readSave();
  if (remembered) {
    writeSaveInto(game, remembered);
    game.message = "The inn remembers you.";
  }
  let settings = loadSettings();
  /** @type {Pending | null} */
  let pending = null;
  /** @type {{ x: number, y: number, id: number } | null} */
  let origin = null;
  let sellPage = 0;

  root.classList.add("game-root");
  root.replaceChildren();

  const header = document.createElement("header");
  const phase = document.createElement("p");
  phase.className = "phase";
  const title = document.createElement("h1");
  title.textContent = "Zone 1";
  const status = document.createElement("p");
  status.className = "status";
  status.setAttribute("aria-live", "polite");
  header.append(phase, title, status);

  const stage = document.createElement("div");
  stage.id = "stage";
  stage.className = "stage";

  const pad = document.createElement("div");
  pad.className = "pad";

  const hint = document.createElement("p");
  hint.className = "hint";

  root.append(header, stage, pad, hint);

  function clearPending() {
    pending = null;
  }

  function beginAgain() {
    game = createGame();
    pending = null;
    sellPage = 0;
    draw();
  }

  const SELL_PAGE = 9;

  function sellPages() {
    return Math.max(1, Math.ceil(game.deck.length / SELL_PAGE));
  }

  function clampSellPage() {
    if (sellPage >= sellPages()) sellPage = sellPages() - 1;
    if (sellPage < 0) sellPage = 0;
  }

  /** @param {Screen} screen */
  function go(screen) {
    if (screen === "menu") play("menu");
    if (screen !== "trade") sellPage = 0;
    game.screen = screen;
    game.message = "";
    clearPending();
    draw();
  }

  function wake() {
    applyDown(game);
    play("down");
    draw();
  }

  /** @param {Dir} dir */
  function step(dir) {
    if (game.screen === "dungeon") {
      const beforeClock = game.clock;
      const moved = moveInDungeon(game, dir);
      const dungeon = game.dungeon;
      if (!moved || !dungeon) {
        game.message = "The stone does not give.";
        play("bump");
        draw();
        return;
      }
      game.message = "";
      play("step");
      const under = dungeon.cells[dungeon.y]?.[dungeon.x];
      if (under === DUNGEON.stairs) {
        game.layer = "zone";
        game.screen = "map";
        game.message = "You climb back to the plains.";
      } else if (under === DUNGEON.rubble) {
        game.screen = "ruin";
      } else {
        const kind = under ? foeKind(under) : null;
        if (kind) beginFight(game, kind, false);
      }
      noteDay(beforeClock);
      draw();
      return;
    }
    if (game.screen !== "map") return;
    const beforeClock = game.clock;
    const moved = travel(game, dir);
    if (!moved) {
      game.message = "The zone ends here.";
      play("bump");
      draw();
      return;
    }
    game.message = "";
    play("step");
    const under = tileAt(game, game.player.x, game.player.y);
    if (under === TILES.village) game.screen = "trade";
    else if (under === TILES.ruin) {
      if (!game.dungeon) game.dungeon = generateDungeon();
      game.layer = "dungeon";
      game.screen = "dungeon";
      game.message = "The dark takes the plains away.";
    } else if (under === TILES.slime) beginFight(game, "slime", false);
    else {
      game.screen = "map";
      const met = rollEncounter(game, under);
      if (met) beginFight(game, met, true);
    }
    noteDay(beforeClock);
    draw();
  }

  /** @param {string} label @param {() => void} onClick @param {boolean} [disabled] @param {string} [aria] */
  function button(label, onClick, disabled, aria) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-btn";
    btn.textContent = label;
    btn.disabled = Boolean(disabled);
    if (aria) btn.setAttribute("aria-label", aria);
    btn.addEventListener("click", onClick);
    return btn;
  }

  /** @param {HTMLElement} parent @param {string} text @param {string} [cls] */
  function line(parent, text, cls) {
    const p = document.createElement("p");
    p.className = cls ? `panel-line ${cls}` : "panel-line";
    p.textContent = text;
    parent.append(p);
  }

  function placeLine() {
    const tail = `${game.purse} coin | ${game.health} hp | ${clockLabel(game.clock)}`;
    if (game.layer === "dungeon" && game.dungeon && game.screen !== "map") {
      const under = game.dungeon.cells[game.dungeon.y]?.[game.dungeon.x] ?? DUNGEON.wall;
      return `${dungeonName(under)} | ${game.dungeon.x}, ${game.dungeon.y} | ${tail}`;
    }
    const under = tileAt(game, game.player.x, game.player.y);
    return `${groundName(under)} | ${game.player.x}, ${game.player.y} | ${tail}`;
  }

  /** @param {number} before */
  function noteDay(before) {
    if (dayOf(game.clock) === dayOf(before)) return;
    const bit = "A new day. The village sets out fresh goods.";
    game.message = game.message ? `${game.message} ${bit}` : bit;
  }

  function drawMap() {
    const map = document.createElement("div");
    map.id = "map";
    map.setAttribute("role", "img");
    map.setAttribute(
      "aria-label",
      `Zone map. You are at ${game.layer === "dungeon" && game.dungeon ? game.dungeon.x : game.player.x}, ${game.layer === "dungeon" && game.dungeon ? game.dungeon.y : game.player.y}.`,
    );
    stage.append(map);
    renderMap(map, game, stage);
  }

  function drawMenu() {
    const panel = panelEl("GAME MENU");
    panel.append(
      button("1  Deck", () => go("deck")),
      button("2  Settings", () => go("settings")),
      button("3  You", () => go("you")),
      button("0  Back", () => go(game.layer === "dungeon" ? "dungeon" : "map")),
    );
    stage.append(panel);
  }

  function drawDeck() {
    const panel = panelEl("DECK");
    line(panel, `${game.deck.length} cards | weight ${deckWeight(game.deck)} | ${game.purse} coin`, "c-yellow");
    line(panel, `Health ${game.health} / ${game.healthMax}`, "c-green");
    if (game.message) line(panel, game.message, "c-orange");
    if (game.deck.length === 0) {
      line(panel, "Your deck is empty.");
    } else {
      if (game.deckIndex >= game.deck.length) game.deckIndex = game.deck.length - 1;
      const id = game.deck[game.deckIndex];
      line(panel, `${game.deckIndex + 1} / ${game.deck.length}`, "c-dim");
      if (id) renderCard(panel, id);
      const row = document.createElement("div");
      row.className = "pair";
      row.append(
        button("[ Prev ]", () => {
          game.deckIndex = (game.deckIndex - 1 + game.deck.length) % game.deck.length;
          draw();
        }),
        button("[ Next ]", () => {
          game.deckIndex = (game.deckIndex + 1) % game.deck.length;
          draw();
        }),
      );
      panel.append(row);
      if (id && canUseInField(id)) {
        panel.append(
          button("1  Use", () => {
            game.message = useFieldCard(game, game.deckIndex).message;
            draw();
          }),
        );
      }
    }
    panel.append(button("0  Back", () => go("menu")));
    stage.append(panel);
  }

  function drawSettings() {
    const panel = panelEl("SETTINGS");
    line(panel, "Movement. One of these must stay on.", "c-dim");
    const arrowsLocked = controlLocked(settings, "arrows");
    const swipeLocked = controlLocked(settings, "swipe");
    panel.append(
      button(
        `1  On-screen arrows    ${settings.arrows ? "ON" : "OFF"}`,
        () => flip("arrows"),
        arrowsLocked,
        settings.arrows ? "On-screen arrows on" : "On-screen arrows off",
      ),
      button(
        `2  Swipe               ${settings.swipe ? "ON" : "OFF"}`,
        () => flip("swipe"),
        swipeLocked,
        settings.swipe ? "Swipe on" : "Swipe off",
      ),
      button("0  Back", () => go("menu")),
    );
    stage.append(panel);
  }

  /** @param {"arrows" | "swipe"} key */
  function flip(key) {
    const result = toggleSetting(settings, key);
    if (result.blocked) {
      game.message = "Leave one way to move.";
      draw();
      return;
    }
    settings = result.settings;
    saveSettings(settings);
    game.message = "";
    draw();
  }

  function drawTrade() {
    const panel = panelEl("VILLAGE");
    line(panel, `Purse ${game.purse} coin`, "c-yellow");
    line(panel, "Sell, then buy, to swap. Coin covers the difference.", "c-dim");
    if (game.message) line(panel, game.message, "c-orange");

    if (pending) {
      drawConfirm(panel);
      stage.append(panel);
      return;
    }

    const innKey = letterIndex("i") >= game.villageStock.length;
    panel.append(button(innKey ? "i  Inn" : "Inn", () => go("inn")));

    line(panel, "YOUR DECK", "c-white");
    if (game.deck.length === 0) line(panel, "(empty)", "c-dim");
    clampSellPage();
    const start = sellPage * SELL_PAGE;
    const page = game.deck.slice(start, start + SELL_PAGE);
    page.forEach((id, slot) => {
      const card = cardById(id);
      const index = start + slot;
      panel.append(
        button(`${slot + 1}  ${padName(card.name)} ${card.value}`, () => {
          pending = { kind: "sell", index };
          draw();
        }),
      );
    });
    if (sellPages() > 1) {
      line(panel, `Cards ${start + 1}-${start + page.length} of ${game.deck.length}. [ ] turns the page.`, "c-dim");
      const pages = document.createElement("div");
      pages.className = "pair";
      pages.append(
        button("[", () => {
          sellPage -= 1;
          clampSellPage();
          draw();
        }, sellPage === 0),
        button("]", () => {
          sellPage += 1;
          clampSellPage();
          draw();
        }, sellPage >= sellPages() - 1),
      );
      panel.append(pages);
    }

    line(panel, "VILLAGE", "c-white");
    if (game.villageStock.length === 0) line(panel, "(nothing for sale)", "c-dim");
    game.villageStock.forEach((id, index) => {
      const card = cardById(id);
      const letter = String.fromCharCode(97 + index);
      panel.append(
        button(`${letter}  ${padName(card.name)} ${card.value}`, () => {
          pending = { kind: "buy", index };
          draw();
        }),
      );
    });
    panel.append(button("0  Leave", () => go("map")));
    stage.append(panel);
  }

  function rest() {
    const result = restAtInn(game);
    game.message = result.message;
    play(result.ok ? "rest" : "bump");
    draw();
  }

  function drawInn() {
    const panel = panelEl("INN");
    line(panel, "A bed, a fire, and a book with your name.", "c-dim");
    line(panel, `Health ${game.health} / ${game.healthMax}`, "c-green");
    line(panel, `Purse ${game.purse} coin`, "c-yellow");
    line(panel, "A bed is 2 coin. It fills your health, and the inn remembers you.", "c-dim");
    if (game.message) line(panel, game.message, "c-orange");
    panel.append(button("1  Rest", () => rest()));
    panel.append(button("0  Back", () => go("trade")));
    stage.append(panel);
  }

  /** @param {HTMLElement} panel */
  function drawConfirm(panel) {
    if (!pending) return;
    if (pending.kind === "sell") {
      const id = game.deck[pending.index];
      if (!id) {
        clearPending();
        return;
      }
      const card = cardById(id);
      line(panel, `Sell ${card.name} for ${card.value} coin?`, "c-yellow");
    } else if (pending.kind === "buy") {
      const id = game.villageStock[pending.index];
      if (!id) {
        clearPending();
        return;
      }
      const card = cardById(id);
      line(panel, `Buy ${card.name} for ${card.value} coin?`, "c-yellow");
    } else {
      const id = game.deck[pending.index];
      if (!id) {
        clearPending();
        return;
      }
      line(panel, `Cast ${cardById(id).name} into the crack? It may be lost.`, "c-yellow");
    }
    const row = document.createElement("div");
    row.className = "pair";
    row.append(
      button("[ Yes ]", () => confirmPending()),
      button("[ No ]", () => {
        clearPending();
        game.message = "";
        draw();
      }),
    );
    panel.append(row);
  }

  function confirmPending() {
    if (!pending) return;
    const action = pending;
    clearPending();
    if (action.kind === "sell") game.message = sellCard(game, action.index).message;
    else if (action.kind === "buy") game.message = buyCard(game, action.index).message;
    else game.message = castIntoRuin(game, action.index).message;
    if (action.kind !== "cast") play("coin");
    else play("down");
    draw();
  }

  function drawRuin() {
    const panel = panelEl("RUIN");
    line(panel, "The floor is warm ash.", "c-dim");
    if (game.message) line(panel, game.message, "c-orange");
    if (pending?.kind === "cast") {
      drawConfirm(panel);
      stage.append(panel);
      return;
    }
    line(panel, game.ruinLoot.length ? "Something loose is still in the rubble." : "The rubble has been picked over.", "c-dim");
    panel.append(button("1  Sift the rubble", () => {
      game.message = siftRuin(game).message;
      draw();
    }));
    if (game.deck.length === 0) {
      line(panel, "You have no card to cast in.", "c-dim");
    } else {
      if (game.deckIndex >= game.deck.length) game.deckIndex = game.deck.length - 1;
      const id = game.deck[game.deckIndex];
      if (id) {
        line(panel, `In hand: ${cardById(id).name}`, "c-white");
        const row = document.createElement("div");
        row.className = "pair";
        row.append(
          button("[ Prev ]", () => {
            game.deckIndex = (game.deckIndex - 1 + game.deck.length) % game.deck.length;
            draw();
          }),
          button("[ Next ]", () => {
            game.deckIndex = (game.deckIndex + 1) % game.deck.length;
            draw();
          }),
        );
        panel.append(row);
        panel.append(
          button("2  Cast this card", () => {
            pending = { kind: "cast", index: game.deckIndex };
            draw();
          }),
        );
      }
    }
    panel.append(button("0  Leave", () => go(game.layer === "dungeon" ? "dungeon" : "map")));
    stage.append(panel);
  }

  function drawYou() {
    const panel = panelEl("YOU");
    renderPlayer(panel, game);
    line(panel, "Plains. Health is on this card, not in the deck.", "c-dim");
    if (game.message) line(panel, game.message, "c-orange");
    panel.append(button("0  Back", () => go("menu")));
    stage.append(panel);
  }

  function combatChoices() {
    return game.deck
      .map((id, index) => ({ id, index, card: cardById(id) }))
      .filter((entry) => entry.card.use !== "field");
  }

  function drawFight() {
    const fight = game.fight;
    if (!fight) {
      game.screen = game.layer === "dungeon" ? "dungeon" : "map";
      drawMap();
      return;
    }
    const panel = panelEl("FIGHT");
    renderCreature(panel, fight);
    line(panel, `You  ${hpBar(game.health, game.healthMax)}  ${game.health}`, "c-white");
    for (const entry of fight.log) line(panel, entry, "c-orange");

    if (fight.phase === "choose") {
      const choices = combatChoices();
      if (choices.length === 0) line(panel, "You have nothing that will fight.", "c-dim");
      choices.forEach((entry, number) => {
        panel.append(
          button(`${number + 1}  ${padName(entry.card.name)} ${entry.card.value}`, () => {
            playCombatCard(game, entry.index);
            play("hit");
            draw();
          }),
        );
      });
      panel.append(button("0  Flee", () => {
        fleeFight(game);
        play("bump");
        draw();
      }));
    } else if (fight.phase === "exchange") {
      panel.append(button("1  Continue", () => {
        fight.phase = "choose";
        fight.log = [];
        draw();
      }));
    } else if (fight.phase === "won") {
      line(panel, "Take one card, or leave them.", "c-dim");
      fight.deck.forEach((id, index) => {
        const card = cardById(id);
        const letter = String.fromCharCode(97 + index);
        panel.append(
          button(`${letter}  ${padName(card.name)} ${card.value}`, () => {
            claimSpoil(game, index);
            draw();
          }),
        );
      });
      panel.append(button("0  Leave them", () => {
        claimSpoil(game, -1);
        draw();
      }));
    } else {
      panel.append(button("1  Wake", () => wake()));
    }
    stage.append(panel);
  }

  /** @param {string} heading */
  function panelEl(heading) {
    const panel = document.createElement("div");
    panel.className = "panel";
    const rule = document.createElement("p");
    rule.className = "panel-line c-orange";
    rule.textContent = "=========================";
    const h = document.createElement("p");
    h.className = "panel-line c-yellow";
    h.textContent = heading;
    panel.append(rule, h);
    return panel;
  }

  function drawPad() {
    pad.replaceChildren();
    if (game.screen !== "map" && game.screen !== "dungeon") {
      pad.hidden = true;
      return;
    }
    pad.hidden = false;
    if (settings.arrows) {
      const grid = document.createElement("div");
      grid.className = "cross";
      grid.append(
        arrow("n", "[ N ]", "North"),
        arrow("w", "[ W ]", "West"),
        arrow("s", "[ S ]", "South"),
        arrow("e", "[ E ]", "East"),
      );
      pad.append(grid);
    }
    pad.append(button("[ Menu ]", () => go("menu"), false, "Open menu"));
  }

  /**
   * @param {Dir} dir
   * @param {string} label
   * @param {string} aria
   */
  function arrow(dir, label, aria) {
    const btn = button(label, () => step(dir), false, aria);
    btn.classList.add("arrow", dir);
    return btn;
  }

  function drawHint() {
    if (game.screen === "map" || game.screen === "dungeon") {
      const move =
        settings.swipe && settings.arrows
          ? "Swipe, or tap an arrow. One square."
          : settings.swipe
            ? "Swipe to move one square."
            : "Tap an arrow to move one square.";
      hint.textContent = game.screen === "dungeon" ? `${move} < climbs out. * is the rubble.` : move;
      return;
    }
    if (game.screen === "menu") hint.textContent = "Deck, you, settings, or back to the map.";
    else if (game.screen === "deck") hint.textContent = "Trail bread can be used from here.";
    else if (game.screen === "settings") hint.textContent = "Remembered on this phone.";
    else if (game.screen === "trade") hint.textContent = "Leave when you are done. The inn keeps a bed.";
    else if (game.screen === "inn") hint.textContent = "A bed is 2 coin. Resting is the save.";
    else if (game.screen === "you") hint.textContent = "This card is you. The deck is what you carry.";
    else if (game.screen === "fight") hint.textContent = "Strike the creature card, or flee and take one hit.";
    else if (game.screen === "ruin" && game.layer === "dungeon") hint.textContent = "Sift or cast, then leave. You are still in the ruin.";
    else if (game.screen === "over") hint.textContent = "The trip is over. Nothing was saved.";
    else hint.textContent = "Step off the ruin when you are done.";
  }

  function drawOver() {
    const panel = panelEl("GAME OVER");
    line(panel, game.message || "No coin, and nothing left to carry.", "c-red");
    line(panel, "Nothing was saved. The plains start over.", "c-dim");
    panel.append(button("1  Begin again", () => beginAgain()));
    stage.append(panel);
  }

  function draw() {
    phase.textContent = PHASE[game.screen];
    title.textContent = game.layer === "dungeon" ? "Ruin" : "Zone 1";
    root.dataset.watch = watchName(game.clock);
    status.textContent = game.message || placeLine();
    const onGround = game.screen === "map" || game.screen === "dungeon";
    stage.classList.toggle("is-map", onGround);
    stage.replaceChildren();
    if (onGround) drawMap();
    else if (game.screen === "menu") drawMenu();
    else if (game.screen === "deck") drawDeck();
    else if (game.screen === "settings") drawSettings();
    else if (game.screen === "trade") drawTrade();
    else if (game.screen === "inn") drawInn();
    else if (game.screen === "you") drawYou();
    else if (game.screen === "fight") drawFight();
    else if (game.screen === "over") drawOver();
    else drawRuin();
    drawPad();
    drawHint();
    root.dataset.screen = game.screen;
    root.dataset.x = String(game.player.x);
    root.dataset.y = String(game.player.y);
    root.dataset.purse = String(game.purse);
    root.dataset.cards = String(game.deck.length);
    root.dataset.health = String(game.health);
  }

  /** @param {string} key */
  function onFightKey(key) {
    const fight = game.fight;
    if (!fight) return;
    if (fight.phase === "choose") {
      if (key === "0" || key === "Escape") {
        fleeFight(game);
        play("bump");
        draw();
        return;
      }
      const digit = Number(key);
      const choices = combatChoices();
      if (digit >= 1 && digit <= choices.length) {
        const choice = choices[digit - 1];
        if (choice) {
          playCombatCard(game, choice.index);
          play("hit");
        }
        draw();
      }
      return;
    }
    if (fight.phase === "exchange") {
      if (key === "1" || key === "Enter" || key === "Escape") {
        fight.phase = "choose";
        fight.log = [];
        draw();
      }
      return;
    }
    if (fight.phase === "won") {
      if (key === "0" || key === "Escape") {
        claimSpoil(game, -1);
        draw();
        return;
      }
      const letter = letterIndex(key);
      if (letter >= 0 && letter < fight.deck.length) {
        claimSpoil(game, letter);
        draw();
      }
      return;
    }
    if (key === "1" || key === "Enter" || key === "0" || key === "Escape") {
      wake();
    }
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    unlockAudio();
    if (game.screen === "over") {
      if (event.key === "1" || event.key === "Enter") {
        event.preventDefault();
        beginAgain();
      }
      return;
    }
    if (game.screen === "map" || game.screen === "dungeon") {
      const dir = KEYS[event.key];
      if (dir) {
        event.preventDefault();
        step(dir);
        return;
      }
      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        go("menu");
      }
      return;
    }

    if (event.key === "Escape" || event.key === "0") {
      event.preventDefault();
      if (game.screen === "fight") {
        onFightKey("0");
        return;
      }
      if (pending) {
        clearPending();
        game.message = "";
        draw();
        return;
      }
      if (game.screen === "deck" || game.screen === "settings" || game.screen === "you") go("menu");
      else if (game.screen === "inn") go("trade");
      else if ((game.screen === "menu" || game.screen === "ruin") && game.layer === "dungeon") go("dungeon");
      else go("map");
      return;
    }

    if (game.screen === "menu") {
      if (event.key === "1") go("deck");
      else if (event.key === "2") go("settings");
      else if (event.key === "3") go("you");
      return;
    }

    if (game.screen === "settings") {
      if (event.key === "1") flip("arrows");
      else if (event.key === "2") flip("swipe");
      return;
    }

    if (game.screen === "deck") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (game.deck.length) game.deckIndex = (game.deckIndex - 1 + game.deck.length) % game.deck.length;
        draw();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (game.deck.length) game.deckIndex = (game.deckIndex + 1) % game.deck.length;
        draw();
      } else if (event.key === "1") {
        const id = game.deck[game.deckIndex];
        if (id && canUseInField(id)) {
          game.message = useFieldCard(game, game.deckIndex).message;
          draw();
        }
      }
      return;
    }

    if (game.screen === "fight") {
      onFightKey(event.key);
      return;
    }

    if (pending && (event.key === "y" || event.key === "Y" || event.key === "Enter")) {
      event.preventDefault();
      confirmPending();
      return;
    }
    if (pending && (event.key === "n" || event.key === "N")) {
      clearPending();
      game.message = "";
      draw();
      return;
    }

    if (game.screen === "inn") {
      if (event.key === "1") rest();
      return;
    }

    if (game.screen === "trade" && !pending) {
      if ((event.key === "i" || event.key === "I") && letterIndex("i") >= game.villageStock.length) {
        go("inn");
        return;
      }
      if (event.key === "[") {
        sellPage -= 1;
        clampSellPage();
        draw();
        return;
      }
      if (event.key === "]") {
        sellPage += 1;
        clampSellPage();
        draw();
        return;
      }
      const digit = Number(event.key);
      if (event.key.length === 1 && digit >= 1 && digit <= SELL_PAGE) {
        const index = sellPage * SELL_PAGE + digit - 1;
        if (index < game.deck.length) {
          pending = { kind: "sell", index };
          draw();
        }
        return;
      }
      const letter = letterIndex(event.key);
      if (letter >= 0 && letter < game.villageStock.length) {
        pending = { kind: "buy", index: letter };
        draw();
      }
      return;
    }

    if (game.screen === "ruin" && !pending) {
      if (event.key === "1") {
        game.message = siftRuin(game).message;
        draw();
      } else if (event.key === "2" && game.deck.length) {
        pending = { kind: "cast", index: game.deckIndex };
        draw();
      } else if (event.key === "ArrowLeft" && game.deck.length) {
        event.preventDefault();
        game.deckIndex = (game.deckIndex - 1 + game.deck.length) % game.deck.length;
        draw();
      } else if (event.key === "ArrowRight" && game.deck.length) {
        event.preventDefault();
        game.deckIndex = (game.deckIndex + 1) % game.deck.length;
        draw();
      }
    }
  }

  /** @param {PointerEvent} event */
  function onPointerDown(event) {
    unlockAudio();
    if ((game.screen !== "map" && game.screen !== "dungeon") || !settings.swipe) return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers refuse capture. The swipe math does not need it.
    }
  }

  /** @param {PointerEvent} event */
  function onPointerUp(event) {
    if (!origin || origin.id !== event.pointerId) return;
    const dir = directionFromSwipe(event.clientX - origin.x, event.clientY - origin.y);
    origin = null;
    if (dir) step(dir);
  }

  const ac = new AbortController();
  const listen = { signal: ac.signal };
  window.addEventListener("keydown", onKey, listen);
  stage.addEventListener("pointerdown", onPointerDown, listen);
  stage.addEventListener("pointerup", onPointerUp, listen);
  stage.addEventListener("pointercancel", () => {
    origin = null;
  }, listen);

  const observer = new ResizeObserver(() => {
    if (game.screen === "map" || game.screen === "dungeon") draw();
  });
  observer.observe(stage);

  draw();

  return () => {
    ac.abort();
    observer.disconnect();
  };
}

/** @param {string} key */
function letterIndex(key) {
  if (key.length !== 1) return -1;
  const code = key.toLowerCase().charCodeAt(0);
  if (code < 97 || code > 122) return -1;
  return code - 97;
}

/** @param {string} name */
function padName(name) {
  const cut = name.length > 16 ? name.slice(0, 16) : name;
  return cut.padEnd(16, " ");
}
