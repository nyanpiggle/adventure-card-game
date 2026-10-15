/**
 * Card catalog. Stats live here, not in the save.
 * The deck stores ids only. Pictures live in art.js, not on the card.
 * `value` is the price. `damage` is the harm in a fight. They are not the same number.
 */

/**
 * @typedef {"combat" | "field" | "both"} CardUse
 * @typedef {{
 *   id: string,
 *   name: string,
 *   weight: number,
 *   value: number,
 *   damage: number,
 *   use: CardUse,
 *   tags: string[],
 *   text: string,
 * }} Card
 */

/** @type {Record<string, Card>} */
export const CARDS = {
  staff: {
    id: "staff",
    name: "Walking Staff",
    weight: 2,
    value: 3,
    damage: 2,
    use: "both",
    tags: ["wood"],
    text: "A plain staff. It walks with you, and it will do in a fight.",
  },
  bread: {
    id: "bread",
    name: "Trail Bread",
    weight: 1,
    value: 2,
    damage: 0,
    use: "field",
    tags: ["food"],
    text: "Eat it out of a fight. It restores 4 health. It is not a weapon.",
  },
  knife: {
    id: "knife",
    name: "Belt Knife",
    weight: 1,
    value: 6,
    damage: 3,
    use: "combat",
    tags: ["metal", "attack"],
    text: "A short blade. Only useful when something is trying to bite you.",
  },
  charm: {
    id: "charm",
    name: "Copper Charm",
    weight: 1,
    value: 8,
    damage: 1,
    use: "both",
    tags: ["trinket"],
    text: "Traders pay well for it. It is a weak thing to hit with.",
  },
  rope: {
    id: "rope",
    name: "Coil of Rope",
    weight: 3,
    value: 4,
    damage: 0,
    use: "field",
    tags: ["fiber"],
    text: "Hemp for pits and bundles. No use in a fight.",
  },
  torch: {
    id: "torch",
    name: "Pitch Torch",
    weight: 1,
    value: 5,
    damage: 1,
    use: "both",
    tags: ["fire"],
    text: "Worth more than the bruise it leaves. A poor club up close.",
  },
  shard: {
    id: "shard",
    name: "Ashen Shard",
    weight: 1,
    value: 6,
    damage: 1,
    use: "combat",
    tags: ["stone", "attack"],
    text: "A shard of stone from the ruin wall. On its own it barely cuts.",
  },
  fang: {
    id: "fang",
    name: "Fang",
    weight: 1,
    value: 4,
    damage: 3,
    use: "combat",
    tags: ["attack", "beast"],
    text: "A bite. Wolves carry these. It only works in a fight.",
  },
  spit: {
    id: "spit",
    name: "Acid Spit",
    weight: 1,
    value: 3,
    damage: 2,
    use: "combat",
    tags: ["attack", "acid"],
    text: "A gob of slime. Metal that strikes the slime is eaten instead.",
  },
};

/**
 * The player card. It is not in the deck. Health lives on the player, and this
 * card is how that stat is shown.
 */
export const PLAYER = {
  id: "you",
  name: "You",
  healthMax: 8,
  text: "A traveller on the plains. Your health is on this card.",
};

export const STARTING_PURSE = 4;
/** @type {string[]} */
export const STARTING_DECK = ["staff", "bread", "knife"];
/** @type {string[]} */
export const STARTING_STOCK = ["rope", "torch", "charm"];
/** @type {string[]} */
export const STARTING_LOOT = ["shard", "torch"];

/**
 * Creature cards. You strike the creature card. The creature fights with its deck.
 * @typedef {{
 *   id: string,
 *   name: string,
 *   tags: string[],
 *   health: number,
 *   coin: number,
 *   deck: string[],
 * }} Creature
 */

/** @type {Record<string, Creature>} */
export const CREATURES = {
  wolf: {
    id: "wolf",
    name: "Wolf",
    tags: ["beast"],
    health: 6,
    coin: 2,
    deck: ["fang", "fang"],
  },
  slime: {
    id: "slime",
    name: "Slime",
    tags: ["acid"],
    health: 5,
    coin: 1,
    deck: ["spit", "spit"],
  },
};

/** @param {string} id */
export function cardById(id) {
  const card = CARDS[id];
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
}

/** @param {string} id */
export function creatureById(id) {
  const creature = CREATURES[id];
  if (!creature) throw new Error(`Unknown creature ${id}`);
  return creature;
}

