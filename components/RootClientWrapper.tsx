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

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('alphaline_disclaimer_seen');
    if (seen !== 'true') {
      setShowDisclaimer(true);
    }
  }, []);

  const dismissDisclaimer = () => {
    localStorage.setItem('alphaline_disclaimer_seen', 'true');
    setShowDisclaimer(false);
  };

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

      {showDisclaimer && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 600,
          background: '#111318',
          border: '1px solid #1E2230',
          borderRadius: 8,
          padding: '16px 20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          fontFamily: 'var(--font-inter)',
          color: '#E2E8F0',
        }}>
          <div style={{ fontSize: 13, lineHeight: '1.5', textAlign: 'left' }}>
            <span style={{ fontWeight: 'bold', color: '#6366F1' }}>Disclaimer:</span>{' '}
            This is NOT financial advice. Alphaline provides AI-generated signals for educational purposes only. Always do your own research.
          </div>
          <button 
            onClick={dismissDisclaimer}
            style={{
              background: '#6366F1',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              flexShrink: 0
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {children}
    </>
  );
}
export default RootClientWrapper;
