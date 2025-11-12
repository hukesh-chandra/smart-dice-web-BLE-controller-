import React from 'react';
import { GameState, Player } from '../types';
import { SevenSegmentDisplay } from './SevenSegmentDisplay';

// Maps digits 0-9 to their 7-segment display bitmask representation.
// The bitmask format is 0b_gfedcba, where 'a' is the LSB.
// This map has been updated to use standard, universally recognized patterns.
const SEVEN_SEGMENT_MAP: number[] = [
  0b0111111, // 0
  0b0000110, // 1
  0b1011011, // 2
  0b1001111, // 3
  0b1100110, // 4
  0b1101101, // 5
  0b1111101, // 6
  0b0000111, // 7
  0b1111111, // 8
  0b1101111, // 9
];

const SegmentNumberDisplay: React.FC<{ value: number; litColor?: string }> = ({ value, litColor }) => {
  // Display up to 3 digits, padding with invisible placeholders to ensure alignment.
  const stringValue = Math.max(0, value).toString().slice(-3).padStart(3, ' ');

  return (
    <div className="flex justify-center items-center h-[80px]">
      {stringValue.split('').map((digit, index) => {
        if (digit === ' ') {
          return <div key={index} className="w-[50px] h-[80px]" />; // Placeholder for padding
        }
        const digitValue = parseInt(digit, 10);
        return <SevenSegmentDisplay key={index} value={SEVEN_SEGMENT_MAP[digitValue]} litColor={litColor} />;
      })}
    </div>
  );
};

interface PlayerScoreProps {
  name: string;
  score: number;
  isTurn: boolean;
}

const PlayerScore: React.FC<PlayerScoreProps> = ({ name, score, isTurn }) => {
  const litColor = isTurn ? '#ffffff' : '#ef4444';
  const bgColor = isTurn ? 'bg-red-600 shadow-lg scale-105' : 'bg-gray-700';

  return (
    <div className={`p-4 rounded-lg transition-all duration-300 ${bgColor}`}>
      <div className={`text-sm mb-1 ${isTurn ? 'text-red-100' : 'text-gray-300'}`}>{name}</div>
      <SegmentNumberDisplay value={score} litColor={litColor} />
    </div>
  );
};


export const Scoreboard: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const { scoreA, scoreB, turn, mode, currentRound, rounds, raceTarget, winner } = gameState;

  const getGameStatusText = () => {
    if (winner) {
      return winner === 'Draw' ? "Game Over: It's a Draw!" : `Game Over: ${winner} Wins!`;
    }
    if (mode === 'MODE_GAME') {
      return `Round ${currentRound} of ${rounds}`;
    }
    if (mode === 'MODE_RACE') {
      return `Race to ${raceTarget}`;
    }
    if (mode === 'MODE_COUNTDOWN') {
        return `Countdown from ${gameState.countdownStart}`;
    }
    return 'Free Roll Mode';
  };

  const gameActive = mode !== 'MODE_FREE';

  if (!gameActive && !winner) {
    return null;
  }
  
  return (
    <div className="bg-gray-800 p-4 rounded-2xl shadow-lg space-y-3">
        <h3 className="text-lg font-semibold text-center text-white">{getGameStatusText()}</h3>
        <div className="grid grid-cols-2 gap-4">
            <PlayerScore name="Player A" score={scoreA} isTurn={turn === Player.A} />
            <PlayerScore name="Player B" score={scoreB} isTurn={turn === Player.B} />
        </div>
        {gameState.message && (
            <p className="text-center text-red-400 pt-2 h-6">{gameState.message}</p>
        )}
    </div>
  );
};
