'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Trash2,
  FileSpreadsheet,
  X,
  ArrowRight
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
  date: string; // ISO String
  pair: string;
  side: 'Long' | 'Short';
  pnl: number;
  notes?: string;
}

// --- Components ---

const StatCard = ({ label, value, trend }: { label: string, value: string, trend?: 'up' | 'down' | 'neutral' }) => (
  <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-xl hover:border-white/10 transition-colors">
    <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">{label}</h3>
    <div className="flex items-center gap-3">
      <div className="text-2xl font-light text-zinc-100">{value}</div>
      {trend && (
        <div className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
          trend === 'up' ? "bg-emerald-500/10 text-emerald-500" : 
          trend === 'down' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-800 text-zinc-400"
        )}>
          {trend === 'up' ? 'Profit' : trend === 'down' ? 'Loss' : 'Neutral'}
        </div>
      )}
    </div>
  </div>
);

// --- Main Page ---

export default function CryptoJournal() {
  // --- State ---
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // To prevent hydration mismatch
  
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

  // Load from LocalStorage on Mount
  useEffect(() => {
    const saved = localStorage.getItem('crypto_journal_trades');
    if (saved) {
      try {
        setTrades(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse trades", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage on Change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('crypto_journal_trades', JSON.stringify(trades));
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

  // Prevent hydration flicker
  if (!isLoaded) return <div className="min-h-screen bg-zinc-950" />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-emerald-500/30">
      
      {/* Top Navigation */}
      <nav className="border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <h1 className="font-semibold text-zinc-100 tracking-tight">Journal</h1>
          </div>
          
          {trades.length > 0 && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Import"
              >
                <Upload size={18} />
              </button>
              <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 rounded-md text-sm font-medium transition-all"
              >
                <Plus size={16} /> Add Trade
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* --- EMPTY STATE (Onboarding) --- */}
        {trades.length === 0 ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
              <TrendingUp className="text-emerald-500" size={32} />
            </div>
            <h2 className="text-3xl font-light text-white mb-3">No trades recorded yet</h2>
            <p className="text-zinc-500 max-w-md mb-10">
              Start tracking your performance by adding your first trade manually or importing your history from an Excel sheet.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
              <button 
                onClick={() => setIsManualModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-100 text-zinc-950 hover:bg-white rounded-xl font-medium transition-all group"
              >
                <Plus size={18} />
                <span>Manual Entry</span>
              </button>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl font-medium transition-all"
              >
                <FileSpreadsheet size={18} />
                <span>Import CSV</span>
              </button>
            </div>
          </div>
        ) : (
          /* --- DASHBOARD VIEW --- */
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard 
                label="Net PnL" 
                value={formatCurrency(stats.totalPnL)} 
                trend={stats.totalPnL >= 0 ? 'up' : 'down'}
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
              <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-xl p-6">
                <div className="h-[300px] w-full">
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
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                        formatter={(value: number) => [formatCurrency(value), 'PnL']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke={stats.totalPnL >= 0 ? '#10b981' : '#f43f5e'} 
                        strokeWidth={2}
                        fill="url(#colorPnl)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Bar Chart */}
              <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-15)}>
                      <Tooltip 
                        cursor={{fill: '#27272a'}}
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value: number) => [formatCurrency(value), 'PnL']}
                      />
                      <Bar dataKey="pnl">
                        {chartData.slice(-15).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#34d399' : '#fb7185'} radius={[2, 2, 2, 2]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">History</h3>
                <button onClick={clearAllData} className="text-xs text-zinc-600 hover:text-rose-500 transition-colors">
                  Clear Data
                </button>
              </div>
              
              <div className="grid gap-2">
                {trades.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((trade) => (
                  <div key={trade.id} className="group flex items-center justify-between p-4 bg-zinc-900/20 border border-white/5 rounded-lg hover:bg-zinc-900/60 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-1 h-8 rounded-full",
                        trade.pnl >= 0 ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-200">{trade.pair}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border",
                            trade.side === 'Long' 
                              ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" 
                              : "border-rose-500/20 text-rose-500 bg-rose-500/5"
                          )}>
                            {trade.side}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {format(new Date(trade.date), 'MMM dd, yyyy')} • {trade.notes || 'No notes'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "font-medium",
                        trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {trade.pnl > 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                      </div>
                      <button 
                        onClick={() => deleteTrade(trade.id)}
                        className="text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all"
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
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-white">Import Data</h2>
              <p className="text-sm text-zinc-400">
                Upload .xlsx or .csv. Required columns: <br/>
                <span className="text-emerald-400">Date, Pair, Side, PnL</span>
              </p>
              
              <div 
                className="border-2 border-dashed border-zinc-700 rounded-xl p-10 hover:bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-3 text-zinc-500 group-hover:text-zinc-300">
                  <Upload size={32} />
                  <span className="text-sm">Click to upload file</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
             <button 
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold text-white mb-6">Log Trade</h2>
            
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 uppercase font-medium">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newTrade.date}
                    onChange={e => setNewTrade({...newTrade, date: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500 uppercase font-medium">Side</label>
                  <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    {['Long', 'Short'].map(side => (
                       <button
                        key={side}
                        type="button"
                        onClick={() => setNewTrade({...newTrade, side: side as 'Long' | 'Short'})}
                        className={cn(
                          "flex-1 text-sm py-1 rounded-md transition-all",
                          newTrade.side === side 
                            ? (side === 'Long' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400") 
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
                <label className="text-xs text-zinc-500 uppercase font-medium">Pair</label>
                <input 
                  type="text" 
                  placeholder="BTC/USDT"
                  required
                  value={newTrade.pair}
                  onChange={e => setNewTrade({...newTrade, pair: e.target.value.toUpperCase()})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 uppercase font-medium">PnL ($)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  required
                  value={newTrade.pnl}
                  onChange={e => setNewTrade({...newTrade, pnl: parseFloat(e.target.value)})}
                  className={cn(
                    "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 transition-all placeholder:text-zinc-700",
                    (newTrade.pnl || 0) > 0 ? "text-emerald-400 focus:border-emerald-500/50 focus:ring-emerald-500/50" : 
                    (newTrade.pnl || 0) < 0 ? "text-rose-400 focus:border-rose-500/50 focus:ring-rose-500/50" : "text-zinc-200 focus:border-zinc-600"
                  )}
                />
              </div>

               <div className="space-y-1.5">
                <label className="text-xs text-zinc-500 uppercase font-medium">Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Setup details..."
                  value={newTrade.notes}
                  onChange={e => setNewTrade({...newTrade, notes: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-600 transition-all placeholder:text-zinc-700 resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-3 rounded-xl mt-4 transition-all flex items-center justify-center gap-2"
              >
                <span>Save Trade</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}