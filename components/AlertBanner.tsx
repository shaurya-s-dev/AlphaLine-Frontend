'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AlertBannerProps {
  onSelectSignal?: (signal: any) => void;
}

export function AlertBanner({ onSelectSignal }: AlertBannerProps) {
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const knownSignalIds = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef(false);

  const getSignalColor = (type: string) => {
    if (type === 'BUY') return '#22C55E';
    if (type === 'SELL') return '#EF4444';
    return '#F59E0B';
  };

  const fetchLatestSignals = async () => {
    try {
      const response = await fetch('/api/signals?market=all');
      if (!response.ok) return;
      const data = await response.json();
      
      if (data.success && data.signals) {
        const fetchedSignals = data.signals;

        if (!initialFetchDone.current) {
          // First fetch: just seed the known IDs, do not alert
          fetchedSignals.forEach((s: any) => knownSignalIds.current.add(s.id));
          initialFetchDone.current = true;
        } else {
          // Subsequent fetches: check for new high-confidence signals
          let newAlertFound = false;

          for (const signal of fetchedSignals) {
            if (!knownSignalIds.current.has(signal.id)) {
              // Add to known set immediately
              knownSignalIds.current.add(signal.id);

              if (signal.confidence > 80 && !newAlertFound) {
                setActiveAlert(signal);
                newAlertFound = true;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("AlertBanner polling error:", e);
    }
  };

  // Set up polling every 30 seconds
  useEffect(() => {
    fetchLatestSignals();

    const interval = setInterval(() => {
      fetchLatestSignals();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss alert after 5 seconds
  useEffect(() => {
    if (activeAlert) {
      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [activeAlert]);

  if (!activeAlert) return null;

  const signalColor = getSignalColor(activeAlert.signalType);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -48 }}
        animate={{ y: 0 }}
        exit={{ y: -48 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 h-12 z-50 backdrop-blur-sm flex items-center justify-between px-6"
        style={{
          backgroundColor: `${signalColor}26`, // 15% opacity hex
          borderBottom: `1px solid ${signalColor}66`, // 40% opacity hex
        }}
      >
        {/* Left Side Info */}
        <div className="flex items-center gap-2">
          {/* Pulsing Dot */}
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: signalColor }}
          />
          <span className="font-sans font-medium text-[13px] text-[#E2E8F0]">
            New signal
          </span>
          <span 
            className="font-sans font-semibold text-[13px] ml-1"
            style={{ color: signalColor }}
          >
            {activeAlert.ticker}
          </span>
          <span className="font-mono text-[12px] text-[#E2E8F0] ml-1">
            {activeAlert.confidence}%
          </span>
          <span 
            className="font-sans font-semibold text-[11px] uppercase ml-1 px-1.5 py-0.5 rounded bg-void/40 border border-border-dark"
            style={{ color: signalColor }}
          >
            {activeAlert.signalType}
          </span>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center">
          <button
            onClick={() => {
              if (onSelectSignal) {
                onSelectSignal(activeAlert);
              }
              setActiveAlert(null);
            }}
            className="font-sans font-medium text-[12px] px-3 py-1 rounded-[4px] border transition-colors cursor-pointer"
            style={{
              backgroundColor: `${signalColor}33`, // 20% opacity
              border: `1px solid ${signalColor}4D`, // 30% opacity
              color: signalColor,
            }}
          >
            View
          </button>
          <button
            onClick={() => setActiveAlert(null)}
            className="text-[#374151] hover:text-[#E2E8F0] ml-3 text-[16px] font-bold cursor-pointer transition-colors leading-none pb-0.5"
          >
            &times;
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
