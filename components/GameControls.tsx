import React, { useState } from 'react';
import { GameMode } from '../types';

interface GameControlsProps {
  onCommand: (command: string) => void;
  isConnected: boolean;
  gameActive: boolean;
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
      active ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`}
  >
    {children}
  </button>
);

const GameInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center space-x-2">
        <label className="text-gray-300 text-sm w-24">{label}:</label>
        <input 
            type="number"
            value={value}
            onChange={onChange}
            className="w-20 bg-gray-900 border border-gray-600 text-white rounded-md px-2 py-1 text-center"
        />
    </div>
);


export const GameControls: React.FC<GameControlsProps> = ({ onCommand, isConnected, gameActive }) => {
  const [activeTab, setActiveTab] = useState<GameMode>(GameMode.FREE);
  const [rounds, setRounds] = useState('5');
  const [raceTarget, setRaceTarget] = useState('20');
  const [countdownStart, setCountdownStart] = useState('50');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleStartGame = () => {
    switch (activeTab) {
      case GameMode.GAME:
        if (parseInt(rounds, 10) > 0) {
          onCommand(`SETROUNDS ${rounds}`);
          onCommand('GAME');
        }
        break;
      case GameMode.RACE:
        if (parseInt(raceTarget, 10) > 0) {
          onCommand(`RACE ${raceTarget}`);
        }
        break;
      case GameMode.COUNTDOWN:
        if (parseInt(countdownStart, 10) > 0) {
          onCommand(`COUNTDOWN ${countdownStart}`);
        }
        break;
    }
  };
  
  const handleSoundToggle = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    onCommand(newState ? 'SOUND ON' : 'SOUND OFF');
  }

  const baseButtonClasses = "w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-200 focus:outline-none focus:ring-4";
  const disabledClasses = "bg-gray-600 cursor-not-allowed";

  return (
    <div className="bg-gray-800 p-4 rounded-2xl shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Controls</h2>
        <button onClick={handleSoundToggle} className="text-2xl">
            {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      <div className="flex space-x-2">
        <TabButton active={activeTab === GameMode.FREE} onClick={() => setActiveTab(GameMode.FREE)}>Free Roll</TabButton>
        <TabButton active={activeTab === GameMode.GAME} onClick={() => setActiveTab(GameMode.GAME)}>A vs B</TabButton>
        <TabButton active={activeTab === GameMode.RACE} onClick={() => setActiveTab(GameMode.RACE)}>Race</TabButton>
        <TabButton active={activeTab === GameMode.COUNTDOWN} onClick={() => setActiveTab(GameMode.COUNTDOWN)}>Countdown</TabButton>
      </div>
      
      {activeTab !== GameMode.FREE && !gameActive && (
        <div className="bg-gray-700 p-3 rounded-lg space-y-3">
          {activeTab === GameMode.GAME && <GameInput label="Rounds" value={rounds} onChange={(e) => setRounds(e.target.value)} />}
          {activeTab === GameMode.RACE && <GameInput label="Race Target" value={raceTarget} onChange={(e) => setRaceTarget(e.target.value)} />}
          {activeTab === GameMode.COUNTDOWN && <GameInput label="Start Score" value={countdownStart} onChange={(e) => setCountdownStart(e.target.value)} />}
        </div>
      )}

      <div className="space-y-3 pt-2">
        { activeTab !== GameMode.FREE && !gameActive && (
            <button onClick={handleStartGame} disabled={!isConnected} className={`${baseButtonClasses} ${!isConnected ? disabledClasses : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}>
                Start Game
            </button>
        )}
        <button onClick={() => onCommand('RESET')} disabled={!isConnected} className={`${baseButtonClasses} ${!isConnected ? disabledClasses : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}>
          Reset
        </button>
      </div>
    </div>
  );
};