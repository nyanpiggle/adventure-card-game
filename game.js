import { STARTING_DECK, STARTING_LOOT, STARTING_PURSE, STARTING_STOCK, BODY } from "./cards.js";
import { blankCells, countMask, maskFromLines } from "./shapes.js";
import { advanceTime } from "./time.js";

export const TILES = {
  empty: "  .  ",
  player: "  P  ",
  village: "  V  ",
  ruin: "  R  ",
  slime: "  S  ",
};

export const ZONE_SIZE = 25;

/** @typedef {"n" | "e" | "s" | "w"} Dir */
/** @typedef {"map" | "menu" | "deck" | "settings" | "trade" | "ruin" | "you" | "fight" | "over" | "inn" | "dungeon" | "craft"} Screen */

/**
 * @typedef {{
 *   creatureId: string,
 *   name: string,
 *   deck: string[],
 *   originR: number,
 *   originC: number,
 *   width: number,
 *   height: number,
 *   health: number,
 *   healthMax: number,
 * }} Foe
 */

/**
 * One fight. Several foes share one hitbox. One column of empty ground sits
 * between them. `wall` marks that column. It is not a body cell, and it is drawn as `.`.
 * `deck` is every card the broken foes are still carrying.
 * After they break, `spoilAt` is the foe you are choosing from, west to east,
 * and `taken` is the cards already picked. One card from each foe.
 * @typedef {{
 *   foes: Foe[],
 *   body: boolean[][],
 *   wall: boolean[][],
 *   cells: number[][],
 *   health: number,
 *   healthMax: number,
 *   deck: string[],
 *   spoilAt: number,
 *   taken: string[],
 *   phase: "choose" | "exchange" | "won" | "lost",
 *   log: string[],
 *   random: boolean,
 *   tiles: { x: number, y: number }[],
 * }} Fight
 */

/**
 * @typedef {{
 *   kind: "slime",
 *   symbol: string,
 *   x: number,
 *   y: number,
 *   alive: boolean,
 * }} Monster
 */

/**
 * @typedef {{
 *   phase: "travel",
 *   screen: Screen,
 *   world: string[][][][],
 *   zoneX: number,
 *   zoneY: number,
 *   player: { kind: "player", symbol: string, x: number, y: number },
 *   village: { kind: "village", symbol: string, x: number, y: number },
 *   ruin: { kind: "ruin", symbol: string, x: number, y: number },
 *   monsters: Monster[],
 *   turns: number,
 *   purse: number,
 *   health: number,
 *   healthMax: number,
 *   cells: number[][],
 *   biome: "plains",
 *   lastEncounterTurn: number,
 *   deck: string[],
 *   deckIndex: number,
 *   villageStock: string[],
 *   ruinLoot: string[],
 *   fight: Fight | null,
 *   message: string,
 *   clock: number,
 *   layer: "zone" | "dungeon",
 *   dungeon: import("./dungeon.js").Dungeon | null,
 * }} Game
 */

/** @type {Record<Dir, [number, number]>} */
const STEP = {
  n: [0, -1],
  e: [1, 0],
  s: [0, 1],
  w: [-1, 0],
};

/** @returns {Game} */
export function createGame() {
  /** @type {Game["player"]} */
  const player = { kind: "player", symbol: TILES.player, x: 12, y: 18 };
  /** @type {Game["village"]} */
  const village = { kind: "village", symbol: TILES.village, x: 12, y: 14 };
  /** @type {Game["ruin"]} */
  const ruin = { kind: "ruin", symbol: TILES.ruin, x: 4, y: 3 };
  /** @type {Monster} */
  const slime = { kind: "slime", symbol: TILES.slime, x: 6, y: 6, alive: true };

  /** @type {string[][]} */
  const zone = [];
  for (let y = 0; y < ZONE_SIZE; y++) {
    /** @type {string[]} */
    const row = [];
    for (let x = 0; x < ZONE_SIZE; x++) row.push(TILES.empty);
    zone.push(row);
  }
  const villageRow = zone[village.y];
  const ruinRow = zone[ruin.y];
  const slimeRow = zone[slime.y];
  if (!villageRow || !ruinRow || !slimeRow) throw new Error("Zone too small for landmarks");
  villageRow[village.x] = village.symbol;
  ruinRow[ruin.x] = ruin.symbol;
  slimeRow[slime.x] = slime.symbol;

  const you = maskFromLines(BODY.you);
  return {
    phase: "travel",
    screen: "map",
    world: [[zone]],
    zoneX: 0,
    zoneY: 0,
    player,
    village,
    ruin,
    monsters: [slime],
    turns: 0,
    purse: STARTING_PURSE,
    health: countMask(you),
    healthMax: countMask(you),
    cells: blankCells(you),
    biome: "plains",
    lastEncounterTurn: -1,
    deck: [...STARTING_DECK],
    deckIndex: 0,
    villageStock: [...STARTING_STOCK],
    ruinLoot: [...STARTING_LOOT],
    fight: null,
    message: "",
    clock: 0,
    layer: "zone",
    dungeon: null,
  };
}

/** @param {Game} game */
export function zoneOf(game) {
  const row = game.world[game.zoneY];
  const zone = row?.[game.zoneX];
  if (!zone) throw new Error("Missing zone");
  return zone;
}

/**
 * @param {Game} game
 * @param {number} x
 * @param {number} y
 */
export function tileAt(game, x, y) {
  const tile = zoneOf(game)[y]?.[x];
  if (tile == null) throw new Error(`Off the zone: ${x}, ${y}`);
  return tile;
}

/**
 * The picture. The player covers the ground; the array keeps the ground.
 * @param {Game} game
 * @param {number} x
 * @param {number} y
 */
export function glyphAt(game, x, y) {
  if (game.player.x === x && game.player.y === y) return game.player.symbol;
  return tileAt(game, x, y);
}

/**
 * One square, cardinal only. Returns false at the edge of the zone.
 * @param {Game} game
 * @param {Dir} dir
 */
export function travel(game, dir) {
  const step = STEP[dir];
  if (!step) return false;
  const [dx, dy] = step;
  const x = game.player.x + dx;
  const y = game.player.y + dy;
  if (x < 0 || y < 0 || x >= ZONE_SIZE || y >= ZONE_SIZE) return false;
  game.player.x = x;
  game.player.y = y;
  game.turns += 1;
  advanceTime(game, 1);
  return true;
}

/** Where a fight sends you back. */
/** @param {Game} game */
export function travelScreen(game) {
  return game.layer === "dungeon" ? "dungeon" : "map";
}

/** @param {string} symbol */
export function groundName(symbol) {
  if (symbol === TILES.village) return "Village";
  if (symbol === TILES.ruin) return "Ruin";
  if (symbol === TILES.slime) return "Slime";
  return "Open ground";
}
