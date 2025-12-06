'use client';

import React, { useState, useEffect, useDeferredValue, useTransition, useRef } from 'react';
import { 
  ArrowRightLeft, 
  Columns, 
  Rows, 
  Trash2, 
  Code, 
  Check, 
  Copy,
  FileDiff,
  Loader2,
  ChevronUp,
  ChevronDown,
  Home // Imported Home icon
} from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import Link from 'next/link'; // Imported Next.js Link

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'json', label: 'JSON' },
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'python', label: 'Python' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'sql', label: 'SQL' },
  { id: 'xml', label: 'XML' },
  { id: 'yaml', label: 'YAML' },
];

export default function DiffCheckerPage() {
  const [oldCode, setOldCode] = useState<string>('');
  const [newCode, setNewCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('javascript');
  
  const deferredOldCode = useDeferredValue(oldCode);
  const deferredNewCode = useDeferredValue(newCode);

  const [splitView, setSplitView] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOldCode(`{
  "project": "UtilityApp",
  "version": 1.0,
  "features": ["diff", "json"],
  "author": "Dev"
}`);
    setNewCode(`{
  "project": "UtilityApp",
  "version": 2.0,
  "features": ["diff", "json", "uuid", "monaco"],
  "author": "Dev"
}`);
  }, []);

  const handleSwap = () => {
    const temp = oldCode;
    setOldCode(newCode);
    setNewCode(temp);
  };

  const handleClear = () => {
    setOldCode('');
    setNewCode('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSplitView = () => {
    startTransition(() => {
      setSplitView((prev) => !prev);
    });
  };

  const isDiffing = deferredOldCode !== oldCode || deferredNewCode !== newCode || isPending;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0c0c0e] p-6 md:p-12 font-sans text-zinc-900 dark:text-zinc-100 pb-40 transition-colors selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
      
      {/* Modern Scrollbar Styles */}
      <style jsx global>{`
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { 
          background: rgba(161, 161, 170, 0.3); 
          border-radius: 99px; 
          border: 3px solid transparent; 
          background-clip: content-box; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: rgba(161, 161, 170, 0.5); 
          border: 3px solid transparent; 
          background-clip: content-box; 
        }
        textarea { scrollbar-gutter: stable; }
      `}</style>

      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Input Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Original Input */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-b-0 border-zinc-200 dark:border-zinc-800 rounded-t-xl">
              <label className="text-xs font-semibold tracking-wide text-zinc-500 uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                Original
              </label>
              <span className="text-[10px] text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">Read Only</span>
            </div>
            <textarea
              value={oldCode}
              onChange={(e) => setOldCode(e.target.value)}
              placeholder="Paste original text here..."
              className="w-full h-72 p-4 font-mono text-sm bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-b-xl focus:ring-1 focus:ring-orange-500/30 focus:border-orange-400/50 outline-none resize-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all shadow-sm"
              spellCheck={false}
            />
          </div>
          
          {/* Modified Input */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-b-0 border-zinc-200 dark:border-zinc-800 rounded-t-xl">
              <label className="text-xs font-semibold tracking-wide text-zinc-500 uppercase flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                Modified
              </label>
              <button 
                onClick={handleCopy}
                className="text-[10px] flex items-center gap-1.5 font-bold text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
            <textarea
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="Paste modified text here..."
              className="w-full h-72 p-4 font-mono text-sm bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-b-xl focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-400/50 outline-none resize-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 transition-all shadow-sm"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Monaco Diff Editor Area */}
        <div className="flex flex-col gap-0">
          <div className="flex items-center justify-between px-1 mb-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <FileDiff size={18} className="text-zinc-400" />
              Diff Result
              {isDiffing && <Loader2 size={14} className="animate-spin text-zinc-400 ml-2" />}
            </label>
            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
              {language}
            </span>
          </div>

          <div className="h-[75vh] w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-xl relative ring-1 ring-black/5">
            {!isEditorReady && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-500" />
                <span className="text-xs tracking-widest uppercase font-semibold">Loading Engine...</span>
              </div>
            )}
            <DiffEditor
              height="100%"
              language={language}
              original={deferredOldCode}
              modified={deferredNewCode}
              theme="vs-dark"
              options={{
                renderSideBySide: splitView,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: 1.6,
                wordWrap: 'on',
                diffWordWrap: 'on',
                originalEditable: false,
                padding: { top: 24, bottom: 24 },
                renderOverviewRuler: false,
                hideCursorInOverviewRuler: true,
                guides: { indentation: false },
                renderLineHighlight: 'none',
              }}
              onMount={() => setIsEditorReady(true)}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Bar - Pure Functionality, No Branding */}
      <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 p-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl shadow-2xl rounded-full border border-zinc-200/50 dark:border-zinc-700/50 ring-1 ring-black/5 dark:ring-white/5 transition-transform hover:scale-[1.01]">
          
          {/* NEW: Home / Back Button */}
          <Link 
            href="/"
            className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-full transition-all"
            title="Back to Home"
          >
            <Home size={18} />
          </Link>

          {/* Separator */}
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

          {/* Custom Language Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-full transition-colors min-w-[130px] justify-between group"
            >
              <span className="flex items-center gap-2">
                <Code size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                {LANGUAGES.find(l => l.id === language)?.label}
              </span>
              {isDropdownOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-3 w-40 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-200">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setLanguage(lang.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors flex items-center justify-between
                      ${language === lang.id 
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50'
                      }`}
                  >
                    {lang.label}
                    {language === lang.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1"></div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSplitView}
              disabled={isPending}
              className={`p-2.5 rounded-full transition-all ${
                splitView 
                  ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-inner' 
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
              }`}
              title={splitView ? "Unified View" : "Split View"}
            >
              {splitView ? <Columns size={18} /> : <Rows size={18} />}
            </button>

            <button
              onClick={handleSwap}
              className="p-2.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-all"
              title="Swap Inputs"
            >
              <ArrowRightLeft size={18} />
            </button>

            <button
              onClick={handleClear}
              className="p-2.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
              title="Clear All"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}