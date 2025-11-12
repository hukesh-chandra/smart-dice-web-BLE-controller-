import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useBluetoothDice } from './hooks/useBluetoothDice';
import { DiceDisplay } from './components/DiceDisplay';
import { GameControls } from './components/GameControls';
import { Scoreboard } from './components/Scoreboard';
import { Log } from './components/Log';
import { GameState, GameMode, Player } from './types';

const initialState: GameState = {
  mode: GameMode.FREE,
  scoreA: 0,
  scoreB: 0,
  turn: null,
  rounds: 5,
  currentRound: 0,
  raceTarget: 0,
  countdownStart: 50,
  winner: null,
  lastRoll: null,
  message: '',
};

function App() {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'roll' | 'end' | 'win' | 'error') => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
        case 'roll':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            break;
        case 'end':
             oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            break;
        case 'win':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.linearRampToValueAtTime(1046.50, audioContext.currentTime + 0.3); // C6
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
            break;
        case 'error':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            break;
    }

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1);
  }, []);


  const handleDataReceived = useCallback((data: string) => {
    setLogs((prev) => [...prev.slice(-100), data]);

    const lowerData = data.toLowerCase();

    // Roll result
    if (lowerData.startsWith('rolled:')) {
      const num = parseInt(data.substring(8), 10);
      setGameState((prev) => ({ ...prev, lastRoll: num }));
      setIsRolling(false);
      playSound('end');
    }
    // Game mode start
    else if (lowerData.includes('game mode started')) {
        const roundsMatch = data.match(/Rounds: (\d+)/);
        const rounds = roundsMatch ? parseInt(roundsMatch[1], 10) : 5;
        setGameState({
            ...initialState,
            mode: GameMode.GAME,
            rounds: rounds,
            currentRound: 1,
            turn: Player.A,
            message: 'Player A to roll',
        });
    } else if (lowerData.includes('race mode started')) {
        const targetMatch = data.match(/Target: (\d+)/);
        const target = targetMatch ? parseInt(targetMatch[1], 10) : 20;
        setGameState({
            ...initialState,
            mode: GameMode.RACE,
            raceTarget: target,
            turn: Player.A,
            message: 'Player A to roll',
        });
    } else if (lowerData.includes('countdown mode started')) {
        const scoreMatch = data.match(/Start Score: (\d+)/);
        const startScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
        setGameState({
            ...initialState,
            mode: GameMode.COUNTDOWN,
            countdownStart: startScore,
            scoreA: startScore,
            scoreB: startScore,
            turn: Player.A,
            message: 'Player A to roll',
        });
    }
    // Player turn
    else if (lowerData.includes('player a turn')) {
        setGameState((prev) => ({...prev, turn: Player.A, message: 'Player A to roll'}));
    } else if (lowerData.includes('player b turn') || lowerData.includes('next turn: player b')) {
        setGameState((prev) => ({...prev, turn: Player.B, message: 'Player B to roll'}));
    } else if (lowerData.includes('next turn: player a')) {
        setGameState((prev) => ({...prev, turn: Player.A, message: 'Player A to roll'}));
    }
     // Bust message for Countdown
    else if (lowerData.includes('busts!')) {
        setGameState(prev => ({ ...prev, message: data }));
    }
    // Score updates (authoritative state)
    else if (lowerData.startsWith('scores ->')) { // "Scores -> A: 10 B: 5"
        const scoresMatch = data.match(/A: (\d+)\s+B: (\d+)/);
        if (scoresMatch) {
            setGameState(prev => ({...prev, scoreA: parseInt(scoresMatch[1]), scoreB: parseInt(scoresMatch[2])}));
        }
    }
    // Round end
    else if (lowerData.startsWith('round') && lowerData.endsWith('finished.')) {
        setGameState(prev => ({...prev, currentRound: prev.currentRound + 1}));
    }
    // Game over
    else if (lowerData.includes('winner: player a')) {
      setGameState(prev => ({...prev, winner: Player.A, turn: null, message: 'Player A Wins!'}));
      playSound('win');
    } else if (lowerData.includes('winner: player b')) {
      setGameState(prev => ({...prev, winner: Player.B, turn: null, message: 'Player B Wins!'}));
      playSound('win');
    } else if (lowerData.includes('draw!') || lowerData.includes('tie!')) {
      setGameState(prev => ({...prev, winner: 'Draw', turn: null, message: `It's a Draw!`}));
    }
    // Reset
    else if (lowerData.includes('reset done')) {
        setGameState(initialState);
        setLogs([]);
    }

  }, [playSound]);

  const { connect, disconnect, sendCommand, isConnected, isConnecting, error } = useBluetoothDice(handleDataReceived);
  
  const handleCommand = useCallback((command: string) => {
    if (command === 'ROLL') {
        setIsRolling(true);
        setGameState(prev => ({ ...prev, lastRoll: null, message: '' }));
        playSound('roll');
    }
    sendCommand(command);
  }, [sendCommand, playSound]);

  useEffect(() => {
    if (isRolling) {
      const timeout = setTimeout(() => {
        // Failsafe to stop rolling animation if no response
        if(isRolling) {
            setIsRolling(false);
            setGameState(prev => ({...prev, message: 'No response from dice.'}));
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isRolling]);

  const gameActive = (gameState.mode !== GameMode.FREE && !gameState.winner);
  const canRoll = (gameActive || gameState.mode === GameMode.FREE) && !gameState.winner;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-500 tracking-wider">
            Smart Dice Controller
          </h1>
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              isConnected ? 'bg-red-600 hover:bg-red-700' :
              isConnecting ? 'bg-gray-600 animate-pulse' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isConnected ? 'Disconnect' : isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </header>

        {error && <p className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg mb-4">Error: {error}</p>}

        <main className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <DiceDisplay value={gameState.lastRoll} isRolling={isRolling} />
            {canRoll && (
              <button
                onClick={() => handleCommand('ROLL')}
                disabled={!isConnected || isRolling}
                className="w-48 py-4 px-4 rounded-lg font-bold text-white transition-all duration-200 focus:outline-none focus:ring-4 text-xl bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isRolling ? 'Rolling...' : 'Roll Dice'}
              </button>
            )}
          </div>

          <div className="space-y-6">
            <GameControls onCommand={handleCommand} isConnected={isConnected} gameActive={gameActive} />
            <Scoreboard gameState={gameState} />
          </div>
        </main>
        
        <footer className="mt-6">
          <Log logs={logs} />
        </footer>
      </div>
    </div>
  );
}

export default App;