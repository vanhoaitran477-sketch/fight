export type GameStatus = 'loading' | 'waiting' | 'playing' | 'gameover';

export interface PlayerState {
  id: 1 | 2;
  hp: number;
  maxHp: number;
  isBlocking: boolean;
  isHit: boolean; // Visual flash red
  hitTimer: number;
  punchCooldown: number;
  swordCooldown: number; // Cooldown for sword swings
  rainCooldown: number; // Cooldown for bird flap attack
  score: number;
  charge: {
    active: boolean;
    progress: number; // 0.0 to 1.0
    complete: boolean;
    startTime: number;
  };
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: 1 | 2;
  active: boolean;
  type: 'normal' | 'special' | 'slash' | 'rain';
  damage: number;
}

// MediaPipe Types (Simplified)
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResult {
  landmarks: Landmark[][];
  worldLandmarks: Landmark[][];
}