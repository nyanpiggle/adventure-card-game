import { cardById, creatureById, BODY } from "./cards.js";
import { TILES, travelScreen, zoneOf } from "./game.js";
import { clearDungeonFoe, clearPack } from "./dungeon.js";
import { readSave, writeSaveInto } from "./save.js";
import {
  bestHurt,
  countMask,
  joinBodies,
  livingCount,
  maskFromLines,
  rotateMask,
  scratchCell,
  stampCells,
  stampCovers,
} from "./shapes.js";
import { watchName, wolfChance } from "./time.js";

/** Random overworld fights. Not used for a monster you step on. */
export const ENCOUNTER_CHANCE = 0.1;
export const ENCOUNTER_COOLDOWN = 5;

/** A fight shows at most two bodies. A third would crowd the ground column. */
const PACK_CAP = 2;

/**
 * Plains only, and only on open ground. Cooldown starts after a random fight,
 * not after a miss. The roll does not change the game.
 * At night the wolf brings a second wolf. Other watches are still one.
 * @param {import("./game.js").Game} game
 * @param {string} ground
 * @param {() => number} [rng]
 * @returns {string[] | null}
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
  if (watchName(game.clock) === "night") return ["wolf", "wolf"];
  return ["wolf"];
}

/**
 * @param {string[]} ids
 */
function openLine(ids) {
  const names = ids.map((id) => creatureById(id).name.toLowerCase());
  if (names.length <= 1) return `A ${names[0] ?? "creature"} is on you.`;
  if (names[0] === names[1]) {
    if (names[0] === "wolf") return "Two wolves are on you.";
    return `Two ${names[0]}s are on you.`;
  }
  return `A ${names[0]} and a ${names[1]} are on you.`;
}

/**
 * @param {import("./game.js").Fight} fight
 */
function packPhrase(fight) {
  const first = fight.foes[0];
  const second = fight.foes[1];
  if (!first) return "them";
  if (!second) return `the ${first.name.toLowerCase()}`;
  if (first.creatureId === second.creatureId) {
    return first.name.toLowerCase() === "wolf" ? "the wolves" : `the ${first.name.toLowerCase()}s`;
  }
  return `the ${first.name.toLowerCase()} and the ${second.name.toLowerCase()}`;
}

/**
 * @param {import("./game.js").Fight} fight
 * @param {number} index
 */
function foeLabel(fight, index) {
  const foe = fight.foes[index];
  if (!foe) return "It";
  const twins = fight.foes.filter((other) => other.creatureId === foe.creatureId).length > 1;
  if (!twins) return foe.name;
  return index === 0 ? `The west ${foe.name.toLowerCase()}` : `The east ${foe.name.toLowerCase()}`;
}

/**
 * @param {import("./game.js").Fight} fight
 * @param {import("./game.js").Foe} foe
 */
function foeLiving(fight, foe) {
  let n = 0;
  for (let r = 0; r < foe.height; r++) {
    for (let c = 0; c < foe.width; c++) {
      const y = foe.originR + r;
      const x = foe.originC + c;
      if (fight.body[y]?.[x] && fight.cells[y]?.[x]) n += 1;
    }
  }
  return n;
}

/** @param {import("./game.js").Fight} fight */
function syncFight(fight) {
  let total = 0;
  for (const foe of fight.foes) {
    foe.health = foeLiving(fight, foe);
    total += foe.health;
  }
  fight.health = total;
}

/**
 * @param {import("./game.js").Game} game
 * @param {string | string[]} creatureIds
 * @param {boolean} randomEncounter
 * @param {{ x: number, y: number }[]} [tiles]
 */
export function beginFight(game, creatureIds, randomEncounter, tiles = []) {
  const ids = (Array.isArray(creatureIds) ? creatureIds : [creatureIds]).slice(0, PACK_CAP);
  if (ids.length === 0) return;
  const creatures = ids.map((id) => creatureById(id));
  const joined = joinBodies(creatures.map((creature) => maskFromLines(creature.shape)));
  /** @type {import("./game.js").Foe[]} */
  const foes = creatures.map((creature, index) => {
    const place = joined.places[index];
    const healthMax = countMask(maskFromLines(creature.shape));
    return {
      creatureId: creature.id,
      name: creature.name,
      deck: [...creature.deck],
      originR: place?.originR ?? 0,
      originC: place?.originC ?? 0,
      width: place?.width ?? 0,
      height: place?.height ?? 0,
      health: healthMax,
      healthMax,
    };
  });
  const healthMax = countMask(joined.body);
  game.fight = {
    foes,
    body: joined.body,
    wall: joined.wall,
    cells: joined.cells,
    health: healthMax,
    healthMax,
    deck: foes.flatMap((foe) => foe.deck.slice()),
    spoilAt: 0,
    taken: [],
    phase: "choose",
    log: [openLine(ids)],
    random: randomEncounter,
    tiles: tiles.slice(),
  };
  if (randomEncounter) game.lastEncounterTurn = game.turns;
  game.screen = "fight";
  game.message = "";
}

