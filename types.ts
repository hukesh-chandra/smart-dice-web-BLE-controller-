
export enum GameMode {
  FREE = 'MODE_FREE',
  GAME = 'MODE_GAME',
  RACE = 'MODE_RACE',
  COUNTDOWN = 'MODE_COUNTDOWN', // A new suggested game mode
}

export enum Player {
  A = 'A',
  B = 'B',
}

export interface GameState {
  mode: GameMode;
  scoreA: number;
  scoreB: number;
  turn: Player | null;
  rounds: number;
  currentRound: number;
  raceTarget: number;
  countdownStart: number;
  winner: Player | 'Draw' | null;
  lastRoll: number | null;
  message: string;
}
