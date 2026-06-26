'use client';

import React, { useState, useEffect } from 'react';

function getMarketStatus() {
  const now = new Date();
  
  // IST = UTC+5:30
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const istHours = ist.getUTCHours();
  const istMinutes = ist.getUTCMinutes();
  const istDay = ist.getUTCDay();
  const istTotal = istHours * 60 + istMinutes
  
  // NSE: 9:15 AM to 3:30 PM IST, Mon-Fri
  const nseOpen = 9 * 60 + 15;   // 555
  const nseClose = 15 * 60 + 30;  // 930
  const nseIsOpen = istDay >= 1 && istDay <= 5 
    && istTotal >= nseOpen && istTotal < nseClose;

  // EST = UTC-5
  const est = new Date(now.getTime() - (5 * 60 * 60 * 1000));
  const estHours = est.getUTCHours();
  const estMinutes = est.getUTCMinutes();
  const estDay = est.getUTCDay();
  const estTotal = estHours * 60 + estMinutes;
  
  // NYSE: 9:30 AM to 4:00 PM EST, Mon-Fri
  const nyseOpen = 9 * 60 + 30;
  const nyseClose = 16 * 60;
  const usIsOpen = estDay >= 1 && estDay <= 5
    && estTotal >= nyseOpen && estTotal < nyseClose;

  // Calculate time until next open/close
  function minutesUntil(targetMinutes: number, currentMinutes: number) {
    let diff = targetMinutes - currentMinutes;
    if (diff < 0) diff += 24 * 60;
    return diff;
  }

  const nseMinutesLeft = nseIsOpen 
    ? minutesUntil(nseClose, istTotal)
    : minutesUntil(nseOpen, istTotal);
  
  const usMinutesLeft = usIsOpen
    ? minutesUntil(nyseClose, estTotal)
    : minutesUntil(nyseOpen, estTotal);

  function formatTime(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return {
    nse: {
      open: nseIsOpen,
      label: nseIsOpen 
        ? `closes ${formatTime(nseMinutesLeft)}`
        : `opens ${formatTime(nseMinutesLeft)}`,
    },
    us: {
      open: usIsOpen,
      label: usIsOpen
        ? `closes ${formatTime(usMinutesLeft)}`
        : `opens ${formatTime(usMinutesLeft)}`,
    }
  };
}

export function MarketCountdown() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    setStatus(getMarketStatus());
    const timer = setInterval(() => {
      setStatus(getMarketStatus());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!status) {
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#6B7280" }}>
            NSE
          </span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#374151" }}>
            loading...
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#6B7280" }}>
            US
          </span>
          <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: 10, color: "#374151" }}>
            loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <MarketPill 
        name="NSE" 
        isOpen={status.nse.open} 
        timeLabel={status.nse.label} 
      />
      <MarketPill 
        name="US" 
        isOpen={status.us.open} 
        timeLabel={status.us.label} 
      />
    </div>
  );
}

function MarketPill({ name, isOpen, timeLabel }: { name: string; isOpen: boolean; timeLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{
        width: 6, 
        height: 6, 
        borderRadius: "50%",
        background: isOpen ? "#22C55E" : "#374151"
      }} />
      <span style={{
        fontFamily: "var(--font-inter)", 
        fontSize: 11, 
        color: "#6B7280"
      }}>
        {name}
      </span>
      <span style={{
        fontFamily: "var(--font-jetbrains-mono)",
        fontSize: 10,
        color: isOpen ? "#22C55E" : "#374151"
      }}>
        {timeLabel}
      </span>
    </div>
  );
}
export default MarketCountdown;
