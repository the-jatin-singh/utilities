'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  Download, 
  Dice5, 
  RotateCcw, 
  Home, 
  Palette, 
  Cherry, // New icon for fruit base
  Smile, 
  HardHat, // New icon for caps
  Image as ImageIcon,
  Undo2,
  Check,
  Copy
} from 'lucide-react';
import Link from 'next/link';

// --- TYPES ---

type Category = 'fruit' | 'cap' | 'face' | 'bg';

interface AvatarState {
  fruitStyle: number;
  fruitColor: string;
  capStyle: number;
  capColor: string;
  eyeStyle: number;
  mouthStyle: number;
  bgColor: string;
}

// --- ASSETS (New Fruit-Themed 16x16 Grid) ---
// shape-rendering="crispEdges" ensures the pixel-art look.

const ASSETS = {
  // The base fruit shapes
  fruit: [
    "M5 4h6v1h2v2h1v4h-1v2h-2v1h-6v-1h-2v-2h-1v-4h1v-2h2z", // 0: Apple/Round
    "M6 3h4v1h1v2h1v3h1v3h-1v2h-1v1h-6v-1h-1v-2h-1v-3h1v-3h1v-2h1z", // 1: Pear
    "M3 4h10v2h1v4h-1v2h-2v1h-2v1h-2v-1h-2v-1h-2v-2h-1v-4h1z", // 2: Strawberry shape
    "M2 7h2v-2h2v-1h4v1h2v2h2v2h-2v2h-2v1h-4v-1h-2v-2h-2z", // 3: Lemon/Oval
    "M5 3h2v1h2v-1h2v2h1v2h1v2h-1v2h-1v2h-1v1h-4v-1h-1v-2h-1v-2h1v-2h1v-2h-2z", // 4: Grapes Bunch
  ],
  
  // Hats and stems (rendered on top)
  cap: [
    "", // 0: None
    "M7 1h2v2h-2z", // 1: Simple Stem
    "M7 1h2v1h1v1h-4v-1h1z M6 2h1v1h-2v-1h1z", // 2: Leafy Stem
    "M5 2h6v1h1v1h1v1h-8v-1h1v-1h-1z", // 3: Tiny Beanie
    "M5 1h6v1h1v2h-8v-2h1z M4 3h8v1h-8z", // 4: Baseball Cap back
    "M4 0h2v1h-1v1h-1v2h-1v-3h1z M12 0h-2v1h1v1h1v2h1v-3h-1z M6 3h4v1h-4z", // 5: Viking/Stem combo
    "M3 3h10v1h-10z M5 1h6v2h-6z", // 6: Top hat tiny
  ],
  
  eyes: [
    "M6 7h1v2h-1z M9 7h1v2h-1z", // 0: Dot eyes tall
    "M5 8h2v1h-2z M9 8h2v1h-2z", // 1: Wide dots
    "M6 8h1v1h-1z M9 8h1v1h-1z", // 2: Tiny dots
    "M5 7h2v2h-2z M6 8h1v1h-1z M9 7h2v2h-2z M10 8h1v1h-1z", // 3: Sparkle eyes
    "M5 8h2v1h-2z M9 8h2v1h-2z M4 7h3v1h-3z M9 7h3v1h-3z", // 4: Chill/Closed
  ],
  
  mouth: [
    "", // 0: None
    "M7 11h2v1h-2z", // 1: Tiny dot mouth
    "M6 11h1v1h2v-1h1v1h-4z", // 2: Tiny smile
    "M7 10h2v2h-2z", // 3: 'O' mouth
    "M6 12h4v1h-4z", // 4: Flat line
    "M6 11h1v1h-1z M9 11h1v1h-1z M7 12h2v1h-2z", // 5: Cute open
  ]
};

// --- PRESETS (Modern Minimal Pastel Palette) ---

const PALETTES = {
  // Muted fruit tones
  fruit: ['#FF8A80', '#FFB74D', '#FFD54F', '#AED581', '#81C784', '#4DB6AC', '#4DD0E1', '#9575CD', '#F06292', '#E57373', '#BA68C8', '#FFF176'],
  // Complementary cap colors
  cap: ['#546E7A', '#78909C', '#8D6E63', '#A1887F', '#FF8A65', '#FFD54F', '#81C784', '#4DB6AC', '#64B5F6', '#9575CD', '#E0E0E0', '#37474F'],
  // Very soft, clean backgrounds
  bg: ['#F5F5F5', '#FAFAFA', '#EFF0F1', '#ECEFF1', '#E3F2FD', '#E8F5E9', '#FFFDE7', '#FBE9E7', '#F3E5F5', '#EDE7F6', '#E0F7FA', '#FFFFFF']
};

