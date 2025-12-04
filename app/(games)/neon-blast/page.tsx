"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Trophy,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Heart,
  Zap,
  Crosshair,
} from "lucide-react";

/** ============================================
 *  TYPES
 * ============================================ */
type GameState = "START" | "PLAYING" | "GAMEOVER";

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
  type: "enemy1" | "enemy2";
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

/** ============================================
 *  CONSTANTS
 * ============================================ */
const COLORS = {
  bg: "#1a1a2e",
  player: "#00f3ff",
  enemy1: "#ff0055",
  enemy2: "#ffcc00",
  bullet: "#fff",
  particle: ["#ff0055", "#ffcc00", "#00f3ff", "#ffffff"],
  text: "#ffffff",
  hud: "#16213e",
};

const SPRITES: Record<string, number[]> = {
  player: [
    0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0,
    0, 1, 0, 0, 0, 1, 1, 0,
  ],
  enemy1: [
    0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0,
    1, 0, 0, 1, 0, 0,
  ],
  enemy2: [
    0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0,
    0, 0, 0, 0, 0, 1, 0,
  ],
};

/** ============================================
 *  AUDIO HANDLER (SAFE FOR SSR)
 * ============================================ */

let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AudioClass =
      window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioClass();
  }
};

const playSound = (type: "shoot" | "explosion" | "powerup", isMuted: boolean) => {
  if (isMuted || !audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === "shoot") {
    osc.type = "square";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "explosion") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === "powerup") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }
};

/** ============================================
 *  GAME COMPONENT
 * ============================================ */

export default function GameRoute() {
  // GAME STATE
  const [gameState, setGameState] = useState<GameState>("START");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [isMuted, setIsMuted] = useState(false);
  const [level, setLevel] = useState(1);

  // CANVAS & LOOP
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const frameRef = useRef(0);
  const shakeRef = useRef(0);

  // OBJECTS
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    w: 32,
    h: 32,
    speed: 5,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);

  /** ============================================
   *  INIT ON CLIENT
   * ============================================ */
  useEffect(() => {
    if (typeof window === "undefined") return;

    initAudio();

    const saved = localStorage.getItem("neon_blaster_highscore");
    if (saved) setHighScore(parseInt(saved));

    if (starsRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        starsRef.current.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 2 + 0.5,
        });
      }
    }
  }, []);

  /** ============================================
   *  GAME LOOP
   * ============================================ */
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (typeof window !== "undefined") {
      if (
        canvas.width !== window.innerWidth ||
        canvas.height !== window.innerHeight
      ) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // ========= STARS ============
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    starsRef.current.forEach((s) => {
      s.y += s.speed;
      if (s.y > height) {
        s.y = 0;
        s.x = Math.random() * width;
      }
      ctx.fillRect(s.x, s.y, s.size, s.size);
    });

    // ========== PLAYING ============
    if (gameState === "PLAYING") {
      frameRef.current++;

      const p = playerRef.current;

      // Draw Player
      drawSprite(ctx, SPRITES.player, p.x, p.y, p.w, COLORS.player);

      // Auto Shoot
      if (frameRef.current % 15 === 0) {
        bulletsRef.current.push({
          x: p.x + p.w / 2 - 2,
          y: p.y,
          w: 4,
          h: 10,
          speed: 10,
        });

        playSound("shoot", isMuted);
      }
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, isMuted]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameLoop]);

  /** ============================================
   *  SPRITE DRAWER
   * ============================================ */
  const drawSprite = (
    ctx: CanvasRenderingContext2D,
    map: number[],
    x: number,
    y: number,
    size: number,
    color: string
  ) => {
    const pixel = size / 8;
    ctx.fillStyle = color;
    for (let i = 0; i < 64; i++) {
      if (map[i] === 1) {
        const col = i % 8;
        const row = Math.floor(i / 8);
        ctx.fillRect(x + col * pixel, y + row * pixel, pixel, pixel);
      }
    }
  };

  /** ============================================
   *  START GAME
   * ============================================ */
  const handleStart = () => {
    scoreRef.current = 0;
    setScore(0);
    setHealth(3);
    setLevel(1);
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];

    if (canvasRef.current) {
      playerRef.current.x = canvasRef.current.width / 2 - 16;
      playerRef.current.y = canvasRef.current.height - 100;
    }

    setGameState("PLAYING");
    playSound("powerup", isMuted);
  };

  /** ============================================
   *  PLAYER MOVEMENT
   * ============================================ */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "PLAYING") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    playerRef.current.x = e.clientX - rect.left - 16;
    playerRef.current.y = e.clientY - rect.top - 16;
  };

  /** ============================================
   *  GAME OVER: SAVE HIGH SCORE
   * ============================================ */
  useEffect(() => {
    if (gameState === "GAMEOVER") {
      if (score > highScore) {
        setHighScore(score);
        if (typeof window !== "undefined") {
          localStorage.setItem("neon_blaster_highscore", score.toString());
        }
      }
    }
  }, [gameState]);

  /** ============================================
   *  UI / RENDER
   * ============================================ */
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-mono">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        className="block w-full h-full"
      />

      {/* HUD */}
      <div className="absolute top-0 left-0 p-4 text-white z-20 font-retro text-xs flex gap-10">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-yellow-400">
            <Trophy size={16} /> HI: {highScore}
          </span>
          <span className="flex items-center gap-2 text-cyan-400">
            <Crosshair size={16} /> PTS: {score}
          </span>
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

      {/* MUTE BUTTON */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-4 right-4 z-30 p-2 bg-gray-900 bg-opacity-50 text-white border border-gray-700"
      >
        {isMuted ? <VolumeX /> : <Volume2 />}
      </button>

      {/* START SCREEN */}
      {gameState === "START" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 text-white z-30 font-retro flex-col gap-6">
          <h1 className="text-5xl">NEON BLAST</h1>
          <button
            onClick={handleStart}
            className="px-8 py-4 bg-cyan-500 text-black text-lg"
          >
            INSERT COIN
          </button>
        </div>
      )}

      {/* GAME OVER */}
      {gameState === "GAMEOVER" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900 bg-opacity-80 text-white z-30 font-retro gap-6">
          <h1 className="text-5xl">GAME OVER</h1>
          <p className="text-3xl">{score}</p>

          <button
            onClick={handleStart}
            className="px-6 py-3 bg-white text-black text-lg"
          >
            <RotateCcw /> TRY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
