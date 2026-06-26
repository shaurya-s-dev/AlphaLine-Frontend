'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [email, setEmail] = useState<string>('Loading...');
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [currentActive, setCurrentActive] = useState<string>('Dashboard');
  
  // Market Open/Closed status states
  const [marketStatus, setMarketStatus] = useState({ nseOpen: false, usOpen: false });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      } else {
        setEmail('user@alphaline.fi');
      }
    };
    getUser();
  }, []);

  // Update active tab based on pathname and searchParams
  useEffect(() => {
    if (pathname === '/backtest') {
      setCurrentActive('Backtest');
    } else if (pathname === '/risk') {
      setCurrentActive('Risk');
    } else if (pathname === '/api-docs') {
      setCurrentActive('API');
    } else if (pathname === '/dashboard') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'Watchlist') {
          setCurrentActive('Watchlist');
        } else {
          setCurrentActive('Dashboard');
        }
      } else {
        setCurrentActive('Dashboard');
      }
    } else if (activeTab) {
      setCurrentActive(activeTab);
    }
  }, [pathname, activeTab]);

  // Market status checker effect
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      
      // NSE Open Mon-Fri 9:15 AM - 3:30 PM IST (Asia/Kolkata)
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const istDay = istTime.getDay();
      const istHour = istTime.getHours();
      const istMin = istTime.getMinutes();
      const istMinOfDay = istHour * 60 + istMin;
      const isNseOpen = (istDay >= 1 && istDay <= 5) && 
                         (istMinOfDay >= (9 * 60 + 15) && istMinOfDay <= (15 * 60 + 30));

      // US Open Mon-Fri 9:30 AM - 4:00 PM EST/EDT (America/New_York)
      const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const estDay = estTime.getDay();
      const estHour = estTime.getHours();
      const estMin = estTime.getMinutes();
      const estMinOfDay = estHour * 60 + estMin;
      const isUsOpen = (estDay >= 1 && estDay <= 5) && 
                        (estMinOfDay >= (9 * 60 + 30) && estMinOfDay <= (16 * 60));

      setMarketStatus({ nseOpen: isNseOpen, usOpen: isUsOpen });
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleNavClick = (tabName: string) => {
    if (setActiveTab) {
      setActiveTab(tabName);
    }
    if (tabName === 'Dashboard') {
      router.push('/dashboard');
    } else if (tabName === 'Watchlist') {
      router.push('/dashboard?tab=Watchlist');
    } else if (tabName === 'Backtest') {
      router.push('/backtest');
    } else if (tabName === 'Risk') {
      router.push('/risk');
    } else if (tabName === 'API') {
      router.push('/api-docs');
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    )},
    { name: 'Watchlist', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.237.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )},
    { name: 'Backtest', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { name: 'Risk', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )},
    { name: 'API', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
  ];

  return (
    <aside className="w-[220px] h-screen fixed left-0 top-0 border-r border-border-dark bg-surface flex flex-col justify-between p-4 hidden md:flex z-20">
      <div>
        {/* Logo with logo-text class for blinking cursor */}
        <div className="flex items-center gap-2 px-2 py-3 mb-6 select-none">
          <span className="logo-text font-brand text-[16px] font-semibold text-indigo tracking-[0.15em]">
            ALPHALINE
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentActive === item.name;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-[6px] transition-colors duration-150 font-sans border ${
                  isActive
                    ? 'text-frost border-border-dark'
                    : 'text-muted hover:text-frost hover:bg-[#131720] border-transparent'
                }`}
                style={
                  isActive
                    ? { background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, transparent 100%)' }
                    : {}
                }
              >
                <span className={isActive ? 'text-indigo' : 'text-muted'}>{item.icon}</span>
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Market Status + User Avatar Section */}
      <div>
        {/* Market Status Section */}
        <div className="px-2 py-3 border-t border-border-dark mb-3 select-none">
          <div className="flex items-center justify-between text-[11px] font-sans font-normal text-muted">
            {/* NSE */}
            <div className="flex items-center gap-1.5">
              <span>NSE</span>
              <span className={`w-[5px] h-[5px] rounded-full ${marketStatus.nseOpen ? 'bg-sig-green animate-pulse' : 'bg-sig-red'}`} />
              <span className="text-frost">{marketStatus.nseOpen ? 'Open' : 'Closed'}</span>
            </div>

            <span className="text-[#1E2230] font-mono">·</span>

            {/* US */}
            <div className="flex items-center gap-1.5">
              <span>US</span>
              <span className={`w-[5px] h-[5px] rounded-full ${marketStatus.usOpen ? 'bg-sig-green animate-pulse' : 'bg-sig-red'}`} />
              <span className="text-frost">{marketStatus.usOpen ? 'Open' : 'Closed'}</span>
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="flex items-center justify-between border-t border-border-dark pt-4 px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 bg-indigo text-white rounded-full flex items-center justify-center text-[11px] font-bold select-none flex-shrink-0">
              {email[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-medium text-frost truncate leading-tight">
                {email}
              </span>
              <span className="text-[10px] text-muted leading-tight font-sans">
                Free Plan
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="text-muted hover:text-sig-red p-1 rounded-[6px] hover:bg-raised transition-colors duration-150"
            title="Sign Out"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Styled-JSX styling for Blinking Cursor and custom logo animations */}
      <style jsx>{`
        .logo-text::after {
          content: '|';
          animation: blink 1s step-end infinite;
          color: #6366F1;
          margin-left: 2px;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </aside>
  );
}

export default Sidebar;
