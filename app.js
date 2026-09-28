export const TILES = {
  empty: "  .  ",
  player: "  P  ",
  village: "  V  ",
  ruin: "  R  ",
};

export const ZONE_SIZE = 25;

const STEP = {
  n: [0, -1],
  e: [1, 0],
  s: [0, 1],
  w: [-1, 0],
};

export function createGame() {
  const player = { kind: "player", symbol: TILES.player, x: 12, y: 18 };
  const village = { kind: "village", symbol: TILES.village, x: 12, y: 14 };
  const ruin = { kind: "ruin", symbol: TILES.ruin, x: 4, y: 3 };

  const zone = [];
  for (let y = 0; y < ZONE_SIZE; y++) {
    const row = [];
    for (let x = 0; x < ZONE_SIZE; x++) row.push(TILES.empty);
    zone.push(row);
  }
  zone[village.y][village.x] = village.symbol;
  zone[ruin.y][ruin.x] = ruin.symbol;

  return {
    phase: "travel",
    world: [[zone]],
    zoneX: 0,
    zoneY: 0,
    player,
    village,
    ruin,
    turns: 0,
  };
}

export function zoneOf(game) {
  return game.world[game.zoneY][game.zoneX];
}

export function tileAt(game, x, y) {
  return zoneOf(game)[y][x];
}

export function glyphAt(game, x, y) {
  if (game.player.x === x && game.player.y === y) return game.player.symbol;
  return tileAt(game, x, y);
}

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
  return true;
}

export function directionFromSwipe(dx, dy, min = 24) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < min) return null;
  if (ax === ay) return null;
  if (ax > ay) return dx > 0 ? "e" : "w";
  return dy > 0 ? "s" : "n";
}

export function groundName(symbol) {
  if (symbol === TILES.village) return "Village";
  if (symbol === TILES.ruin) return "Ruin";
  return "Open ground";
}

const KEYS = {
  ArrowUp: "n",
  ArrowDown: "s",
  ArrowLeft: "w",
  ArrowRight: "e",
};

function boot() {
  const game = createGame();
  const map = document.getElementById("map");
  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  let notice = "";

  function fit() {
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

  function draw() {
    const { cols, rows } = fit();
    const halfC = Math.floor(cols / 2);
    const halfR = Math.floor(rows / 2);
    const x0 = Math.min(Math.max(game.player.x - halfC, 0), ZONE_SIZE - cols);
    const y0 = Math.min(Math.max(game.player.y - halfR, 0), ZONE_SIZE - rows);
    const mid = y0 + Math.floor(rows / 2);
    const width = cols * TILES.empty.length + 6;

    function compassEdge(letter) {
      const between = width - 4;
      const left = Math.floor((between - 1) / 2);
      const right = between - 1 - left;
      const edge = document.createElement("div");
      edge.className = "edge";
      edge.append(document.createTextNode(" ×" + "=".repeat(left)));
      const mark = document.createElement("span");
      mark.className = "compass";
      mark.textContent = letter;
      edge.append(mark);
      edge.append(document.createTextNode("=".repeat(right) + "× "));
      return edge;
    }

    function side(kind) {
      const el = document.createElement("span");
      el.className = "side";
      if (kind === "W") {
        const mark = document.createElement("span");
        mark.className = "compass";
        mark.textContent = "W";
        el.append(mark, document.createTextNode("||"));
      } else if (kind === "E") {
        const mark = document.createElement("span");
        mark.className = "compass";
        mark.textContent = "E";
        el.append(document.createTextNode("||"), mark);
      } else if (kind === "west") {
        el.textContent = " ||";
      } else {
        el.textContent = "|| ";
      }
      return el;
    }

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
          const span = document.createElement("span");
          span.textContent = glyph;
          if (glyph === TILES.player) span.className = "p";
          else if (glyph === TILES.village) span.className = "v";
          else if (glyph === TILES.ruin) span.className = "r";
          cells.appendChild(span);
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
    const under = tileAt(game, game.player.x, game.player.y);
    const where = groundName(under);
    status.textContent = notice || `${where} · ${game.player.x}, ${game.player.y}`;
    map.dataset.x = String(game.player.x);
    map.dataset.y = String(game.player.y);
    map.dataset.under = under;
  }

  function step(dir) {
    const moved = travel(game, dir);
    notice = moved ? "" : "The zone ends here.";
    draw();
  }

  let origin = null;
  stage.addEventListener("pointerdown", (event) => {
    origin = { x: event.clientX, y: event.clientY, id: event.pointerId };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointerup", (event) => {
    if (!origin || origin.id !== event.pointerId) return;
    const dir = directionFromSwipe(event.clientX - origin.x, event.clientY - origin.y);
    origin = null;
    if (dir) step(dir);
  });
  stage.addEventListener("pointercancel", () => {
    origin = null;
  });

  window.addEventListener("keydown", (event) => {
    const dir = KEYS[event.key];
    if (!dir) return;
    event.preventDefault();
    step(dir);
  });
  window.addEventListener("resize", draw);
  draw();
}

if (typeof document !== "undefined") boot();
