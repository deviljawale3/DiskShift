import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RodId, GameState, ScreenState, GameStatus } from './types.ts';
import { ROD_IDS, SOLVE_SPEED_MS, getTierForLevel, MAX_LEVEL } from './constants.ts';
import { createInitialState, isValidMove, getAutoSolveMoves, isGameWon } from './services/hanoiLogic.ts';
import { sounds } from './services/soundService.ts';
import Rod from './components/Rod.tsx';
import Logo from './components/Logo.tsx';

const SAVE_KEY = 'diskshift_save_v1';
const TUTORIAL_KEY = 'diskshift_tutorial_seen';

const App: React.FC = () => {
  const [screen, setScreen] = useState<ScreenState>('HOME');
  const [previousScreen, setPreviousScreen] = useState<ScreenState>('HOME');
  const [level, setLevel] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [movingDiskInfo, setMovingDiskInfo] = useState<{ rodId: RodId; size: number } | null>(null);

  const tier = getTierForLevel(level);
  const diskCount = tier.disks;
  const startRodId = tier.startRod;
  const targetRodId = tier.targetRod;
  const optimalMoves = Math.pow(2, diskCount) - 1;
  
  const [rods, setRods] = useState<GameState>(createInitialState(diskCount, startRodId));
  const [history, setHistory] = useState<GameState[]>([]);
  const [selectedRod, setSelectedRod] = useState<RodId | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [timer, setTimer] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastTargetRod, setLastTargetRod] = useState<RodId | null>(null);
  
  const [bgmVolume, setBgmVolume] = useState(0.2);
  const [sfxVolume, setSfxVolume] = useState(0.5);

  const solveTimerRef = useRef<number | null>(null);
  const gameTimerRef = useRef<number | null>(null);

  const saveGame = useCallback(() => {
    const data = {
      level,
      rods,
      moveCount,
      timer,
      historyLength: history.length,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [level, rods, moveCount, timer, history.length]);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const savedLevel = data.level || 1;
        setLevel(savedLevel);
        const currentTier = getTierForLevel(savedLevel);
        setRods(data.rods || createInitialState(currentTier.disks, currentTier.startRod));
        setMoveCount(data.moveCount || 0);
        setTimer(data.timer || 0);
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  useEffect(() => {
    if (screen === 'PLAYING') {
      saveGame();
    }
  }, [rods, moveCount, timer, screen, saveGame]);

  useEffect(() => {
    sounds.setBGMVolume(bgmVolume);
  }, [bgmVolume]);

  useEffect(() => {
    sounds.setSFXVolume(sfxVolume);
  }, [sfxVolume]);

  const runTransition = (callback: () => void) => {
    setIsTransitioning(true);
    setTimeout(() => {
      callback();
      setTimeout(() => setIsTransitioning(false), 400);
    }, 500);
  };

  const startLevel = (lvl: number) => {
    const clampedLevel = Math.min(Math.max(1, lvl), MAX_LEVEL);
    runTransition(() => {
      sounds.startBGM();
      setLevel(clampedLevel);
      const newTier = getTierForLevel(clampedLevel);
      setRods(createInitialState(newTier.disks, newTier.startRod));
      setHistory([]);
      setSelectedRod(null);
      setMoveCount(0);
      setTimer(0);
      setGameStatus(GameStatus.IDLE);
      setScreen('PLAYING');
      setErrorMessage(null);
      setLastTargetRod(null);
      setMovingDiskInfo(null);
      stopGameTimer();
      sounds.playLevelUp();
    });
  };

  const startGameTimer = () => {
    if (gameTimerRef.current) return;
    gameTimerRef.current = window.setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopGameTimer = () => {
    if (gameTimerRef.current) {
      window.clearInterval(gameTimerRef.current);
      gameTimerRef.current = null;
    }
  };

  const executeMove = (from: RodId, to: RodId) => {
    if (isValidMove(rods, from, to)) {
      setHistory(prev => [...prev, JSON.parse(JSON.stringify(rods))]);
      const sourceDisks = [...rods[from]];
      const targetDisks = [...rods[to]];
      const diskToMove = sourceDisks.pop();

      if (diskToMove !== undefined) {
        targetDisks.push(diskToMove);
        const nextRods = { ...rods, [from]: sourceDisks, [to]: targetDisks };
        setRods(nextRods);
        setMoveCount(prev => prev + 1);
        setSelectedRod(null);
        setLastTargetRod(to);
        setErrorMessage(null);
        sounds.playDrop();

        if (isGameWon(nextRods, diskCount, targetRodId)) {
          stopGameTimer();
          setScreen('WON');
          sounds.playWin();
          localStorage.removeItem(SAVE_KEY);
        }
      }
    } else {
      setErrorMessage("ILLEGAL MOVE!");
      sounds.playError();
      setSelectedRod(null); 
    }
  };

  const handleRodClick = (rodId: RodId) => {
    if (gameStatus === GameStatus.SOLVING || screen !== 'PLAYING') return;
    sounds.playSelect();
    if (selectedRod === null) {
      if (rods[rodId].length > 0) {
        setSelectedRod(rodId);
        setErrorMessage(null);
        if (gameStatus === GameStatus.IDLE) {
          setGameStatus(GameStatus.PLAYING);
          startGameTimer();
        }
      }
      return;
    }
    if (selectedRod === rodId) {
      setSelectedRod(null);
      setErrorMessage(null);
      return;
    }
    executeMove(selectedRod, rodId);
  };

  const handleDragStart = (rodId: RodId) => {
    setSelectedRod(rodId);
    setErrorMessage(null);
    sounds.playSelect();
    if (gameStatus === GameStatus.IDLE) {
      setGameStatus(GameStatus.PLAYING);
      startGameTimer();
    }
  };

  const handleUndo = () => {
    if (history.length === 0 || gameStatus === GameStatus.SOLVING) return;
    const previousState = history[history.length - 1];
    setRods(previousState);
    setHistory(prev => prev.slice(0, -1));
    setMoveCount(prev => prev - 1);
    setSelectedRod(null);
    setLastTargetRod(null);
    setErrorMessage(null);
    sounds.playUndo();
  };

  const handleAutoSolve = () => {
    if (gameStatus === GameStatus.SOLVING) return;
    setGameStatus(GameStatus.SOLVING);
    setErrorMessage(null);
    startGameTimer();
    
    // Find auxiliary rod for the algorithm
    const auxiliaryRodId: RodId = ROD_IDS.find(id => id !== startRodId && id !== targetRodId) as RodId;
    const moves = getAutoSolveMoves(diskCount, startRodId, targetRodId, auxiliaryRodId);
    let moveIdx = 0;

    // Reset board for a clean solution run starting from the correct origin rod
    setRods(createInitialState(diskCount, startRodId));
    setMoveCount(0);

    const interval = window.setInterval(() => {
      if (moveIdx >= moves.length) {
        window.clearInterval(interval);
        solveTimerRef.current = null;
        stopGameTimer();
        setScreen('WON');
        sounds.playWin();
        setMovingDiskInfo(null);
        return;
      }
      const { from, to } = moves[moveIdx];
      
      setRods(prev => {
        const newState = { ...prev };
        const disk = newState[from].pop();
        if (disk !== undefined) { 
          setMovingDiskInfo({ rodId: to, size: disk });
          newState[to].push(disk); 
          setLastTargetRod(to);
          sounds.playDrop(); 
        }
        return newState;
      });
      setMoveCount(prev => prev + 1);
      moveIdx++;
    }, SOLVE_SPEED_MS);
    solveTimerRef.current = interval;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const SettingsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724/0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const renderHome = () => (
    <div className="flex flex-col h-[100dvh] w-full px-6 pt-[env(safe-area-inset-top,5px)] pb-[env(safe-area-inset-bottom,5px)] bg-mesh relative items-center overflow-hidden">
      <div className="flex flex-col items-center w-full mt-auto mb-2 sm:mb-3">
        <div className="flex items-center gap-4">
          <h1 className="font-black tracking-tighter italic text-[clamp(2rem,12vw,4.5rem)] leading-none select-none bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            DISKSHIFT
          </h1>
          <div className="tooltip-container">
            <button 
              onClick={() => { sounds.playSelect(); setPreviousScreen('HOME'); setScreen('SETTINGS'); }}
              className="p-2 bg-slate-900/40 rounded-full text-slate-400 border border-white/10 active:scale-90 shadow-xl hover:text-white backdrop-blur-md"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <span className="tooltip-text">Audio Configuration</span>
          </div>
        </div>
        <p className="text-slate-500 font-black tracking-[0.4em] uppercase text-[8px] sm:text-[10px] mt-1 italic animate-pulse">Neural Logic Directive</p>
      </div>

      <div className="w-full max-w-[280px] sm:max-w-md bg-slate-950/40 p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl flex flex-col items-center group mb-4 sm:mb-6 transition-all">
        <span className="text-[7px] sm:text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] italic mb-1.5">Active Module</span>
        <div className="text-[clamp(1.8rem,8vw,4rem)] font-black text-white italic tracking-tighter leading-none mb-2 drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]">PHASE: {tier.phaseName}</div>
        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative border border-white/5 shadow-inner mb-2.5">
          <div className={`h-full bg-gradient-to-r from-sky-400 via-${tier.theme}-500 to-fuchsia-600 transition-all duration-1000 shadow-[0_0_15px_rgba(14,165,233,0.8)]`} style={{width: `${Math.max(5, (level/MAX_LEVEL)*100)}%`}} />
        </div>
        <div className={`text-[8px] sm:text-xs font-black tracking-[0.3em] uppercase ${tier.color} italic`}>{tier.name} • LEVEL {level}</div>
      </div>

      <div className="flex flex-col items-center w-full mt-auto mb-2 gap-3">
        <div className="w-full max-w-[220px] sm:max-w-[300px]">
          <button
            onClick={() => {
              sounds.playSelect();
              const seen = localStorage.getItem(TUTORIAL_KEY);
              if (!seen) setScreen('TUTORIAL');
              else startLevel(level);
            }}
            className="relative group w-full h-14 sm:h-16 perspective-lg"
          >
            <div className="absolute inset-0 bg-sky-900/30 rounded-[1.2rem] sm:rounded-[1.5rem] transform translate-y-1 blur-md opacity-60" />
            <div className={`absolute inset-0 bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700 rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center overflow-hidden border border-white/20 shadow-3xl transition-all duration-300 group-active:translate-y-1 group-active:scale-[0.98]`}>
              <span className="relative z-20 text-white font-black text-[clamp(1.1rem,4.5vw,1.8rem)] tracking-[0.2em] italic uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                Initiate
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 mt-1">
          <button onClick={() => { sounds.playSelect(); setScreen('TUTORIAL'); }} className="text-slate-600 hover:text-white font-black uppercase tracking-[0.4em] text-[7px] sm:text-[9px] italic transition-colors">Review Protocol</button>
          <Logo />
        </div>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="flex flex-col h-[100dvh] w-full px-4 pt-[env(safe-area-inset-top,10px)] pb-[env(safe-area-inset-bottom,8px)] overflow-hidden bg-mesh relative justify-between">
      <header className="flex items-center justify-between w-full px-4 py-2 border-b border-white/10 bg-slate-900/90 backdrop-blur-3xl rounded-b-[1.5rem] shadow-xl relative z-50">
        <div className="flex-1 flex justify-start">
          <div className="tooltip-container">
            <button onClick={() => { sounds.playSelect(); stopGameTimer(); setScreen('PAUSED'); }} className="p-2 bg-slate-800 rounded-full text-white hover:bg-sky-500 border border-white/20 active:scale-90 shadow-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 9v6m4-6v6" /></svg>
            </button>
            <span className="tooltip-text">Stasis (Pause)</span>
          </div>
        </div>
        <div className="flex-1 text-center">
            <div className="text-[clamp(0.9rem,4vw,1.2rem)] font-black text-white uppercase tracking-tighter italic leading-none">{tier.phaseName}</div>
            <div className={`text-[7px] font-black uppercase tracking-[0.2em] ${tier.color} mt-1`}>{tier.name} • LVL {level} • {diskCount} LAYERS</div>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <div className="tooltip-container">
            <button onClick={() => { sounds.playSelect(); setPreviousScreen('PLAYING'); setScreen('SETTINGS'); }} className="p-2.5 bg-slate-800 rounded-full text-white hover:bg-sky-500 border border-white/20 active:scale-90 shadow-xl transition-all">
              <SettingsIcon className="w-5 h-5" />
            </button>
            <span className="tooltip-text">Settings</span>
          </div>
          <div className="tooltip-container">
            <button onClick={() => { sounds.playSelect(); stopGameTimer(); setScreen('HOME'); }} className="p-2.5 bg-slate-800 rounded-full text-white hover:bg-sky-500 border border-white/20 active:scale-90 shadow-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            </button>
            <span className="tooltip-text">Home Relay</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center min-h-0 py-1">
          <div className="w-full max-w-[400px] px-2 pt-10 mb-1">
            <div className="flex items-center bg-slate-900/80 p-1 rounded-[1rem] border border-white/10 shadow-2xl backdrop-blur-3xl w-full">
              <div className="flex-1 text-center py-1 sm:py-1.5 border-r border-white/10">
                <div className="text-[clamp(1.1rem,6vw,2rem)] font-black text-white tabular-nums tracking-tighter leading-none">{moveCount} <span className="text-slate-600 text-[8px] sm:text-sm font-medium">/{optimalMoves}</span></div>
                <div className="text-[6px] uppercase tracking-[0.2em] text-slate-500 font-black mt-0.5 italic">Actions</div>
              </div>
              <div className="flex-1 text-center py-1 sm:py-1.5 relative">
                <div className="text-[clamp(1.1rem,6vw,2rem)] font-black text-white tabular-nums tracking-tighter leading-none">{formatTime(timer)}</div>
                <div className="text-[6px] uppercase tracking-[0.2em] text-slate-500 font-black mt-0.5 italic">Elapsed</div>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 tooltip-container">
                  <button onClick={() => { sounds.playSelect(); startLevel(level); }} className="p-1 bg-white/5 rounded-md border border-white/10 active:scale-90 hover:bg-white/10 transition-all">
                    <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <span className="tooltip-text">Cycle Reset</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center px-3 mt-3">
              <div className="text-[7px] sm:text-[8px] font-black text-sky-400 uppercase tracking-widest italic animate-pulse">
                TARGET S-{targetRodId}
              </div>
              <div className="tooltip-container">
                <button onClick={handleUndo} disabled={history.length === 0 || gameStatus === GameStatus.SOLVING} className="p-1.5 bg-slate-900/80 rounded-lg hover:bg-slate-800 border border-white/15 disabled:opacity-10 transition-all active:scale-90 shadow-xl">
                  <svg className="w-3 h-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
                <span className="tooltip-text">Step Reversal</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-[440px] flex items-center justify-center p-1.5 min-h-0">
            <div className="w-full h-full bg-slate-900/30 border border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative flex items-end">
              <div className="absolute inset-x-5 bottom-[15%] h-[8%] pointer-events-none z-0 opacity-10">
                  <div className={`absolute top-1/2 left-0 right-0 h-[1px] bg-sky-500 blur-[1px]`} />
                  <div className="absolute inset-0 bg-energy-grid" />
              </div>
              <div className="flex justify-between items-end gap-1 h-full w-full max-w-[360px] mx-auto relative z-10 pb-4">
                {ROD_IDS.map(id => (
                  <Rod 
                    key={id} 
                    id={id} 
                    disks={rods[id]} 
                    maxDisks={diskCount} 
                    isSelected={selectedRod === id} 
                    canReceive={selectedRod !== null && selectedRod !== id && isValidMove(rods, selectedRod, id)} 
                    onRodClick={handleRodClick} 
                    onDragStart={handleDragStart} 
                    onDrop={(toId) => selectedRod && executeMove(selectedRod, toId)} 
                    isSolving={gameStatus === GameStatus.SOLVING} 
                    isLastTarget={lastTargetRod === id} 
                    movingDiskSize={movingDiskInfo?.rodId === id ? movingDiskInfo.size : undefined}
                    isObjective={id === targetRodId}
                    isStart={id === startRodId}
                  />
                ))}
              </div>
            </div>
          </div>
      </main>

      <footer className="w-full flex flex-col items-center gap-1 pb-3 shrink-0">
          <div className="tooltip-container">
            <button onClick={() => { sounds.playSelect(); handleAutoSolve(); }} disabled={gameStatus === GameStatus.SOLVING} className="px-5 py-2 bg-slate-950/90 hover:bg-slate-900 text-slate-500 hover:text-cyan-400 font-black uppercase tracking-[0.2em] text-[7px] rounded-full border border-white/5 active:scale-95 disabled:opacity-0 backdrop-blur-2xl italic shadow-xl transition-all">Auto-Solve Relay</button>
            <span className="tooltip-text">Direct Solution Protocol</span>
          </div>
          <div className="h-1.5 flex items-center">
            {errorMessage && <div className="text-rose-500 font-black text-[6px] uppercase tracking-[0.1em] animate-bounce italic">{errorMessage}</div>}
          </div>
          <div className="scale-60 opacity-50"><Logo /></div>
      </footer>
    </div>
  );

  const renderWin = () => {
    const diff = moveCount - optimalMoves;
    let starCount = 5;
    if (diff > optimalMoves * 0.5) starCount = 1;
    else if (diff > optimalMoves * 0.3) starCount = 2;
    else if (diff > optimalMoves * 0.1) starCount = 3;
    else if (diff > 0) starCount = 4;

    return (
      <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[500] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700 overflow-hidden select-none">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 45 }).map((_, i) => (
            <div 
              key={`star-${i}`} 
              className="premium-star" 
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                backgroundColor: 'white',
                borderRadius: '0px',
                '--star-duration': `${2.5 + Math.random() * 4}s`,
                '--star-opacity': 0.2 + Math.random() * 0.6,
                animationDelay: `${Math.random() * 5}s`
              } as any} 
            />
          ))}
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={`sparkle-${i}`} 
              className="sparkle" 
              style={{ 
                left: `${Math.random() * 100}%`, 
                top: `${Math.random() * 100}%`,
                width: '6px',
                height: '6px',
                borderRadius: '0px',
                '--sparkle-duration': `${1.5 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 3}s`
              } as any} 
            />
          ))}
        </div>

        <div className="max-w-md mx-auto w-full text-center relative z-10 flex flex-col items-center gap-1">
          <div className="flex items-end justify-center gap-2 mb-4 h-12">
            {[...Array(5)].map((_, i) => {
              const isActive = i < starCount;
              const isTrophy = i === 2;
              return (
                <div 
                  key={i} 
                  className={`animate-star-dance ${isActive ? '' : 'opacity-10 grayscale'}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {isTrophy ? (
                    <div className="flex flex-col items-center group relative">
                      <svg className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.9)]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2H6v2H1v7c0 2.21 1.79 4 4 4h1c.84 3.1 3.46 5.42 6.7 5.91V21H9v2h6v-2h-3.7v-2.09c3.24-.49 5.86-2.81 6.7-5.91h1c2.21 0 4-1.79 4-4V4h-5V2zM5 13c-1.1 0-2-.9-2-2V6h3v7H5zm14-2c0 1.1-.9 2-2 2h-1V6h3v5z" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.7)]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-[clamp(3.5rem,15vw,6rem)] font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_0_60px_rgba(14,165,233,1)]">
              INTEGRATED
            </h2>
            <p className="font-black text-[clamp(0.65rem,3vw,0.85rem)] tracking-[0.4em] uppercase italic text-emerald-400 opacity-80 mt-1">
              {tier.phaseName} SYNC RESTORED
            </p>
          </div>
          
          <div className="flex gap-4 w-full px-6 mb-10">
            <div className="flex-1 bg-slate-900/60 p-5 rounded-[1.5rem] border border-white/10 backdrop-blur-3xl shadow-3xl flex flex-col items-center justify-center">
              <div className="text-3xl sm:text-4xl font-black text-white tabular-nums mb-1">{moveCount}</div>
              <div className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em] italic opacity-60">Efficiency</div>
            </div>
            <div className="flex-1 bg-slate-900/60 p-5 rounded-[1.5rem] border border-white/10 backdrop-blur-3xl shadow-3xl flex flex-col items-center justify-center">
              <div className="text-3xl sm:text-4xl font-black text-white tabular-nums mb-1">{formatTime(timer)}</div>
              <div className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em] italic opacity-60">Duration</div>
            </div>
          </div>
          
          <div className="flex flex-col items-center w-full px-10 mb-2">
            <button 
              onClick={() => startLevel(level + 1)} 
              className="w-full bg-white text-slate-950 font-black py-5 rounded-full text-xl sm:text-2xl hover:scale-[1.05] active:scale-95 transition-all italic uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3"
            >
              CONTINUE <span className="text-2xl">→</span>
            </button>
            <button 
              onClick={() => startLevel(level)} 
              className="mt-6 text-white/40 hover:text-white font-black tracking-[0.4em] text-[10px] sm:text-[11px] uppercase italic transition-all"
            >
              RE-SYNC SECTOR
            </button>
          </div>

          <div className="mt-6 scale-90 opacity-70">
             <Logo />
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[600] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="w-full max-w-md mx-auto flex flex-col items-center py-6">
        <h2 className="text-[clamp(3rem,14vw,5.5rem)] font-black text-white leading-tight mb-12 italic tracking-tighter self-start drop-shadow-4xl">SYSTEM<br/>CONFIG</h2>
        <div className="w-full space-y-10 mb-14">
           {[{label: 'Ambient Output', val: bgmVolume, set: setBgmVolume}, {label: 'Feedback Haptics', val: sfxVolume, set: setSfxVolume}].map((s, idx) => (
             <div key={idx} className="w-full flex flex-col gap-5">
               <div className="flex justify-between items-end text-[10px] uppercase tracking-[0.5em] text-slate-500 font-black"><span>{s.label}</span><span className="text-white text-3xl italic font-black">{Math.round(s.val * 100)}%</span></div>
               <div className="h-1.5 w-full bg-slate-900 relative rounded-full overflow-hidden border border-white/10">
                 <input type="range" min="0" max="1" step="0.01" value={s.val} onChange={(e) => s.set(parseFloat(e.target.value))} className="w-full h-full cursor-pointer bg-transparent appearance-none absolute z-10 accent-white" />
                 <div className="absolute left-0 top-0 bottom-0 bg-sky-500 shadow-[0_0_40px_#0ea5e9]" style={{width: `${s.val*100}%`}} />
               </div>
             </div>
           ))}
        </div>
        <button onClick={() => { sounds.playSelect(); setScreen(previousScreen); }} className="w-full bg-white text-slate-950 font-black py-5 rounded-[2rem] text-xl active:scale-95 tracking-[0.5em] uppercase italic shadow-[0_40px_100px_rgba(255,255,255,0.2)] hover:bg-sky-400 transition-all">Close Terminal</button>
        <div className="mt-8 scale-75 opacity-70"><Logo /></div>
      </div>
    </div>
  );

  const renderPause = () => (
    <div className="fixed inset-0 bg-slate-950/96 backdrop-blur-3xl z-[600] flex items-center justify-center p-8 animate-in fade-in duration-500 overflow-y-auto">
      <div className="text-center w-full max-w-md mx-auto flex flex-col items-center gap-8">
        <h2 className="text-[clamp(4rem,20vw,8rem)] font-black text-white tracking-tighter italic leading-none drop-shadow-4xl select-none">STASIS</h2>
        <div className="flex flex-col gap-4 w-full px-6">
          <button onClick={() => { sounds.playSelect(); setScreen('PLAYING'); startGameTimer(); }} className="w-full bg-white text-slate-950 font-black py-6 rounded-[2rem] text-2xl active:scale-95 tracking-[0.4em] italic uppercase shadow-4xl hover:bg-sky-400 transition-all">Resume</button>
          <button onClick={() => { sounds.playSelect(); startLevel(level); }} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] border border-white/15 active:scale-95 tracking-[0.5em] uppercase text-sm shadow-2xl hover:bg-slate-800 transition-all">Restart Cycle</button>
          <button onClick={() => runTransition(() => setScreen('HOME'))} className="text-slate-600 hover:text-white font-black tracking-[0.6em] text-[10px] uppercase italic border-b border-transparent hover:border-white/40 mt-6 transition-all">Menu Access</button>
        </div>
        <div className="mt-6 scale-75 opacity-70"><Logo /></div>
      </div>
    </div>
  );

  const renderTutorial = () => (
    <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[700] flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in duration-700 overflow-y-auto">
      <div className="max-w-xl w-full flex flex-col items-center py-4 px-4 mx-auto min-h-full">
        <div className="text-center mb-6">
          <h2 className="text-[clamp(1.6rem,8vw,3.5rem)] font-black text-white italic tracking-tighter leading-none uppercase mb-1.5 drop-shadow-3xl">Directive</h2>
          <p className="text-sky-400 font-black tracking-[0.2em] uppercase text-[7px] sm:text-[9px] italic">Tactical Objective: Integrated Reconstruction</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:gap-4 w-full mb-8">
          {[
            'Shift segments one by one. No simultaneous layering.', 
            'Maintain hierarchy. Larger cores cannot stack on smaller ones.', 
            'Reconstruct in the designated Target Sector for system sync.',
            'Use Auto-Solve Relay if structural integrity is compromised.'
          ].map((t, i) => (
            <div key={i} className="bg-slate-900/40 p-3.5 sm:p-5 rounded-[1.2rem] sm:rounded-[1.8rem] border border-white/5 flex items-center gap-4 sm:gap-6 shadow-xl backdrop-blur-2xl group transition-all">
              <div className="w-8 h-8 sm:w-12 sm:h-12 shrink-0 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-400 text-base sm:text-lg font-black italic border border-sky-500/20">0{i+1}</div>
              <p className="text-slate-200 font-bold text-[11px] sm:text-[14px] leading-tight tracking-wide italic">{t}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-8 mt-auto w-full pb-4">
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={() => { sounds.playSelect(); localStorage.setItem(TUTORIAL_KEY, 'true'); startLevel(level); }} 
              className="relative group bg-white text-slate-950 font-black px-12 py-5 rounded-full text-[11px] sm:text-[13px] active:scale-95 tracking-[0.3em] uppercase italic shadow-[0_15px_60px_rgba(255,255,255,0.25)] hover:scale-105 transition-all text-center flex flex-col items-center justify-center gap-0.5 border-2 border-white/20"
            >
              <span className="relative z-10">Acknowledge Protocol</span>
            </button>
            <div className="flex gap-1 items-center">
              <div className="w-1 h-1 rounded-full bg-sky-500/40" />
              <div className="w-8 h-1 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500 opacity-60" />
            </div>
          </div>
          <div className="scale-75 opacity-70">
            <Logo />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-950 relative overflow-hidden">
      <div className={`transition-mask ${isTransitioning ? 'active' : ''}`} />
      {screen === 'HOME' && renderHome()}
      {screen === 'PLAYING' && renderGame()}
      {screen === 'WON' && renderWin()}
      {screen === 'SETTINGS' && renderSettings()}
      {screen === 'PAUSED' && renderPause()}
      {screen === 'TUTORIAL' && renderTutorial()}
    </div>
  );
};

export default App;