const DEFAULT_AVATAR: AvatarState = {
  fruitStyle: 0,
  fruitColor: '#FF8A80', // Soft Red Apple
  capStyle: 2, // Leaf
  capColor: '#81C784', // Green leaf
  eyeStyle: 0,
  mouthStyle: 2,
  bgColor: '#FAFAFA' // Clean off-white
};

// --- MAIN COMPONENT ---

export default function FruitAvatarMaker() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State
  const [avatar, setAvatar] = useState<AvatarState>(DEFAULT_AVATAR);
  const [history, setHistory] = useState<AvatarState[]>([DEFAULT_AVATAR]);
  const [activeCategory, setActiveCategory] = useState<Category>('fruit');
  const [isCopied, setIsCopied] = useState(false);

  // --- Logic ---

  const updateAvatar = useCallback((updates: Partial<AvatarState>) => {
    setAvatar(prev => {
      const newState = { ...prev, ...updates };
      setHistory(h => [...h.slice(-20), newState]); 
      return newState;
    });
  }, []);

  const undo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); 
      setAvatar(newHistory[newHistory.length - 1]);
      setHistory(newHistory);
    }
  };

  const randomize = () => {
    const randomItem = (arr: any[]) => Math.floor(Math.random() * arr.length);
    const randomColor = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    updateAvatar({
      fruitStyle: randomItem(ASSETS.fruit),
      fruitColor: randomColor(PALETTES.fruit),
      capStyle: Math.random() > 0.2 ? randomItem(ASSETS.cap) : 0, // 80% chance of cap
      capColor: randomColor(PALETTES.cap),
      eyeStyle: randomItem(ASSETS.eyes),
      mouthStyle: randomItem(ASSETS.mouth),
      bgColor: randomColor(PALETTES.bg),
    });
  };

  const download = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; 
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false; // PIXEL ART MODE
        ctx.drawImage(img, 0, 0, 1024, 1024);
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `fruit-avatar-${Date.now()}.png`;
        link.click();
      }
    };
    img.src = url;
  };

  const copySvg = () => {
     if (!svgRef.current) return;
     const svgData = new XMLSerializer().serializeToString(svgRef.current);
     navigator.clipboard.writeText(svgData).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
     });
  };

  // --- Render Helpers (Updated for light theme) ---

  const renderColorGrid = (colors: string[], selected: string, key: keyof AvatarState) => (
    <div className="flex flex-wrap gap-3 p-1">
      {colors.map(c => (
        <button
          key={c}
          onClick={() => updateAvatar({ [key]: c })}
          className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 border-2 ${selected === c ? 'border-neutral-800 ring-2 ring-indigo-100 scale-110' : 'border-neutral-200'}`}
          style={{ backgroundColor: c }}
          aria-label={`Select color ${c}`}
        />
      ))}
      <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-neutral-200 hover:scale-110 transition-transform shadow-sm bg-white">
        <input 
            type="color" 
            value={selected}
            onChange={(e) => updateAvatar({ [key]: e.target.value })}
            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-0 opacity-0"
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400">
            <Palette size={14} />
        </div>
      </div>
    </div>
  );

  const renderStyleGrid = (count: number, current: number, key: keyof AvatarState, label: string) => (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        <button
             onClick={() => updateAvatar({ [key]: 0 })}
             className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-all hover:bg-neutral-100 ${current === 0 ? 'ring-2 ring-indigo-200 border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-500'}`}
        >
            <span className="text-[10px] font-medium">None</span>
        </button>
      {Array.from({ length: count - 1 }).map((_, i) => (
        <button
          key={i + 1}
          onClick={() => updateAvatar({ [key]: i + 1 })}
          className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-all hover:bg-neutral-100 ${current === i + 1 ? 'ring-2 ring-indigo-200 border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-neutral-200 bg-white text-neutral-500'}`}
        >
          <span className="text-lg font-bold">{i + 1}</span>
        </button>
      ))}
    </div>
  );

  // --- SUB-COMPONENTS for Control Panel ---
  
  const categories = [
    { id: 'fruit', icon: Cherry, label: 'Fruit' },
    { id: 'cap', icon: HardHat, label: 'Top' },
    { id: 'face', icon: Smile, label: 'Face' }, 
    { id: 'bg', icon: ImageIcon, label: 'Bg' },
  ];

  return (
    // Changed base theme to light (bg-neutral-50 text-neutral-800)
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-sans flex flex-col overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* --- TOP BAR (Light Theme) --- */}
      <header className="h-16 border-b border-neutral-200 flex items-center justify-between px-4 lg:px-8 z-20 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
            <Link href="/" className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors">
                <Home size={20} />
            </Link>
        </div>

        <div className="flex items-center gap-2">
            <button onClick={undo} disabled={history.length <= 1} className="p-2 text-neutral-500 hover:text-neutral-900 disabled:opacity-30 hover:bg-neutral-100 rounded-full transition-all" title="Undo">
                <Undo2 size={20} />
            </button>
            <button onClick={() => updateAvatar(DEFAULT_AVATAR)} className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-all" title="Reset">
                <RotateCcw size={20} />
            </button>
            <div className="h-6 w-px bg-neutral-200 mx-1"></div>
            <button onClick={randomize} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium transition-all shadow-sm">
                <Dice5 size={16} /> <span className="hidden sm:inline">Randomize</span>
            </button>
            <button onClick={download} className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium shadow-md transition-all">
                <Download size={16} /> <span className="hidden sm:inline">Save PNG</span>
            </button>
             <button onClick={copySvg} className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 bg-white hover:border-neutral-300 text-neutral-700 rounded-lg text-xs font-medium transition-all shadow-sm">
                {isCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} 
                <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy SVG'}</span>
            </button>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT: Canvas Area (Light Theme) */}
        <div className="flex-1 flex items-center justify-center bg-neutral-100 relative p-8">
            {/* Soft gradient background blob */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-100/50 via-neutral-100 to-neutral-100 pointer-events-none"></div>
            
            <div className="relative group z-10">
                 {/* The 8-Bit Engine */}
                 <div className="relative shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden border-4 border-white bg-white">
                    <svg
                        ref={svgRef}
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                        shapeRendering="crispEdges"
                        className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px]"
                        style={{ backgroundColor: avatar.bgColor }}
                    >
                        {/* 1. Fruit Base */}
                        <path d={ASSETS.fruit[avatar.fruitStyle]} fill={avatar.fruitColor} />
                        
                        {/* 2. Facial Features (Dark gray for softer contrast than pure black) */}
                        <path d={ASSETS.eyes[avatar.eyeStyle]} fill="#37474F" opacity="0.9" />
                        <path d={ASSETS.mouth[avatar.mouthStyle]} fill="#37474F" opacity="0.9" />

                        {/* 3. Caps/Stems (Rendered on top) */}
                        <path d={ASSETS.cap[avatar.capStyle]} fill={avatar.capColor} />
                    </svg>
                 </div>
            </div>
        </div>

        {/* RIGHT: Editor Panel (Light Theme) */}
        <div className="h-[45vh] lg:h-auto lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col z-10 shadow-xl shadow-neutral-200/50">
            
            {/* Category Tabs */}
            <div className="flex overflow-x-auto hide-scrollbar border-b border-neutral-100 bg-white">
                {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id as Category)}
                            className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-4 gap-1 border-b-2 transition-all hover:bg-neutral-50 ${isActive ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-neutral-400'}`}
                        >
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">{cat.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Controls Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-neutral-50/50">
                
                {activeCategory === 'fruit' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Shape</label>
                            {renderStyleGrid(ASSETS.fruit.length, avatar.fruitStyle, 'fruitStyle', 'Shape')}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Color</label>
                            {renderColorGrid(PALETTES.fruit, avatar.fruitColor, 'fruitColor')}
                        </div>
                    </div>
                )}

                {activeCategory === 'cap' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Top Accessory</label>
                            {renderStyleGrid(ASSETS.cap.length, avatar.capStyle, 'capStyle', 'Cap')}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Cap Color</label>
                            {renderColorGrid(PALETTES.cap, avatar.capColor, 'capColor')}
                        </div>
                    </div>
                )}

                {activeCategory === 'face' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Eyes</label>
                            {renderStyleGrid(ASSETS.eyes.length, avatar.eyeStyle, 'eyeStyle', 'Eyes')}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Mouth</label>
                            {renderStyleGrid(ASSETS.mouth.length, avatar.mouthStyle, 'mouthStyle', 'Mouth')}
                        </div>
                    </div>
                )}

                {activeCategory === 'bg' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase mb-3 block">Background Color</label>
                            {renderColorGrid(PALETTES.bg, avatar.bgColor, 'bgColor')}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Global Styles for Scrollbar (Light theme adjustments) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #F5F5F5; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #BDBDBD; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}