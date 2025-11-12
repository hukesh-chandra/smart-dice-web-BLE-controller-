
import React from 'react';

interface DiceDisplayProps {
  value: number | null;
  isRolling: boolean;
}

const Dot: React.FC<{ position: string }> = ({ position }) => (
  <div className={`absolute w-10 h-10 bg-white rounded-full ${position}`}></div>
);

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
  return (
    <div className="relative w-48 h-48 bg-gray-800 border-4 border-gray-600 rounded-3xl p-4 grid grid-cols-3 grid-rows-3 gap-2">
      { (value === 1 || value === 3 || value === 5) && <Dot position="col-start-2 row-start-2" /> }
      { (value === 2 || value === 3 || value === 4 || value === 5 || value === 6) && <Dot position="col-start-1 row-start-1" /> }
      { (value === 2 || value === 3 || value === 4 || value === 5 || value === 6) && <Dot position="col-start-3 row-start-3" /> }
      { (value === 4 || value === 5 || value === 6) && <Dot position="col-start-3 row-start-1" /> }
      { (value === 4 || value === 5 || value === 6) && <Dot position="col-start-1 row-start-3" /> }
      { (value === 6) && <Dot position="col-start-1 row-start-2" /> }
      { (value === 6) && <Dot position="col-start-3 row-start-2" /> }
    </div>
  );
};


export const DiceDisplay: React.FC<DiceDisplayProps> = ({ value, isRolling }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 rounded-2xl shadow-lg min-h-[250px]">
      {isRolling ? (
         <div className="animate-spin text-6xl">🎲</div>
      ) : value !== null ? (
        <DiceFace value={value} />
      ) : (
        <div className="w-48 h-48 bg-gray-800 border-4 border-gray-600 rounded-3xl flex items-center justify-center">
            <span className="text-gray-500 text-2xl">Ready</span>
        </div>
      )}
    </div>
  );
};
