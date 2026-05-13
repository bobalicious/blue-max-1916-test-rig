import { jest } from '@jest/globals';
import { buildDeck, shuffle, drawCards, reshuffleDiscard } from '../js/deck.js';

describe('buildDeck', () => {
  test('expands card types by count', () => {
    const deck = buildDeck([
      { name: 'A', count: 3 },
      { name: 'B', count: 2 },
    ]);
    expect(deck).toHaveLength(5);
    expect(deck.filter(c => c.name === 'A')).toHaveLength(3);
    expect(deck.filter(c => c.name === 'B')).toHaveLength(2);
  });

  test('each card has a unique id', () => {
    const deck = buildDeck([
      { name: 'A', count: 3 },
      { name: 'B', count: 2 },
    ]);
    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(5);
  });

  test('IDs are globally unique across separate buildDeck calls', () => {
    const deck1 = buildDeck([{ name: 'X', count: 5 }]);
    const deck2 = buildDeck([{ name: 'Y', count: 5 }]);
    const allIds = [...deck1, ...deck2].map(c => c.id);
    expect(new Set(allIds).size).toBe(10);
  });
});

describe('drawCards', () => {
  test('draws from the front of the deck', () => {
    const deck = buildDeck([{ name: 'A', count: 5 }]);
    const firstId = deck[0].id;
    const drawn = drawCards(deck, 2);
    expect(drawn).toHaveLength(2);
    expect(drawn[0].id).toBe(firstId);
    expect(deck).toHaveLength(3);
  });

  test('draws at most what is available', () => {
    const deck = buildDeck([{ name: 'A', count: 2 }]);
    const drawn = drawCards(deck, 5);
    expect(drawn).toHaveLength(2);
    expect(deck).toHaveLength(0);
  });
});

describe('reshuffleDiscard', () => {
  test('moves discard into deck and clears discard', () => {
    const deck = [];
    const discard = buildDeck([{ name: 'A', count: 3 }]);
    reshuffleDiscard(deck, discard);
    expect(deck).toHaveLength(3);
    expect(discard).toHaveLength(0);
  });
});
