import React, { useState, useEffect } from 'react';
import { Play, Pause, Trophy, AlertCircle, X, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import Card from './Card';
import { getHalfSuit, SUITS, LOW_CARDS, HIGH_CARDS, getCardDisplay, TEAM_COLORS } from '../lib/constants';

const GameScreen = ({ room, socket, onAskCard, onMakeClaim, onTogglePause }) => {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [selectedCardToAsk, setSelectedCardToAsk] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimHalfSuit, setClaimHalfSuit] = useState('');
  const [claimTargetTeam, setClaimTargetTeam] = useState('');
  const [claimDistribution, setClaimDistribution] = useState({});
  const [showInstructions, setShowInstructions] = useState(false);

  const [showTransactionAnimation, setShowTransactionAnimation] = useState(false);
  const [prevTransaction, setPrevTransaction] = useState(null);

  const gameState = room.gameState;
  const players = room.players;

  useEffect(() => {
    if (gameState.lastTransaction &&
      gameState.lastTransaction.timestamp !== prevTransaction?.timestamp) {
      setShowTransactionAnimation(true);
      setPrevTransaction(gameState.lastTransaction);

      // Hide animation after appropriate time
      const duration = gameState.lastTransaction.type.startsWith('CLAIM') ? 5000 : 4000;
      const timer = setTimeout(() => {
        setShowTransactionAnimation(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [gameState.lastTransaction]);

  useEffect(() => {
    if (gameState.isPaused && showCardSelector) {
      setShowCardSelector(false);
      setSelectedCardToAsk(null);
      setSelectedTarget(null);
    }
  }, [gameState.isPaused]);

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
    const winnerTeam = gameState.winner;
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <Trophy className={`w-24 h-24 mx-auto mb-6 ${TEAM_COLORS[winnerTeam].primary}`} />
          <h1 className={`text-4xl font-bold mb-4 ${TEAM_COLORS[winnerTeam].primary}`}>
            {TEAM_COLORS[winnerTeam].name} Wins!
          </h1>
          <div className="text-2xl mb-8 flex items-center justify-center gap-4">
            <span className={`font-bold ${TEAM_COLORS.A.primary}`}>
              {TEAM_COLORS.A.name}: {gameState.claimedHalfSuits.A.length}
            </span>
            <span className="text-gray-400">-</span>
            <span className={`font-bold ${TEAM_COLORS.B.primary}`}>
              {TEAM_COLORS.B.name}: {gameState.claimedHalfSuits.B.length}
            </span>
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

  const myPlayer = players.find(p => p.id === socket.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Transaction/Claim Animation Overlay */}
        {showTransactionAnimation && gameState.lastTransaction && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full mx-4 animate-[slideIn_0.5s_ease-out]">
              {/* Card Transfer Animations */}
              {gameState.lastTransaction.type === 'CARD_GIVEN' && (
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-green-500 animate-[bounce_1s_ease-in-out_2]" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-green-600 mb-4">Card Transferred!</h2>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-xs sm:text-sm text-gray-600 mb-2">From</div>
                      <div className="bg-red-100 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-base sm:text-lg">
                        {players.find(p => p.id === gameState.lastTransaction.targetId)?.name}
                      </div>
                    </div>

                    <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 animate-[pulse_1s_ease-in-out_infinite] rotate-90 sm:rotate-0" />

                    <div className="text-center">
                      <div className="text-xs sm:text-sm text-gray-600 mb-2">To</div>
                      <div className="bg-green-100 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-base sm:text-lg">
                        {players.find(p => p.id === gameState.lastTransaction.askerId)?.name}
                      </div>
                    </div>
                  </div>

                  <div className="inline-block bg-gradient-to-br from-white to-gray-50 p-4 sm:p-6 rounded-2xl shadow-xl border-4 border-yellow-400 animate-[spin_2s_ease-in-out_1]">
                    {(() => {
                      const display = getCardDisplay(gameState.lastTransaction.card);
                      return (
                        <div className="text-center">
                          <div className={`text-4xl sm:text-5xl font-bold ${display.color}`}>
                            {display.value}
                          </div>
                          <div className={`text-5xl sm:text-6xl ${display.color}`}>
                            {display.symbol}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {gameState.lastTransaction.type === 'CARD_NOT_FOUND' && (
                <div className="text-center">
                  <XCircle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-red-500 animate-[shake_0.5s_ease-in-out_2]" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4">Card Not Found!</h2>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-4">
                    <div className="text-center">
                      <div className="bg-blue-100 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-base sm:text-lg">
                        {players.find(p => p.id === gameState.lastTransaction.askerId)?.name}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-2">Asked</div>
                    </div>

                    <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 rotate-90 sm:rotate-0" />

                    <div className="text-center">
                      <div className="bg-gray-200 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-base sm:text-lg">
                        {players.find(p => p.id === gameState.lastTransaction.targetId)?.name}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-2">Doesn't have it</div>
                    </div>
                  </div>

                  <div className="inline-block bg-gradient-to-br from-gray-200 to-gray-300 p-4 sm:p-6 rounded-2xl shadow-xl opacity-50">
                    {(() => {
                      const display = getCardDisplay(gameState.lastTransaction.card);
                      return (
                        <div className="text-center">
                          <div className={`text-4xl sm:text-5xl font-bold ${display.color}`}>
                            {display.value}
                          </div>
                          <div className={`text-5xl sm:text-6xl ${display.color}`}>
                            {display.symbol}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Successful Claim Animation */}
              {gameState.lastTransaction.type === 'CLAIM_SUCCESS' && (
                <div className="text-center">
                  <div className="relative mb-6">
                    <Trophy className="w-20 h-20 sm:w-24 sm:h-24 mx-auto text-yellow-500 animate-[bounce_1s_ease-in-out_3]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 bg-yellow-400 rounded-full opacity-20 animate-ping"></div>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-4xl font-bold text-yellow-600 mb-2">
                    Claim Successful! 🎉
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-700 mb-6">
                    <span className="font-bold text-teal-600">Team {gameState.lastTransaction.awardedTeam}</span> gets the half-suit!
                  </p>

                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-4 sm:p-6 rounded-2xl border-2 border-yellow-400 mb-4">
                    <div className="text-xl sm:text-2xl font-bold text-amber-800 mb-3">
                      {gameState.lastTransaction.halfSuit.replace('-', ' ').toUpperCase()}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {(() => {
                        const [suit, type] = gameState.lastTransaction.halfSuit.split('-');
                        const cardList = type === 'low' ? LOW_CARDS : HIGH_CARDS;
                        return cardList.map((value, i) => {
                          const display = getCardDisplay({ suit, value });
                          return (
                            <div
                              key={i}
                              className="bg-white p-2 sm:p-3 rounded-lg shadow-lg border-2 border-yellow-300 animate-[bounce_1s_ease-in-out]"
                              style={{ animationDelay: `${i * 0.1}s` }}
                            >
                              <div className={`text-lg sm:text-xl font-bold ${display.color}`}>
                                {value}{display.symbol}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {gameState.lastTransaction.claimerTeam !== gameState.lastTransaction.awardedTeam && (
                    <p className="text-sm text-amber-700 italic">
                      Claimed by Team {gameState.lastTransaction.claimerTeam} for Team {gameState.lastTransaction.awardedTeam}
                    </p>
                  )}
                </div>
              )}

              {/* Failed Claim Animation */}
              {gameState.lastTransaction.type === 'CLAIM_FAILED' && (
                <div className="text-center">
                  <XCircle className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 text-red-500 animate-[shake_0.5s_ease-in-out_3]" />

                  <h2 className="text-2xl sm:text-4xl font-bold text-red-600 mb-2">
                    Claim Failed! ❌
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-700 mb-6">
                    <span className="font-bold text-red-600">Team {gameState.lastTransaction.claimerTeam}</span> made an incorrect claim
                  </p>

                  <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 sm:p-6 rounded-2xl border-2 border-red-400 mb-4">
                    <div className="text-xl sm:text-2xl font-bold text-red-800 mb-3">
                      {gameState.lastTransaction.halfSuit.replace('-', ' ').toUpperCase()}
                    </div>
                    <p className="text-sm sm:text-base text-red-700 mb-3">
                      This half-suit now goes to...
                    </p>
                    <div className="bg-green-500 text-white text-2xl sm:text-3xl font-bold py-3 px-6 rounded-xl inline-block animate-[bounce_1s_ease-in-out_2]">
                      Team {gameState.lastTransaction.awardedTeam}! 🎊
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 italic">
                    Incorrect claims give the half-suit to the other team!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-teal-600">🐟 FISH</div>
            <div className={`text-sm px-3 py-1 rounded-lg ${TEAM_COLORS[myTeam].bgMedium} border-2 ${TEAM_COLORS[myTeam].border}`}>
              <div className={`font-bold ${TEAM_COLORS[myTeam].primary}`}>{TEAM_COLORS[myTeam].name}</div>
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
            <div className={`mb-4 ${TEAM_COLORS[myTeam].bg} p-3 rounded-xl border-2 ${TEAM_COLORS[myTeam].border}`}>
              <div className={`font-semibold ${TEAM_COLORS[myTeam].primaryDark}`}>
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
              <h4 className={`font-semibold text-sm mb-2 ${TEAM_COLORS[myTeam].primary}`}>{TEAM_COLORS[myTeam].name}</h4>
              <div className="space-y-2">
                {teammates.map(player => (
                  <div key={player.id} className={`text-sm ${TEAM_COLORS[myTeam].bg} p-3 rounded-lg border ${TEAM_COLORS[myTeam].borderLight}`}>
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
              <h3 className={`font-bold text-sm mb-2 ${TEAM_COLORS[myTeam === 'A' ? 'B' : 'A'].primary}`}>
                {TEAM_COLORS[myTeam === 'A' ? 'B' : 'A'].name}
              </h3>
              <div className="space-y-2">
                {opponents.map(player => {
                  const opponentTeam = myTeam === 'A' ? 'B' : 'A';
                  return (
                    <button
                      key={player.id}
                      onClick={() => setSelectedTarget(player.id)}
                      disabled={!isMyTurn || gameState.isPaused}
                      className={`w-full p-3 rounded-xl text-left transition ${selectedTarget === player.id
                        ? `${TEAM_COLORS[opponentTeam].bgMedium} border-2 ${TEAM_COLORS[opponentTeam].border}`
                        : `${TEAM_COLORS[opponentTeam].bg} hover:${TEAM_COLORS[opponentTeam].bgMedium} border-2 ${TEAM_COLORS[opponentTeam].borderLight}`
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
                  );
                })}
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

            {/* Last Transaction Display */}
            {gameState.lastTransaction && (
              <div className={`mb-4 p-4 rounded-xl border-2 ${gameState.lastTransaction.type === 'CARD_GIVEN'
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
                }`}>
                <div className="text-xs font-semibold mb-2 text-gray-600">Last Action:</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">
                    {players.find(p => p.id === gameState.lastTransaction.askerId)?.name}
                  </span>
                  <ArrowRight size={16} className="text-gray-400" />
                  <span className="font-semibold">
                    {players.find(p => p.id === gameState.lastTransaction.targetId)?.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {(() => {
                    const display = getCardDisplay(gameState.lastTransaction.card);
                    return (
                      <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-lg">
                        <span className={`text-lg font-bold ${display.color}`}>
                          {display.value}{display.symbol}
                        </span>
                        {gameState.lastTransaction.type === 'CARD_GIVEN' ? (
                          <CheckCircle size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-600" />
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

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
              <div className={`${TEAM_COLORS.A.bg} p-2 rounded border ${TEAM_COLORS.A.borderLight}`}>
                <div className={`font-semibold ${TEAM_COLORS.A.primary}`}>{TEAM_COLORS.A.name}</div>
                <div className="text-gray-600">
                  {gameState.claimedHalfSuits.A.length} claimed
                </div>
              </div>
              <div className={`${TEAM_COLORS.B.bg} p-2 rounded border ${TEAM_COLORS.B.borderLight}`}>
                <div className={`font-semibold ${TEAM_COLORS.B.primary}`}>{TEAM_COLORS.B.name}</div>
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
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-teal-600">🐟 How to Play Fish</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Objective */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border-l-4 border-teal-500">
                <h3 className="font-bold text-lg mb-2 text-teal-800">🎯 Objective</h3>
                <p className="text-sm text-gray-700">
                  Work with your team to collect complete <strong>half-suits</strong> (6 cards each).
                  The team that correctly claims the most half-suits wins the game!
                </p>
              </div>

              {/* Game Setup */}
              <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                <h3 className="font-bold text-lg mb-2 text-blue-800">🎴 What's a Half-Suit?</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Each suit is split into two half-suits (8 total in the game):
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded">
                    <span className="font-semibold">Low Cards:</span> 2, 3, 4, 5, 6, 7
                  </div>
                  <div className="bg-white p-2 rounded">
                    <span className="font-semibold">High Cards:</span> 9, 10, J, Q, K, A
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  <em>Note: All 8s are removed from the deck</em>
                </p>
              </div>

              {/* Asking for Cards */}
              <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
                <h3 className="font-bold text-lg mb-2 text-green-800">❓ Asking for Cards</h3>
                <p className="text-sm text-gray-700 mb-2">On your turn:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                  <li>
                    <strong>Select an opponent</strong> from the other team
                  </li>
                  <li>
                    <strong>Ask for a specific card</strong> you DON'T have (but you must have another card in that same half-suit)
                  </li>
                  <li>
                    <strong>If they have it:</strong> They give it to you and you continue asking
                  </li>
                  <li>
                    <strong>If they don't have it:</strong> Their turn begins
                  </li>
                </ol>
                <div className="bg-white p-3 rounded-lg mt-3 text-xs border border-green-200">
                  <strong className="text-green-700">Example:</strong> If you have the 2♥, you can ask for 3♥, 4♥, 5♥, 6♥, or 7♥
                  (any other low hearts you don't have). You CANNOT ask for 2♥ (you have it) or 9♥ (different half-suit).
                </div>
              </div>

              {/* Illegal Questions */}
              <div className="bg-red-50 p-4 rounded-xl border-l-4 border-red-500">
                <h3 className="font-bold text-lg mb-2 text-red-800">⚠️ Illegal Questions</h3>
                <p className="text-sm text-gray-700 mb-2">Your question is <strong>illegal</strong> if you:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Ask for a card you already have</li>
                  <li>Ask for a card when you have NO cards in that half-suit</li>
                  <li>Ask a teammate (must ask opponents only)</li>
                </ul>
                <p className="text-xs text-red-700 mt-2 font-semibold">
                  Penalty: Your turn immediately ends and passes to the person you asked.
                </p>
              </div>

              {/* Making Claims */}
              <div className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-500">
                <h3 className="font-bold text-lg mb-2 text-amber-800">🏆 Making Claims</h3>
                <p className="text-sm text-gray-700 mb-2">
                  When you know the location of <strong>all 6 cards</strong> in a half-suit:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                  <li>Click "Make Claim" (only available during your team's turn)</li>
                  <li>Select the half-suit you're claiming</li>
                  <li>
                    <strong>Choose which team</strong> has the cards:
                    <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                      <li>Your team (most common)</li>
                      <li>Opponent's team (if you tracked their cards!)</li>
                    </ul>
                  </li>
                  <li>Assign each card to the correct player</li>
                </ol>
                <div className="bg-white p-3 rounded-lg mt-3 border border-amber-200">
                  <p className="text-xs text-amber-900">
                    <strong className="text-amber-700">✓ Correct Claim:</strong> Your team gets the half-suit!
                  </p>
                  <p className="text-xs text-amber-900 mt-1">
                    <strong className="text-red-700">✗ Wrong Claim:</strong> The OTHER team gets the half-suit!
                  </p>
                </div>
              </div>

              {/* No History Rule */}
              <div className="bg-purple-50 p-4 rounded-xl border-l-4 border-purple-500">
                <h3 className="font-bold text-lg mb-2 text-purple-800">🧠 No History Rule</h3>
                <p className="text-sm text-gray-700">
                  Card transfers are <strong>NOT logged</strong> in the game log! Only illegal questions
                  and claims appear. You must remember:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2 mt-2">
                  <li>Who asked for which cards</li>
                  <li>Whether they received them</li>
                  <li>What cards each player likely has</li>
                </ul>
                <p className="text-xs text-purple-700 mt-2 italic">
                  💡 Pay close attention! Memory is your greatest asset.
                </p>
              </div>

              {/* Pause Button */}
              <div className="bg-gray-50 p-4 rounded-xl border-l-4 border-gray-400">
                <h3 className="font-bold text-lg mb-2 text-gray-800">⏸️ Pause Button</h3>
                <p className="text-sm text-gray-700">
                  Only available during <strong>your team's turn</strong>. Use it to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2 mt-2">
                  <li>Think through card locations</li>
                  <li>Recall previous questions</li>
                  <li>Plan your strategy</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  Any teammate can pause or unpause the game.
                </p>
              </div>

              {/* Strategy Tips */}
              <div className="bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500">
                <h3 className="font-bold text-lg mb-2 text-indigo-800">💡 Pro Tips</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Track which cards opponents ask for (they have cards in that half-suit!)</li>
                  <li>Note when opponents DON'T have a card (helps narrow down locations)</li>
                  <li>Coordinate with teammates - use the pause button to discuss strategy</li>
                  <li>Only claim when you're 100% certain - wrong claims help the other team!</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold text-lg hover:shadow-lg transition"
            >
              Got it! Let's Play 🐟
            </button>
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
                            className={`aspect-[2/3] border-2 rounded-lg p-2 flex flex-col items-center justify-center transition ${isSelected
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
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${claimTargetTeam === 'A'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  Team A {myTeam === 'A' && '(Your Team)'}
                </button>
                <button
                  onClick={() => handleTargetTeamChange('B')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${claimTargetTeam === 'B'
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
                                className={`aspect-[2/3] border-2 rounded p-1 text-xs transition flex flex-col items-center justify-center ${isSelected
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