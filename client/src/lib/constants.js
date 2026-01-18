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

export const TEAM_COLORS = {
  A: {
    name: 'Red Team',
    primary: 'text-red-600',
    primaryDark: 'text-red-700',
    bg: 'bg-red-50',
    bgMedium: 'bg-red-100',
    bgDark: 'bg-red-600',
    border: 'border-red-500',
    borderLight: 'border-red-300',
    ring: 'ring-red-500',
    gradient: 'from-red-600 to-rose-600',
    avatar: 'bg-red-600'
  },
  B: {
    name: 'Blue Team',
    primary: 'text-blue-600',
    primaryDark: 'text-blue-700',
    bg: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    bgDark: 'bg-blue-600',
    border: 'border-blue-500',
    borderLight: 'border-blue-300',
    ring: 'ring-blue-500',
    gradient: 'from-blue-600 to-indigo-600',
    avatar: 'bg-blue-600'
  }
};