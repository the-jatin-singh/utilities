"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Volume2, VolumeX, Play, RotateCcw, Heart, Zap, Crosshair } from 'lucide-react';

/**
 * NEON BIT BLASTER (TypeScript Edition)
 * A retro 8-bit space shooter completely contained in one file.
 * Uses procedural sprite generation and Web Audio API for sound.
 */

// --- TYPES & INTERFACES ---

type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'enemy1' | 'enemy2';
  hp: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

// --- ASSETS & CONSTANTS ---

const COLORS = {
  bg: '#1a1a2e',
  player: '#00f3ff', // Cyan
  enemy1: '#ff0055', // Neon Pink
  enemy2: '#ffcc00', // Yellow
  bullet: '#fff',
  particle: ['#ff0055', '#ffcc00', '#00f3ff', '#ffffff'],
  text: '#ffffff',
  hud: '#16213e'
};

// 8x8 Sprite Maps (1 = pixel, 0 = empty)
const SPRITES: Record<string, number[]> = {
  player: [
    0,0,0,1,1,0,0,0,
    0,0,1,1,1,1,0,0,
    0,1,1,0,0,1,1,0,
    1,1,1,1,1,1,1,1,
    1,0,1,1,1,1,0,1,
    1,0,1,0,0,1,0,1,
    0,0,1,0,0,1,0,0,
    0,1,1,0,0,1,1,0
  ],
  enemy1: [
    0,0,1,1,1,1,0,0,
    0,1,1,1,1,1,1,0,
    1,1,0,1,1,0,1,1,
    1,1,1,1,1,1,1,1,
    0,1,0,1,1,0,1,0,
    0,1,0,0,0,0,1,0,
    0,0,1,0,0,1,0,0,
    0,0,1,0,0,1,0,0
  ],
  enemy2: [
    0,0,1,0,0,1,0,0,
    0,0,0,1,1,0,0,0,
    0,1,1,1,1,1,1,0,
    1,1,0,1,1,0,1,1,
    1,1,1,1,1,1,1,1,
    0,1,0,1,1,0,1,0,
    1,0,0,0,0,0,0,1,
    0,1,0,0,0,0,1,0
  ]
};

// --- AUDIO SYSTEM ---
// Simple synthesizer for retro sound effects
// Using 'any' for window to handle webkitAudioContext without complex polyfills in one file
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
const audioCtx = new AudioContextClass();

const playSound = (type: 'shoot' | 'explosion' | 'powerup') => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;

  if (type === 'shoot') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'explosion') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.2);
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'powerup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
};

