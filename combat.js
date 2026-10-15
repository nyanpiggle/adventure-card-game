import { cardById, creatureById } from "./cards.js";
import { TILES, ZONE_SIZE, travelScreen, zoneOf } from "./game.js";
import { clearDungeonFoe } from "./dungeon.js";
import { readSave, writeSaveInto } from "./save.js";
import { wolfChance } from "./time.js";

/** Random overworld fights. Not used for a monster you step on. */
export const ENCOUNTER_CHANCE = 0.1;
export const ENCOUNTER_COOLDOWN = 5;

/**
 * Plains only, and only on open ground. Cooldown starts after a random fight,
 * not after a miss. The roll does not change the game.
 * @param {import("./game.js").Game} game
 * @param {string} ground
 * @param {() => number} [rng]
 * @returns {"wolf" | null}
 */
export function rollEncounter(game, ground, rng = Math.random) {
  if (game.biome !== "plains") return null;
  if (ground !== TILES.empty) return null;
  if (
    game.lastEncounterTurn >= 0 &&
    game.turns - game.lastEncounterTurn < ENCOUNTER_COOLDOWN
  ) {
    return null;
  }
  if (rng() >= wolfChance(game.clock)) return null;
  return "wolf";
}

/**
 * @param {import("./game.js").Game} game
 * @param {string} creatureId
 * @param {boolean} randomEncounter
 */
export function beginFight(game, creatureId, randomEncounter) {
  const creature = creatureById(creatureId);
  game.fight = {
    creatureId,
    name: creature.name,
    health: creature.health,
    healthMax: creature.health,
    deck: [...creature.deck],
    phase: "choose",
    log: [`A ${creature.name.toLowerCase()} is on you.`],
    random: randomEncounter,
  };
  if (randomEncounter) game.lastEncounterTurn = game.turns;
  game.screen = "fight";
  game.message = "";
}

/**
 * @param {import("./game.js").Game} game
 * @returns {string}
 */
function creatureStrike(game) {
  const fight = game.fight;
  if (!fight) return "";
  const id = fight.deck.shift();
  if (!id) {
    game.health -= 1;
    return `${fight.name} scratches you for 1.`;
  }
  fight.deck.push(id);
  const card = cardById(id);
  const harm = card.use === "field" ? 0 : card.value;
  game.health -= harm;
  if (harm === 0) return `${fight.name} fumbles ${card.name}.`;
  return `${fight.name} uses ${card.name} for ${harm}.`;
}

/**
 * Strike the creature card with a combat or both card.
 * Metal against an acid creature is destroyed and deals no harm.
 * A dead creature does not strike back.
 * @param {import("./game.js").Game} game
 * @param {number} index
 */
export function playCombatCard(game, index) {
  const fight = game.fight;
  if (!fight || fight.phase !== "choose") return;
  const id = game.deck[index];
  if (!id) return;
  const card = cardById(id);
  if (card.use === "field") {
    fight.log = ["That card is no use in a fight."];
    return;
  }
  /** @type {string[]} */
  const log = [];
  const creature = creatureById(fight.creatureId);
  if (card.tags.includes("metal") && creature.tags.includes("acid")) {
    game.deck.splice(index, 1);
    if (game.deckIndex >= game.deck.length) game.deckIndex = Math.max(0, game.deck.length - 1);
    log.push(`The acid eats ${card.name}. It deals no harm.`);
  } else {
    fight.health -= card.value;
    log.push(`${card.name} strikes for ${card.value}.`);
  }
  if (fight.health <= 0) {
    fight.health = 0;
    fight.phase = "won";
    log.push(`${fight.name} breaks.`);
    fight.log = log;
    return;
  }
  log.push(creatureStrike(game));
  if (game.health <= 0) {
    game.health = 0;
    fight.phase = "lost";
    log.push("You go down.");
  } else {
    fight.phase = "exchange";
  }
  fight.log = log;
}

/**
 * Leaving still lets the creature strike once.
 * @param {import("./game.js").Game} game
 */
