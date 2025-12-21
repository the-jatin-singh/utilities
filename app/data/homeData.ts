import { 
  Diff, 
  Palette, 
  Zap, 
  Terminal, 
  Gamepad2, 
  Layout,
  Clock,
  LucideIcon, 
  Sparkles,
  Smile,
  TrendingUp 
} from 'lucide-react';

// --- Types ---

export type CategoryId = 'tools' | 'games' | 'productivity' | 'creativity' | 'finance'

export interface Section {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
}

export interface AppItem {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  href: string;
  category: CategoryId;
  addedAt: string;   // ISO Date 'YYYY-MM-DD'
  updatedAt: string; // ISO Date 'YYYY-MM-DD'
}

export interface AppConfig {
  appName: string;
  version: string;
  githubUrl: string;
  sections: Section[];
}

// --- Configuration ---

export const APP_CONFIG: AppConfig = {
  appName: 'Toolkit',
  version: '1.4',
  githubUrl: 'https://github.com/the-jatin-singh/utilities',
  sections: [
    { id: 'productivity', label: 'Productivity', icon: Layout },
    { id: 'creativity', label: 'Creativity', icon: Sparkles },
    { id: 'finance', label: 'Finance', icon: TrendingUp }, 
    { id: 'tools', label: 'Utilities', icon: Terminal },
    { id: 'games', label: 'Arcade', icon: Gamepad2 }
  ]
};

// --- Data ---

export const APPS_DATA: AppItem[] = [
  {
    id: 'crypto-dashboard',
    title: 'TradeMind',
    desc: 'Crypto trade analytics & dashboard',
    icon: TrendingUp,
    href: '/crypto',
    category: 'finance',
    addedAt: '2025-12-21',
    updatedAt: '2025-12-21'
  },
  // 8-Bit Avatar
  {
    id: '8-bit-avatar',
    title: '8-Bit Avatar',
    desc: 'Pixel art character generator',
    icon: Smile,
    href: '/8-bit-avatar',
    category: 'creativity',
    addedAt: '2025-12-17',
    updatedAt: '2025-12-17'
  },
  // Focus Timer App
  {
    id: 'focus-timer',
    title: 'Focus Timer',
    desc: 'Pomodoro technique & break manager',
    icon: Clock, 
    href: '/focus', 
    category: 'productivity',
    addedAt: '2025-12-05', 
    updatedAt: '2025-12-05'
  },
  // Task Planner App
  {
    id: 'planner-board',
    title: 'Task Planner',
    desc: 'Kanban style todo board',
    icon: Layout,
    href: '/planner',
    category: 'productivity',
    addedAt: '2025-12-06',
    updatedAt: '2025-12-06'
  },
  // Diff Checker App
  {
    id: 'diff-checker',
    title: 'Diff Checker',
    desc: 'Compare code & text',
    icon: Diff,
    href: '/check-difference',
    category: 'tools',
    addedAt: '2025-11-20',
    updatedAt: '2025-12-01'
  },
  // SVG Customizer App
  {
    id: 'svg-customizer',
    title: 'SVG Customizer',
    desc: 'Optimize & edit icons',
    icon: Palette,
    href: '/customize-svg',
    category: 'tools',
    addedAt: '2025-11-25',
    updatedAt: '2025-11-28'
  },
  // Neon Blast Game
  {
    id: 'neon-blast',
    title: 'Neon Blast',
    desc: 'Reflex survival game',
    icon: Zap,
    href: '/neon-blast',
    category: 'games',
    addedAt: '2025-10-15',
    updatedAt: '2025-11-05'
  }
];