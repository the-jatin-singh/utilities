'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, X, BarChart3, Home } from 'lucide-react';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  notifications: boolean;
}

interface DailyStats {
  [date: string]: {
    sessions: number;
    totalMinutes: number;
  };
}

export default function PomodoroApp() {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats>({});
  const [settings, setSettings] = useState<TimerSettings>({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true,
    soundVolume: 70,
    notifications: true,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings and stats from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    const savedStats = localStorage.getItem('pomodoroStats');
    const savedTotalSessions = localStorage.getItem('pomodoroTotalSessions');
    
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setTimeLeft(parsed.pomodoro * 60);
    }
    
    if (savedStats) {
      setDailyStats(JSON.parse(savedStats));
    }
    
    if (savedTotalSessions) {
      setTotalSessions(parseInt(savedTotalSessions));
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }, [settings]);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('pomodoroStats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  // Save total sessions
  useEffect(() => {
    localStorage.setItem('pomodoroTotalSessions', totalSessions.toString());
  }, [totalSessions]);

  // Initialize audio
  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const createBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(settings.soundVolume / 100, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };
    
    audioRef.current = { play: createBeep } as any;
  }, [settings.soundVolume]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Update document title
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ${mode === 'pomodoro' ? 'Focus' : 'Break'}`;
  }, [timeLeft, mode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showSettings && !showStats) {
        e.preventDefault();
        setIsRunning(!isRunning);
      } else if (e.key === 'r' && !showSettings && !showStats) {
        e.preventDefault();
        handleReset();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, showSettings, showStats]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    // Play sound
    if (settings.soundEnabled) {
      audioRef.current?.play();
    }
    
    // Show notification
    if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: mode === 'pomodoro' ? 'Focus session completed! Time for a break.' : 'Break over! Ready to focus?',
      });
    }
    
    if (mode === 'pomodoro') {
      const newSessions = sessions + 1;
      const newTotalSessions = totalSessions + 1;
      setSessions(newSessions);
      setTotalSessions(newTotalSessions);
      
      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      setDailyStats((prev) => ({
        ...prev,
        [today]: {
          sessions: (prev[today]?.sessions || 0) + 1,
          totalMinutes: (prev[today]?.totalMinutes || 0) + settings.pomodoro,
        },
      }));
      
      // Determine next mode
      const nextMode = newSessions % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
      setMode(nextMode);
      setTimeLeft(settings[nextMode] * 60);
      
      if (settings.autoStartBreaks) {
        setTimeout(() => setIsRunning(true), 1000);
      }
    } else {
      setMode('pomodoro');
      setTimeLeft(settings.pomodoro * 60);
      
      if (settings.autoStartPomodoros) {
        setTimeout(() => setIsRunning(true), 1000);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(settings[newMode] * 60);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(settings[mode] * 60);
  };

  const handleSettingsChange = (key: keyof TimerSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const applySettings = () => {
    setTimeLeft(settings[mode] * 60);
    setIsRunning(false);
    setShowSettings(false);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const progress = ((settings[mode] * 60 - timeLeft) / (settings[mode] * 60)) * 100;

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todaySessions = dailyStats[today]?.sessions || 0;
  const todayMinutes = dailyStats[today]?.totalMinutes || 0;
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();
  
  const weekTotal = last7Days.reduce((sum, date) => sum + (dailyStats[date]?.sessions || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Home Button */}
      <a
        href="/"
        className="fixed top-4 left-4 sm:top-6 sm:left-6 p-3 bg-white rounded-full border border-neutral-200 hover:bg-neutral-50 transition-colors shadow-sm z-50"
        aria-label="Go to home"
      >
        <Home className="w-5 h-5 text-neutral-700" />
      </a>

      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Left Sidebar - Stats */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-sm font-medium text-neutral-500 mb-4">Today</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-semibold text-neutral-900">{todaySessions}</p>
                  <p className="text-xs text-neutral-500 mt-1">sessions</p>
                </div>
                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-2xl font-semibold text-neutral-900">{todayMinutes}</p>
                  <p className="text-xs text-neutral-500 mt-1">minutes</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-sm font-medium text-neutral-500 mb-4">Week</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-semibold text-neutral-900">{weekTotal}</p>
                  <p className="text-xs text-neutral-500 mt-1">sessions</p>
                </div>
                <div className="pt-3 border-t border-neutral-100">
                  <p className="text-2xl font-semibold text-neutral-900">{totalSessions}</p>
                  <p className="text-xs text-neutral-500 mt-1">all time</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowStats(true)}
              className="w-full bg-white hover:bg-neutral-50 rounded-lg border border-neutral-200 p-4 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-neutral-700"
            >
              <BarChart3 className="w-4 h-4" />
              Statistics
            </button>
          </div>

          {/* Center - Timer */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6 sm:p-8 lg:p-12">
              {/* Mode Selector */}
              <div className="flex gap-2 mb-8 lg:mb-12">
                <button
                  onClick={() => handleModeChange('pomodoro')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === 'pomodoro'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Focus
                </button>
                <button
                  onClick={() => handleModeChange('shortBreak')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === 'shortBreak'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Short Break
                </button>
                <button
                  onClick={() => handleModeChange('longBreak')}
                  className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === 'longBreak'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Long Break
                </button>
              </div>

              {/* Timer Display */}
              <div className="relative mb-8 lg:mb-12 mx-auto" style={{ maxWidth: '400px' }}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#f5f5f5"
                    strokeWidth="4"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="#171717"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl sm:text-6xl lg:text-7xl font-light text-neutral-900 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-400 uppercase tracking-wider font-medium mt-2 lg:mt-3">
                    {mode === 'pomodoro' ? 'Focus' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
                  </div>
                  {mode === 'pomodoro' && (
                    <div className="mt-2 text-xs text-neutral-400">
                      {sessions % settings.longBreakInterval + 1} / {settings.longBreakInterval}
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="p-5 sm:p-6 rounded-full bg-neutral-900 hover:bg-neutral-800 transition-colors"
                >
                  {isRunning ? (
                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="p-4 sm:p-5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-700" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-4 sm:p-5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Info */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-sm font-medium text-neutral-500 mb-4">Current Streak</h2>
              <div>
                <p className="text-4xl font-semibold text-neutral-900">{sessions}</p>
                <p className="text-xs text-neutral-500 mt-1">sessions</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
              <h2 className="text-sm font-medium text-neutral-500 mb-4">Recent Activity</h2>
              <div className="space-y-2">
                {last7Days.slice(-5).reverse().map((date) => {
                  const d = new Date(date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const sessions = dailyStats[date]?.sessions || 0;
                  const maxSessions = Math.max(...last7Days.map(d => dailyStats[d]?.sessions || 0), 1);
                  const barWidth = (sessions / maxSessions) * 100;
                  
                  return (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400 w-8">{dayName}</span>
                      <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
                        <div
                          className="bg-neutral-900 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-neutral-600 w-4 text-right">{sessions}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-neutral-100 rounded-lg p-4 sm:p-6">
              <p className="text-xs text-neutral-600">
                <span className="font-medium">Tip:</span> Press Space to start/pause, R to reset
              </p>
            </div>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-md hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 mb-4">Timer Duration</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Focus (min)</label>
                      <input
                        type="number"
                        value={settings.pomodoro}
                        onChange={(e) => handleSettingsChange('pomodoro', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        min="1"
                        max="60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Short Break (min)</label>
                      <input
                        type="number"
                        value={settings.shortBreak}
                        onChange={(e) => handleSettingsChange('shortBreak', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        min="1"
                        max="30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Long Break (min)</label>
                      <input
                        type="number"
                        value={settings.longBreak}
                        onChange={(e) => handleSettingsChange('longBreak', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        min="1"
                        max="60"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs text-neutral-500 mb-2">Long Break Interval</label>
                    <input
                      type="number"
                      value={settings.longBreakInterval}
                      onChange={(e) => handleSettingsChange('longBreakInterval', parseInt(e.target.value) || 1)}
                      className="w-full sm:w-48 px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-200">
                  <h3 className="text-sm font-medium text-neutral-900 mb-4">Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-neutral-700">Auto-start Breaks</span>
                      <input
                        type="checkbox"
                        checked={settings.autoStartBreaks}
                        onChange={(e) => handleSettingsChange('autoStartBreaks', e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-neutral-700">Auto-start Focus Sessions</span>
                      <input
                        type="checkbox"
                        checked={settings.autoStartPomodoros}
                        onChange={(e) => handleSettingsChange('autoStartPomodoros', e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-neutral-700">Sound Notifications</span>
                      <input
                        type="checkbox"
                        checked={settings.soundEnabled}
                        onChange={(e) => handleSettingsChange('soundEnabled', e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-1 focus:ring-neutral-900"
                      />
                    </label>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-neutral-700">Volume</span>
                        <span className="text-xs text-neutral-500">{settings.soundVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.soundVolume}
                        onChange={(e) => handleSettingsChange('soundVolume', parseInt(e.target.value))}
                        className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                      />
                    </div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-700">Desktop Notifications</span>
                        {Notification.permission === 'default' && (
                          <button
                            onClick={requestNotificationPermission}
                            className="text-xs bg-neutral-900 hover:bg-neutral-800 px-2 py-0.5 rounded text-white"
                          >
                            Enable
                          </button>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => handleSettingsChange('notifications', e.target.checked)}
                        disabled={Notification.permission === 'denied'}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={applySettings}
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showStats && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Statistics</h2>
                <button
                  onClick={() => setShowStats(false)}
                  className="p-1 rounded-md hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-xs text-neutral-500 mb-1">Total Sessions</p>
                    <p className="text-3xl font-semibold text-neutral-900">{totalSessions}</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-xs text-neutral-500 mb-1">This Week</p>
                    <p className="text-3xl font-semibold text-neutral-900">{weekTotal}</p>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-4 col-span-2 sm:col-span-1">
                    <p className="text-xs text-neutral-500 mb-1">Today</p>
                    <p className="text-3xl font-semibold text-neutral-900">{todaySessions}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-900 mb-4">Last 7 Days</h3>
                  <div className="space-y-3">
                    {last7Days.map((date) => {
                      const d = new Date(date);
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                      const sessions = dailyStats[date]?.sessions || 0;
                      const minutes = dailyStats[date]?.totalMinutes || 0;
                      const maxSessions = Math.max(...last7Days.map(d => dailyStats[d]?.sessions || 0), 1);
                      const barWidth = (sessions / maxSessions) * 100;
                      
                      return (
                        <div key={date}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-neutral-500">{dayName}</span>
                            <span className="text-xs text-neutral-700">{sessions} sessions · {minutes} min</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-2">
                            <div
                              className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}