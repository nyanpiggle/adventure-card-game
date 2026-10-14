import { ART_W, artFor, fitCell, valueLine, wrapText } from "./art.js";
import { cardById, creatureById, PLAYER } from "./cards.js";
import { hpBar } from "./combat.js";
import { TILES, ZONE_SIZE, glyphAt, tileAt } from "./game.js";

/**
 * @param {string} className
 * @param {string} text
 */
function span(className, text) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

/**
 * @param {HTMLElement} map
 * @param {HTMLElement} stage
 * @returns {{ cols: number, rows: number }}
 */
function fit(map, stage) {
  const probe = document.createElement("span");
  probe.textContent = TILES.empty;
  probe.style.visibility = "hidden";
  probe.style.position = "absolute";
  map.appendChild(probe);
  const cellW = probe.getBoundingClientRect().width || 40;
  const cellH = probe.getBoundingClientRect().height || 18;
  probe.remove();
  const bounds = stage.getBoundingClientRect();
  const charW = cellW / TILES.empty.length;
  let cols = Math.floor((bounds.width - charW * 6) / cellW);
  let rows = Math.floor((bounds.height - cellH * 2) / Math.max(cellW, cellH));
  if (cols % 2 === 0) cols -= 1;
  if (rows % 2 === 0) rows -= 1;
  cols = Math.max(5, Math.min(ZONE_SIZE, cols));
  rows = Math.max(3, Math.min(ZONE_SIZE, rows));
  return { cols, rows };
}

/**
 * @param {HTMLElement} map
 * @param {import("./game.js").Game} game
 * @param {HTMLElement} stage
 */
export function renderMap(map, game, stage) {
  const { cols, rows } = fit(map, stage);
  const halfC = Math.floor(cols / 2);
  const halfR = Math.floor(rows / 2);
  const x0 = Math.min(Math.max(game.player.x - halfC, 0), ZONE_SIZE - cols);
  const y0 = Math.min(Math.max(game.player.y - halfR, 0), ZONE_SIZE - rows);
  const mid = y0 + Math.floor(rows / 2);
  const width = cols * TILES.empty.length + 6;

  /**
   * @param {string} letter
   */
  function compassEdge(letter) {
    const between = width - 4;
    const left = Math.floor((between - 1) / 2);
    const right = between - 1 - left;
    const edge = document.createElement("div");
    edge.className = "edge";
    edge.append(document.createTextNode(" ×" + "=".repeat(left)));
    edge.append(span("compass", letter));
    edge.append(document.createTextNode("=".repeat(right) + "× "));
    return edge;
  }

  /**
   * @param {"W" | "E" | "west" | "east"} kind
   */
  function side(kind) {
    const el = document.createElement("span");
    el.className = "side";
    if (kind === "W") {
      el.append(span("compass", "W"), document.createTextNode("||"));
    } else if (kind === "E") {
      el.append(document.createTextNode("||"), span("compass", "E"));
    } else if (kind === "west") {
      el.textContent = " ||";
    } else {
      el.textContent = "|| ";
    }
    return el;
  }

  /**
   * @param {number} y
   * @param {boolean} blank
   */
  function line(y, blank) {
    const row = document.createElement("div");
    row.className = blank ? "line blank" : "line";
    if (blank) row.setAttribute("aria-hidden", "true");
    const center = !blank && y === mid;
    row.append(side(center ? "W" : "west"));
    const cells = document.createElement("span");
    cells.className = "cells";
    if (blank) {
      cells.textContent = " ".repeat(cols * TILES.empty.length);
    } else {
      for (let x = x0; x < x0 + cols; x++) {
        const glyph = glyphAt(game, x, y);
        const cell = document.createElement("span");
        cell.textContent = glyph;
        if (glyph === TILES.player) cell.className = "p";
        else if (glyph === TILES.village) cell.className = "v";
        else if (glyph === TILES.ruin) cell.className = "r";
        else if (glyph === TILES.slime) cell.className = "m";
        else cell.className = "g";
        cells.appendChild(cell);
      }
    }
    row.append(cells, side(center ? "E" : "east"));
    return row;
  }

  map.replaceChildren();
  map.append(compassEdge("N"));
  for (let y = y0; y < y0 + rows; y++) {
    map.append(line(y, false));
    if (y < y0 + rows - 1) map.append(line(y, true));
  }
  map.append(compassEdge("S"));
  map.dataset.x = String(game.player.x);
  map.dataset.y = String(game.player.y);
  map.dataset.under = tileAt(game, game.player.x, game.player.y);
}

