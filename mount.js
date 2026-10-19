import { BODY, buyCard, canUseInField, cardById, castIntoRuin, craftSlots, creatureById, deckWeight, isCraftedId, placeFieldHeal, sellCard, sellPayout, siftRuin, uncraftCard } from "./cards.js";
import { applyDown, beginFight, claimSpoil, fleeFight, playCombatCard, rollEncounter } from "./combat.js";
import { DUNGEON, dungeonName, foeKind, generateDungeon, moveInDungeon } from "./dungeon.js";
import { KEYS, directionFromSwipe } from "./direction.js";
import { TILES, createGame, groundName, tileAt, travel } from "./game.js";
import { renderCard, renderCreature, renderHitbox, renderMap, renderPlayer } from "./render.js";
import { controlLocked, loadSettings, saveSettings, toggleSetting } from "./settings.js";
import { clearSave, readSave, restAtInn, savePresent, writeSaveInto } from "./save.js";
import { centerAnchor, clampAnchor, maskFromLines, pictureLines, rotateMask, stampCovers } from "./shapes.js";
import { play, unlockAudio } from "./sound.js";
import { advanceTime, clockLabel, dayOf, watchName } from "./time.js";

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
  craft: "Craft",
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
  let forgetting = false;
  /** @type {{ a: number | null, b: number | null, c: number | null }} */
  let bench = { a: null, b: null, c: null };
  /** @type {null | "a" | "b" | "c" | "uncraft"} */
  let craftPick = null;
  /** @type {{ mode: "fight" | "heal", index: number, rot: number, ar: number, ac: number } | null} */
  let aim = null;
  /** @type {{ id: number, moved: boolean } | null} */
  let drag = null;
  let skipClick = false;

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
    aim = null;
    drag = null;
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
    forgetting = false;
    if (screen !== "craft") {
      craftPick = null;
      bench = { a: null, b: null, c: null };
    } else {
      craftPick = null;
    }
    aim = null;
    drag = null;
    clearFloater();
    game.screen = screen;
    game.message = "";
    clearPending();
    draw();
  }

  function forgetSave() {
    clearSave();
    forgetting = false;
    beginAgain();
    game.message = "The inn has forgotten you.";
    draw();
  }

  function wake() {
    applyDown(game);
    play("down");
    draw();
  }

  function waitWatch() {
    const before = game.clock;
    advanceTime(game, 1);
    game.message = `You wait. It is ${clockLabel(game.clock)}.`;
    noteDay(before);
    play("wait");
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
    play("bell");
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
    if (game.message) line(panel, game.message, "c-orange");
    if (forgetting) {
      line(panel, "Clear the save and start the zone over?", "c-yellow");
      line(panel, "Settings stay. The inn will not remember this.", "c-dim");
      panel.append(
        button("y  Yes", () => forgetSave()),
        button("n  No", () => {
          forgetting = false;
          game.message = "";
          draw();
        }),
      );
      stage.append(panel);
      return;
    }
    const remembered = savePresent();
    panel.append(
      button("1  Deck", () => go("deck")),
      button("2  Craft", () => go("craft")),
      button("3  You", () => go("you")),
      button("4  Settings", () => go("settings")),
      button(
        "5  Clear the save",
        () => {
          if (!savePresent()) {
            game.message = "The inn remembers nothing.";
            draw();
            return;
          }
          forgetting = true;
          game.message = "";
          draw();
        },
        !remembered,
      ),
      button("0  Back", () => go(game.layer === "dungeon" ? "dungeon" : "map")),
    );
    if (!remembered) line(panel, "The inn remembers nothing.", "c-dim");
    stage.append(panel);
  }

  function youBody() {
    return maskFromLines(BODY.you);
  }

  function aimStamp() {
    if (!aim) return null;
    const id = game.deck[aim.index];
    if (!id) return null;
    const card = cardById(id);
    if (!card.shape) return null;
    return rotateMask(maskFromLines(card.shape), aim.rot);
  }

  function aimBody() {
    if (aim?.mode === "fight" && game.fight) return maskFromLines(creatureById(game.fight.creatureId).shape);
    return youBody();
  }

  /** @param {number} ar @param {number} ac */
  function moveAim(ar, ac) {
    if (!aim) return;
    const stamp = aimStamp();
    if (!stamp) return;
    const spot = clampAnchor(aimBody(), stamp, ar, ac);
    aim.ar = spot.ar;
    aim.ac = spot.ac;
  }

  function centerAim() {
    if (!aim) return;
    const stamp = aimStamp();
    if (!stamp) return;
    const spot = centerAnchor(aimBody(), stamp);
    aim.ar = spot.ar;
    aim.ac = spot.ac;
  }

  /** @param {import("./game.js").Dir} dir */
  function nudgeAim(dir) {
    if (!aim) return;
    const step = { n: [-1, 0], s: [1, 0], w: [0, -1], e: [0, 1] }[dir];
    if (!step) return;
    moveAim(aim.ar + step[0], aim.ac + step[1]);
    draw();
  }

  function rotateAim() {
    if (!aim) return;
    aim.rot = (aim.rot + 1) % 4;
    moveAim(aim.ar, aim.ac);
    draw();
  }

  /** @param {number} x @param {number} y */
  function moveFloater(x, y) {
    const stamp = aimStamp();
    if (!stamp) return;
    let el = document.getElementById("stamp-float");
    if (!el) {
      el = document.createElement("pre");
      el.id = "stamp-float";
      el.className = "stamp-float";
      root.append(el);
    }
    el.textContent = stamp.map((row) => row.map((on) => (on ? "#" : " ")).join("")).join("\n");
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function clearFloater() {
    document.getElementById("stamp-float")?.remove();
  }

  function paintGhost() {
    if (!aim) return;
    const stamp = aimStamp();
    const who = aim.mode === "heal" ? "you" : "foe";
    const box = stage.querySelector(`[data-hitbox="${who}"]`);
    if (!box || !stamp) return;
    box.querySelectorAll("[data-r]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const r = Number(node.dataset.r);
      const c = Number(node.dataset.c);
      const covered = stampCovers(stamp, aim.ar, aim.ac, r, c);
      node.classList.toggle("ghost", covered);
      if (node.classList.contains("margin")) node.textContent = covered ? "#" : ".";
    });
  }

  /** @param {number} index */
  function armFight(index) {
    const id = game.deck[index];
    const fight = game.fight;
    if (!id || !fight) return;
    const card = cardById(id);
    const creature = creatureById(fight.creatureId);
    if (card.tags.includes("metal") && creature.tags.includes("acid")) {
      playCombatCard(game, index, null);
      aim = null;
      play("hit");
      draw();
      return;
    }
    if (!card.shape) return;
    aim = { mode: "fight", index, rot: 0, ar: 0, ac: 0 };
    centerAim();
    draw();
  }

  function commitStrike() {
    if (!aim || aim.mode !== "fight" || !game.fight) return;
    const place = { rot: aim.rot, ar: aim.ar, ac: aim.ac };
    const index = aim.index;
    aim = null;
    clearFloater();
    playCombatCard(game, index, place);
    play("hit");
    draw();
  }

  function commitHeal() {
    if (!aim || aim.mode !== "heal") return;
    const result = placeFieldHeal(game, aim.index, aim.rot, aim.ar, aim.ac);
    game.message = result.message;
    if (result.ok) aim = null;
    play(result.ok ? "coin" : "bump");
    draw();
  }

  /**
   * Drag a combat card onto the foe hitbox. A tap only arms it.
   * @param {HTMLButtonElement} btn
   * @param {number} index
   */
  function watchCardDrag(btn, index) {
    /** @type {{ x: number, y: number } | null} */
    let start = null;
    btn.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const id = game.deck[index];
      if (!id || !game.fight) return;
      const card = cardById(id);
      if (!card.shape) return;
      const same = aim?.mode === "fight" && aim.index === index;
      aim = {
        mode: "fight",
        index,
        rot: same ? aim.rot : 0,
        ar: same ? aim.ar : 0,
        ac: same ? aim.ac : 0,
      };
      if (same) moveAim(aim.ar, aim.ac);
      else centerAim();
      start = { x: event.clientX, y: event.clientY };
      drag = { id: event.pointerId, moved: false };
      skipClick = false;
      try {
        btn.setPointerCapture(event.pointerId);
      } catch {
        // Capture can fail. Moves still arrive while the pointer stays on the button.
      }
    });
    btn.addEventListener("pointermove", (event) => {
      if (!drag || drag.id !== event.pointerId || !aim || !start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) drag.moved = true;
      if (!drag.moved) return;
      moveFloater(event.clientX, event.clientY);
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const cell = under instanceof Element ? under.closest("[data-r]") : null;
      if (!(cell instanceof HTMLElement) || cell.dataset.r == null || cell.dataset.c == null) return;
      if (cell.closest("[data-hitbox]")?.getAttribute("data-hitbox") !== "foe") return;
      moveAim(Number(cell.dataset.r), Number(cell.dataset.c));
      paintGhost();
    });
    btn.addEventListener("pointerup", (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const moved = drag.moved;
      drag = null;
      start = null;
      clearFloater();
      if (!moved) return;
      skipClick = true;
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const onFoe = under instanceof Element && under.closest("[data-hitbox='foe']");
      if (onFoe) commitStrike();
      else draw();
    });
  }

  function drawDeck() {
    const panel = panelEl("DECK");
    line(panel, `${game.deck.length} cards | weight ${deckWeight(game.deck)} | ${game.purse} coin`, "c-yellow");
    line(panel, `Health ${game.health} / ${game.healthMax}`, "c-green");
    for (const row of pictureLines(youBody(), game.cells)) line(panel, row, "c-green");
    if (game.message) line(panel, game.message, "c-orange");
    if (aim?.mode === "heal") {
      const stamp = aimStamp();
      line(panel, "Lay the shape on hurt cells. R turns it.", "c-dim");
      renderHitbox(
        panel,
        youBody(),
        game.cells,
        stamp ? { mask: stamp, ar: aim.ar, ac: aim.ac } : null,
        "you",
        (r, c, event) => {
          event.preventDefault();
          moveAim(r, c);
          paintGhost();
        },
        (r, c, event) => {
          if (event.buttons !== 1) return;
          moveAim(r, c);
          paintGhost();
        },
        stamp ? Math.max(stamp.length, stamp[0]?.length ?? 0) - 1 : 0,
      );
      panel.append(
        button("R  Turn", () => rotateAim()),
        button("1  Place", () => commitHeal()),
        button("0  Cancel", () => {
          aim = null;
          game.message = "";
          draw();
        }),
      );
      stage.append(panel);
      return;
    }
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
            if (game.health >= game.healthMax) {
              game.message = "You are already well.";
              draw();
              return;
            }
            aim = { mode: "heal", index: game.deckIndex, rot: 0, ar: 0, ac: 0 };
            centerAim();
            game.message = "";
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
        button(`${slot + 1}  ${padName(card.name)} ${sellPayout(card.value)}`, () => {
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
    const before = dayOf(game.clock);
    const result = restAtInn(game);
    game.message = result.message;
    if (result.ok && dayOf(game.clock) !== before) play("bell");
    play(result.ok ? "rest" : "bump");
    draw();
  }

  function drawInn() {
    const panel = panelEl("INN");
    line(panel, "A bed, a fire, and a book with your name.", "c-dim");
    line(panel, `Health ${game.health} / ${game.healthMax}`, "c-green");
    for (const row of pictureLines(youBody(), game.cells)) line(panel, row, "c-green");
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
      const payout = sellPayout(card.value);
      const kept = card.value - payout;
      line(panel, `Sell ${card.name} for ${payout} coin? The village keeps ${kept}.`, "c-yellow");
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

  function passWatch() {
    const before = game.clock;
    advanceTime(game, 1);
    noteDay(before);
  }

  function confirmPending() {
    if (!pending) return;
    const action = pending;
    clearPending();
    const result =
      action.kind === "sell"
        ? sellCard(game, action.index)
        : action.kind === "buy"
          ? buyCard(game, action.index)
          : castIntoRuin(game, action.index);
    game.message = result.message;
    if (result.ok) passWatch();
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
      const result = siftRuin(game);
      game.message = result.message;
      if (result.ok) passWatch();
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
    if (game.message) line(panel, game.message, "c-orange");
    panel.append(button("0  Back", () => go("menu")));
    stage.append(panel);
  }

  /** @param {"a" | "b" | "c"} except */
  function benchTaken(except) {
    /** @type {Set<number>} */
    const used = new Set();
    for (const key of /** @type {const} */ (["a", "b", "c"])) {
      if (key === except) continue;
      const index = bench[key];
      if (index != null) used.add(index);
    }
    return used;
  }

  /**
   * @param {"a" | "b" | "c" | null} except
   */
  function freeCards(except) {
    const used = except ? benchTaken(except) : new Set();
    return game.deck
      .map((id, index) => ({ id, index }))
      .filter((entry) => !used.has(entry.index));
  }

  /** @param {"a" | "b" | "c"} key */
  function slotName(key) {
    const index = bench[key];
    if (index == null) return "(empty)";
    const id = game.deck[index];
    return id ? cardById(id).name : "(empty)";
  }

  function doCraft() {
    if (bench.a == null || bench.b == null || bench.c == null) {
      game.message = "A slot is empty.";
      play("bump");
      draw();
      return;
    }
    const result = craftSlots(game, bench.a, bench.b, bench.c);
    game.message = result.message;
    if (result.ok) {
      bench = { a: null, b: null, c: null };
      passWatch();
      play("coin");
    } else {
      play("bump");
    }
    draw();
  }

  /** @param {HTMLElement} panel @param {"a" | "b" | "c"} key */
  function drawCraftPick(panel, key) {
    const choices = freeCards(key);
    if (choices.length === 0) line(panel, "Nothing left to set.", "c-dim");
    choices.slice(0, 26).forEach((entry, letter) => {
      const mark = String.fromCharCode(97 + letter);
      panel.append(
        button(`${mark}  ${cardById(entry.id).name}`, () => {
          bench[key] = entry.index;
          craftPick = null;
          game.message = "";
          draw();
        }),
      );
    });
    panel.append(button("0  Back", () => {
      craftPick = null;
      draw();
    }));
    stage.append(panel);
  }

  /** @param {HTMLElement} panel */
  function drawUncraft(panel) {
    const made = game.deck
      .map((id, index) => ({ id, index }))
      .filter((entry) => isCraftedId(entry.id));
    if (made.length === 0) line(panel, "You have nothing crafted.", "c-dim");
    made.slice(0, 26).forEach((entry, letter) => {
      const mark = String.fromCharCode(97 + letter);
      panel.append(
        button(`${mark}  ${cardById(entry.id).name}`, () => {
          const result = uncraftCard(game, entry.index);
          game.message = result.message;
          bench = { a: null, b: null, c: null };
          craftPick = null;
          play(result.ok ? "coin" : "bump");
          draw();
        }),
      );
    });
    panel.append(button("0  Back", () => {
      craftPick = null;
      draw();
    }));
    stage.append(panel);
  }

  function drawCraft() {
    const panel = panelEl(craftPick === "uncraft" ? "UNCRAFT" : craftPick ? "CHOOSE" : "CRAFT");
    if (game.message) line(panel, game.message, "c-orange");
    if (craftPick === "a" || craftPick === "b" || craftPick === "c") {
      drawCraftPick(panel, craftPick);
      return;
    }
    if (craftPick === "uncraft") {
      drawUncraft(panel);
      return;
    }
    line(panel, "Two reagents, and a catalyst. The catalyst comes back.", "c-dim");
    panel.append(
      button(`1  Reagent   ${slotName("a")}`, () => {
        craftPick = "a";
        game.message = "";
        draw();
      }),
      button(`2  Reagent   ${slotName("b")}`, () => {
        craftPick = "b";
        game.message = "";
        draw();
      }),
      button(`3  Catalyst  ${slotName("c")}`, () => {
        craftPick = "c";
        game.message = "";
        draw();
      }),
      button("4  Craft", () => doCraft()),
      button("5  Uncraft", () => {
        craftPick = "uncraft";
        game.message = "";
        draw();
      }),
      button("0  Back", () => go("menu")),
    );
    stage.append(panel);
  }

  function combatChoices() {
    return game.deck
      .map((id, index) => ({ id, index, card: cardById(id) }))
      .filter((entry) => entry.card.use !== "field");
  }

  /** Room around the body so a stamp can hang off the top and the left. */
  function foePad() {
    let n = 0;
    for (const entry of combatChoices()) {
      const shape = entry.card.shape;
      if (!shape) continue;
      const width = shape.reduce((max, row) => Math.max(max, row.length), 0);
      n = Math.max(n, shape.length - 1, width - 1);
    }
    return n;
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
    const foeBody = maskFromLines(creatureById(fight.creatureId).shape);
    const stamp = aim?.mode === "fight" ? aimStamp() : null;
    renderHitbox(
      panel,
      foeBody,
      fight.cells,
      stamp ? { mask: stamp, ar: aim?.ar ?? 0, ac: aim?.ac ?? 0 } : null,
      "foe",
      (r, c, event) => {
        if (!aim || aim.mode !== "fight") return;
        event.preventDefault();
        moveAim(r, c);
        paintGhost();
      },
      (r, c, event) => {
        if (!aim || aim.mode !== "fight" || event.buttons !== 1) return;
        moveAim(r, c);
        paintGhost();
      },
      fight.phase === "choose" ? foePad() : 0,
    );
    line(panel, `You  ${game.health} / ${game.healthMax}`, "c-white");
    renderHitbox(panel, youBody(), game.cells, null, "you");
    for (const entry of fight.log) line(panel, entry, "c-orange");

    if (fight.phase === "choose") {
      if (aim?.mode === "fight") {
        const armed = game.deck[aim.index];
        const name = armed ? cardById(armed).name : "That card";
        line(panel, `${name}. R turns it. Drop it on them, or Strike.`, "c-dim");
        panel.append(
          button("R  Turn", () => rotateAim()),
          button("Strike", () => commitStrike()),
          button("X  Put it down", () => {
            aim = null;
            draw();
          }),
        );
      }
      const choices = combatChoices();
      if (choices.length === 0) line(panel, "You have nothing that will fight.", "c-dim");
      choices.forEach((entry, number) => {
        const btn = button(`${number + 1}  ${padName(entry.card.name)} harm ${entry.card.damage}`, () => {
          if (skipClick) {
            skipClick = false;
            return;
          }
          armFight(entry.index);
        });
        watchCardDrag(btn, entry.index);
        panel.append(btn);
      });
      panel.append(button("0  Flee", () => {
        aim = null;
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
    pad.append(button("[ . ]", () => waitWatch(), false, "Wait"));
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
      hint.textContent = game.screen === "dungeon" ? `${move} < climbs out. * is the rubble. . waits.` : `${move} . waits.`;
      return;
    }
    if (game.screen === "menu") hint.textContent = forgetting
      ? "Yes forgets the inn and starts the zone over."
      : "Deck, craft, you, settings, or clear the save.";
    else if (game.screen === "deck") hint.textContent = aim?.mode === "heal"
      ? "Drag the shape onto hurt cells. R turns it. Place eats the card."
      : "Bread, herbs, and a potion can be laid on hurt cells.";
    else if (game.screen === "craft") {
      hint.textContent = craftPick === "uncraft"
        ? "A made card comes apart into its reagents."
        : craftPick
          ? "Choose a card from the deck."
          : "The catalyst is not used up.";
    }
    else if (game.screen === "settings") hint.textContent = "Remembered on this phone.";
    else if (game.screen === "trade") hint.textContent = "Leave when you are done. The inn keeps a bed.";
    else if (game.screen === "inn") hint.textContent = "A bed is 2 coin. Resting is the save.";
    else if (game.screen === "you") hint.textContent = "This card is you.";
    else if (game.screen === "fight") hint.textContent = "Drag a card onto the hitbox. R turns it. 0 flees and takes one hit.";
    else if (game.screen === "ruin" && game.layer === "dungeon") hint.textContent = "Sift or cast, then leave. You are still in the ruin.";
    else if (game.screen === "over") hint.textContent = "The trip is over. Nothing was saved.";
    else hint.textContent = "Step off the ruin when you are done.";
  }

  function drawOver() {
    const panel = panelEl("GAME OVER");
    line(panel, game.message || "You go down. The inn does not remember you.", "c-red");
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
    else if (game.screen === "craft") drawCraft();
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
        aim = null;
        fleeFight(game);
        play("bump");
        draw();
        return;
      }
      if (aim?.mode === "fight") {
        const dir = KEYS[key];
        if (dir) {
          nudgeAim(dir);
          return;
        }
        if (key === "r" || key === "R") {
          rotateAim();
          return;
        }
        if (key === "Enter") {
          commitStrike();
          return;
        }
        if (key === "x" || key === "X") {
          aim = null;
          draw();
          return;
        }
      }
      const digit = Number(key);
      const choices = combatChoices();
      if (digit >= 1 && digit <= choices.length) {
        const choice = choices[digit - 1];
        if (choice) armFight(choice.index);
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
        return;
      }
      if (event.key === ".") {
        event.preventDefault();
        waitWatch();
      }
      return;
    }

    if (event.key === "Escape" || event.key === "0") {
      event.preventDefault();
      if (game.screen === "fight") {
        onFightKey("0");
        return;
      }
      if (aim?.mode === "heal") {
        aim = null;
        game.message = "";
        draw();
        return;
      }
      if (pending) {
        clearPending();
        game.message = "";
        draw();
        return;
      }
      if (forgetting) {
        forgetting = false;
        game.message = "";
        draw();
        return;
      }
      if (game.screen === "craft" && craftPick) {
        craftPick = null;
        game.message = "";
        draw();
        return;
      }
      if (game.screen === "deck" || game.screen === "settings" || game.screen === "you" || game.screen === "craft") go("menu");
      else if (game.screen === "inn") go("trade");
      else if ((game.screen === "menu" || game.screen === "ruin") && game.layer === "dungeon") go("dungeon");
      else go("map");
      return;
    }

    if (game.screen === "menu") {
      if (forgetting) {
        if (event.key === "y" || event.key === "Y" || event.key === "Enter") forgetSave();
        else if (event.key === "n" || event.key === "N") {
          forgetting = false;
          game.message = "";
          draw();
        }
        return;
      }
      if (event.key === "1") go("deck");
      else if (event.key === "2") go("craft");
      else if (event.key === "3") go("you");
      else if (event.key === "4") go("settings");
      else if (event.key === "5") {
        if (!savePresent()) {
          game.message = "The inn remembers nothing.";
          draw();
          return;
        }
        forgetting = true;
        game.message = "";
        draw();
      }
      return;
    }

    if (game.screen === "craft") {
      if (craftPick === "a" || craftPick === "b" || craftPick === "c") {
        const choices = freeCards(craftPick);
        const letter = letterIndex(event.key);
        const choice = letter >= 0 ? choices[letter] : undefined;
        if (choice) {
          bench[craftPick] = choice.index;
          craftPick = null;
          game.message = "";
          draw();
        }
        return;
      }
      if (craftPick === "uncraft") {
        const made = game.deck
          .map((id, index) => ({ id, index }))
          .filter((entry) => isCraftedId(entry.id));
        const letter = letterIndex(event.key);
        const choice = letter >= 0 ? made[letter] : undefined;
        if (choice) {
          const result = uncraftCard(game, choice.index);
          game.message = result.message;
          bench = { a: null, b: null, c: null };
          craftPick = null;
          play(result.ok ? "coin" : "bump");
          draw();
        }
        return;
      }
      if (event.key === "1") craftPick = "a";
      else if (event.key === "2") craftPick = "b";
      else if (event.key === "3") craftPick = "c";
      else if (event.key === "4") {
        doCraft();
        return;
      } else if (event.key === "5") craftPick = "uncraft";
      else return;
      game.message = "";
      draw();
      return;
    }

    if (game.screen === "settings") {
      if (event.key === "1") flip("arrows");
      else if (event.key === "2") flip("swipe");
      return;
    }

    if (game.screen === "deck") {
      if (aim?.mode === "heal") {
        const dir = KEYS[event.key];
        if (dir) {
          event.preventDefault();
          nudgeAim(dir);
          return;
        }
        if (event.key === "r" || event.key === "R") {
          rotateAim();
          return;
        }
        if (event.key === "Enter" || event.key === "1") {
          commitHeal();
        }
        return;
      }
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
          if (game.health >= game.healthMax) {
            game.message = "You are already well.";
            draw();
            return;
          }
          aim = { mode: "heal", index: game.deckIndex, rot: 0, ar: 0, ac: 0 };
          centerAim();
          game.message = "";
          draw();
        }
      }
      return;
    }

    if (game.screen === "fight") {
      if (KEYS[event.key] || event.key === "Enter") event.preventDefault();
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
        const result = siftRuin(game);
        game.message = result.message;
        if (result.ok) passWatch();
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
