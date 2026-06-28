'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import SignalCard from '@/components/SignalCard';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0D0F14] text-frost flex select-none overflow-hidden font-sans">
      
      {/* Left Half (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 bg-[#0D0F14] relative overflow-hidden">
        <AnimatedBackground />
        
        {/* Centered Left Content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-8 max-w-[400px]">
          {/* BRAND */}
          <div className="font-brand font-semibold text-[24px] text-indigo tracking-[0.2em] uppercase select-none">
            ALPHALINE
          </div>
          
          {/* Static Hero Signal Card */}
          <div className="w-full relative border border-border-dark/80 bg-surface/30 backdrop-blur-xl rounded-[16px] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-left">
            <SignalCard
              ticker="RELIANCE.NS"
              market="NSE"
              signalType="BUY"
              confidence={81}
              entry={2847.50}
              stopLoss={2790.00}
              target={2960.00}
              timestamp="Just now"
              isBlurred={false}
            />
          </div>
          
          {/* Inline Stats */}
          <div className="font-sans font-normal text-[12px] text-[#374151] select-none tracking-wide text-center">
            35 tickers &middot; NSE/BSE/US &middot; Real-time
          </div>
        </div>
      </div>

      {/* Right Half */}
      <div className="w-full lg:w-[480px] bg-[#111318] border-l border-border-dark/60 flex flex-col justify-between p-8 sm:p-12 relative z-10">
        
        {/* Form Container (Centered Vertically) */}
        <div className="w-full max-w-[360px] m-auto flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="font-sans font-normal text-[14px] text-[#6B7280]">
              Welcome back
            </span>
            <h1 className="font-sans font-medium text-[20px] text-[#E2E8F0]">
              Sign in to Alphaline
            </h1>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4 font-sans">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-muted tracking-wider uppercase font-medium">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@domain.com"
                className="w-full bg-[#1C1F28] border border-[#1E2230] rounded-[6px] h-10 px-3 text-[13px] text-[#E2E8F0] placeholder-[#374151] focus:border-indigo focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-muted tracking-wider uppercase font-medium">Password</label>
                <Link href="/reset-password" className="text-[11px] text-[#6366F1] hover:underline font-sans">
                  Forgot password?
                </Link>
              </div>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••"
                  className="w-full bg-[#1C1F28] border border-[#1E2230] rounded-[6px] h-10 pl-3 pr-10 text-[13px] text-[#E2E8F0] placeholder-[#374151] focus:border-indigo focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[#EF4444] font-sans font-normal text-[12px] leading-normal"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Sign In Button */}
            <motion.button
              onClick={handleLogin}
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#6366F1] text-white font-sans font-medium text-[14px] rounded-[6px] h-10 flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-[#5254DE] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </motion.button>
          </div>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border-dark/60"></div>
            <span className="flex-shrink mx-4 text-dim font-mono text-[11px] uppercase">or</span>
            <div className="flex-grow border-t border-border-dark/60"></div>
          </div>

          {/* Bottom redirection Link */}
          <p className="text-[13px] font-sans font-normal text-[#6B7280] text-center leading-none">
            Don't have an account?{' '}
            <Link href="/register" className="text-[#6366F1] hover:underline font-medium ml-1">
              Create one
            </Link>
          </p>
        </div>

        {/* Footer (Right panel bottom) */}
        <div className="text-center font-sans font-normal text-[11px] text-[#374151] select-none mt-auto pt-6 border-t border-border-dark/20">
          Built for H0 Hackathon &middot; Vercel + AWS
        </div>

      </div>
    </div>
  );
}