/**
 * @param {HTMLElement} parent
 * @param {string} id
 */
export function renderCard(parent, id) {
  const card = cardById(id);
  const pre = document.createElement("pre");
  pre.className = "card";
  const useClass = card.use === "combat" ? "c-red" : card.use === "field" ? "c-green" : "c-blue";
  const rule = `+${"-".repeat(ART_W)}+`;
  pre.append(span("c-dim", rule), document.createTextNode("\n"));
  const rows = [
    { text: fitCell(card.name), cls: "c-white" },
    ...artFor(id).map((text) => ({ text, cls: useClass })),
    ...wrapText(card.text, ART_W)
      .slice(0, 4)
      .map((text) => ({ text: fitCell(text), cls: "c-dim" })),
    { text: fitCell(`Use: ${card.use}`), cls: useClass },
    ...(card.tags.length ? [{ text: fitCell(card.tags.join(" ")), cls: "c-dim" }] : []),
    { text: valueLine(card.value, card.weight), cls: "c-yellow" },
  ];
  for (const row of rows) {
    pre.append(span("c-dim", "|"), span(row.cls, row.text), span("c-dim", "|"), document.createTextNode("\n"));
  }
  pre.append(span("c-dim", rule));
  parent.append(pre);
}

/**
 * The creature card you are striking. Not a deck card.
 * @param {HTMLElement} parent
 * @param {import("./game.js").Fight} fight
 */
export function renderCreature(parent, fight) {
  const creature = creatureById(fight.creatureId);
  const pre = document.createElement("pre");
  pre.className = "card";
  const rule = `+${"-".repeat(ART_W)}+`;
  const rows = [
    { text: fitCell(fight.name), cls: "c-red" },
    ...artFor(fight.creatureId).map((text) => ({ text, cls: "c-red" })),
    { text: fitCell(creature.tags.join(" ") || "creature"), cls: "c-dim" },
    { text: fitCell(`HP ${hpBar(fight.health, fight.healthMax)}`), cls: "c-red" },
    { text: fitCell(`${Math.max(0, fight.health)} / ${fight.healthMax}`), cls: "c-yellow" },
  ];
  pre.append(span("c-dim", rule), document.createTextNode("\n"));
  for (const row of rows) {
    pre.append(span("c-dim", "|"), span(row.cls, row.text), span("c-dim", "|"), document.createTextNode("\n"));
  }
  pre.append(span("c-dim", rule));
  parent.append(pre);
}

/**
 * @param {HTMLElement} parent
 * @param {import("./game.js").Game} game
 */
export function renderPlayer(parent, game) {
  const pre = document.createElement("pre");
  pre.className = "card";
  const rule = `+${"-".repeat(ART_W)}+`;
  const rows = [
    { text: fitCell(PLAYER.name), cls: "c-white" },
    ...artFor(PLAYER.id).map((text) => ({ text, cls: "c-white" })),
    ...wrapText(PLAYER.text, ART_W).map((text) => ({ text: fitCell(text), cls: "c-dim" })),
    { text: fitCell(`HP ${hpBar(game.health, game.healthMax)}`), cls: "c-green" },
    { text: fitCell(`${game.health} / ${game.healthMax}    Deck ${game.deck.length}`), cls: "c-yellow" },
  ];
  pre.append(span("c-dim", rule), document.createTextNode("\n"));
  for (const row of rows) {
    pre.append(span("c-dim", "|"), span(row.cls, row.text), span("c-dim", "|"), document.createTextNode("\n"));
  }
  pre.append(span("c-dim", rule));
  parent.append(pre);
}