/** @param {import("./game.js").Game} game */
function syncYou(game) {
  const body = maskFromLines(BODY.you);
  game.health = livingCount(body, game.cells);
  game.healthMax = countMask(body);
}

/**
 * Metal on a fight where every creature still up is acid is eaten before you place it.
 * @param {import("./game.js").Fight} fight
 * @param {{ tags: string[] }} card
 */
export function metalWasted(fight, card) {
  if (!card.tags.includes("metal")) return false;
  const living = fight.foes.filter((foe) => foe.health > 0);
  return living.length > 0 && living.every((foe) => creatureById(foe.creatureId).tags.includes("acid"));
}

/**
 * @param {import("./game.js").Fight} fight
 * @param {import("./game.js").Foe} foe
 * @param {boolean[][]} stamp
 * @param {number} ar
 * @param {number} ac
 */
function stampTouches(fight, foe, stamp, ar, ac) {
  for (let r = 0; r < foe.height; r++) {
    for (let c = 0; c < foe.width; c++) {
      const y = foe.originR + r;
      const x = foe.originC + c;
      if (!fight.body[y]?.[x]) continue;
      if (stampCovers(stamp, ar, ac, y, x)) return true;
    }
  }
  return false;
}

/**
 * One creature lays its shape where it cuts the most. An empty deck scratches one cell.
 * @param {import("./game.js").Game} game
 * @param {import("./game.js").Foe} foe
 * @param {string} label
 * @returns {string}
 */
function foeStrike(game, foe, label) {
  const body = maskFromLines(BODY.you);
  const id = foe.deck.shift();
  if (!id) {
    const hit = scratchCell(body, game.cells);
    game.cells = hit.cells;
    syncYou(game);
    return `${label} scratches you.`;
  }
  foe.deck.push(id);
  const card = cardById(id);
  if (!card.shape) return `${label} fumbles ${card.name}.`;
  const best = bestHurt(body, game.cells, maskFromLines(card.shape));
  game.cells = best.cells;
  syncYou(game);
  if (best.changed === 0) return `${label} misses with ${card.name}.`;
  return `${label} uses ${card.name} and cuts ${best.changed}.`;
}

/**
 * Living foes strike from the west. A foe with no cells left does not swing.
 * If one of them drops you, the rest do not.
 * @param {import("./game.js").Game} game
 * @returns {string[]}
 */
function enemiesStrike(game) {
  const fight = game.fight;
  if (!fight) return [];
  /** @type {string[]} */
  const lines = [];
  for (let index = 0; index < fight.foes.length; index++) {
    if (game.health <= 0) break;
    const foe = fight.foes[index];
    if (!foe || foeLiving(fight, foe) <= 0) continue;
    lines.push(foeStrike(game, foe, foeLabel(fight, index)));
  }
  return lines;
}

/**
 * Strike the shared hitbox with a combat or both card.
 * Metal against an all-acid fight is eaten before you place it.
 * Metal whose stamp covers an acid body is eaten and cuts nothing, wolf included.
 * A dead foe does not strike back. The others do.
 * @param {import("./game.js").Game} game
 * @param {number} index
 * @param {{ rot: number, ar: number, ac: number } | null} place
 */