export default function GameRoute() {
  // Game State
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [health, setHealth] = useState<number>(3);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [level, setLevel] = useState<number>(1);

  // Refs for Game Loop
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const scoreRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  
  // Game Objects Refs
  const playerRef = useRef<Player>({ x: 0, y: 0, w: 32, h: 32, speed: 5 });
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);

  // --- INITIALIZATION ---

  useEffect(() => {
    // Load high score
    const saved = localStorage.getItem('neon_blaster_highscore');
    if (saved) setHighScore(parseInt(saved, 10));

    // Initialize Stars (Background)
    if (starsRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        starsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 2 + 0.5
        });
      }
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- GAME LOGIC HELPER FUNCTIONS ---

  const spawnEnemy = (width: number) => {
    const size = 32;
    const type = Math.random() > 0.7 ? 'enemy2' : 'enemy1';
    enemiesRef.current.push({
      x: Math.random() * (width - size),
      y: -size,
      w: size,
      h: size,
      type: type,
      hp: type === 'enemy2' ? 2 : 1,
      speed: Math.random() * 2 + 1 + (level * 0.2) // Speed increases with level
    });
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color: color || COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)]
      });
    }
  };

  const drawSprite = (ctx: CanvasRenderingContext2D, map: number[], x: number, y: number, size: number, color: string) => {
    const pixelSize = size / 8;
    ctx.fillStyle = color;
    for (let i = 0; i < 64; i++) {
      if (map[i] === 1) {
        const col = i % 8;
        const row = Math.floor(i / 8);
        ctx.fillRect(x + col * pixelSize, y + row * pixelSize, pixelSize, pixelSize);
      }
    }
  };

  // --- MAIN GAME LOOP ---

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Resize handling (basic)
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Reset player X on resize to prevent out of bounds
      if(playerRef.current.x > canvas.width) playerRef.current.x = canvas.width / 2;
    }

    const width = canvas.width;
    const height = canvas.height;

    // 1. CLEAR & SHAKE
    ctx.fillStyle = COLORS.bg;
    let shakeX = 0;
    let shakeY = 0;
    if (shakeRef.current > 0) {
      shakeX = (Math.random() - 0.5) * shakeRef.current;
      shakeY = (Math.random() - 0.5) * shakeRef.current;
      shakeRef.current *= 0.9;
      if (shakeRef.current < 0.5) shakeRef.current = 0;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.fillRect(-shakeX, -shakeY, width + 20, height + 20); // Overdraw to cover shake

    // 2. BACKGROUND (STARS)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    if (gameState === 'PLAYING') {
      frameCountRef.current++;
      
      // Increase Difficulty
      if (frameCountRef.current % 600 === 0) setLevel(l => l + 1);

      // SPAWN ENEMIES
      const spawnRate = Math.max(20, 60 - level * 2);
      if (frameCountRef.current % spawnRate === 0) {
        spawnEnemy(width);
      }

      // PLAYER MOVEMENT
      const p = playerRef.current;
      p.x = Math.max(0, Math.min(width - p.w, p.x));
      p.y = Math.max(0, Math.min(height - p.h, p.y));

      // DRAW PLAYER
      drawSprite(ctx, SPRITES.player, p.x, p.y, p.w, COLORS.player);
      
      // AUTO SHOOT
      if (frameCountRef.current % 15 === 0) {
         bulletsRef.current.push({ x: p.x + p.w/2 - 2, y: p.y, w: 4, h: 10, speed: 10 });
         if(!isMuted) playSound('shoot');
      }

      // UPDATE & DRAW BULLETS
      ctx.fillStyle = COLORS.bullet;
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.y -= b.speed;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.y < -10) bulletsRef.current.splice(i, 1);
      }

      // UPDATE & DRAW ENEMIES
      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const e = enemiesRef.current[i];
        e.y += e.speed;
        
        drawSprite(ctx, e.type === 'enemy1' ? SPRITES.enemy1 : SPRITES.enemy2, e.x, e.y, e.w, e.type === 'enemy1' ? COLORS.enemy1 : COLORS.enemy2);

        // Check Collision: Bullet vs Enemy
        let enemyHit = false;
        for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
          const b = bulletsRef.current[j];
          if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
            bulletsRef.current.splice(j, 1);
            e.hp--;
            if (e.hp <= 0) {
              enemyHit = true;
              createExplosion(e.x + e.w/2, e.y + e.h/2, e.type === 'enemy1' ? COLORS.enemy1 : COLORS.enemy2);
              if(!isMuted) playSound('explosion');
              scoreRef.current += (e.type === 'enemy1' ? 100 : 200);
              setScore(scoreRef.current);
            }
            break; 
          }
        }

        // Check Collision: Player vs Enemy
        if (!enemyHit) {
           if (p.x < e.x + e.w - 4 && p.x + p.w > e.x + 4 && p.y < e.y + e.h - 4 && p.y + p.h > e.y + 4) {
             enemyHit = true;
             createExplosion(p.x + p.w/2, p.y + p.h/2, COLORS.player);
             shakeRef.current = 15; // Screen Shake
             setHealth(h => {
               const newHealth = h - 1;
               if (newHealth <= 0) {
                 setGameState('GAMEOVER');
                 if(!isMuted) playSound('explosion');
               }
               return newHealth;
             });
           }
        }

        if (enemyHit) {
          enemiesRef.current.splice(i, 1);
        } else if (e.y > height) {
          enemiesRef.current.splice(i, 1); // Enemy passed player
        }
      }

      // UPDATE & DRAW PARTICLES
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const part = particlesRef.current[i];
        part.x += part.vx;
        part.y += part.vy;
        part.life -= 0.05;
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, 4, 4);
        ctx.globalAlpha = 1.0;
        if (part.life <= 0) particlesRef.current.splice(i, 1);
      }
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, level, isMuted]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  // --- CONTROLS ---

  const handleStart = () => {
    scoreRef.current = 0;
    setScore(0);
    setHealth(3);
    setLevel(1);
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    
    // Center player
    if(canvasRef.current) {
        playerRef.current.x = canvasRef.current.width / 2 - 16;
        playerRef.current.y = canvasRef.current.height - 100;
    }
    
    setGameState('PLAYING');
    if(!isMuted) playSound('powerup');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    playerRef.current.x = x - playerRef.current.w / 2;
    playerRef.current.y = y - playerRef.current.h / 2;
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    // e.preventDefault() is not passively supported in React synthetic events sometimes, 
    // but the touch-action: none CSS property handles the scrolling behavior better.
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    playerRef.current.x = x - playerRef.current.w / 2;
    playerRef.current.y = y - playerRef.current.h / 2;
  };

  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('neon_blaster_highscore', score.toString());
      }
    }
  }, [gameState, score, highScore]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-mono select-none">
      {/* Styles for Google Font and CRT Effect */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .font-retro { font-family: 'Press Start 2P', cursive; }
          .scanline {
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 4px, 6px 100%;
            pointer-events: none;
          }
        `}
      </style>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="block w-full h-full cursor-none touch-none"
      />

      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 scanline z-10 opacity-70"></div>

      {/* HUD Layer */}
      <div className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-start text-white font-retro text-xs md:text-sm shadow-md pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-yellow-400">
             <Trophy size={16} /> <span>HI: {highScore}</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-400">
             <Crosshair size={16} /> <span>PTS: {score}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
             <Heart 
                key={i} 
                size={20} 
                className={i < health ? "text-red-500 fill-current" : "text-gray-700"} 
             />
          ))}
        </div>
      </div>
      
      {/* Mute Button (Clickable) */}
      <button 
        onClick={() => setIsMuted(!isMuted)} 
        className="absolute bottom-4 right-4 z-30 p-2 bg-gray-900 bg-opacity-50 rounded border border-gray-700 text-white hover:bg-gray-800 transition-colors"
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* START SCREEN */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white font-retro animate-fade-in">
          <div className="mb-8 text-center px-4">
            <h1 className="text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-cyan-400 to-yellow-400 mb-4 tracking-widest drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
              NEON BIT
            </h1>
            <h2 className="text-2xl md:text-4xl text-white mb-2 tracking-widest">BLASTER</h2>
            <p className="text-xs text-gray-400 mt-4 animate-pulse">SYSTEM READY...</p>
          </div>

          <button
            onClick={handleStart}
            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-none border-4 border-cyan-400 hover:border-pink-500 transition-colors duration-300"
          >
             <div className="absolute inset-0 w-0 bg-cyan-400 transition-all duration-[250ms] ease-out group-hover:w-full opacity-20"></div>
             <div className="flex items-center gap-4 text-cyan-400 group-hover:text-pink-500">
                <Play size={24} className="fill-current" />
                <span className="text-lg md:text-xl">INSERT COIN</span>
             </div>
          </button>
          
          <div className="mt-12 text-[10px] text-gray-500 max-w-xs text-center leading-relaxed">
            <p>DRAG TO MOVE • AUTO FIRE ENGAGED</p>
            <p>DESTROY ALIENS • DODGE IMPACT</p>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-red-900 bg-opacity-90 text-white font-retro">
          <h2 className="text-5xl mb-2 text-red-500 drop-shadow-[4px_4px_0_#000]">GAME OVER</h2>
          <div className="bg-black bg-opacity-50 p-6 border-2 border-white mb-8 text-center min-w-[250px]">
            <p className="text-gray-400 text-xs mb-2">FINAL SCORE</p>
            <p className="text-3xl text-yellow-400 mb-4">{score}</p>
            
            {score >= highScore && score > 0 && (
               <div className="flex items-center justify-center gap-2 text-green-400 text-xs animate-bounce">
                  <Zap size={12} /> NEW RECORD!
               </div>
            )}
          </div>

          <button
            onClick={handleStart}
            className="flex items-center gap-3 px-6 py-3 bg-white text-black hover:bg-gray-200 transition-transform active:scale-95"
          >
            <RotateCcw size={20} />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
}