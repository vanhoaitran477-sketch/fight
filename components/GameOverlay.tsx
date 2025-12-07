
import React from 'react';
import { PlayerState, GameStatus } from '../types';

interface GameOverlayProps {
  p1: PlayerState;
  p2: PlayerState;
  status: GameStatus;
  onStart: () => void;
  onRestart: () => void;
  message: string;
}

const HealthBar: React.FC<{ hp: number; max: number; align: 'left' | 'right'; name: string }> = ({ hp, max, align, name }) => {
  const percent = Math.max(0, (hp / max) * 100);
  const isDanger = percent < 30;

  return (
    <div className={`flex flex-col w-full max-w-md ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-2 mb-1 ui-font font-bold text-xl uppercase tracking-widest text-white drop-shadow-md">
        <span>{name}</span>
      </div>
      <div className="flex w-full items-center gap-3">
        {align === 'right' && (
           <span className="game-font text-white text-lg drop-shadow-md min-w-[3ch] text-right">{Math.ceil(hp)}</span>
        )}
        
        <div className="flex-1 h-8 bg-gray-900/80 border-2 border-gray-600 skew-x-[-15deg] relative overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ease-out ${isDanger ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`}
            style={{ width: `${percent}%`, marginLeft: align === 'right' ? 'auto' : 0 }}
          />
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20"></div>
        </div>

        {align === 'left' && (
           <span className="game-font text-white text-lg drop-shadow-md min-w-[3ch] text-left">{Math.ceil(hp)}</span>
        )}
      </div>
    </div>
  );
};

export const GameOverlay: React.FC<GameOverlayProps> = ({ p1, p2, status, onStart, onRestart, message }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      {/* Header / HUD */}
      <div className="flex justify-between items-start w-full gap-12">
        <HealthBar hp={p1.hp} max={p1.maxHp} align="left" name="Player 1" />
        
        <div className="mt-2 text-center">
          <div className="game-font text-yellow-400 text-3xl drop-shadow-lg shadow-black">VS</div>
        </div>

        <HealthBar hp={p2.hp} max={p2.maxHp} align="right" name="Player 2" />
      </div>

      {/* Center Messages */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
        {status === 'waiting' && (
          <div className="animate-bounce">
            <h2 className="ui-font text-2xl text-blue-300 mb-2">Waiting for Players...</h2>
            <p className="text-sm text-gray-400">Stand on opposite sides of the camera</p>
          </div>
        )}

        {status === 'loading' && (
           <div className="flex flex-col items-center">
             <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mb-4"></div>
             <p className="ui-font text-xl">Initializing AI Vision...</p>
           </div>
        )}
        
        {status === 'playing' && message && (
          <div className="game-font text-4xl text-yellow-300 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] animate-pulse">
            {message}
          </div>
        )}

        {status === 'gameover' && (
          <div className="bg-black/80 p-8 rounded-xl border border-white/20 backdrop-blur-md text-center">
            <h1 className="game-font text-5xl text-red-500 mb-6 drop-shadow-lg">GAME OVER</h1>
            <p className="ui-font text-2xl mb-8 text-white">
              {p1.hp <= 0 && p2.hp <= 0 ? "DRAW!" : p1.hp > 0 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!"}
            </p>
            <button 
              onClick={onRestart}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded skew-x-[-10deg] transition transform hover:scale-105 ui-font text-xl border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
            >
              REMATCH
            </button>
          </div>
        )}
      </div>

      {/* Controls / Instructions */}
      <div className="flex justify-between items-end text-xs text-gray-400 ui-font font-bold uppercase tracking-wider">
        <div className="flex flex-col gap-2 bg-black/50 p-3 rounded">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-white rounded-full"></span> Punch: Thrust Hand
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span> Sword: Hands Together & Swing
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-cyan-400 rounded-full"></span> Special: One Hand Up/Down (Hold)
          </div>
          <div className="flex items-center gap-2">
             <span className="w-3 h-3 bg-green-500 rounded-full"></span> Rain: Flap Arms (Breaks Guard)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Block: Cross Arms on Chest
          </div>
        </div>
        <div>
           AI Powered Combat
        </div>
      </div>
    </div>
  );
};
