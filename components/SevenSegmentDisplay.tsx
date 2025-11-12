
import React from 'react';

interface SevenSegmentDisplayProps {
  value: number; // A bitmask: 0b_gfedcba
  litColor?: string;
  unlitColor?: string;
}

const Segment: React.FC<{ on: boolean; orientation: 'h' | 'v'; position: string; litColor: string; unlitColor: string }> = ({ on, orientation, position, litColor, unlitColor }) => {
  const baseClasses = 'absolute transition-colors duration-200';
  const orientationClasses = orientation === 'h' ? 'w-[32px] h-[8px]' : 'w-[8px] h-[32px]';
  const color = on ? litColor : unlitColor;

  return <div className={`${baseClasses} ${orientationClasses} ${position}`} style={{ backgroundColor: color }} />;
};

export const SevenSegmentDisplay: React.FC<SevenSegmentDisplayProps> = ({ value, litColor = '#ef4444', unlitColor = 'rgba(239, 68, 68, 0.1)' }) => {
  const isOn = (segment: number) => (value & (1 << segment)) !== 0;

  return (
    <div className="relative w-[50px] h-[80px]">
      {/* Segment A (top) */}
      <Segment on={isOn(0)} orientation="h" position="top-0 left-[9px]" litColor={litColor} unlitColor={unlitColor} />
      {/* Segment B (top-right) */}
      <Segment on={isOn(1)} orientation="v" position="top-[9px] right-0" litColor={litColor} unlitColor={unlitColor} />
      {/* Segment C (bottom-right) */}
      <Segment on={isOn(2)} orientation="v" position="bottom-[9px] right-0" litColor={litColor} unlitColor={unlitColor} />
      {/* Segment D (bottom) */}
      <Segment on={isOn(3)} orientation="h" position="bottom-0 left-[9px]" litColor={litColor} unlitColor={unlitColor} />
      {/* Segment E (bottom-left) */}
      <Segment on={isOn(4)} orientation="v" position="bottom-[9px] left-0" litColor={litColor} unlitColor={unlitColor} />
      {/* Segment F (top-left) */}
      <Segment on={isOn(5)} orientation="v" position="top-[9px] left-0" litColor={litColor} unlitColor={unlitColor} />
      {/* Segment G (middle) */}
      <Segment on={isOn(6)} orientation="h" position="top-1/2 -mt-[4px] left-[9px]" litColor={litColor} unlitColor={unlitColor} />
    </div>
  );
};
