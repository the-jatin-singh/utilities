import { 
  Diff, 
  Palette, 
  Zap, 
  Terminal, 
  Gamepad2, 
  Layout,
  LucideIcon 
} from 'lucide-react';

// --- Types ---

export type CategoryId = 'tools' | 'games' | 'productivity';

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
  version: '1.2',
  githubUrl: 'https://github.com/the-jatin-singh/utilities',
  sections: [
    { id: 'productivity', label: 'Productivity', icon: Layout }, // New Section
    { id: 'tools', label: 'Utilities', icon: Terminal },
    { id: 'games', label: 'Arcade', icon: Gamepad2 }
  ]
};

// --- Data ---

export const APPS_DATA: AppItem[] = [
  // New Planner App
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