import React from 'react';
import { getCardDisplay } from '../lib/constants';

const Card = ({ card, selected, onClick, disabled }) => {
  const display = getCardDisplay(card);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`aspect-[2/3] bg-white border-2 rounded-lg p-2 flex flex-col items-center justify-center transition-all ${
        selected
          ? 'border-teal-500 bg-teal-50 shadow-lg scale-105'
          : 'border-gray-300 hover:border-teal-300 hover:shadow'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`text-2xl font-bold ${display.color}`}>{display.value}</div>
      <div className={`text-3xl ${display.color}`}>{display.symbol}</div>
    </button>
  );
};

export default Card;