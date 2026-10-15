import { CARDS } from "./cards.js";
import { dungeonFromSave } from "./dungeon.js";
import { TILES, ZONE_SIZE, zoneOf } from "./game.js";
import { SLEEP, advanceTime, clockLabel } from "./time.js";

const KEY = "adventure-card-game:save";
const VERSION = 2;

/** A bed. Pays for a full heal and for the save. */
export const BED_COST = 2;

/**
 * @typedef {{
 *   version: number,
 *   x: number,
 *   y: number,
 *   health: number,
 *   purse: number,
 *   deck: string[],
 *   turns: number,
 *   clock: number,
 *   lastEncounterTurn: number,
 *   village: { x: number, y: number },
 *   ruin: { x: number, y: number },
 *   monsters: { kind: "slime", x: number, y: number, alive: boolean }[],
 *   villageStock: string[],
 *   ruinLoot: string[],
 *   dungeon: import("./dungeon.js").Dungeon | null,
 * }} Save
 */

/** @param {unknown} value @param {number} min @param {number} max */
function isInt(value, min, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/** @param {unknown} list */
function cardIds(list) {
  return (
    Array.isArray(list) &&
    list.length <= 99 &&
    list.every((id) => typeof id === "string" && Object.prototype.hasOwnProperty.call(CARDS, id))
  );
}

/** @param {unknown} point */
function point(point) {
  if (!point || typeof point !== "object") return null;
  const spot = /** @type {{ x?: unknown, y?: unknown }} */ (point);
  if (!isInt(spot.x, 0, ZONE_SIZE - 1) || !isInt(spot.y, 0, ZONE_SIZE - 1)) return null;
  return { x: spot.x, y: spot.y };
}

/**
 * @param {unknown} raw
 * @returns {Save | null}
 */
function normalize(raw) {
  if (!raw || typeof raw !== "object") return null;
  const data = /** @type {Record<string, unknown>} */ (raw);
  if (data.version !== 1 && data.version !== 2) return null;
  const village = point(data.village);
  const ruin = point(data.ruin);
  if (!isInt(data.x, 0, ZONE_SIZE - 1) || !isInt(data.y, 0, ZONE_SIZE - 1)) return null;
  if (!isInt(data.health, 1, 99) || !isInt(data.purse, 0, 9999)) return null;
  if (!isInt(data.turns, 0, 1000000) || !isInt(data.lastEncounterTurn, -1, 1000000)) return null;
  if (!village || !ruin) return null;
  if (!cardIds(data.deck) || !cardIds(data.villageStock) || !cardIds(data.ruinLoot)) return null;
  if (!Array.isArray(data.monsters)) return null;
  /** @type {Save["monsters"]} */
  const monsters = [];
  for (const entry of data.monsters) {
    if (!entry || typeof entry !== "object") return null;
    const monster = /** @type {{ kind?: unknown, x?: unknown, y?: unknown, alive?: unknown }} */ (entry);
    if (monster.kind !== "slime") return null;
    if (!isInt(monster.x, 0, ZONE_SIZE - 1) || !isInt(monster.y, 0, ZONE_SIZE - 1)) return null;
    if (typeof monster.alive !== "boolean") return null;
    monsters.push({ kind: "slime", x: monster.x, y: monster.y, alive: monster.alive });
  }
  return {
    version: VERSION,
    x: data.x,
    y: data.y,
    health: data.health,
    purse: data.purse,
    deck: /** @type {string[]} */ (data.deck).slice(),
    turns: data.turns,
    clock: isInt(data.clock, 0, 1000000) ? data.clock : 0,
    lastEncounterTurn: data.lastEncounterTurn,
    village,
    ruin,
    monsters,
    villageStock: /** @type {string[]} */ (data.villageStock).slice(),
    ruinLoot: /** @type {string[]} */ (data.ruinLoot).slice(),
    dungeon: data.version === 2 && data.dungeon != null ? dungeonFromSave(data.dungeon) : null,
  };
}

function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** @returns {Save | null} */
export function readSave() {
  const box = storage();
  if (!box) return null;
  try {
    const raw = box.getItem(KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Write the zone from the landmarks. The player is not stored in the array.
 * @param {import("./game.js").Game} game
 */
function stampZone(game) {
  const zone = zoneOf(game);
  for (let y = 0; y < ZONE_SIZE; y++) {
    const row = zone[y];
    if (!row) continue;
    for (let x = 0; x < ZONE_SIZE; x++) row[x] = TILES.empty;
  }
  const villageRow = zone[game.village.y];
  const ruinRow = zone[game.ruin.y];
  if (villageRow) villageRow[game.village.x] = TILES.village;
  if (ruinRow) ruinRow[game.ruin.x] = TILES.ruin;
  for (const monster of game.monsters) {
    if (!monster.alive) continue;
    const row = zone[monster.y];
    if (row) row[monster.x] = monster.symbol;
  }
}

/**
 * @param {import("./game.js").Game} game
 * @param {Save} save
 */
export function writeSaveInto(game, save) {
  game.player.x = save.x;
  game.player.y = save.y;
  game.health = Math.min(game.healthMax, save.health);
  game.purse = save.purse;
  game.deck = save.deck.slice();
  game.deckIndex = 0;
  game.turns = save.turns;
  game.clock = save.clock;
  game.lastEncounterTurn = save.lastEncounterTurn;
  game.village.x = save.village.x;
  game.village.y = save.village.y;
  game.ruin.x = save.ruin.x;
  game.ruin.y = save.ruin.y;
  game.monsters = save.monsters.map((monster) => ({
    kind: "slime",
    symbol: TILES.slime,
    x: monster.x,
    y: monster.y,
    alive: monster.alive,
  }));
  game.villageStock = save.villageStock.slice();
  game.ruinLoot = save.ruinLoot.slice();
  game.dungeon = save.dungeon;
  game.layer = "zone";
  game.fight = null;
  stampZone(game);
}

/**
 * @param {import("./game.js").Game} game
 * @returns {boolean}
 */
export function storeSave(game) {
  const box = storage();
  if (!box) return false;
  /** @type {Save} */
  const save = {
    version: VERSION,
    x: game.player.x,
    y: game.player.y,
    health: game.health,
    purse: game.purse,
    deck: game.deck.slice(),
    turns: game.turns,
    clock: game.clock,
    lastEncounterTurn: game.lastEncounterTurn,
    village: { x: game.village.x, y: game.village.y },
    ruin: { x: game.ruin.x, y: game.ruin.y },
    monsters: game.monsters.map((monster) => ({
      kind: "slime",
      x: monster.x,
      y: monster.y,
      alive: monster.alive,
    })),
    villageStock: game.villageStock.slice(),
    ruinLoot: game.ruinLoot.slice(),
    dungeon: game.dungeon
      ? {
          width: game.dungeon.width,
          height: game.dungeon.height,
          cells: game.dungeon.cells.map((row) => row.slice()),
          x: game.dungeon.x,
          y: game.dungeon.y,
        }
      : null,
  };
  try {
    box.setItem(KEY, JSON.stringify(save));
    return readSave() != null;
  } catch {
    return false;
  }
}

/**
 * Pay for the bed, fill health, and remember this moment.
 * @param {import("./game.js").Game} game
 * @returns {{ ok: boolean, message: string }}
 */
export function restAtInn(game) {
  if (game.purse < BED_COST) return { ok: false, message: "A bed is 2 coin." };
  game.purse -= BED_COST;
  game.health = game.healthMax;
  const newDay = advanceTime(game, SLEEP);
  const when = clockLabel(game.clock);
  const dayBit = newDay ? "A new day. " : "";
  if (!storeSave(game)) {
    return { ok: true, message: `${dayBit}You sleep and wake well. It is ${when}. This phone will not keep the memory.` };
  }
  return { ok: true, message: `${dayBit}You sleep. It is ${when}. The inn will remember this.` };
}
