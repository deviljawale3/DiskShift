import React, { useEffect, useState } from 'react';
import { RodId } from '../types.ts';
import { sounds } from '../services/soundService.ts';
import Disk from './Disk.tsx';

interface RodProps {
  id: RodId;
  disks: number[];
  maxDisks: number;
  isSelected: boolean;
  canReceive: boolean;
  onRodClick: (id: RodId) => void;
  onDragStart?: (rodId: RodId) => void;
  onDrop?: (rodId: RodId) => void;
  isSolving: boolean;
  isLastTarget?: boolean;
  movingDiskSize?: number;
  isObjective?: boolean;
  isStart?: boolean;
}

const Rod: React.FC<RodProps> = ({ 
  id, disks, maxDisks, isSelected, canReceive, onRodClick, onDragStart, 
  onDrop, isSolving, isLastTarget, movingDiskSize, isObjective, isStart 
}) => {
  const [pulse, setPulse] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showDataStreak, setShowDataStreak] = useState(false);

  useEffect(() => {
    if (isLastTarget) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [disks.length, isLastTarget]);

  useEffect(() => {
    if (movingDiskSize && isLastTarget) {
      setShowDataStreak(true);
      const timer = setTimeout(() => setShowDataStreak(false), 850);
      return () => clearTimeout(timer);
    }
  }, [movingDiskSize, isLastTarget]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canReceive && !isOver) {
      setIsOver(true);
      sounds.playHover();
    }
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDropLocal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    if (onDrop) onDrop(id);
  };

  const getRoleText = () => {
    if (isObjective) return "Target Objective";
    if (isStart) return "Source Origin";
    return "Auxiliary Hub";
  };

  return (
    <div 
      className={`
        relative flex flex-col items-center justify-end h-full w-[32%] group
        transition-all duration-400 rounded-3xl
        ${!isSolving ? 'cursor-pointer' : 'cursor-default'}
        ${isOver || (isHovered && !isSolving) ? 'bg-sky-500/15 scale-[1.08] shadow-[0_0_40px_rgba(14,165,233,0.1)]' : ''}
        ${isSelected ? 'bg-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)]' : ''}
      `}
      onClick={() => onRodClick(id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropLocal}
      onMouseEnter={() => {
        setIsHovered(true);
        if (!isSolving) sounds.playHover();
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tactical Tooltip */}
      <div className={`
        absolute -top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-900/95 
        border border-white/15 backdrop-blur-2xl shadow-3xl transition-all duration-300
        ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        pointer-events-none z-[100] whitespace-nowrap
      `}>
        <span className="text-[11px] font-black tracking-[0.15em] text-sky-400 uppercase italic">
          {getRoleText()}
        </span>
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-white/15" />
      </div>

      {isObjective && (
        <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 z-40">
          <div className="bg-sky-500/25 text-sky-300 text-[8px] font-black py-0.5 px-3 rounded-full border border-sky-400/40 tracking-[0.25em] animate-pulse">
            TARGET
          </div>
        </div>
      )}

      {/* Rod Core */}
      <div className={`
        absolute bottom-[10%] w-[5px] sm:w-[7px] h-[80%] rounded-full transition-all duration-500 z-10
        ${isSelected || (isHovered && !isSolving) ? 'bg-sky-300 shadow-[0_0_40px_#7dd3fc,0_0_10px_white]' : 'bg-white/15'}
        ${isObjective ? 'bg-sky-500 shadow-[0_0_45px_#0ea5e9]' : ''}
        ${pulse ? 'animate-rod-pulse' : ''}
      `}>
         {isObjective && (
           <div className="absolute inset-x-[-12px] top-0 bottom-0 bg-sky-500/15 blur-[12px] rounded-full animate-pulse" />
         )}
      </div>

      {/* Auto-Solve Data Streak (Enhanced Trail Visual) */}
      {showDataStreak && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center">
            <div className="w-2.5 h-64 bg-gradient-to-t from-transparent via-white to-sky-400 blur-[12px] animate-trailing-light" />
            <div className="w-0.5 h-48 bg-white blur-[2px] animate-trailing-light opacity-50" />
        </div>
      )}

      <div className="relative z-20 flex flex-col-reverse items-center w-full pb-[15%] space-y-1 space-y-reverse">
        {disks.map((size, index) => (
          <Disk 
            key={`${id}-disk-${size}`} 
            size={size} 
            maxSize={maxDisks}
            isSelected={isSelected && index === disks.length - 1}
            isClickable={!isSolving && index === disks.length - 1}
            onDragStart={() => !isSolving && onDragStart && onDragStart(id)}
            isMoving={movingDiskSize === size && index === disks.length - 1}
          />
        ))}
      </div>
      
      <div className={`
        absolute -bottom-10 font-black tracking-[0.4em] text-[11px] transition-all duration-500
        ${isSelected || isOver || isObjective || (isHovered && !isSolving) ? 'text-sky-400 scale-110 drop-shadow-[0_0_10px_#0ea5e9]' : 'text-slate-600'}
        uppercase italic
      `}>
        S-{id}
      </div>
    </div>
  );
};

export default Rod;