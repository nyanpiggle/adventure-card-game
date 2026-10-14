import { cardById, creatureById } from "./cards.js";
import { TILES, ZONE_SIZE, zoneOf } from "./game.js";

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
  if (rng() >= ENCOUNTER_CHANCE) return null;
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
  game.screen = "map";
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
  if (fight.creatureId === "slime") clearMonsterHere(game);
  game.fight = null;
  game.screen = "map";
  const coinBit = creature.coin > 0 ? `${creature.coin} coin. ` : "";
  game.message = taken ? `${coinBit}You take ${taken}.` : `${coinBit}You leave the rest.`;
}

/**
 * Not a save. The inn is not built yet.
 * @param {import("./game.js").Game} game
 */
export function applyDown(game) {
  const lost = Math.min(2, game.purse);
  game.purse -= lost;
  game.health = Math.max(1, Math.ceil(game.healthMax / 2));
  game.player.x = game.village.x;
  game.player.y = Math.min(ZONE_SIZE - 1, game.village.y + 1);
  game.fight = null;
  game.screen = "map";
  game.lastEncounterTurn = game.turns;
  const coinBit = lost > 0 ? `, short ${lost} coin` : "";
  game.message = `You wake south of the village with ${game.health} health${coinBit}.`;
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
