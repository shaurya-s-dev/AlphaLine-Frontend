'use client';

import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { createClient } from '@/lib/supabase/client';
import { ThemeContext } from '@/components/ThemeProvider';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Settings, User, Bell, Database, Info, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useContext(ThemeContext);
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('Loading...');
  const [joinedDate, setJoinedDate] = useState('...');
  
  // Notification states (stored in localStorage)
  const [notifHighConf, setNotifHighConf] = useState(true);
  const [notifMarketAlerts, setNotifMarketAlerts] = useState(false);
  const [notifWeeklySummary, setNotifWeeklySummary] = useState(false);

  // Data & Signals states
  const [defaultMarket, setDefaultMarket] = useState('All');
  const [minConfidence, setMinConfidence] = useState(50);

  useEffect(() => {
    setMounted(true);
    document.title = 'Alphaline — Settings';

    // Fetch user details
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || 'user@alphaline.fi');
        if (user.created_at) {
          const date = new Date(user.created_at);
          setJoinedDate(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
        }
      } else {
        setEmail('user@alphaline.fi');
        setJoinedDate('June 2026');
      }
    };
    fetchUser();

    // Load custom settings from localStorage
    if (typeof window !== 'undefined') {
      const savedHighConf = localStorage.getItem('alphaline_notif_high_conf');
      if (savedHighConf !== null) setNotifHighConf(savedHighConf === 'true');

      const savedMarketAlerts = localStorage.getItem('alphaline_notif_market_alerts');
      if (savedMarketAlerts !== null) setNotifMarketAlerts(savedMarketAlerts === 'true');

      const savedWeeklySummary = localStorage.getItem('alphaline_notif_weekly_summary');
      if (savedWeeklySummary !== null) setNotifWeeklySummary(savedWeeklySummary === 'true');

      const savedMarket = localStorage.getItem('alphaline_default_market');
      if (savedMarket) setDefaultMarket(savedMarket);

      const savedConf = localStorage.getItem('alphaline_min_confidence');
      if (savedConf) setMinConfidence(parseInt(savedConf, 10));
    }
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const saveNotif = (key: string, val: boolean, setter: (v: boolean) => void) => {
    setter(val);
    localStorage.setItem(key, val.toString());
    toast.success('Notification preferences updated');
  };

  const saveMarketPreference = (market: string) => {
    setDefaultMarket(market);
    localStorage.setItem('alphaline_default_market', market);
    toast.success(`Default market set to ${market}`);
  };

  const saveMinConfidence = (val: number) => {
    setMinConfidence(val);
    localStorage.setItem('alphaline_min_confidence', val.toString());
  };

  if (!mounted) return null;

  // Toggle switch subcomponent
  const Toggle = ({ active, onChange }: { active: boolean, onChange: (v: boolean) => void }) => (
    <div 
      onClick={() => onChange(!active)}
      className={`w-10 h-[22px] rounded-full p-[2px] cursor-pointer transition-colors duration-200 flex items-center ${
        active ? 'bg-[#6366F1]' : 'bg-[#1C1F28] border border-[#1E2230]'
      }`}
    >
      <motion.div 
        layout
        className={`w-[16px] h-[16px] rounded-full shadow-md bg-white`}
        animate={{ x: active ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Settings" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-4xl w-full mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex flex-col gap-1 mb-8 select-none">
          <h1 className="text-[22px] font-medium text-frost font-sans flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo" /> Settings
          </h1>
          <p className="text-[13px] text-muted font-sans font-normal leading-normal">
            Manage your account preferences, theme options, and custom signal thresholds.
          </p>
        </div>

        <div className="space-y-6">
          
          {/* Theme / Appearance Section */}
          <section className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Settings className="w-4 h-4 text-indigo" />
              <h2 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-wider">Appearance</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-[14px] font-medium text-[#E2E8F0] leading-none mb-1">Theme</h3>
                <p className="text-[12px] text-muted leading-tight">Choose your preferred color scheme</p>
              </div>
              <div className="flex gap-2">
                {['dark', 'light'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-1.5 text-[12px] font-medium rounded-[6px] transition-all capitalize ${
                      theme === t
                        ? 'bg-[#6366F1] text-white shadow-md'
                        : 'bg-[#1C1F28] border border-[#1E2230] text-[#6B7280] hover:text-frost hover:bg-[#252836]'
                    }`}
                  >
                    {t} Mode
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Account Card */}
          <section className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <User className="w-4 h-4 text-indigo" />
              <h2 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-wider">Account Profile</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-[16px] font-bold select-none">
                  {email[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[#E2E8F0]">{email}</h3>
                  <p className="text-[11px] text-muted">Member Since: {joinedDate} · Plan: Free Tier</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="border border-[#1E2230] text-[#EF4444] hover:bg-[#EF4444]/10 px-4 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </section>

          {/* Notifications Card */}
          <section className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-4.5">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Bell className="w-4 h-4 text-indigo" />
              <h2 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-wider">Notification Alerts</h2>
            </div>

            <div className="divide-y divide-border-dark/40">
              {/* Row 1 */}
              <div className="flex justify-between items-center py-3">
                <div>
                  <h3 className="text-[13px] font-medium text-[#E2E8F0] mb-0.5">High-Confidence Signal Alerts</h3>
                  <p className="text-[11px] text-muted">Notify when any signal reaches confidence threshold &gt; 80%</p>
                </div>
                <Toggle 
                  active={notifHighConf} 
                  onChange={(val) => saveNotif('alphaline_notif_high_conf', val, setNotifHighConf)} 
                />
              </div>

              {/* Row 2 */}
              <div className="flex justify-between items-center py-3">
                <div>
                  <h3 className="text-[13px] font-medium text-[#E2E8F0] mb-0.5">Market Open & Close Updates</h3>
                  <p className="text-[11px] text-muted">Notify at NSE opening bell and US market closing bells</p>
                </div>
                <Toggle 
                  active={notifMarketAlerts} 
                  onChange={(val) => saveNotif('alphaline_notif_market_alerts', val, setNotifMarketAlerts)} 
                />
              </div>

              {/* Row 3 */}
              <div className="flex justify-between items-center py-3">
                <div>
                  <h3 className="text-[13px] font-medium text-[#E2E8F0] mb-0.5">Weekly Performance Recap</h3>
                  <p className="text-[11px] text-muted">Receive a weekly digest summarizing generated signal success ratings</p>
                </div>
                <Toggle 
                  active={notifWeeklySummary} 
                  onChange={(val) => saveNotif('alphaline_notif_weekly_summary', val, setNotifWeeklySummary)} 
                />
              </div>
            </div>
          </section>

          {/* Data & Signals Card */}
          <section className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-5">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Database className="w-4 h-4 text-indigo" />
              <h2 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-wider">Data &amp; Filter Defaults</h2>
            </div>

            {/* Default Market Selection */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-[13px] font-medium text-[#E2E8F0] mb-0.5">Default Market View</h3>
                <p className="text-[11px] text-muted">Pre-selected tab when opening signal feeds</p>
              </div>
              <div className="flex gap-1.5 bg-void p-1 rounded-[6px] border border-border-dark">
                {['All', 'NSE', 'BSE', 'US'].map((mkt) => (
                  <button
                    key={mkt}
                    onClick={() => saveMarketPreference(mkt)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-[4px] transition-all ${
                      defaultMarket === mkt
                        ? 'bg-[#6366F1] text-white'
                        : 'text-muted hover:text-frost'
                    }`}
                  >
                    {mkt}
                  </button>
                ))}
              </div>
            </div>

            {/* Min Confidence Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[13px] font-medium text-[#E2E8F0] mb-0.5">Minimum Confidence Threshold</h3>
                  <p className="text-[11px] text-muted">Filter out signals with probability score below this value</p>
                </div>
                <span className="font-mono font-bold text-[14px] text-indigo bg-indigo/10 px-2 py-0.5 rounded">
                  {minConfidence}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={minConfidence}
                onChange={(e) => saveMinConfidence(parseInt(e.target.value, 10))}
                className="w-full accent-indigo h-1 bg-[#1C1F28] rounded-lg appearance-none cursor-pointer border border-border-dark"
              />
            </div>
          </section>

          {/* About Section */}
          <section className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Info className="w-4 h-4 text-indigo" />
              <h2 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-wider">About Alphaline</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-[12px] font-sans">
              <div>
                <span className="text-muted block">App Version</span>
                <span className="font-mono text-frost font-medium">v1.0.0</span>
              </div>
              <div>
                <span className="text-muted block">Hackathon Track</span>
                <span className="text-frost font-medium">H0 Hackathon — Vercel + AWS</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted block">Core Technologies</span>
                <span className="text-frost font-normal">Next.js 14 · FastAPI · DynamoDB · XGBoost Model Engine</span>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
