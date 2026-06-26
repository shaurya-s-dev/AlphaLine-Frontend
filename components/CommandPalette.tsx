'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, Activity, Star, Play, Coins, ShieldAlert, Terminal } from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  signals?: any[];
  onSelectSignal?: (signal: any) => void;
}

export function CommandPalette({ isOpen, onClose, signals = [], onSelectSignal }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Pages always shown
  const pages = [
    { name: 'Dashboard', path: '/dashboard', shortcut: 'D', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { name: 'Heatmap', path: '/heatmap', shortcut: 'H', icon: <Activity className="w-3.5 h-3.5" /> },
    { name: 'Watchlist', path: '/dashboard?tab=Watchlist', shortcut: 'W', icon: <Star className="w-3.5 h-3.5" /> },
    { name: 'Backtest', path: '/backtest', shortcut: 'B', icon: <Play className="w-3.5 h-3.5" /> },
    { name: 'Simulator', path: '/simulator', shortcut: 'S', icon: <Coins className="w-3.5 h-3.5" /> },
    { name: 'Risk', path: '/risk', shortcut: 'R', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { name: 'API Docs', path: '/api-docs', shortcut: 'A', icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  // Filter signals matching ticker name (case-insensitive)
  const filteredSignals = search.trim() === '' 
    ? [] 
    : signals.filter(sig => sig.ticker.toLowerCase().includes(search.toLowerCase())).slice(0, 10);

  // Combined list for keyboard navigation
  const combinedItems = [
    ...pages.map(p => ({ type: 'page', ...p })),
    ...filteredSignals.map(s => ({ type: 'signal', ...s }))
  ];

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation inside the palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % combinedItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + combinedItems.length) % combinedItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (combinedItems[selectedIndex]) {
          triggerItem(combinedItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, combinedItems]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const triggerItem = (item: any) => {
    if (item.type === 'page') {
      router.push(item.path);
      onClose();
    } else if (item.type === 'signal') {
      if (onSelectSignal) {
        onSelectSignal(item);
      }
      onClose();
    }
  };

  const getSignalColor = (type: string) => {
    if (type === 'BUY') return '#22C55E';
    if (type === 'SELL') return '#EF4444';
    return '#F59E0B';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-[560px] max-h-[400px] bg-[#111318] border border-[#1E2230] rounded-[12px] flex flex-col overflow-hidden shadow-2xl z-10 mx-4"
          >
            {/* Top Search Input Row */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#111318]">
              <Search className="w-4 h-4 text-[#374151]" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickers, pages..."
                className="flex-1 bg-transparent border-none outline-none text-[#E2E8F0] font-sans font-normal text-[14px] placeholder-[#374151] min-w-0"
              />
              <kbd className="bg-[#1C1F28] border border-[#1E2230] rounded-[4px] font-sans font-normal text-[11px] text-[#374151] px-1.5 py-0.5 select-none">
                ESC
              </kbd>
            </div>

            {/* Divider */}
            <div className="h-[0.5px] bg-[#1E2230]" />

            {/* Results List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* Pages Section */}
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-sans font-medium text-dim uppercase tracking-wider select-none">
                  Pages
                </div>
                {pages.map((page, idx) => {
                  const absoluteIdx = idx;
                  const isActive = selectedIndex === absoluteIdx;
                  return (
                    <div
                      key={page.name}
                      data-active={isActive}
                      onClick={() => triggerItem({ type: 'page', ...page })}
                      className={`h-9 flex items-center justify-between px-3 rounded-[6px] cursor-pointer transition-colors duration-100 ${
                        isActive 
                          ? 'bg-[#1C1F28] border-l-2 border-[#6366F1] pl-[10px]' 
                          : 'hover:bg-[#1C1F28] pl-3'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[#374151] flex items-center justify-center">
                          {page.icon}
                        </span>
                        <span className="font-sans font-normal text-[13px] text-[#E2E8F0]">
                          {page.name}
                        </span>
                      </div>
                      <kbd className="font-sans font-normal text-[11px] text-[#374151] select-none">
                        {page.shortcut}
                      </kbd>
                    </div>
                  );
                })}
              </div>

              {/* Signals Section */}
              {filteredSignals.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-sans font-medium text-dim uppercase tracking-wider select-none">
                    Signals
                  </div>
                  {filteredSignals.map((sig, idx) => {
                    const absoluteIdx = pages.length + idx;
                    const isActive = selectedIndex === absoluteIdx;
                    return (
                      <div
                        key={sig.id || idx}
                        data-active={isActive}
                        onClick={() => triggerItem({ type: 'signal', ...sig })}
                        className={`h-9 flex items-center justify-between px-3 rounded-[6px] cursor-pointer transition-colors duration-100 ${
                          isActive 
                            ? 'bg-[#1C1F28] border-l-2 border-[#6366F1] pl-[10px]' 
                            : 'hover:bg-[#1C1F28] pl-3'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: getSignalColor(sig.signalType) }}
                          />
                          <span className="font-sans font-medium text-[13px] text-[#E2E8F0]">
                            {sig.ticker}
                          </span>
                          <span className="font-sans font-normal text-[10px] text-[#374151]">
                            {sig.market}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[12px] text-[#E2E8F0]">
                            {sig.confidence}%
                          </span>
                          <span 
                            className="font-sans text-[11px] font-medium" 
                            style={{ color: getSignalColor(sig.signalType) }}
                          >
                            {sig.signalType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty Search State for Signals */}
              {search.trim() !== '' && filteredSignals.length === 0 && (
                <div className="py-6 text-center text-[12px] font-sans text-muted">
                  No signals found matching "{search}"
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="h-[32px] border-t border-[#1E2230] bg-[#111318] flex items-center px-4 select-none">
              <span className="font-sans font-normal text-[11px] text-[#374151] tracking-wide">
                &uarr;&darr; navigate &middot; &crarr; select &middot; esc close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
