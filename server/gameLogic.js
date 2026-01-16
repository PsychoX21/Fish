const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const LOW_CARDS = ['2', '3', '4', '5', '6', '7'];
const HIGH_CARDS = ['9', '10', 'J', 'Q', 'K', 'A'];

const createDeck = () => {
  const deck = [];
  SUITS.forEach(suit => {
    [...LOW_CARDS, ...HIGH_CARDS].forEach(value => {
      deck.push({ suit, value, id: `${value}-${suit}` });
    });
  });
  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getHalfSuit = (card) => {
  const isLow = LOW_CARDS.includes(card.value);
  return `${card.suit}-${isLow ? 'low' : 'high'}`;
};

const dealCards = (numPlayers) => {
  const deck = shuffleDeck(createDeck());
  const cardsPerPlayer = Math.floor(deck.length / numPlayers);
  const hands = {};
  
  for (let i = 0; i < numPlayers; i++) {
    hands[i] = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  }
  
  return hands;
};

const assignTeams = (playerIds) => {
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
  const teamSize = playerIds.length / 2;
  return {
    A: shuffled.slice(0, teamSize),
    B: shuffled.slice(teamSize)
  };
};

// CORRECTED: Player must have a card in half-suit but NOT the specific card they're asking for
const validateQuestion = (askerHand, card, targetId, askerTeam, targetTeam) => {
  // Rule 1: Must have a card in the same half-suit
  const hasCardInHalfSuit = askerHand.some(c => getHalfSuit(c) === getHalfSuit(card));
  
  // Rule 2: Must NOT already have the specific card they're asking for
  const alreadyHasCard = askerHand.some(c => c.id === card.id);
  
  // Rule 3: Must ask opponent team
  const isOpponent = askerTeam !== targetTeam;
  
  return {
    isValid: hasCardInHalfSuit && !alreadyHasCard && isOpponent,
    reason: !hasCardInHalfSuit ? 'NO_CARD_IN_HALFSUIT' : 
            alreadyHasCard ? 'ALREADY_HAS_CARD' : 
            !isOpponent ? 'SAME_TEAM' : 'VALID'
  };
};

// CORRECTED: Claims can be made for ANY team's half-suit (if you know the distribution)
const validateClaim = (gameState, playerId, halfSuit, distribution, targetTeam) => {
  const claimerTeam = gameState.teams.A.includes(playerId) ? 'A' : 'B';
  
  // Check if half-suit already claimed
  if (gameState.claimedHalfSuits.A.includes(halfSuit) || 
      gameState.claimedHalfSuits.B.includes(halfSuit)) {
    return { isValid: false, reason: 'ALREADY_CLAIMED' };
  }
  
  // Get expected cards for this half-suit
  const [suit, type] = halfSuit.split('-');
  const cardList = type === 'low' ? LOW_CARDS : HIGH_CARDS;
  const expectedCards = cardList.map(value => ({ suit, value, id: `${value}-${suit}` }));
  
  // Get team members of the target team
  const teamMembers = gameState.teams[targetTeam];
  
  // Verify all claimed players are on the target team
  for (const pid of Object.keys(distribution)) {
    if (!teamMembers.includes(pid)) {
      return { isValid: false, reason: 'WRONG_TEAM_MEMBER' };
    }
  }
  
  // Verify all cards in distribution are correct
  const claimedCardIds = new Set();
  for (const [pid, cards] of Object.entries(distribution)) {
    const actualHand = gameState.hands[pid];
    
    for (const card of cards) {
      claimedCardIds.add(card.id);
      
      // Check if player actually has this card
      if (!actualHand.some(c => c.id === card.id)) {
        return { isValid: false, reason: 'PLAYER_MISSING_CARD' };
      }
      
      // Check if card belongs to this half-suit
      if (!expectedCards.some(c => c.id === card.id)) {
        return { isValid: false, reason: 'WRONG_HALFSUIT_CARD' };
      }
    }
  }
  
  // Verify all 6 cards are accounted for
  if (claimedCardIds.size !== 6) {
    return { isValid: false, reason: 'INCOMPLETE_CLAIM' };
  }
  
  return { isValid: true, reason: 'VALID', actualTeam: targetTeam };
};

module.exports = {
  SUITS,
  LOW_CARDS,
  HIGH_CARDS,
  createDeck,
  shuffleDeck,
  getHalfSuit,
  dealCards,
  assignTeams,
  validateQuestion,
  validateClaim
};