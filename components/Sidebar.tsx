'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Menu, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { MarketCountdown } from '@/components/MarketCountdown';
import { useSidebar } from '@/components/SidebarProvider';

export interface SidebarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onGenerateSignals?: () => void;
  isGenerating?: boolean;
  counts?: { [route: string]: number };
}

export function Sidebar({ 
  activeTab, 
  setActiveTab,
  isMobileOpen = false,
  onMobileClose,
  onGenerateSignals,
  isGenerating = false,
  counts
}: SidebarProps) {
  const [email, setEmail] = useState<string>('Loading...');
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const [currentActive, setCurrentActive] = useState<string>('Dashboard');
  const { collapsed, setCollapsed } = useSidebar();

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
    } else if (pathname === '/heatmap') {
      setCurrentActive('Heatmap');
    } else if (pathname === '/simulator') {
      setCurrentActive('Simulator');
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleNavClick = (tabName: string) => {
    if (setActiveTab) {
      setActiveTab(tabName);
    }
    if (onMobileClose) {
      onMobileClose();
    }
    if (tabName === 'Dashboard') {
      router.push('/dashboard');
    } else if (tabName === 'Watchlist') {
      router.push('/dashboard?tab=Watchlist');
    } else if (tabName === 'Outcomes') {
      router.push('/dashboard?tab=Outcomes');
    } else if (tabName === 'Heatmap') {
      router.push('/heatmap');
    } else if (tabName === 'Backtest') {
      router.push('/backtest');
    } else if (tabName === 'Simulator') {
      router.push('/simulator');
    } else if (tabName === 'Risk') {
      router.push('/risk');
    } else if (tabName === 'API') {
      router.push('/api-docs');
    }
  };

  const navItems = [
    { name: 'Dashboard', keyHint: 'D', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    )},
    { name: 'Heatmap', keyHint: 'H', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v16M15 4v16M4 10h16M4 14h16" />
      </svg>
    )},
    { name: 'Watchlist', keyHint: 'W', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.237.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )},
    { name: 'Outcomes', keyHint: 'O', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { name: 'Backtest', keyHint: 'B', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { name: 'Simulator', keyHint: 'S', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { name: 'Risk', keyHint: 'R', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )},
    { name: 'API', keyHint: 'A', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
  ];

  const renderContent = (isMobilePanel = false) => {
    const isCollapsedDesktop = collapsed && !isMobilePanel;
    return (
      <div className="flex flex-col justify-between h-full w-full">
        <div>
          {/* Logo and Close Button (only for mobile modal panel) */}
          <div className="flex items-center justify-between px-2 py-3 mb-6 select-none">
            <span className="logo-text font-brand text-[16px] font-semibold text-indigo tracking-[0.15em] relative">
              {isCollapsedDesktop ? 'A' : 'ALPHALINE'}
            </span>
            {isMobilePanel && onMobileClose && (
              <button 
                onClick={onMobileClose} 
                className="text-muted hover:text-frost p-1 rounded-[6px] bg-raised border border-border-dark"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentActive === item.name;
              return (
                <motion.div
                  key={item.name}
                  whileHover={{ x: isCollapsedDesktop ? 0 : 3 }}
                  transition={{ duration: 0.15 }}
                  className="relative w-full"
                >
                  <button
                    onClick={() => handleNavClick(item.name)}
                    className={`w-full flex items-center ${isCollapsedDesktop ? 'justify-center px-2' : 'gap-3 pl-4 pr-3'} py-2 text-[13px] font-medium rounded-[6px] transition-colors duration-150 font-sans border relative overflow-hidden ${
                      isActive
                        ? 'text-frost border-border-dark bg-raised/30'
                        : 'text-muted hover:text-frost hover:bg-[#131720] border-transparent'
                    }`}
                    style={
                      isActive
                        ? { background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, transparent 100%)' }
                        : {}
                    }
                    title={isCollapsedDesktop ? item.name : undefined}
                  >
                    {/* Left Border Scale-In animation on Active */}
                    {isActive && (
                      <motion.div 
                        layoutId="active-border"
                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}

                    <span className={isActive ? 'text-indigo' : 'text-muted'}>
                      {item.icon}
                    </span>
                    {!isCollapsedDesktop && <span>{item.name}</span>}
                    
                    {/* Signals Count Badge */}
                    {!isCollapsedDesktop && counts && counts[item.name] !== undefined && counts[item.name] > 0 && (
                      <span className="bg-[#1C1F28] border border-[#1E2230] text-[#6B7280] font-mono text-[10px] px-1.5 py-0.5 rounded-[4px] ml-auto select-none mr-1.5">
                        {counts[item.name]}
                      </span>
                    )}

                    {/* Shortcut key tag */}
                    {!isCollapsedDesktop && (
                      <kbd className={`text-[9px] text-[#374151] bg-[#1C1F28] border border-border-dark px-1.5 rounded font-mono font-normal ${counts && counts[item.name] !== undefined && counts[item.name] > 0 ? '' : 'ml-auto'}`}>
                        {item.keyHint}
                      </kbd>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* Bottom status + user info */}
        <div className="space-y-3">
          {!isCollapsedDesktop && onGenerateSignals && (
            <button
              onClick={onGenerateSignals}
              disabled={isGenerating}
              className="w-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#6366F1] hover:bg-[#6366F1]/20 disabled:opacity-50 text-[11px] font-sans font-medium py-1.5 px-3 rounded-[6px] transition-colors flex items-center justify-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Signals</span>
              )}
            </button>
          )}

          {/* Market Status */}
          {!isCollapsedDesktop && (
            <div className="px-2 py-3 border-t border-border-dark mb-3 select-none flex justify-center">
              <MarketCountdown />
            </div>
          )}

          {/* User Card */}
          {isCollapsedDesktop ? (
            <div className="flex flex-col items-center gap-3 border-t border-border-dark pt-4 w-full">
              <div className="w-7 h-7 bg-indigo text-white rounded-full flex items-center justify-center text-[11px] font-bold select-none flex-shrink-0" title={email}>
                {email[0]?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={() => router.push('/settings')}
                className="text-muted hover:text-indigo p-1 rounded-[6px] hover:bg-raised transition-colors duration-150"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleSignOut}
                className="text-muted hover:text-sig-red p-1 rounded-[6px] hover:bg-raised transition-colors duration-150"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
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

              {/* Settings */}
              <button
                onClick={() => router.push('/settings')}
                className="text-muted hover:text-indigo p-1 rounded-[6px] hover:bg-raised transition-colors duration-150 mr-1"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="text-muted hover:text-sig-red p-1 rounded-[6px] hover:bg-raised transition-colors duration-150"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <motion.aside 
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="h-screen fixed left-0 top-0 border-r border-border-dark bg-surface flex flex-col justify-between p-4 hidden md:flex z-20 overflow-visible"
      >
        {renderContent(false)}

        {/* Collapsible toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 bg-[#1C1F28] border border-[#1E2230] rounded-full flex items-center justify-center text-muted hover:text-frost cursor-pointer transition-all duration-300 z-50 hover:bg-[#111318]"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

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
      </motion.aside>

      {/* 2. Mobile Collapsible Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[240px] bg-surface border-r border-border-dark z-50 p-4 flex flex-col justify-between md:hidden"
            >
              {renderContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
