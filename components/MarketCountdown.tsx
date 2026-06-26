'use client';

import React, { useState, useEffect } from 'react';

function getMinutesToNextState(market: 'NSE' | 'NYSE', now: Date) {
  const timeZone = market === 'NSE' ? 'Asia/Kolkata' : 'America/New_York';
  const openTime = market === 'NSE' ? 9 * 60 + 15 : 9 * 60 + 30;
  const closeTime = market === 'NSE' ? 15 * 60 + 30 : 16 * 60;
  
  // Get date in target timezone
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone }));
  const day = tzDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hour = tzDate.getHours();
  const minute = tzDate.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  const isWeekend = day === 0 || day === 6;
  const isTradingHour = totalMinutes >= openTime && totalMinutes < closeTime;
  const isOpen = !isWeekend && isTradingHour;
  
  if (isOpen) {
    return { isOpen: true, minutes: closeTime - totalMinutes };
  } else {
    // If it's today (weekday) before openTime, the next open is today at openTime
    if (!isWeekend && totalMinutes < openTime) {
      return { isOpen: false, minutes: openTime - totalMinutes };
    }
    
    // Otherwise, find the next weekday (Mon-Fri)
    let targetDate = new Date(tzDate);
    let daysAdded = 0;
    while (true) {
      daysAdded++;
      targetDate.setDate(targetDate.getDate() + 1);
      const targetDay = targetDate.getDay();
      if (targetDay >= 1 && targetDay <= 5) {
        break;
      }
    }
    
    const diff = (daysAdded * 24 * 60) + openTime - totalMinutes;
    return { isOpen: false, minutes: diff };
  }
}

function getMarketStatus() {
  const now = new Date();
  const nseStatus = getMinutesToNextState('NSE', now);
  const usStatus = getMinutesToNextState('NYSE', now);

  function formatTime(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return {
    nse: {
      open: nseStatus.isOpen,
      label: nseStatus.isOpen 
        ? `closes ${formatTime(nseStatus.minutes)}`
        : `opens ${formatTime(nseStatus.minutes)}`,
    },
    us: {
      open: usStatus.isOpen,
      label: usStatus.isOpen
        ? `closes ${formatTime(usStatus.minutes)}`
        : `opens ${formatTime(usStatus.minutes)}`,
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
