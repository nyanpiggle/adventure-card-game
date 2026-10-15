import { TILES } from "./game.js";

/** Five characters, same as the overworld, so the columns line up. */
export const DUNGEON = {
  wall: "  #  ",
  floor: "  .  ",
  stairs: "  <  ",
  rubble: "  *  ",
  wolf: "  W  ",
  slime: "  S  ",
};

const WIDTH = 19;
const HEIGHT = 19;

/**
 * @typedef {{
 *   width: number,
 *   height: number,
 *   cells: string[][],
 *   x: number,
 *   y: number,
 * }} Dungeon
 */

/** @param {() => number} rng @param {number} n */
function roll(rng, n) {
  return Math.floor(rng() * n);
}

/**
 * Rooms joined by straight corridors of length 3 to 10.
 * A monster in a later room is the first letter of its name.
 * @param {() => number} [rng]
 * @returns {Dungeon}
 */
export function generateDungeon(rng = Math.random) {
  /** @type {string[][]} */
  const cells = [];
  for (let y = 0; y < HEIGHT; y++) {
    /** @type {string[]} */
    const row = [];
    for (let x = 0; x < WIDTH; x++) row.push(DUNGEON.wall);
    cells.push(row);
  }

  /** @type {{ x: number, y: number, w: number, h: number }[]} */
  const rooms = [];

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function roomFits(x, y, w, h) {
    if (x < 1 || y < 1 || x + w >= WIDTH - 1 || y + h >= HEIGHT - 1) return false;
    for (let yy = y - 1; yy <= y + h; yy++) {
      for (let xx = x - 1; xx <= x + w; xx++) {
        if (cells[yy]?.[xx] !== DUNGEON.wall) return false;
      }
    }
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  function carveRoom(x, y, w, h) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const row = cells[yy];
        if (row) row[xx] = DUNGEON.floor;
      }
    }
  }

  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   */
  function carveLine(x0, y0, x1, y1) {
    let x = x0;
    let y = y0;
    const row0 = cells[y];
    if (row0 && row0[x] === DUNGEON.wall) row0[x] = DUNGEON.floor;
    while (x !== x1 || y !== y1) {
      if (x !== x1) x += Math.sign(x1 - x);
      else y += Math.sign(y1 - y);
      const row = cells[y];
      if (row && row[x] === DUNGEON.wall) row[x] = DUNGEON.floor;
    }
  }

  for (let attempt = 0; attempt < 48 && rooms.length < 4; attempt++) {
    const w = 3 + roll(rng, 4);
    const h = 3 + roll(rng, 4);
    if (rooms.length === 0) {
      const x = 1 + roll(rng, WIDTH - w - 2);
      const y = 1 + roll(rng, HEIGHT - h - 2);
      if (!roomFits(x, y, w, h)) continue;
      carveRoom(x, y, w, h);
      rooms.push({ x, y, w, h });
      continue;
    }
    const prev = rooms[rooms.length - 1];
    if (!prev) continue;
    const len = 3 + roll(rng, 8);
    const dir = roll(rng, 4);
    let x = prev.x;
    let y = prev.y;
    if (dir === 0) x = prev.x + prev.w + len;
    else if (dir === 1) x = prev.x - len - w;
    else if (dir === 2) y = prev.y + prev.h + len;
    else y = prev.y - len - h;
    if (!roomFits(x, y, w, h)) continue;
    carveRoom(x, y, w, h);
    if (dir === 0) carveLine(prev.x + prev.w - 1, prev.y, x, y);
    else if (dir === 1) carveLine(prev.x, prev.y, x + w - 1, y);
    else if (dir === 2) carveLine(prev.x, prev.y + prev.h - 1, x, y);
    else carveLine(prev.x, prev.y, x, y + h - 1);
    rooms.push({ x, y, w, h });
  }

  if (rooms.length < 2) {
    for (const row of cells) row.fill(DUNGEON.wall);
    rooms.length = 0;
    carveRoom(2, 7, 4, 4);
    rooms.push({ x: 2, y: 7, w: 4, h: 4 });
    carveRoom(10, 7, 4, 3);
    carveLine(5, 8, 10, 8);
    rooms.push({ x: 10, y: 7, w: 4, h: 3 });
  }

  const first = rooms[0];
  const last = rooms[rooms.length - 1];
  if (first) {
    const row = cells[first.y + Math.floor(first.h / 2)];
    if (row) row[first.x + Math.floor(first.w / 2)] = DUNGEON.stairs;
  }
  if (last) {
    const row = cells[last.y + Math.floor(last.h / 2)];
    if (row) row[last.x + Math.floor(last.w / 2)] = DUNGEON.rubble;
  }

  rooms.forEach((room, index) => {
    if (index === 0) return;
    const kind = index % 2 === 1 ? DUNGEON.slime : DUNGEON.wolf;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cells[y]?.[x] === DUNGEON.floor) {
          const row = cells[y];
          if (row) row[x] = kind;
          return;
        }
      }
    }
  });

  let sx = 1;
  let sy = 1;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (cells[y]?.[x] === DUNGEON.stairs) {
        sx = x;
        sy = y;
      }
    }
  }

  return { width: WIDTH, height: HEIGHT, cells, x: sx, y: sy };
}