/** @param {string} id */
export function canUseInField(id) {
  return id === "bread";
}

/** @param {string[]} deck */
export function deckWeight(deck) {
  return deck.reduce((sum, id) => sum + cardById(id).weight, 0);
}

/**
 * @param {{ deck: string[], deckIndex: number }} game
 */
export function clampDeckIndex(game) {
  if (game.deck.length === 0) {
    game.deckIndex = 0;
    return;
  }
  if (game.deckIndex >= game.deck.length) game.deckIndex = game.deck.length - 1;
  if (game.deckIndex < 0) game.deckIndex = 0;
}

/**
 * @param {{ purse: number, deck: string[], deckIndex: number, villageStock: string[] }} game
 * @param {number} index
 * @returns {{ ok: boolean, message: string }}
 */
export function sellCard(game, index) {
  if (index < 0 || index >= game.deck.length) {
    return { ok: false, message: "No such card." };
  }
  const id = game.deck[index];
  if (!id) return { ok: false, message: "No such card." };
  const card = cardById(id);
  game.deck.splice(index, 1);
  game.purse += card.value;
  game.villageStock.push(id);
  clampDeckIndex(game);
  return { ok: true, message: `Sold ${card.name} for ${card.value} coin.` };
}

/**
 * @param {{ purse: number, deck: string[], deckIndex: number, villageStock: string[] }} game
 * @param {number} index
 * @returns {{ ok: boolean, message: string }}
 */
export function buyCard(game, index) {
  if (index < 0 || index >= game.villageStock.length) {
    return { ok: false, message: "The village is not selling that." };
  }
  const id = game.villageStock[index];
  if (!id) return { ok: false, message: "The village is not selling that." };
  const card = cardById(id);
  if (game.purse < card.value) {
    return { ok: false, message: `Not enough coin for ${card.name}.` };
  }
  game.purse -= card.value;
  game.villageStock.splice(index, 1);
  game.deck.push(id);
  return { ok: true, message: `Bought ${card.name} for ${card.value} coin.` };
}

/**
 * Eat trail bread. Other cards do nothing out of a fight yet.
 * @param {{ health: number, healthMax: number, deck: string[], deckIndex: number }} game
 * @param {number} index
 * @returns {{ ok: boolean, message: string }}
 */
export function useFieldCard(game, index) {
  if (index < 0 || index >= game.deck.length) {
    return { ok: false, message: "No such card." };
  }
  const id = game.deck[index];
  if (!id) return { ok: false, message: "No such card." };
  if (!canUseInField(id)) return { ok: false, message: "Nothing to do with that out here." };
  if (game.health >= game.healthMax) return { ok: false, message: "You are already well." };
  const gain = Math.min(4, game.healthMax - game.health);
  game.health += gain;
  game.deck.splice(index, 1);
  clampDeckIndex(game);
  return { ok: true, message: `You eat the bread and gain ${gain} health.` };
}

/**
 * Take the next loose card in the ruin. The pile does not refill.
 * @param {{ deck: string[], deckIndex: number, ruinLoot: string[] }} game
 * @returns {{ ok: boolean, message: string }}
 */
export function siftRuin(game) {
  const id = game.ruinLoot.shift();
  if (!id) return { ok: false, message: "Nothing else is loose." };
  game.deck.push(id);
  return { ok: true, message: `You find ${cardById(id).name}.` };
}

/**
 * Lose a card. Half the time the crack gives back the next loose card, if any.
 * @param {{ deck: string[], deckIndex: number, ruinLoot: string[] }} game
 * @param {number} index
 * @param {() => number} [rng]
 * @returns {{ ok: boolean, message: string }}
 */
export function castIntoRuin(game, index, rng = Math.random) {
  if (index < 0 || index >= game.deck.length) {
    return { ok: false, message: "You have nothing to cast in." };
  }
  const id = game.deck[index];
  if (!id) return { ok: false, message: "You have nothing to cast in." };
  const lost = cardById(id);
  game.deck.splice(index, 1);
  clampDeckIndex(game);
  if (rng() < 0.5) {
    const found = game.ruinLoot.shift();
    if (found) {
      game.deck.push(found);
      return {
        ok: true,
        message: `${lost.name} falls. ${cardById(found).name} scrapes back out.`,
      };
    }
  }
  return { ok: true, message: `${lost.name} is gone. The crack stays shut.` };
}
