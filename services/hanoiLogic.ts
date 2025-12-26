import { RodId, GameState, Move } from '../types';

/**
 * Validates if a move is legal according to Tower of Hanoi rules.
 */
export const isValidMove = (state: GameState, from: RodId, to: RodId): boolean => {
  if (from === to) return false;
  const sourceRod = state[from];
  const targetRod = state[to];

  if (sourceRod.length === 0) return false;

  const diskToMove = sourceRod[sourceRod.length - 1];
  
  if (targetRod.length === 0) return true;

  const topTargetDisk = targetRod[targetRod.length - 1];
  return diskToMove < topTargetDisk;
};

/**
 * Recursive Tower of Hanoi algorithm.
 * Generates a list of moves to solve the puzzle.
 */
export const getAutoSolveMoves = (
  n: number,
  source: RodId,
  target: RodId,
  auxiliary: RodId
): Move[] => {
  const moves: Move[] = [];

  const solve = (count: number, s: RodId, t: RodId, a: RodId) => {
    if (count <= 0) return;
    
    // Move n-1 disks from source to auxiliary
    solve(count - 1, s, a, t);
    
    // Move the nth disk from source to target
    moves.push({ from: s, to: t });
    
    // Move n-1 disks from auxiliary to target
    solve(count - 1, a, t, s);
  };

  solve(n, source, target, auxiliary);
  return moves;
};

/**
 * Check if the game is won (all disks on the specified target rod).
 */
export const isGameWon = (state: GameState, totalDisks: number, targetRod: RodId): boolean => {
  return state[targetRod].length === totalDisks;
};

/**
 * Initialize game state with disks on a specific starting rod.
 */
export const createInitialState = (diskCount: number, startRod: RodId = 'A'): GameState => {
  const disks = Array.from({ length: diskCount }, (_, i) => diskCount - i);
  const state: GameState = { A: [], B: [], C: [] };
  state[startRod] = disks;
  return state;
};
