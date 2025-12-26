export type RodId = 'A' | 'B' | 'C';

export type ScreenState = 'HOME' | 'PLAYING' | 'PAUSED' | 'WON' | 'END' | 'SETTINGS' | 'TUTORIAL';

export interface GameState {
  A: number[];
  B: number[];
  C: number[];
}

export interface Move {
  from: RodId;
  to: RodId;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  SOLVING = 'SOLVING',
  WON = 'WON'
}

export interface TierInfo {
  name: string;
  color: string;
  disks: number;
  startRod: RodId;
  targetRod: RodId;
}
