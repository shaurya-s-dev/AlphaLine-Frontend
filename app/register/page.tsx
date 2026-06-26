'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
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

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col justify-center items-center p-6 font-sans">
      <div className="w-full max-w-[360px] flex flex-col items-center gap-6">
        {/* Top Logo */}
        <div className="font-brand font-semibold text-[14px] text-indigo tracking-[0.2em] uppercase select-none">
          ALPHALINE
        </div>

        {/* Card Form */}
        <div className="w-full bg-surface border border-border-dark p-6 rounded-[6px]">
          <h2 className="text-[16px] font-medium text-frost mb-4 font-sans leading-none text-center">Register</h2>
          
          <form onSubmit={handleRegister} className="space-y-4 font-sans">
            <div>
              <label className="block text-[11px] text-dim font-sans mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] focus:outline-none focus:border-indigo placeholder:text-dim"
              />
            </div>

            <div>
              <label className="block text-[11px] text-dim font-sans mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] focus:outline-none focus:border-indigo placeholder:text-dim"
              />
            </div>

            <div>
              <label className="block text-[11px] text-dim font-sans mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] focus:outline-none focus:border-indigo placeholder:text-dim"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo text-white text-[13px] font-medium py-2 rounded-[6px] hover:bg-[#5254DE] transition-colors duration-150 leading-none mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <p className="text-sig-red text-[12px] font-medium mt-4 text-center leading-normal">
              {error}
            </p>
          )}
        </div>

        {/* Bottom Link */}
        <p className="text-[12px] text-muted font-sans text-center leading-none">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