export function playCombatCard(game, index, place) {
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
  const stamp = card.shape && place ? rotateMask(maskFromLines(card.shape), place.rot) : null;
  const eaten =
    metalWasted(fight, card) ||
    Boolean(
      stamp &&
        place &&
        card.tags.includes("metal") &&
        fight.foes.some(
          (foe) => creatureById(foe.creatureId).tags.includes("acid") && stampTouches(fight, foe, stamp, place.ar, place.ac),
        ),
    );
  if (eaten) {
    game.deck.splice(index, 1);
    if (game.deckIndex >= game.deck.length) game.deckIndex = Math.max(0, game.deck.length - 1);
    log.push(`The acid eats ${card.name}. It deals no harm.`);
  } else if (!stamp || !place) {
    log.push(`${card.name} misses.`);
  } else {
    const before = fight.foes.map((foe) => foeLiving(fight, foe));
    const hit = stampCells(fight.body, fight.cells, stamp, place.ar, place.ac, "hurt");
    fight.cells = hit.cells;
    syncFight(fight);
    log.push(hit.changed ? `${card.name} cuts ${hit.changed}.` : `${card.name} misses.`);
    fight.foes.forEach((foe, foeIndex) => {
      if ((before[foeIndex] ?? 0) > 0 && foe.health <= 0) log.push(`${foeLabel(fight, foeIndex)} breaks.`);
    });
  }
  if (fight.health <= 0) {
    openSpoil(game, log);
    return;
  }
  log.push(...enemiesStrike(game));
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
 * Leaving still lets every living foe strike once, from the west.
 * @param {import("./game.js").Game} game
 */
export function fleeFight(game) {
  const fight = game.fight;
  if (!fight || fight.phase !== "choose") return;
  const lines = enemiesStrike(game);
  if (game.health <= 0) {
    game.health = 0;
    fight.phase = "lost";
    fight.log = [...lines, "You go down."];
    return;
  }
  const who = packPhrase(fight);
  game.fight = null;
  game.screen = travelScreen(game);
  game.message = `${lines.join(" ")} You break away from ${who}.`;
}

/**
 * The next broken foe, from `from` on, that is still carrying a card.
 * @param {import("./game.js").Fight} fight
 * @param {number} from
 */
function spoilIndexFrom(fight, from) {
  for (let i = from; i < fight.foes.length; i++) {
    const foe = fight.foes[i];
    if (foe && foe.health <= 0 && foe.deck.length > 0) return i;
  }
  return fight.foes.length;
}

/**
 * "The west wolf" becomes "the west wolf". "Wolf" becomes "the wolf".
 * @param {import("./game.js").Fight} fight
 * @param {number} index
 */
function foePhrase(fight, index) {
  const label = foeLabel(fight, index);
  if (label.startsWith("The ")) return `the ${label.slice(4)}`;
  return `the ${label.toLowerCase()}`;
}

/**
 * @param {string[]} items
 */
function listPhrase(items) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * They broke. Coin is one purse from each foe that broke.
 * Each of those foes then offers one card from its own deck.
 * @param {import("./game.js").Game} game
 * @param {string[]} log
 */
function openSpoil(game, log) {
  const fight = game.fight;
  if (!fight) return;
  fight.health = 0;
  fight.phase = "won";
  fight.taken = [];
  fight.spoilAt = spoilIndexFrom(fight, 0);
  fight.deck = fight.foes.flatMap((foe) => (foe.health <= 0 ? foe.deck.slice() : []));
  fight.log = log;
  if (fight.spoilAt >= fight.foes.length) finishSpoil(game);
}

/**
 * The foe whose deck is on offer, or null when the spoil is done.
 * @param {import("./game.js").Fight} fight
 * @returns {{ deck: string[], prompt: string, leave: string } | null}
 */
export function spoilOffer(fight) {
  if (fight.phase !== "won") return null;
  const foe = fight.foes[fight.spoilAt];
  if (!foe || foe.deck.length === 0) return null;
  if (fight.foes.length <= 1) {
    return { deck: foe.deck, prompt: "Take one card, or leave them.", leave: "0  Leave them" };
  }
  const who = foePhrase(fight, fight.spoilAt);
  return {
    deck: foe.deck,
    prompt: `Take one card from ${who}, or leave it.`,
    leave: "0  Leave it",
  };
}

/**
 * Pay every broken foe, then leave the fight.
 * @param {import("./game.js").Game} game
 */
function finishSpoil(game) {
  const fight = game.fight;
  if (!fight) return;
  const coin = fight.foes.reduce((sum, foe) => {
    if (foe.health > 0) return sum;
    return sum + creatureById(foe.creatureId).coin;
  }, 0);
  game.purse += coin;
  if (game.layer === "dungeon") {
    if (fight.tiles.length) clearPack(game, fight.tiles);
    else clearDungeonFoe(game);
  } else if (fight.foes.some((foe) => foe.health <= 0 && foe.creatureId === "slime")) {
    clearMonsterHere(game);
  }
  const taken = fight.taken.slice();
  game.fight = null;
  game.screen = travelScreen(game);
  const coinBit = coin > 0 ? `${coin} coin. ` : "";
  const lootBit = taken.length > 0 ? `You take ${listPhrase(taken)}.` : "You leave the rest.";
  game.message = `${coinBit}${lootBit}`;
}

/**
 * Take one card from the foe on offer, or leave that foe's cards.
 * The next foe is offered after this one. -1 leaves the current foe.
 * @param {import("./game.js").Game} game
 * @param {number} index
 */
export function claimSpoil(game, index) {
  const fight = game.fight;
  if (!fight || fight.phase !== "won") return;
  const foe = fight.foes[fight.spoilAt];
  if (foe && index >= 0 && index < foe.deck.length) {
    const id = foe.deck[index];
    if (id) {
      game.deck.push(id);
      const name = cardById(id).name;
      fight.taken.push(fight.foes.length > 1 ? `${name} from ${foePhrase(fight, fight.spoilAt)}` : name);
    }
  }
  fight.spoilAt = spoilIndexFrom(fight, fight.spoilAt + 1);
  if (fight.spoilAt < fight.foes.length) return;
  finishSpoil(game);
}

/**
 * If the inn remembers you, wake as that save left you.
 * With no save, the run ends on the death screen.
 * @param {import("./game.js").Game} game
 */
export function applyDown(game) {
  const saved = readSave();
  if (saved) {
    writeSaveInto(game, saved);
    game.layer = "zone";
    game.screen = "map";
    game.message = "You wake at the inn, as you left it.";
    return;
  }
  game.fight = null;
  game.layer = "zone";
  game.screen = "over";
  game.message = "You go down. The inn does not remember you.";
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
