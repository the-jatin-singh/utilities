"use client";
import React, { useState, useMemo, memo, ChangeEvent } from 'react';
import {
  Diff,
  Palette,
  Zap,
  ArrowRight,
  Search,
  Github,
  Terminal,
  Gamepad2,
  Box,
  LucideIcon
} from 'lucide-react';

// --- Types & Interfaces ---

type CategoryId = 'tools' | 'games';
type FilterType = 'all' | CategoryId;

interface Section {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
}

interface AppItem {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  href: string;
  category: CategoryId;
}

interface AppConfig {
  appName: string;
  version: string;
  githubUrl: string;
  sections: Section[];
}

// --- Configuration & Data ---

const APP_CONFIG: AppConfig = {
  appName: 'Toolkit',
  version: '1.0',
  // githubUrl: 'https://github.com/the-jatin-singh',
  githubUrl: 'https://github.com/the-jatin-singh/utilities',
  sections: [
    { id: 'tools', label: 'Utilities', icon: Terminal },
    { id: 'games', label: 'Arcade', icon: Gamepad2 }
  ]
};

const APPS_DATA: AppItem[] = [
  {
    id: 'diff-checker',
    title: 'Diff Checker',
    desc: 'Compare code & text',
    icon: Diff,
    href: '/check-difference',
    category: 'tools'
  },
  {
    id: 'svg-customizer',
    title: 'SVG Customizer',
    desc: 'Optimize & edit icons',
    icon: Palette,
    href: '/customize-svg',
    category: 'tools'
  },
  {
    id: 'neon-blast',
    title: 'Neon Blast',
    desc: 'Reflex survival game',
    icon: Zap,
    href: '/neon-blast',
    category: 'games'
  }
];

// --- Components ---

/**
 * Renders a single application card.
 * Memoized to prevent re-renders when parent state changes but props don't.
 */
const MinimalCard = memo(({ title, desc, icon: Icon, href }: Omit<AppItem, 'id' | 'category'>) => (
  <a
    href={href}
    className="group block p-4 rounded-lg bg-neutral-900/30 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 transition-all duration-200"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-neutral-400 group-hover:text-white transition-colors">
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors line-clamp-1">
            {desc}
          </p>
        </div>
      </div>
      <ArrowRight
        size={14}
        className="text-neutral-600 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200"
      />
    </div>
  </a>
));

/**
 * Filter button component.
 */
interface FilterTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterTab = memo(({ label, isActive, onClick }: FilterTabProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${isActive
        ? 'bg-neutral-800 text-white shadow-sm'
        : 'text-neutral-500 hover:text-neutral-300'
      }`}
  >
    {label}
  </button>
));

/**
 * Header component containing title, search, and filters.
 */
interface HeaderProps {
  searchQuery: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  activeTab: FilterType;
  onTabChange: (tab: FilterType) => void;
}

const Header = ({ searchQuery, onSearchChange, activeTab, onTabChange }: HeaderProps) => (
  <header className="mb-10 border-b border-neutral-800/50 pb-6">
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-2xl font-bold text-white tracking-tight">{APP_CONFIG.appName}</h1>
      <div className="text-xs font-mono text-neutral-500 border border-neutral-800 rounded px-2 py-1">
        v{APP_CONFIG.version}
      </div>
    </div>

    <p className="text-neutral-500 text-sm mb-6 max-w-md">
      Simple utilities and games. No clutter, just tools.
    </p>

    <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
      {/* Search Input */}
      <div className="relative group w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-neutral-400 transition-colors" size={14} />
        <input
          type="text"
          placeholder="Find a tool..."
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full bg-neutral-900/50 border border-neutral-800 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all placeholder:text-neutral-700 text-neutral-300"
        />
      </div>

      {/* Tab Filters */}
      <div className="flex gap-1 bg-neutral-900/50 p-1 rounded-md border border-neutral-800 w-fit self-start sm:self-auto">
        <FilterTab label="All" isActive={activeTab === 'all'} onClick={() => onTabChange('all')} />
        {APP_CONFIG.sections.map(section => (
          <FilterTab
            key={section.id}
            label={section.id}
            isActive={activeTab === section.id}
            onClick={() => onTabChange(section.id)}
          />
        ))}
      </div>
    </div>
  </header>
);

/**
 * Footer component.
 */
const Footer = () => (
  <footer className="border-t border-neutral-900 py-6 bg-neutral-950">
    <div className="max-w-3xl mx-auto px-6 flex justify-between items-center text-neutral-600">
      <span className="text-xs">Open Source Utility Collection</span>
      <a
        href={APP_CONFIG.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-white transition-colors p-2 -mr-2"
        aria-label="View on GitHub"
      >
        <Github size={18} />
      </a>
    </div>
  </footer>
);

/**
 * Main Content Area
 */
interface AppGridProps {
  sections: Array<Section & { items: AppItem[] }>;
  searchQuery: string;
}

const AppGrid = ({ sections, searchQuery }: AppGridProps) => {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-neutral-600">
        <Box size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p>No apps found matching "{searchQuery}"</p>
      </div>
    );
  }

  return (
    <main className="space-y-8 min-h-[300px]">
      {sections.map(section => (
        <section key={section.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            <section.icon size={12} />
            <span>{section.label}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.items.map(item => (
              <MinimalCard
                key={item.id}
                title={item.title}
                desc={item.desc}
                icon={item.icon}
                href={item.href}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
};

// --- Main Page Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Optimized filter logic
  const visibleSections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const isAllTabs = activeTab === 'all';

    return APP_CONFIG.sections.map(section => {
      // 1. Filter by Category first (if not 'all')
      if (!isAllTabs && section.id !== activeTab) {
        return { ...section, items: [] };
      }

      // 2. Filter items by Search Query
      const items = APPS_DATA.filter(item => {
        if (item.category !== section.id) return false;
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.desc.toLowerCase().includes(query)
        );
      });

      return { ...section, items };
    }).filter(section => section.items.length > 0);
  }, [activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col">
      <div className="w-full max-w-3xl mx-auto px-6 py-12 grow">
        <Header
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <AppGrid sections={visibleSections} searchQuery={searchQuery} />
      </div>

      <Footer />
    </div>
  );
}