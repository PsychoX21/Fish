export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const LOW_CARDS = ['2', '3', '4', '5', '6', '7'];
export const HIGH_CARDS = ['9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_SYMBOLS = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠'
};

export const SUIT_COLORS = {
  clubs: 'text-gray-800',
  diamonds: 'text-red-600',
  hearts: 'text-red-600',
  spades: 'text-gray-800'
};

export const getHalfSuit = (card) => {
  const isLow = LOW_CARDS.includes(card.value);
  return `${card.suit}-${isLow ? 'low' : 'high'}`;
};

export const getCardDisplay = (card) => ({
  symbol: SUIT_SYMBOLS[card.suit],
  color: SUIT_COLORS[card.suit],
  value: card.value
});