export function fleeFight(game) {
  const fight = game.fight;
  if (!fight || fight.phase !== "choose") return;
  const line = creatureStrike(game);
  if (game.health <= 0) {
    game.health = 0;
    fight.phase = "lost";
    fight.log = [line, "You go down."];
    return;
  }
  const name = fight.name;
  game.fight = null;
  game.screen = travelScreen(game);
  game.message = `${line} You break away from the ${name.toLowerCase()}.`;
}

/**
 * @param {import("./game.js").Game} game
 * @param {number} index -1 leaves every card
 */
export function claimSpoil(game, index) {
  const fight = game.fight;
  if (!fight || fight.phase !== "won") return;
  const creature = creatureById(fight.creatureId);
  /** @type {string} */
  let taken = "";
  if (index >= 0 && index < fight.deck.length) {
    const id = fight.deck[index];
    if (id) {
      game.deck.push(id);
      taken = cardById(id).name;
    }
  }
  game.purse += creature.coin;
  if (game.layer === "dungeon") clearDungeonFoe(game);
  else if (fight.creatureId === "slime") clearMonsterHere(game);
  game.fight = null;
  game.screen = travelScreen(game);
  const coinBit = creature.coin > 0 ? `${creature.coin} coin. ` : "";
  game.message = taken ? `${coinBit}You take ${taken}.` : `${coinBit}You leave the rest.`;
}

/**
 * If the inn remembers you, wake as that save left you.
 * Otherwise this is not a save: half your coin, rounded up, south of the village.
 * Broke (0 coin) also loses one random card. No coin and no cards ends the trip.
 * @param {import("./game.js").Game} game
 * @param {() => number} [rng]
 */
export function applyDown(game, rng = Math.random) {
  const saved = readSave();
  if (saved) {
    writeSaveInto(game, saved);
    game.layer = "zone";
    game.screen = "map";
    game.message = "You wake at the inn, as you left it.";
    return;
  }
  const hadCoin = game.purse;
  const lost = Math.ceil(game.purse / 2);
  game.purse -= lost;
  /** @type {string | null} */
  let dropped = null;
  if (hadCoin === 0 && game.deck.length > 0) {
    const index = Math.floor(rng() * game.deck.length);
    const id = game.deck[index];
    if (id) {
      dropped = cardById(id).name;
      game.deck.splice(index, 1);
      if (game.deckIndex >= game.deck.length) game.deckIndex = Math.max(0, game.deck.length - 1);
    }
  }
  game.health = Math.max(1, Math.ceil(game.healthMax / 2));
  game.player.x = game.village.x;
  game.player.y = Math.min(ZONE_SIZE - 1, game.village.y + 1);
  game.layer = "zone";
  game.fight = null;
  game.lastEncounterTurn = game.turns;
  if (game.purse === 0 && game.deck.length === 0) {
    game.screen = "over";
    game.message = dropped
      ? `${dropped} is gone. No coin, and nothing left to carry.`
      : "No coin, and nothing left to carry.";
    return;
  }
  game.screen = "map";
  const coinBit = lost > 0 ? `, short ${lost} coin` : "";
  const cardBit = dropped ? `. ${dropped} is gone` : "";
  game.message = `You wake south of the village with ${game.health} health${coinBit}${cardBit}.`;
}

/**
 * The slime is a marker. Killing it clears the square you are standing on.
 * @param {import("./game.js").Game} game
 */
function clearMonsterHere(game) {
  const { x, y } = game.player;
  const monster = game.monsters.find((entry) => entry.alive && entry.x === x && entry.y === y);
  if (!monster) return;
  monster.alive = false;
  const row = zoneOf(game)[y];
  if (row && row[x] === monster.symbol) row[x] = TILES.empty;
}

/**
 * @param {number} current
 * @param {number} max
 */
export function hpBar(current, max) {
  const filled = Math.max(0, Math.min(max, current));
  return "#".repeat(filled) + ".".repeat(Math.max(0, max - filled));
}
