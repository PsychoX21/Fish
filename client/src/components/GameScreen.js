import React, { useState } from 'react';
import { Play, Pause, Trophy, AlertCircle, X } from 'lucide-react';
import Card from './Card';
import { getHalfSuit, SUITS, LOW_CARDS, HIGH_CARDS, getCardDisplay } from '../lib/constants';

const GameScreen = ({ room, socket, onAskCard, onMakeClaim, onTogglePause }) => {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [selectedCardToAsk, setSelectedCardToAsk] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimHalfSuit, setClaimHalfSuit] = useState('');
  const [claimTargetTeam, setClaimTargetTeam] = useState('');
  const [claimDistribution, setClaimDistribution] = useState({});
  const [showInstructions, setShowInstructions] = useState(false);


  const gameState = room.gameState;
  const players = room.players;
  
  const getPlayerTeam = (playerId) => {
    return gameState.teams.A.includes(playerId) ? 'A' : 'B';
  };

  const myTeam = getPlayerTeam(socket.id);
  const myHand = gameState.hands[socket.id] || [];
  const groupedHand = myHand.reduce((acc, card) => {
    const hs = getHalfSuit(card);
    acc[hs] = acc[hs] || [];
    acc[hs].push(card);
    return acc;
  }, {});
  const orderedHalfSuits = Object.keys(groupedHand).sort();

  const isMyTurn = gameState.currentPlayer === socket.id;
  const isMyTeamTurn = gameState.teams[myTeam].includes(gameState.currentPlayer);
  
  const teammates = players.filter(p => 
    getPlayerTeam(p.id) === myTeam && p.id !== socket.id
  );
  
  const opponents = players.filter(p => getPlayerTeam(p.id) !== myTeam);

  // Get all unclaimed cards organized by half-suit
  const getUnclaimedCards = () => {
    const claimed = [...gameState.claimedHalfSuits.A, ...gameState.claimedHalfSuits.B];
    const allCards = [];
    
    SUITS.forEach(suit => {
      ['low', 'high'].forEach(type => {
        const halfSuitName = `${suit}-${type}`;
        if (!claimed.includes(halfSuitName)) {
          const cardList = type === 'low' ? LOW_CARDS : HIGH_CARDS;
          const cards = cardList.map(value => ({
            suit,
            value,
            id: `${value}-${suit}`,
            halfSuit: halfSuitName
          }));
          allCards.push({ halfSuit: halfSuitName, cards });
        }
      });
    });
    
    return allCards;
  };

  // Check if player can ask for this card
  const canAskForCard = (card) => {
    // Must have a card in the same half-suit
    const hasCardInHalfSuit = myHand.some(c => getHalfSuit(c) === getHalfSuit(card));
    // Must NOT already have this specific card
    const alreadyHasCard = myHand.some(c => c.id === card.id);
    
    return hasCardInHalfSuit && !alreadyHasCard;
  };

  const handleOpenCardSelector = () => {
    if (!selectedTarget) {
      alert('Please select an opponent first');
      return;
    }
    setShowCardSelector(true);
  };

  const handleSelectCardToAsk = (card) => {
    if (!canAskForCard(card)) {
      alert('You cannot ask for this card. You must have a card in the same half-suit and not already have this card.');
      return;
    }
    setSelectedCardToAsk(card);
  };

  const handleConfirmAskCard = () => {
    if (!selectedCardToAsk || !selectedTarget) return;
    
    onAskCard(selectedTarget, selectedCardToAsk);
    setShowCardSelector(false);
    setSelectedCardToAsk(null);
    setSelectedTarget(null);
  };

  const handleOpenClaimModal = () => {
    const defaultTeam = myTeam;

    setShowClaimModal(true);
    setClaimTargetTeam(defaultTeam);

    const dist = {};
    gameState.teams[defaultTeam].forEach(pid => {
      dist[pid] = [];
    });

    setClaimDistribution(dist);
  };

  const handleTargetTeamChange = (team) => {
    setClaimTargetTeam(team);
    const dist = {};
    const teamMembers = gameState.teams[team];
    teamMembers.forEach(pid => dist[pid] = []);
    setClaimDistribution(dist);
  };

  const handleMakeClaim = () => {
    if (!claimHalfSuit) {
      alert('Please select a half-suit to claim');
      return;
    }

    if (!claimTargetTeam) {
      alert('Please select which team has the cards');
      return;
    }

    const totalCards = Object.values(claimDistribution).flat().length;
    if (totalCards !== 6) {
      alert('Must assign all 6 cards in the half-suit');
      return;
    }

    onMakeClaim(claimHalfSuit, claimDistribution, claimTargetTeam);
    setShowClaimModal(false);
    setClaimHalfSuit('');
    setClaimTargetTeam('');
    setClaimDistribution({});
  };

  const toggleCardInClaim = (playerId, card) => {
    setClaimDistribution(prev => {
      // prevent duplicate card across players
      for (const pid in prev) {
        if (pid !== playerId && prev[pid].some(c => c.id === card.id)) {
          return prev;
        }
      }

      const newDist = { ...prev };
      const playerCards = newDist[playerId] || [];
      const cardIndex = playerCards.findIndex(c => c.id === card.id);

      if (cardIndex !== -1) {
        newDist[playerId] = playerCards.filter((_, i) => i !== cardIndex);
      } else {
        newDist[playerId] = [...playerCards, card];
      }

      return newDist;
    });
  };

  const getAvailableHalfSuits = () => {
    const halfSuits = [];
    SUITS.forEach(suit => {
      ['low', 'high'].forEach(type => {
        const hs = `${suit}-${type}`;
        if (!gameState.claimedHalfSuits.A.includes(hs) && 
            !gameState.claimedHalfSuits.B.includes(hs)) {
          halfSuits.push(hs);
        }
      });
    });
    return halfSuits;
  };

  const getCardsForHalfSuit = (halfSuit) => {
    const [suit, type] = halfSuit.split('-');
    const cardList = type === 'low' ? LOW_CARDS : HIGH_CARDS;
    return cardList.map(value => ({ 
      suit, 
      value, 
      id: `${value}-${suit}` 
    }));
  };

  if (gameState.gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <Trophy className="w-24 h-24 mx-auto mb-6 text-yellow-500" />
          <h1 className="text-4xl font-bold mb-4">
            Team {gameState.winner} Wins!
          </h1>
          <div className="text-2xl mb-8">
            Final Score: Team A: {gameState.claimedHalfSuits.A.length} - 
            Team B: {gameState.claimedHalfSuits.B.length}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:shadow-lg transition"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-teal-600">🐟 FISH</div>
            <div className="text-sm">
              <div className="font-semibold">Team {myTeam}</div>
              <div className="text-xs text-gray-600">
                Score: {gameState.claimedHalfSuits[myTeam].length}/8
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {gameState.isPaused && (
              <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                PAUSED
              </div>
            )}
            {isMyTeamTurn && (
              <button
                onClick={onTogglePause}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                title={gameState.isPaused ? "Unpause" : "Pause"}
              >
                {gameState.isPaused ? <Play size={20} /> : <Pause size={20} />}
              </button>
            )}
            <button
              onClick={() => setShowInstructions(true)}
              className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition"
              title="How to Play"
              >
              <AlertCircle size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Team Members */}
                  <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4">
                      
            {/* You */}
            <div className="mb-4 bg-blue-50 p-3 rounded-xl border-2 border-blue-400">
                <div className="font-semibold text-blue-800">
                    {players.find(p => p.id === socket.id)?.name} (You)
                </div>
                <div className="text-xs text-gray-600">
                    {myHand.length} cards
                </div>
                {isMyTurn && (
                    <div className="text-xs text-green-600 font-semibold mt-1">
                    Your Turn
                    </div>
                )}
            </div>
                      
            {/* Teammates */}
            <div className="mb-4 pb-4 border-b">
              <h4 className="font-semibold text-sm mb-2">Teammates</h4>
              <div className="space-y-2">
                {teammates.map(player => (
                  <div key={player.id} className="text-sm bg-teal-50 p-3 rounded-lg">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-gray-600">
                      {gameState.hands[player.id].length} cards
                    </div>
                    {gameState.currentPlayer === player.id && (
                      <div className="text-xs text-green-600 font-semibold mt-1">
                        Current Turn
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Opponents */}
            <div>
              <h3 className="font-bold text-sm mb-2 text-gray-800">
                Opponents (Team {myTeam === 'A' ? 'B' : 'A'})
              </h3>
              <div className="space-y-2">
                {opponents.map(player => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedTarget(player.id)}
                    disabled={!isMyTurn || gameState.isPaused}
                    className={`w-full p-3 rounded-xl text-left transition ${
                      selectedTarget === player.id
                        ? 'bg-red-100 border-2 border-red-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    } ${!isMyTurn || gameState.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-xs text-gray-600">
                      {gameState.hands[player.id].length} cards
                    </div>
                    {gameState.currentPlayer === player.id && (
                      <div className="text-xs text-green-600 font-semibold mt-1">
                        Current Turn
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Game Area */}
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4">
            <div className="mb-4">
              {isMyTurn ? (
                <div className="bg-green-100 border border-green-500 text-green-800 p-3 rounded-xl text-center font-semibold">
                  Your Turn!
                </div>
              ) : (
                <div className="bg-gray-100 text-gray-600 p-3 rounded-xl text-center">
                  {players.find(p => p.id === gameState.currentPlayer)?.name}'s Turn
                </div>
              )}
            </div>

            {isMyTurn && !gameState.isPaused && (
              <button
                onClick={handleOpenCardSelector}
                disabled={!selectedTarget}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold mb-4 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {selectedTarget 
                  ? `Ask ${players.find(p => p.id === selectedTarget)?.name} for a card`
                  : 'Select an opponent first'}
              </button>
            )}

            <div className="bg-gray-50 rounded-xl p-4 h-80 overflow-y-auto mb-4">
              <h4 className="font-semibold mb-2 sticky top-0 bg-gray-50 z-10">Game Log</h4>
              <div className="space-y-1 text-sm">
                {gameState.gameLog.slice(-30).reverse().map((log, i) => (
                  <div key={i} className="p-2 bg-white rounded text-xs">
                    {log.type === 'ILLEGAL_QUESTION' && (
                      <span className="text-red-600">
                        ⚠ Illegal question by {players.find(p => p.id === log.askerId)?.name}
                        {log.reason === 'NO_CARD_IN_HALFSUIT' && ' - No card in half-suit'}
                        {log.reason === 'ALREADY_HAS_CARD' && ' - Already has the card'}
                        {log.reason === 'SAME_TEAM' && ' - Asked teammate'}
                      </span>
                    )}
                    {log.type === 'CLAIM_SUCCESS' && (
                      <span className="text-green-600 font-semibold">
                        ✓ Team {log.targetTeam} claimed {log.halfSuit}!
                        {log.claimerTeam !== log.targetTeam && ` (claimed by Team ${log.claimerTeam})`}
                      </span>
                    )}
                    {log.type === 'CLAIM_FAILED' && (
                      <span className="text-red-600 font-semibold">
                        ✗ Failed claim on {log.halfSuit} by Team {log.claimerTeam}
                      </span>
                    )}
                  </div>
                ))}
                {gameState.gameLog.length === 0 && (
                  <div className="text-gray-400 text-center py-8">
                    Game log will appear here
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleOpenClaimModal}
              disabled={!isMyTeamTurn}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Make Claim
            </button>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-teal-50 p-2 rounded">
                <div className="font-semibold">Team A</div>
                <div className="text-gray-600">
                  {gameState.claimedHalfSuits.A.length} claimed
                </div>
              </div>
              <div className="bg-red-50 p-2 rounded">
                <div className="font-semibold">Team B</div>
                <div className="text-gray-600">
                  {gameState.claimedHalfSuits.B.length} claimed
                </div>
              </div>
            </div>
          </div>

          {/* Right: My Hand*/}
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4">
            <h3 className="font-bold text-lg mb-3 text-gray-800">
              My Hand ({myHand.length})
            </h3>

            <div className="space-y-3">
              {orderedHalfSuits.map(hs => (
                <div key={hs}>
                  <div className="text-xs font-semibold text-gray-500 mb-1 uppercase">
                    {hs.replace('-', ' ')}
                  </div>

                  <div className="flex gap-2">
                    {groupedHand[hs].map(card => (
                      <Card
                        key={card.id}
                        card={card}
                        disabled={!isMyTurn || gameState.isPaused}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">How to Play</h2>
              <button onClick={() => setShowInstructions(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <b>Asking</b>
                <ol className="list-decimal list-inside text-xs mt-1">
                  <li>Select an opponent</li>
                  <li>Choose a card you don’t have</li>
                  <li>You must own a card in that half-suit</li>
                </ol>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg text-xs">
                <b>Claims:</b> You must know all 6 cards AND who owns them.
              </div>

              <div className="bg-red-50 p-3 rounded-lg text-xs">
                <b>No History Rule:</b> Card transfers are not logged.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Selector Modal */}
      {showCardSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Select Card to Ask From {players.find(p => p.id === selectedTarget)?.name}
              </h2>
              <button
                onClick={() => {
                  setShowCardSelector(false);
                  setSelectedCardToAsk(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {getUnclaimedCards().map(({ halfSuit, cards }) => {
                const [suit, type] = halfSuit.split('-');
                return (
                  <div key={halfSuit} className="border-2 border-gray-200 rounded-lg p-3">
                    <h3 className="font-semibold mb-2 text-sm capitalize">
                      {suit} - {type}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {cards.map(card => {
                        const canAsk = canAskForCard(card);
                        const isSelected = selectedCardToAsk?.id === card.id;
                        const display = getCardDisplay(card);
                        
                        return (
                          <button
                            key={card.id}
                            onClick={() => canAsk && handleSelectCardToAsk(card)}
                            disabled={!canAsk}
                            className={`aspect-[2/3] border-2 rounded-lg p-2 flex flex-col items-center justify-center transition ${
                              isSelected
                                ? 'border-green-500 bg-green-50 shadow-lg'
                                : canAsk
                                ? 'border-gray-300 hover:border-teal-300 hover:shadow'
                                : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className={`text-xl font-bold ${display.color}`}>
                              {display.value}
                            </div>
                            <div className={`text-2xl ${display.color}`}>
                              {display.symbol}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCardSelector(false);
                  setSelectedCardToAsk(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAskCard}
                disabled={!selectedCardToAsk}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Ask for {selectedCardToAsk?.value || 'Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Make a Claim</h2>
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setClaimHalfSuit('');
                  setClaimTargetTeam('');
                  setClaimDistribution({});
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Select Half-Suit to Claim:
              </label>
              <select
                value={claimHalfSuit}
                onChange={(e) => {
                  const hs = e.target.value;
                  setClaimHalfSuit(hs);

                  if (claimTargetTeam) {
                    const dist = {};
                    gameState.teams[claimTargetTeam].forEach(pid => {
                      dist[pid] = [];
                    });
                    setClaimDistribution(dist);
                  }
                }}
                className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              >
                <option value="">Choose a half-suit...</option>
                {getAvailableHalfSuits().map(hs => (
                  <option key={hs} value={hs}>
                    {hs.replace('-', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Which team has these cards?
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTargetTeamChange('A')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    claimTargetTeam === 'A'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Team A {myTeam === 'A' && '(Your Team)'}
                </button>
                <button
                  onClick={() => handleTargetTeamChange('B')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    claimTargetTeam === 'B'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Team B {myTeam === 'B' && '(Your Team)'}
                </button>
              </div>
            </div>

            {claimHalfSuit && claimTargetTeam && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">
                  Assign cards to {claimTargetTeam === myTeam ? 'teammates' : 'opponents'}:
                </h3>
                <div className="space-y-3">
                  {gameState.teams[claimTargetTeam].map(playerId => {
                    const player = players.find(p => p.id === playerId);
                    const cards = getCardsForHalfSuit(claimHalfSuit);
                    
                    return (
                      <div key={playerId} className="border-2 border-gray-200 rounded-lg p-3">
                        <div className="font-semibold mb-2">
                          {player.name} {playerId === socket.id && '(You)'}
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {cards.map(card => {
                            const isSelected = claimDistribution[playerId]?.some(c => c.id === card.id);
                            const display = getCardDisplay(card);
                            return (
                              <button
                                key={card.id}
                                onClick={() => toggleCardInClaim(playerId, card)}
                                className={`aspect-[2/3] border-2 rounded p-1 text-xs transition flex flex-col items-center justify-center ${
                                  isSelected
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-gray-300 hover:border-teal-300'
                                }`}
                              >
                                <div className={`font-bold ${display.color}`}>{display.value}</div>
                                <div className={display.color}>{display.symbol}</div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Selected: {claimDistribution[playerId]?.length || 0}/6
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setClaimHalfSuit('');
                  setClaimTargetTeam('');
                  setClaimDistribution({});
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-xl font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMakeClaim}
                disabled={!claimHalfSuit || !claimTargetTeam}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Submit Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;