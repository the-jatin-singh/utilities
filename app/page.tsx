"use client";
import React, { useState, useMemo, memo, ChangeEvent } from 'react';
import {
  ArrowRight,
  Search,
  Github,
  Box,
  Clock,
  CalendarDays
} from 'lucide-react';

// Import data
import { APP_CONFIG, APPS_DATA, AppItem, CategoryId } from './data/homeData'; 
// Import Logo
import { Logo } from './icons/icons';

// --- Utilities ---

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const isNewApp = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays <= 14; 
};

// --- Components ---

const MinimalCard = memo(({ title, desc, icon: Icon, href, addedAt, updatedAt }: Omit<AppItem, 'id' | 'category'>) => {
  const isNew = useMemo(() => isNewApp(addedAt), [addedAt]);

  return (
    <a
      href={href}
      className="group block p-4 rounded-xl bg-neutral-900/30 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 transition-all duration-200 relative overflow-hidden"
    >
      {isNew && (
        <div className="absolute top-0 right-0">
          <div className="bg-indigo-600/20 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-indigo-600/20 backdrop-blur-sm">
            NEW
          </div>
        </div>
      )}

      <div className="flex flex-col h-full justify-between gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-800/50 text-neutral-400 group-hover:text-white group-hover:bg-neutral-800 transition-all">
              <Icon size={20} />
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
            size={16}
            className="text-neutral-600 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200 mt-2"
          />
        </div>

        <div className="flex items-center gap-4 pt-3 mt-1 border-t border-neutral-800/50 text-[10px] text-neutral-600 font-mono">
          <div className="flex items-center gap-1.5" title={`Added: ${addedAt}`}>
             <CalendarDays size={10} />
             <span>Added {formatDate(addedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5" title={`Last Updated: ${updatedAt}`}>
             <Clock size={10} />
             <span>Upd {formatDate(updatedAt)}</span>
          </div>
        </div>
      </div>
    </a>
  );
});
MinimalCard.displayName = 'MinimalCard';

interface FilterTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterTab = memo(({ label, isActive, onClick }: FilterTabProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${isActive
        ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white shadow-sm'
        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
      }`}
  >
    {label}
  </button>
));
FilterTab.displayName = 'FilterTab';

// --- HEADER COMPONENT ---
interface HeaderProps {
  searchQuery: string;
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  activeTab: 'all' | CategoryId;
  onTabChange: (tab: 'all' | CategoryId) => void;
}

const Header = ({ searchQuery, onSearchChange, activeTab, onTabChange }: HeaderProps) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 transition-all">
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
      
      {/* Logo Area */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-8 h-8 flex items-center justify-center text-white">
          <Logo />
        </div>
        <div className="w-px h-6 bg-neutral-800 hidden sm:block"></div>
      </div>

      {/* Middle: Tab Filters (Scrollable) */}
      <div className="flex-1 flex gap-1 overflow-x-auto hide-scrollbar mask-gradient-right py-1 items-center">
        <FilterTab label="All" isActive={activeTab === 'all'} onClick={() => onTabChange('all')} />
        {APP_CONFIG.sections.map(section => (
          <FilterTab
            key={section.id}
            label={section.label}
            isActive={activeTab === section.id}
            onClick={() => onTabChange(section.id)}
          />
        ))}
      </div>

      {/* Right: Search Input */}
      <div className="relative group w-32 sm:w-48 md:w-64 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-indigo-400 transition-colors" size={14} />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={onSearchChange}
          className="w-full bg-neutral-900/50 border border-neutral-800/80 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500/30 focus:bg-neutral-900 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-neutral-600 text-neutral-300"
        />
      </div>

    </div>
  </header>
);

// --- FOOTER COMPONENT ---
const Footer = () => (
  <footer className="border-t border-neutral-900 py-8 mt-auto">
    <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-neutral-600">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-500">Open Source Collection</span>
      </div>
      <div className='flex items-center gap-2'>
         <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900 border border-neutral-600 rounded-2xl px-2 py-0.5">
             v{APP_CONFIG.version}
           </span>
      <a
        href={APP_CONFIG.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-white transition-colors p-2 -mr-2 hover:bg-neutral-900 rounded-lg"
        aria-label="View on GitHub"
      >
        <Github size={20} />
      </a>
      </div>
    </div>
  </footer>
);

interface AppGridProps {
  sections: Array<{ id: CategoryId; label: string; icon: any; items: AppItem[] }>;
  searchQuery: string;
}

const AppGrid = ({ sections, searchQuery }: AppGridProps) => {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-600 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 rounded-full bg-neutral-900/50 mb-4">
           <Box size={32} strokeWidth={1.5} className="opacity-50" />
        </div>
        <p className="text-sm">No apps found matching "{searchQuery}"</p>
        <button 
           onClick={() => window.location.reload()}
           className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <main className="space-y-10 min-h-[400px]">
      {sections.map(section => (
        <section key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded bg-neutral-900 text-indigo-500">
              <section.icon size={14} />
            </div>
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
              {section.label}
            </h2>
            <div className="h-px bg-neutral-900 flex-grow ml-2"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {section.items.map(item => (
              <MinimalCard
                key={item.id}
                title={item.title}
                desc={item.desc}
                icon={item.icon}
                href={item.href}
                addedAt={item.addedAt}
                updatedAt={item.updatedAt}
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
  const [activeTab, setActiveTab] = useState<'all' | CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleSections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const isAllTabs = activeTab === 'all';

    return APP_CONFIG.sections.map(section => {
      if (!isAllTabs && section.id !== activeTab) {
        return { ...section, items: [] };
      }
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
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Scrollbar hider utility */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header takes up 64px height fixed */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area - Added padding-top to account for fixed header */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-24 pb-12 grow">
        <AppGrid sections={visibleSections} searchQuery={searchQuery} />
      </div>

      <Footer />
    </div>
  );
}