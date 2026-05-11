// Deck management: build from JSON, shuffle, draw, discard, reshuffle.

export function buildDeck(cardData) {
  const deck = [];
  let id = 0;
  for (const card of cardData) {
    const count = card.count || 1;
    for (let i = 0; i < count; i++) {
      deck.push({ ...card, id: id++ });
    }
  }
  return deck;
}

export function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function drawCards(deck, count) {
  return deck.splice(0, Math.min(count, deck.length));
}

export function reshuffleDiscard(deck, discard) {
  deck.push(...discard);
  discard.length = 0;
  shuffle(deck);
}
