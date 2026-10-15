/** A day is 60 watches. 60 has many factors, and it stays under 100. */

import { STARTING_STOCK } from "./cards.js";

export const DAY = 60;

/** A bed at the inn. */
export const SLEEP = 30;

/** @param {number} clock */
export function dayOf(clock) {
  return Math.floor(clock / DAY) + 1;
}

/** @param {number} clock */
export function watchOf(clock) {
  return ((clock % DAY) + DAY) % DAY;
}

/**
 * Four equal watches. 15 is a factor of the day.
 * @param {number} clock
 * @returns {"dawn" | "day" | "dusk" | "night"}
 */
export function watchName(clock) {
  const watch = watchOf(clock);
  if (watch < 15) return "dawn";
  if (watch < 30) return "day";
  if (watch < 45) return "dusk";
  return "night";
}

/** @param {number} clock */
export function clockLabel(clock) {
  return `day ${dayOf(clock)}, ${watchName(clock)}`;
}

/**
 * Day stays the old 1 in 10. Dawn and dusk are a little busier. Night is 1 in 5.
 * @param {number} clock
 */
export function wolfChance(clock) {
  const name = watchName(clock);
  if (name === "night") return 1 / 5;
  if (name === "dawn" || name === "dusk") return 1 / 8;
  return 1 / 10;
}

/**
 * Move the watch forward. A new day puts the village stock back.
 * @param {{ clock: number, villageStock: string[] }} game
 * @param {number} amount
 * @returns {boolean} true when a new day started
 */
export function advanceTime(game, amount) {
  const before = dayOf(game.clock);
  game.clock += amount;
  if (dayOf(game.clock) <= before) return false;
  game.villageStock = [...STARTING_STOCK];
  return true;
}
