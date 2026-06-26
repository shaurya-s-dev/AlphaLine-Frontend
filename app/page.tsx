import Link from "next/link";
import SignalCard from "@/components/SignalCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alphaline - AI-powered Trading Signals",
  description: "AI-generated confluence signals for NSE, BSE and US equities.",
  openGraph: {
    title: "Alphaline - AI-powered Trading Signals",
    description: "AI-generated confluence signals for NSE, BSE and US equities.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Alphaline Trading Platform",
      }
    ],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-void text-frost flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-[640px] w-full flex flex-col items-center text-center gap-8">
        {/* Top Logo */}
        <div className="font-brand font-semibold text-[14px] text-indigo tracking-[0.2em] uppercase select-none">
          ALPHALINE
        </div>

        {/* Hero Static SignalCard */}
        <div className="w-full max-w-[380px] text-left">
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

        {/* Pitch Text */}
        <p className="text-[16px] text-muted font-normal leading-relaxed max-w-[480px]">
          AI-generated confluence signals for NSE, BSE and US equities.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex gap-4 items-center">
          <Link
            href="/dashboard"
            className="bg-indigo text-white text-[13px] font-medium px-4 py-1.5 rounded-[6px] hover:bg-[#5254DE] transition-colors duration-150 leading-none"
          >
            Get signals free
          </Link>
          <a
            href="#"
            className="text-muted hover:text-frost text-[13px] font-medium transition-colors duration-150 leading-none"
          >
            Read the docs →
          </a>
        </div>

        {/* Stats Inline */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-[12px] text-dim font-normal select-none">
          <span>200M+ traders</span>
          <span>·</span>
          <span>NSE/BSE/US</span>
          <span>·</span>
          <span>Free</span>
        </div>

        {/* Footer */}
        <div className="mt-16 text-[11px] font-sans font-normal text-dim select-none">
          Built for H0 Hackathon
        </div>
      </div>
    </div>
  );
}
