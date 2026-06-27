'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Boxes } from "@/components/ui/background-boxes";
import SignalCard from "@/components/SignalCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    }
  }
};

const letterVariants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    filter: "blur(4px)" 
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    }
  }
};

const heroCardVariants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    y: 30
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: 0.9,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export default function Home() {
  const [traders, setTraders] = useState(0);
  const [markets, setMarkets] = useState(0);
  const [latency, setLatency] = useState(5.0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress * (2 - progress);

      setTraders(Math.floor(ease * 200));
      setMarkets(Math.floor(ease * 10));
      setLatency(parseFloat((5.0 - ease * 3.2).toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0D0F14] text-frost flex flex-col justify-between items-center p-6 sm:p-12">
      {/* Dark overlay mask */}
      <div className="absolute inset-0 w-full h-full bg-[#0D0F14] z-[1] [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      
      {/* Animated boxes background */}
      <Boxes />

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center z-20 relative">
        <div className="font-brand font-semibold text-[13px] text-indigo tracking-[0.2em] uppercase select-none">
          ALPHALINE
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sig-green animate-pulse" />
          <span className="font-mono text-[10px] text-muted tracking-wider uppercase">ENGINE ONLINE</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 my-auto z-20 relative py-12">
        {/* Left column */}
        <div className="flex flex-col gap-6 text-center lg:text-left max-w-[500px]">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2"
          >
            {/* Title letters animation */}
            <div className="font-brand font-semibold text-[32px] sm:text-[44px] tracking-[0.15em] text-frost flex select-none uppercase items-center justify-center lg:justify-start gap-1">
              {"ALPHALINE".split("").map((letter, i) => (
                <motion.span key={i} variants={letterVariants}>
                  {letter}
                </motion.span>
              ))}
            </div>
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-lg sm:text-xl font-medium text-frost/90 tracking-wide font-sans mt-2"
            >
              AI-Powered Confluence Trading Signals
            </motion.h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-[14px] sm:text-[15px] text-muted leading-relaxed max-w-[440px] font-sans"
          >
            Real-time, institutional-grade confluence signals for NSE, BSE and US equities. Eliminate noise and back your trades with probability.
          </motion.p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start mt-2"
          >
            <Link href="/dashboard" passHref legacyBehavior>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto bg-indigo hover:bg-indigo/90 text-white text-[13px] font-medium px-6 py-2.5 rounded-[8px] transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                Get Signals Free
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.a>
            </Link>
            <motion.a
              href="#"
              whileHover={{ scale: 1.03, color: '#E2E8F0' }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto text-muted text-[13px] font-medium px-6 py-2.5 rounded-[8px] border border-border-dark bg-surface/20 backdrop-blur-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-sans"
            >
              Read the docs
            </motion.a>
          </motion.div>

          {/* Stats Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="grid grid-cols-3 gap-4 sm:gap-6 pt-8 border-t border-border-dark/30 mt-6 max-w-[400px] mx-auto lg:mx-0 w-full"
          >
            <div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-indigo tracking-tight">
                {mounted ? `${traders}M+` : "0M+"}
              </div>
              <div className="text-[11px] text-muted font-sans mt-0.5 tracking-wider uppercase">Traders</div>
            </div>
            <div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-sig-green tracking-tight">
                {mounted ? `${markets}` : "0"}
              </div>
              <div className="text-[11px] text-muted font-sans mt-0.5 tracking-wider uppercase">Markets</div>
            </div>
            <div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-sig-amber tracking-tight">
                {mounted ? `< ${latency.toFixed(1)}s` : "< 5.0s"}
              </div>
              <div className="text-[11px] text-muted font-sans mt-0.5 tracking-wider uppercase">Latency</div>
            </div>
          </motion.div>
        </div>

        {/* Right column (Signal Card Hero) */}
        <motion.div 
          variants={heroCardVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-[360px] sm:max-w-[380px]"
        >
          <div className="absolute -inset-10 bg-indigo/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative border border-border-dark/80 bg-surface/30 backdrop-blur-xl rounded-[16px] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <SignalCard
              ticker="NIFTY50"
              market="NSE"
              signalType="BUY"
              confidence={87}
              entry={23410.00}
              stopLoss={23150.00}
              target={23850.00}
              timestamp="2 min ago"
              isBlurred={false}
            />
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl flex justify-between items-center text-[10px] font-sans font-normal text-dim select-none z-20 relative pt-6 mt-auto border-t border-border-dark/20">
        <span>&copy; {new Date().getFullYear()} Alphaline Technologies</span>
        <span>Built for H0 Hackathon</span>
      </footer>
    </div>
  );
}
