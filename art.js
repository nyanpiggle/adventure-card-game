export const ART_W = 21;
export const ART_H = 5;

/**
 * Left-align a picture, then center the block in the 21-wide art cell.
 * @param {string[]} lines
 * @returns {string[]}
 */
function block(lines) {
  const clipped = lines.slice(0, ART_H);
  while (clipped.length < ART_H) clipped.push("");
  const w = Math.max(...clipped.map((line) => line.length));
  if (w > ART_W) throw new Error(`Art too wide (${w}): ${clipped.join("|")}`);
  const left = Math.floor((ART_W - w) / 2);
  const right = ART_W - w - left;
  return clipped.map(
    (line) => " ".repeat(left) + line.padEnd(w, " ") + " ".repeat(right),
  );
}

/** @type {Record<string, string[]>} */
export const ART = {
  staff: block(["    _    ", "   ( )   ", "    |    ", "    |    ", "    |    "]),
  bread: block([
    " ___________ ",
    "/           \\",
    "|  ~  ~  ~  |",
    "| ~  ~  ~ ~ |",
    "\\___________/",
  ]),
  knife: block(["     /\\", "    /  \\", "    |  |", "    |  |", "    |__|"]),
  charm: block(["  ___  ", " /   \\ ", "|  *  |", " \\___/ ", "   |   "]),
  rope: block([
    ' .-----. ',
    "/       \\",
    "| .---. |",
    "|/     \\|",
    " \\     / ",
  ]),
  torch: block(["  /|\\  ", " //|\\\\ ", "  |||  ", "  |||  ", "  |||  "]),
  shard: block(["   /\\   ", "  /  \\  ", " / /\\ \\ ", " \\ \\/ / ", "  \\  /  "]),
  fang: block(["  /\\  ", " /  \\ ", "| /\\ |", "|/  \\|", "      "]),
  spit: block(["  .  ", " ( ) ", "( ~ )", " '-' ", "  ~  "]),
  spear: block(["    ^    ", "    |    ", "    |    ", "    |    ", "   / \\   "]),
  bottle: block(["  ___  ", " /   \\ ", "|     |", "|     |", " \\___/ "]),
  herbs: block(["  \\|/  ", " --*-- ", "  /|\\  ", "   |   ", "  \\_/  "]),
  firestaff: block(["   * *   ", "  ( * )  ", "    |    ", "    |    ", "   / \\   "]),
  potion: block(["   _   ", "  ( )  ", "  |~|  ", "  |~|  ", "  \\_/  "]),
  wolf: block([
    " /\\___/\\ ",
    "(  o o  )",
    " (  W  ) ",
    "/|     |\\",
    "  /   \\  ",
  ]),
  slime: block(["  .-.  ", " (   ) ", "( o o )", " ( ~ ) ", "  '-'  "]),
  you: block(["  O  ", " /|\\ ", " / \\ ", "     ", "     "]),
};

/** @param {string} id */
export function artFor(id) {
  const rows = ART[id];
  if (!rows) return Array.from({ length: ART_H }, () => "?".padStart(11, " ").padEnd(ART_W, " "));
  return rows;
}

/**
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
export function wrapText(text, width) {
  const words = text.split(/\s+/).filter(Boolean);
  /** @type {string[]} */
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= width) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word.length > width ? word.slice(0, width) : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {string} text
 * @param {number} [width]
 */
export function fitCell(text, width = ART_W) {
  if (text.length >= width) return text.slice(0, width);
  return text.padEnd(width, " ");
}

/**
 * @param {number} damage
 * @param {number} value
 * @param {number} weight
 */
export function valueLine(damage, value, weight) {
  return fitCell(`Harm ${damage} Value ${value} Wt ${weight}`);
}
