'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown } from 'lucide-react';

export function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className="bg-[#0D1117]/80 border border-[#1E2230] rounded-[10px] mb-6 overflow-hidden select-none"
      animate={{ height: open ? 'auto' : 44 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-[#A0AEC0] hover:text-frost focus:outline-none"
      >
        <span className="flex items-center gap-2 font-sans font-medium">
          <Info className="w-4 h-4 text-indigo" /> {title}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#8892A4] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="px-4 pb-4 pt-3 text-[12px] text-[#8892A4] leading-relaxed space-y-3 border-t border-border-dark font-sans"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
