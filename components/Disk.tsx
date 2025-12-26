import React, { useState } from 'react';
import { DISK_COLORS } from '../constants';

interface DiskProps {
  size: number;
  maxSize: number;
  isSelected: boolean;
  isClickable: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  isMoving?: boolean;
}

const Disk: React.FC<DiskProps> = ({ size, maxSize, isSelected, isClickable, onDragStart, isMoving }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const range = maxSize > 1 ? maxSize - 1 : 1;
  const normalized = (size - 1) / range;
  const widthPercent = 35 + (normalized * 60); 
  
  const colorClass = DISK_COLORS[size - 1] || 'bg-slate-500';

  const handleDragStartInternal = (e: React.DragEvent) => {
    if (onDragStart) onDragStart(e);
    setIsDragging(true);
    
    const target = e.currentTarget as HTMLElement;
    e.dataTransfer.effectAllowed = 'move';
    
    // Set a ghost image (browser-specific behavior is usually semi-transparent)
    // We enhance it by adding an explicit state class to the source element
    setTimeout(() => {
        target.style.opacity = '0.3';
        target.style.filter = 'blur(2px) brightness(1.5)';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    target.style.filter = 'none';
  };

  return (
    <div 
      className="relative flex items-center justify-center w-full" 
      style={{ width: `${widthPercent}%` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        draggable={isClickable}
        onDragStart={handleDragStartInternal}
        onDragEnd={handleDragEnd}
        className={`
          w-full h-7 sm:h-9 rounded-full flex items-center justify-center text-white font-black
          disk-transition transform-gpu relative border border-white/25
          ${colorClass}
          ${isSelected || isDragging 
            ? 'animate-disk-glow scale-110 -translate-y-8 z-[100] shadow-[0_40px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(14,165,233,0.8)] border-white brightness-125' 
            : 'scale-100 shadow-[0_12px_25px_rgba(0,0,0,0.6)]'}
          ${isHovered && isClickable && !isDragging ? 'brightness-110 -translate-y-1.5 shadow-[0_20px_40px_rgba(0,0,0,0.7)] scale-[1.02]' : ''}
          ${isClickable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
          animate-in fade-in zoom-in duration-300
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-black/20 rounded-full" />
        <span className="relative z-10 select-none text-[13px] sm:text-[15px] italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-black">
          {size}
        </span>
        
        {/* Interactive Instruction Tooltip */}
        {(isHovered || isSelected || isDragging) && isClickable && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2 bg-slate-900/95 border border-white/20 rounded-full backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
             <span className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-400 whitespace-nowrap">
               {isDragging ? 'Relocating Segment' : 'Drag & Stack'}
             </span>
             <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/20" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Disk;