/**
 * Hitbox and stamp shapes. A `#` is a cell. A space is a hole.
 * Health is how many body cells are still standing.
 */

/**
 * @typedef {boolean[][]} Mask
 * @typedef {number[][]} Cells
 */

/**
 * @param {string[]} rows
 * @returns {number}
 */
export function countLines(rows) {
  let n = 0;
  for (const row of rows) {
    for (const ch of row) if (ch === "#") n += 1;
  }
  return n;
}

/**
 * Rows may differ in length. Holes pad out to the widest row.
 * @param {string[]} rows
 * @returns {Mask}
 */
export function maskFromLines(rows) {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return rows.map((row) => {
    /** @type {boolean[]} */
    const line = [];
    for (let c = 0; c < width; c++) line.push(row[c] === "#");
    return line;
  });
}

/** @param {Mask} mask */
export function countMask(mask) {
  let n = 0;
  for (const row of mask) for (const cell of row) if (cell) n += 1;
  return n;
}

/**
 * A full body. Holes stay 0.
 * @param {Mask} body
 * @returns {Cells}
 */
export function blankCells(body) {
  return body.map((row) => row.map((cell) => (cell ? 1 : 0)));
}

/**
 * @param {Mask} body
 * @param {Cells} cells
 */
export function livingCount(body, cells) {
  let n = 0;
  for (let r = 0; r < body.length; r++) {
    const row = body[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (row[c] && cells[r]?.[c]) n += 1;
    }
  }
  return n;
}

/**
 * Clockwise. The new top row is the old left column, bottom to top.
 * @param {Mask} mask
 * @returns {Mask}
 */
export function rotateOnce(mask) {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  /** @type {Mask} */
  const next = [];
  for (let c = 0; c < width; c++) {
    /** @type {boolean[]} */
    const row = [];
    for (let r = height - 1; r >= 0; r--) row.push(Boolean(mask[r]?.[c]));
    next.push(row);
  }
  return next;
}

/**
 * @param {Mask} mask
 * @param {number} times
 * @returns {Mask}
 */
export function rotateMask(mask, times) {
  const turns = ((times % 4) + 4) % 4;
  let next = mask;
  for (let i = 0; i < turns; i++) next = rotateOnce(next);
  return next;
}

/**
 * @param {Mask} body
 * @param {Cells} cells
 * @param {Mask} stamp
 * @param {number} ar
 * @param {number} ac
 * @param {"hurt" | "heal"} mode
 * @returns {{ cells: Cells, changed: number }}
 */
export function stampCells(body, cells, stamp, ar, ac, mode) {
  const next = cells.map((row) => row.slice());
  let changed = 0;
  for (let r = 0; r < stamp.length; r++) {
    const row = stamp[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      const y = ar + r;
      const x = ac + c;
      if (!body[y]?.[x]) continue;
      const rowCells = next[y];
      if (!rowCells) continue;
      if (mode === "hurt" && rowCells[x]) {
        rowCells[x] = 0;
        changed += 1;
      } else if (mode === "heal" && !rowCells[x]) {
        rowCells[x] = 1;
        changed += 1;
      }
    }
  }
  return { cells: next, changed };
}

/**
 * The stamp may start above or west of the body. Negative anchors are how a
 * shape bigger than the health is centered: the top and left of a cross can
 * hang off while the middle sits on a cell. The bounding box still has to
 * touch the body, so the stamp cannot be nudged into empty space forever.
 * @param {Mask} body
 * @param {Mask} stamp
 * @param {number} ar
 * @param {number} ac
 */
export function clampAnchor(body, stamp, ar, ac) {
  const sh = stamp.length || 1;
  const sw = stamp[0]?.length || 1;
  const bh = body.length || 1;
  const bw = body[0]?.length || 1;
  return {
    ar: Math.max(1 - sh, Math.min(bh - 1, ar)),
    ac: Math.max(1 - sw, Math.min(bw - 1, ac)),
  };
}

/**
 * Sit the stamp on the body with the overhang split to the top and the left.
 * A shape taller or wider than the health starts on a negative cell.
 * @param {Mask} body
 * @param {Mask} stamp
 */
