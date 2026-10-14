/** @typedef {"n" | "e" | "s" | "w"} Dir */

/** @type {Record<string, Dir>} */
export const KEYS = {
  ArrowUp: "n",
  ArrowDown: "s",
  ArrowLeft: "w",
  ArrowRight: "e",
};

/**
 * Cardinal direction of a swipe. Diagonals and short drags do not move.
 * @param {number} dx
 * @param {number} dy
 * @param {number} [min]
 * @returns {Dir | null}
 */
export function directionFromSwipe(dx, dy, min = 24) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < min) return null;
  if (ax === ay) return null;
  if (ax > ay) return dx > 0 ? "e" : "w";
  return dy > 0 ? "s" : "n";
}
