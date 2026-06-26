import type { Metadata } from "next";
import { DM_Mono, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const dmMono = DM_Mono({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

const inter = Inter({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Alphaline - AI-powered Trading Signals",
  description: "AI-generated confluence signals for NSE, BSE and US equities.",
};

// Exporting font variables for DM Mono and JetBrains Mono
export const dmMonoVariable = dmMono.variable;
export const jetbrainsMonoVariable = jetbrainsMono.variable;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0D0F14]">
      <body className={`${inter.variable} ${dmMono.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#111318',
              border: '1px solid #1E2230',
              color: '#E2E8F0',
              fontFamily: 'var(--font-inter)',
            }
          }}
        />
      </body>
    </html>
  );
}
