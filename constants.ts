import { RodId, TierInfo } from './types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 1200;

export const ROD_IDS: RodId[] = ['A', 'B', 'C'];

export const DISK_COLORS = [
  'bg-sky-400',     // 1
  'bg-emerald-400', // 2
  'bg-amber-400',   // 3
  'bg-orange-500',  // 4
  'bg-rose-500',    // 5
  'bg-indigo-500',  // 6
  'bg-violet-500',  // 7
  'bg-fuchsia-500', // 8
  'bg-pink-500',    // 9
  'bg-teal-500',    // 10
];

export const SOLVE_SPEED_MS = 300;

export interface EnhancedTierInfo extends TierInfo {
  theme: string;
  glow: string;
  phaseName: string;
}

const PHASE_NAMES = [
  "GENESIS", "NEURAL", "SYNAPSE", "QUANTUM", "KINETIC", 
  "OSMOSIS", "VECTOR", "MANTRA", "AETHER", "OMEGA",
  "INFINITY", "ZENITH", "PARADOX", "FLUX", "CORE", 
  "SHELL", "NODE", "GRID", "LOGIC", "PULSE",
  "CYBER", "BIO", "DATA", "VOID", "PRISM",
  "ARC", "GATE", "ROOT", "LINK", "PATH"
];

const TIER_TITLES = [
  { name: 'NOVICE', color: 'text-emerald-400', theme: 'emerald' },
  { name: 'APPRENTICE', color: 'text-teal-400', theme: 'teal' },
  { name: 'ADEPT', color: 'text-sky-400', theme: 'sky' },
  { name: 'EXPERT', color: 'text-blue-400', theme: 'blue' },
  { name: 'MASTER', color: 'text-indigo-400', theme: 'indigo' },
  { name: 'ELITE', color: 'text-violet-400', theme: 'violet' },
  { name: 'LEGEND', color: 'text-fuchsia-400', theme: 'fuchsia' },
  { name: 'SINGULARITY', color: 'text-white drop-shadow-[0_0_8px_white]', theme: 'slate' }
];

/**
 * Deterministically picks start and target rods to ensure level variety.
 */
const getRodConfig = (lvl: number): { start: RodId, target: RodId } => {
  const pairs: { start: RodId, target: RodId }[] = [
    { start: 'A', target: 'C' },
    { start: 'A', target: 'B' },
    { start: 'B', target: 'C' },
    { start: 'B', target: 'A' },
    { start: 'C', target: 'B' },
    { start: 'C', target: 'A' },
  ];
  // Salted index to prevent predictable patterns
  const index = (lvl * 13 + 7) % pairs.length;
  return pairs[index];
};

export const getTierForLevel = (lvl: number): EnhancedTierInfo => {
  const { start: startRod, target: targetRod } = getRodConfig(lvl);
  
  // Phase design: 20 levels per phase
  const phaseIndex = Math.floor((lvl - 1) / 20) % PHASE_NAMES.length;
  const phaseName = PHASE_NAMES[phaseIndex];

  // Disk progression: Increase every 5 levels, max 10
  // L1-5: 3 disks, L6-10: 4 disks, ..., L36+: 10 disks
  const disks = Math.min(10, 3 + Math.floor((lvl - 1) / 5));

  // Visual styling based on level depth
  const tierIndex = Math.min(Math.floor((lvl - 1) / 150), TIER_TITLES.length - 1);
  const tierMeta = TIER_TITLES[tierIndex];

  return { 
    ...tierMeta,
    disks, 
    startRod, 
    targetRod, 
    phaseName,
    glow: `shadow-${tierMeta.theme}-500/20`
  };
};
