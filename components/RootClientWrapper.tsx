'use client';

import React, { useState, useEffect } from 'react';
import { CommandPalette } from '@/components/CommandPalette';
import { AlertBanner } from '@/components/AlertBanner';
import { SignalDrawer } from '@/components/SignalDrawer';
import { Toaster } from 'sonner';

export function RootClientWrapper({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [signals, setSignals] = useState<any[]>([]);

  // Fetch signals globally for search
  const fetchSignals = async () => {
    try {
      const response = await fetch('/api/signals?market=all&limit=50');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.signals) {
        setSignals(data.signals);
      }
    } catch (e) {
      console.warn("Global layout signals fetch warning:", e);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard listener for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      const isMetaOrCtrl = e.metaKey || e.ctrlKey;
      
      if (isK && isMetaOrCtrl) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AlertBanner onSelectSignal={(s) => setSelectedSignal(s)} />
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        signals={signals}
        onSelectSignal={(s) => setSelectedSignal(s)}
      />

      <SignalDrawer 
        isOpen={!!selectedSignal} 
        onClose={() => setSelectedSignal(null)} 
        signal={selectedSignal} 
      />

      <Toaster 
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#111318',
            border: '1px solid #1E2230',
            color: '#E2E8F0',
            fontFamily: 'var(--font-inter)',
          }
        }}
      />

      {children}
    </>
  );
}
export default RootClientWrapper;
