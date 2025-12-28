'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Trash2,
  FileSpreadsheet,
  X,
  ArrowRight,
  Home,
  Wallet,
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { format, isValid } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// --- Types ---
interface Trade {
  id: string;
  date: string;
  pair: string;
  side: 'Long' | 'Short';
  pnl: number;
  notes?: string;
}

// --- Components ---

const StatCard = ({ label, value, trend, icon: Icon }: { label: string, value: string, trend?: 'up' | 'down' | 'neutral', icon?: any }) => (
  <div className="group relative bg-zinc-900/40 border border-white/5 p-6 rounded-2xl hover:bg-zinc-900/60 transition-all duration-300 overflow-hidden">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      {Icon && <Icon size={40} className="text-white" />}
    </div>
    <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-2">{label}</h3>
    <div className="flex items-baseline gap-3 relative z-10">
      <div className="text-3xl font-light text-zinc-100 tracking-tight">{value}</div>
      {trend && (
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
          trend === 'up' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
          trend === 'down' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
        )}>
          {trend === 'up' ? 'Profit' : trend === 'down' ? 'Loss' : '-'}
        </div>
      )}
    </div>
  </div>
);

// --- Main Page ---

export default function CryptoJournal() {
  // --- State ---
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Entry Form State
  const [newTrade, setNewTrade] = useState<Partial<Trade>>({
    date: new Date().toISOString().split('T')[0],
    side: 'Long',
    pair: '',
    pnl: undefined,
    notes: ''
  });

  // --- Effects ---

  useEffect(() => {
    const saved = localStorage.getItem('cj_data_v1');
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse trades", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cj_data_v1', JSON.stringify(trades));
    }
  }, [trades, isLoaded]);

  // --- Computations ---

  const stats = useMemo(() => {
    if (trades.length === 0) return { totalPnL: 0, winRate: 0, profitFactor: 0, count: 0 };

    const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl <= 0);
    
    const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));

    const winRate = (wins.length / trades.length) * 100;
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    return { totalPnL, winRate, profitFactor, count: trades.length };
  }, [trades]);

  const chartData = useMemo(() => {
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningTotal = 0;
    return sorted.map(t => {
      runningTotal += t.pnl;
      return {
        date: format(new Date(t.date), 'MMM dd'),
        pnl: t.pnl,
        cumulative: runningTotal
      };
    });
  }, [trades]);

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json(ws);

      const normalizedTrades: Trade[] = data.map((row: any, index) => {
        let dateStr = new Date().toISOString();
        if (row.Date) {
           if (typeof row.Date === 'number') {
             dateStr = new Date(Math.round((row.Date - 25569)*86400*1000)).toISOString();
           } else {
             const d = new Date(row.Date);
             if (isValid(d)) dateStr = d.toISOString();
           }
        }

        return {
          id: `imp-${Date.now()}-${index}`,
          date: dateStr,
          pair: row.Pair || row.Symbol || 'Unknown',
          side: (row.Side || row.Type || 'Long') as 'Long' | 'Short',
          pnl: parseFloat(row.PnL || row.Profit || row.Amount || '0'),
          notes: row.Notes || ''
        };
      });

      setTrades(prev => [...prev, ...normalizedTrades]);
      setIsUploadModalOpen(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrade.pnl === undefined) return;

    const trade: Trade = {
      id: `man-${Date.now()}`,
      date: newTrade.date ? new Date(newTrade.date).toISOString() : new Date().toISOString(),
      pair: newTrade.pair || 'Unknown',
      side: newTrade.side as 'Long' | 'Short',
      pnl: Number(newTrade.pnl),
      notes: newTrade.notes
    };
    setTrades(prev => [trade, ...prev]);
    setIsManualModalOpen(false);
    setNewTrade({ date: new Date().toISOString().split('T')[0], side: 'Long', pair: '', pnl: undefined, notes: '' });
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const clearAllData = () => {
    if(confirm("Are you sure you want to delete all data? This cannot be undone.")) {
      setTrades([]);
    }
  }

  if (!isLoaded) return <div className="min-h-screen bg-[#09090b]" />;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-violet-500/30">
      
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a 
              href="/" 
              className="p-2 -ml-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Go Home"
            >
              <Home size={20} />
            </a>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-violet-500/20">
                J
              </div>
              <h1 className="font-medium text-zinc-200 tracking-tight text-sm">Trading Journal</h1>
            </div>
          </div>
          
          {trades.length > 0 && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
                title="Import"
              >
                <Upload size={18} />
              </button>
              <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-950 hover:bg-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-white/5"
              >
                <Plus size={16} /> <span className="hidden sm:inline">New Trade</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* --- EMPTY STATE --- */}
        {trades.length === 0 ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center relative z-10 shadow-2xl">
                <Wallet className="text-violet-500" size={32} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Your Trading Journey</h2>
            <p className="text-zinc-500 max-w-sm mb-10 text-sm leading-relaxed">
              No trades recorded yet. Start logging your performance manually or import data to visualize your edge.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white hover:bg-violet-500 rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20"
              >
                <Plus size={18} />
                <span>Manual</span>
              </button>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-medium transition-all"
              >
                <FileSpreadsheet size={18} />
                <span>Import</span>
              </button>
            </div>
          </div>
        ) : (
          /* --- DASHBOARD VIEW --- */
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                label="Net PnL" 
                value={formatCurrency(stats.totalPnL)} 
                trend={stats.totalPnL >= 0 ? 'up' : 'down'}
                icon={Activity}
              />
              <StatCard 
                label="Win Rate" 
                value={`${stats.winRate.toFixed(1)}%`} 
                trend={stats.winRate > 50 ? 'up' : 'neutral'}
              />
              <StatCard 
                label="Profit Factor" 
                value={stats.profitFactor.toFixed(2)} 
              />
              <StatCard 
                label="Total Trades" 
                value={stats.count.toString()} 
              />
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PnL Curve */}
              <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-6 relative z-10">Equity Curve</h3>
                <div className="h-[320px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="#52525b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        minTickGap={40}
                        dy={10}
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                        itemStyle={{ color: '#e4e4e7' }}
                        formatter={(value: number | undefined) => [value !== undefined ? formatCurrency(value) : '-', 'PnL']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} 
                        strokeWidth={2}
                        fill="url(#colorPnl)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Bar Chart */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
                <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-6">Recent Performance</h3>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-15)}>
                      <Tooltip 
                        cursor={{fill: '#27272a'}}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                        formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'PnL']}
                      />
                      <Bar dataKey="pnl">
                        {chartData.slice(-15).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.pnl >= 0 ? '#34d399' : '#fb7185'} 
                            radius={2} 
                            className="opacity-80 hover:opacity-100 transition-opacity"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Trade History */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Recent Trades</h3>
                <button onClick={clearAllData} className="text-[10px] uppercase font-bold text-zinc-600 hover:text-rose-500 transition-colors tracking-wide">
                  Clear All Data
                </button>
              </div>
              
              <div className="grid gap-2">
                {trades.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((trade) => (
                  <div key={trade.id} className="group relative flex items-center justify-between p-4 bg-zinc-900/20 border border-white/5 rounded-xl hover:bg-zinc-900/50 hover:border-white/10 transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full ring-4 ring-opacity-20",
                        trade.pnl >= 0 ? "bg-emerald-500 ring-emerald-500" : "bg-rose-500 ring-rose-500"
                      )} />
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-zinc-200 tracking-tight">{trade.pair}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide",
                            trade.side === 'Long' 
                              ? "text-emerald-500 bg-emerald-500/10" 
                              : "text-rose-500 bg-rose-500/10"
                          )}>
                            {trade.side}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                          <span className="font-medium text-zinc-600">{format(new Date(trade.date), 'MMM dd')}</span>
                          {trade.notes && (
                            <>
                              <span className="w-0.5 h-0.5 rounded-full bg-zinc-700"></span>
                              <span className="truncate max-w-[200px]">{trade.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "font-medium tracking-tight",
                        trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </div>
                      <button 
                        onClick={() => deleteTrade(trade.id)}
                        className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODALS --- */}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-[#09090b]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Import Data</h2>
                <p className="text-sm text-zinc-500 mt-2">
                  Upload .xlsx or .csv. Required columns: <br/>
                  <span className="text-violet-400 font-mono text-xs bg-violet-500/10 px-2 py-1 rounded mt-1 inline-block">Date, Pair, Side, PnL</span>
                </p>
              </div>
              
              <div 
                className="border-2 border-dashed border-zinc-800 rounded-2xl p-10 hover:bg-zinc-900/50 hover:border-violet-500/30 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-4 text-zinc-600 group-hover:text-violet-400 transition-colors">
                  <div className="p-4 rounded-full bg-zinc-900 group-hover:bg-violet-500/10 transition-colors">
                    <Upload size={24} />
                  </div>
                  <span className="text-sm font-medium">Click to upload file</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-[#09090b]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md p-8 relative shadow-2xl">
             <button 
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">Log Trade</h2>
              <p className="text-sm text-zinc-500">Record a new position manually.</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newTrade.date}
                    onChange={e => setNewTrade({...newTrade, date: e.target.value})}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Side</label>
                  <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                    {['Long', 'Short'].map(side => (
                       <button
                        key={side}
                        type="button"
                        onClick={() => setNewTrade({...newTrade, side: side as 'Long' | 'Short'})}
                        className={cn(
                          "flex-1 text-xs py-1.5 rounded-md transition-all font-medium",
                          newTrade.side === side 
                            ? (side === 'Long' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-rose-500 text-white shadow-lg shadow-rose-500/20") 
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                       >
                         {side}
                       </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Pair</label>
                <input 
                  type="text" 
                  placeholder="e.g. BTC/USDT"
                  required
                  value={newTrade.pair}
                  onChange={e => setNewTrade({...newTrade, pair: e.target.value.toUpperCase()})}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder:text-zinc-700 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">PnL ($)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  required
                  value={newTrade.pnl}
                  onChange={e => setNewTrade({...newTrade, pnl: parseFloat(e.target.value)})}
                  className={cn(
                    "w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 transition-all placeholder:text-zinc-700 font-mono text-sm",
                    (newTrade.pnl || 0) > 0 ? "text-emerald-400 focus:border-emerald-500/50 focus:ring-emerald-500/50" : 
                    (newTrade.pnl || 0) < 0 ? "text-rose-400 focus:border-rose-500/50 focus:ring-rose-500/50" : "text-zinc-200 focus:border-violet-500"
                  )}
                />
              </div>

               <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Notes</label>
                <textarea 
                  rows={3}
                  placeholder="Strategy details..."
                  value={newTrade.notes}
                  onChange={e => setNewTrade({...newTrade, notes: e.target.value})}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder:text-zinc-700 resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium py-3 rounded-xl mt-2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                <span>Save Entry</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}