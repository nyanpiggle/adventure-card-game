import { buyCard, canUseInField, cardById, castIntoRuin, deckWeight, sellCard, siftRuin, useFieldCard } from "./cards.js";
import { applyDown, beginFight, claimSpoil, fleeFight, hpBar, playCombatCard, rollEncounter } from "./combat.js";
import { KEYS, directionFromSwipe } from "./direction.js";
import { TILES, createGame, groundName, tileAt, travel } from "./game.js";
import { renderCard, renderCreature, renderMap, renderPlayer } from "./render.js";
import { controlLocked, loadSettings, saveSettings, toggleSetting } from "./settings.js";

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
};

/**
 * @param {HTMLElement} root
 * @returns {() => void}
 */
export function mount(root) {
  const game = createGame();
  let settings = loadSettings();
  /** @type {Pending | null} */
  let pending = null;
  /** @type {{ x: number, y: number, id: number } | null} */
  let origin = null;

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

  /** @param {Screen} screen */
  function go(screen) {
    game.screen = screen;
    game.message = "";
    clearPending();
    draw();
  }

  /** @param {Dir} dir */
  function step(dir) {
    if (game.screen !== "map") return;
    const moved = travel(game, dir);
    if (!moved) {
      game.message = "The zone ends here.";
      draw();
      return;
    }
    game.message = "";
    const under = tileAt(game, game.player.x, game.player.y);
    if (under === TILES.village) game.screen = "trade";
    else if (under === TILES.ruin) game.screen = "ruin";
    else if (under === TILES.slime) beginFight(game, "slime", false);
    else {
      game.screen = "map";
      const met = rollEncounter(game, under);
      if (met) beginFight(game, met, true);
    }
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
    const under = tileAt(game, game.player.x, game.player.y);
    return `${groundName(under)} · ${game.player.x}, ${game.player.y} · ${game.purse} coin · ${game.health} hp`;
  }

  function drawMap() {
    const map = document.createElement("div");
    map.id = "map";
    map.setAttribute("role", "img");
    map.setAttribute(
      "aria-label",
      `Zone map. You are at ${game.player.x}, ${game.player.y}.`,
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
      button("0  Back", () => go("map")),
    );
    stage.append(panel);
  }

  function drawDeck() {
    const panel = panelEl("DECK");
    line(panel, `${game.deck.length} cards · weight ${deckWeight(game.deck)} · ${game.purse} coin`, "c-yellow");
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

    line(panel, "YOUR DECK", "c-white");
    if (game.deck.length === 0) line(panel, "(empty)", "c-dim");
    game.deck.forEach((id, index) => {
      const card = cardById(id);
      panel.append(
        button(`${index + 1}  ${padName(card.name)} ${card.value}`, () => {
          pending = { kind: "sell", index };
          draw();
        }),
      );
    });

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
    panel.append(button("0  Leave", () => go("map")));
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
      game.screen = "map";
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
            draw();
          }),
        );
      });
      panel.append(button("0  Flee", () => {
        fleeFight(game);
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
      panel.append(button("1  Wake", () => {
        applyDown(game);
        draw();
      }));
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
    if (game.screen !== "map") {
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
    if (game.screen === "map") {
      if (settings.swipe && settings.arrows) hint.textContent = "Swipe, or tap an arrow. One square.";
      else if (settings.swipe) hint.textContent = "Swipe to move one square.";
      else hint.textContent = "Tap an arrow to move one square.";
      return;
    }
    if (game.screen === "menu") hint.textContent = "Deck, you, settings, or back to the map.";
    else if (game.screen === "deck") hint.textContent = "Trail bread can be used from here.";
    else if (game.screen === "settings") hint.textContent = "Remembered on this phone.";
    else if (game.screen === "trade") hint.textContent = "Leave when you are done. Step back onto V to return.";
    else if (game.screen === "you") hint.textContent = "This card is you. The deck is what you carry.";
    else if (game.screen === "fight") hint.textContent = "Strike the creature card, or flee and take one hit.";
    else hint.textContent = "Step off the ruin when you are done.";
  }

  function draw() {
    phase.textContent = PHASE[game.screen];
    status.textContent = game.screen === "map" ? game.message || placeLine() : game.message || placeLine();
    stage.classList.toggle("is-map", game.screen === "map");
    stage.replaceChildren();
    if (game.screen === "map") drawMap();
    else if (game.screen === "menu") drawMenu();
    else if (game.screen === "deck") drawDeck();
    else if (game.screen === "settings") drawSettings();
    else if (game.screen === "trade") drawTrade();
    else if (game.screen === "you") drawYou();
    else if (game.screen === "fight") drawFight();
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
        draw();
        return;
      }
      const digit = Number(key);
      const choices = combatChoices();
      if (digit >= 1 && digit <= choices.length) {
        const choice = choices[digit - 1];
        if (choice) playCombatCard(game, choice.index);
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
      const letter = key.toLowerCase().charCodeAt(0) - 97;
      if (letter >= 0 && letter < fight.deck.length) {
        claimSpoil(game, letter);
        draw();
      }
      return;
    }
    if (key === "1" || key === "Enter" || key === "0" || key === "Escape") {
      applyDown(game);
      draw();
    }
  }

  /** @param {KeyboardEvent} event */
  function onKey(event) {
    if (game.screen === "map") {
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

    if (game.screen === "trade" && !pending) {
      const digit = Number(event.key);
      if (digit >= 1 && digit <= game.deck.length) {
        pending = { kind: "sell", index: digit - 1 };
        draw();
        return;
      }
      const letter = event.key.toLowerCase().charCodeAt(0) - 97;
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
    if (game.screen !== "map" || !settings.swipe) return;
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
    if (game.screen === "map") draw();
  });
  observer.observe(stage);

  draw();

  return () => {
    ac.abort();
    observer.disconnect();
  };
}

/** @param {string} name */
function padName(name) {
  const cut = name.length > 16 ? name.slice(0, 16) : name;
  return cut.padEnd(16, " ");
}
