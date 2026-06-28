'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (
        searchParams.get('type') === 'recovery' || 
        hashParams.get('type') === 'recovery' ||
        window.location.href.includes('type=recovery')
      ) {
        setIsRecovery(true);
      }
    }
  }, []);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setEmailSent(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccessMessage("Password reset successfully! Redirecting...");
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
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
          {isRecovery ? (
            <>
              <h2 className="text-[16px] font-medium text-frost mb-4 font-sans leading-none text-center">New Password</h2>
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4 font-sans">
                <div>
                  <label className="block text-[11px] text-dim font-sans mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  {isLoading ? 'Resetting password...' : 'Update Password'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-[16px] font-medium text-frost mb-4 font-sans leading-none text-center">Reset Password</h2>
              {emailSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                  <p style={{ color: '#E2E8F0', fontSize: 14, lineHeight: '1.4' }}>
                    We sent a password reset link to <strong className="text-indigo">{email}</strong>. Please check your inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResetRequest} className="space-y-4 font-sans">
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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo text-white text-[13px] font-medium py-2 rounded-[6px] hover:bg-[#5254DE] transition-colors duration-150 leading-none mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* Success / Error Display */}
          {error && (
            <p className="text-sig-red text-[12px] font-medium mt-4 text-center leading-normal">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="text-sig-green text-[12px] font-medium mt-4 text-center leading-normal">
              {successMessage}
            </p>
          )}
        </div>

        {/* Bottom Link */}
        <p className="text-[12px] text-muted font-sans text-center leading-none">
          Remember your password?{' '}
          <Link href="/login" className="text-indigo hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