/** @param {string} symbol */
export function dungeonName(symbol) {
  if (symbol === DUNGEON.stairs) return "Stairs";
  if (symbol === DUNGEON.rubble) return "Rubble";
  if (symbol === DUNGEON.wolf) return "Wolf";
  if (symbol === DUNGEON.slime) return "Slime";
  if (symbol === DUNGEON.wall) return "Wall";
  return "Floor";
}

/**
 * @param {Dungeon} dungeon
 * @param {number} x
 * @param {number} y
 */
export function dungeonGlyph(dungeon, x, y) {
  if (dungeon.x === x && dungeon.y === y) return TILES.player;
  return dungeon.cells[y]?.[x] ?? DUNGEON.wall;
}

/** @param {string} symbol */
export function foeKind(symbol) {
  if (symbol === DUNGEON.wolf) return "wolf";
  if (symbol === DUNGEON.slime) return "slime";
  return null;
}

/**
 * One square, cardinal only. Walls and the edge do not move.
 * @param {import("./game.js").Game} game
 * @param {import("./game.js").Dir} dir
 */
export function moveInDungeon(game, dir) {
  const dungeon = game.dungeon;
  if (!dungeon) return false;
  /** @type {Record<import("./game.js").Dir, [number, number]>} */
  const step = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
  const delta = step[dir];
  if (!delta) return false;
  const x = dungeon.x + delta[0];
  const y = dungeon.y + delta[1];
  const tile = dungeon.cells[y]?.[x];
  if (!tile || tile === DUNGEON.wall) return false;
  dungeon.x = x;
  dungeon.y = y;
  game.turns += 1;
  return true;
}

/** The foe you are standing on becomes floor. */
/** @param {import("./game.js").Game} game */
export function clearDungeonFoe(game) {
  const dungeon = game.dungeon;
  if (!dungeon) return;
  const row = dungeon.cells[dungeon.y];
  const tile = row?.[dungeon.x];
  if (!row || !tile || !foeKind(tile)) return;
  row[dungeon.x] = DUNGEON.floor;
}

const KNOWN = new Set(Object.values(DUNGEON));

/**
 * @param {unknown} raw
 * @returns {Dungeon | null}
 */
export function dungeonFromSave(raw) {
  if (!raw || typeof raw !== "object") return null;
  const data = /** @type {Record<string, unknown>} */ (raw);
  const width = data.width;
  const height = data.height;
  if (typeof width !== "number" || typeof height !== "number") return null;
  if (width < 5 || height < 5 || width > 40 || height > 40) return null;
  if (!Array.isArray(data.cells) || data.cells.length !== height) return null;
  /** @type {string[][]} */
  const cells = [];
  let stairs = 0;
  for (const line of data.cells) {
    if (!Array.isArray(line) || line.length !== width) return null;
    /** @type {string[]} */
    const row = [];
    for (const cell of line) {
      if (typeof cell !== "string" || !KNOWN.has(cell)) return null;
      if (cell === DUNGEON.stairs) stairs += 1;
      row.push(cell);
    }
    cells.push(row);
  }
  if (stairs !== 1) return null;
  const x = data.x;
  const y = data.y;
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  const under = cells[y]?.[x];
  if (!under || under === DUNGEON.wall) return null;
  return { width, height, cells, x, y };
}
