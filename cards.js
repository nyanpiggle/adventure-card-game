/**
 * Card catalog. Stats live here, not in the save (there is no save yet).
 * The deck stores ids only. Pictures live in art.js, not on the card.
 */

/**
 * @typedef {"combat" | "field" | "both"} CardUse
 * @typedef {{
 *   id: string,
 *   name: string,
 *   weight: number,
 *   value: number,
 *   use: CardUse,
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
    use: "both",
    text: "A plain staff. It walks with you, and it will do in a fight.",
  },
  bread: {
    id: "bread",
    name: "Trail Bread",
    weight: 1,
    value: 2,
    use: "field",
    text: "Eat it out of a fight. It is not a weapon.",
  },
  knife: {
    id: "knife",
    name: "Belt Knife",
    weight: 1,
    value: 4,
    use: "combat",
    text: "A short blade. Only useful when something is trying to bite you.",
  },
  charm: {
    id: "charm",
    name: "Copper Charm",
    weight: 1,
    value: 5,
    use: "both",
    text: "Traders pay for it. It is also warm in a fight.",
  },
  rope: {
    id: "rope",
    name: "Coil of Rope",
    weight: 3,
    value: 3,
    use: "field",
    text: "Hemp for pits and bundles. No use in a fight.",
  },
  torch: {
    id: "torch",
    name: "Pitch Torch",
    weight: 1,
    value: 2,
    use: "both",
    text: "Light for the next corner, and a poor club up close.",
  },
  shard: {
    id: "shard",
    name: "Ash Shard",
    weight: 1,
    value: 6,
    use: "combat",
    text: "A flake of the ruin wall. It cuts.",
  },
};

export const STARTING_PURSE = 4;
/** @type {string[]} */
export const STARTING_DECK = ["staff", "bread", "knife"];
/** @type {string[]} */
export const STARTING_STOCK = ["rope", "torch", "charm"];
/** @type {string[]} */
export const STARTING_LOOT = ["shard", "torch"];

/** @param {string} id */
export function cardById(id) {
  const card = CARDS[id];
  if (!card) throw new Error(`Unknown card ${id}`);
  return card;
}

/** @param {string[]} deck */
export function deckWeight(deck) {
  return deck.reduce((sum, id) => sum + cardById(id).weight, 0);
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
 * Take the next loose card in the ruin. The pile does not refill.
 * @param {{ deck: string[], deckIndex: number, ruinLoot: string[] }} game
 * @returns {{ ok: boolean, message: string }}
 */
export function siftRuin(game) {
  const id = game.ruinLoot.shift();
  if (!id) return { ok: false, message: "Nothing else is loose in the ash." };
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

/** @param {{ deck: string[], deckIndex: number }} game */
function clampDeckIndex(game) {
  if (game.deck.length === 0) {
    game.deckIndex = 0;
    return;
  }
  if (game.deckIndex >= game.deck.length) game.deckIndex = game.deck.length - 1;
  if (game.deckIndex < 0) game.deckIndex = 0;
}