export function centerAnchor(body, stamp) {
  const bh = body.length || 1;
  const bw = body[0]?.length || 1;
  const sh = stamp.length || 1;
  const sw = stamp[0]?.length || 1;
  return clampAnchor(body, stamp, Math.floor((bh - sh) / 2), Math.floor((bw - sw) / 2));
}

/**
 * The creature's strike. Most cells removed wins.
 * Ties keep the earlier turn, then the higher anchor, then the lefter one,
 * because the search walks rotation, then row, then column.
 * @param {Mask} body
 * @param {Cells} cells
 * @param {Mask} stamp
 * @returns {{ rot: number, ar: number, ac: number, changed: number, cells: Cells }}
 */
export function bestHurt(body, cells, stamp) {
  /** @type {{ rot: number, ar: number, ac: number, changed: number, cells: Cells } | null} */
  let best = null;
  let turned = stamp;
  for (let rot = 0; rot < 4; rot++) {
    const sh = turned.length || 1;
    const sw = turned[0]?.length || 1;
    const bh = body.length;
    const bw = body[0]?.length ?? 0;
    for (let ar = 1 - sh; ar < bh; ar++) {
      for (let ac = 1 - sw; ac < bw; ac++) {
        const hit = stampCells(body, cells, turned, ar, ac, "hurt");
        if (!best || hit.changed > best.changed) {
          best = { rot, ar, ac, changed: hit.changed, cells: hit.cells };
        }
      }
    }
    turned = rotateOnce(turned);
  }
  if (best) return best;
  return { rot: 0, ar: 0, ac: 0, changed: 0, cells: cells.map((row) => row.slice()) };
}

/**
 * One cell, the north-most, then the west-most. An empty deck still scratches.
 * @param {Mask} body
 * @param {Cells} cells
 */
export function scratchCell(body, cells) {
  const next = cells.map((row) => row.slice());
  for (let r = 0; r < body.length; r++) {
    const row = body[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (row[c] && next[r]?.[c]) {
        const line = next[r];
        if (line) line[c] = 0;
        return { cells: next, changed: 1 };
      }
    }
  }
  return { cells: next, changed: 0 };
}

/**
 * Old saves stored a number. Drop cells from the south-east until that many remain.
 * @param {Mask} body
 * @param {number} health
 * @returns {Cells}
 */
export function cellsForHealth(body, health) {
  const cells = blankCells(body);
  let living = livingCount(body, cells);
  const target = Math.max(0, Math.min(living, health));
  for (let r = body.length - 1; r >= 0 && living > target; r--) {
    const row = body[r] ?? [];
    for (let c = row.length - 1; c >= 0 && living > target; c--) {
      if (row[c] && cells[r]?.[c]) {
        const line = cells[r];
        if (line) line[c] = 0;
        living -= 1;
      }
    }
  }
  return cells;
}

/**
 * @param {Mask} body
 * @param {Cells} cells
 * @returns {string[]}
 */
export function woundList(body, cells) {
  /** @type {string[]} */
  const wounds = [];
  for (let r = 0; r < body.length; r++) {
    const row = body[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (row[c] && !cells[r]?.[c]) wounds.push(`${r},${c}`);
    }
  }
  return wounds;
}

/**
 * @param {Mask} body
 * @param {string[]} wounds
 * @returns {Cells}
 */
export function cellsFromWounds(body, wounds) {
  const cells = blankCells(body);
  for (const wound of wounds) {
    const [rs, cs] = wound.split(",");
    const r = Number(rs);
    const c = Number(cs);
    if (!body[r]?.[c]) continue;
    const row = cells[r];
    if (row) row[c] = 0;
  }
  return cells;
}

/**
 * @param {Mask} body
 * @param {Cells} cells
 * @returns {string[]}
 */
export function pictureLines(body, cells) {
  return body.map((row, r) => row.map((on, c) => (on ? (cells[r]?.[c] ? "#" : ".") : " ")).join(""));
}

/**
 * @param {Mask} stamp
 * @param {number} ar
 * @param {number} ac
 * @param {number} r
 * @param {number} c
 */
export function stampCovers(stamp, ar, ac, r, c) {
  return Boolean(stamp[r - ar]?.[c - ac]);
}
