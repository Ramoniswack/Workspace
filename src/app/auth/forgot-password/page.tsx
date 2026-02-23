'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Mail, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      // TODO: Implement password reset API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center p-3 font-sans">
      <div className="w-full max-w-[380px]">
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          {!success ? (
            <>
              {/* Title */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 text-[#135bec] mb-2">
                  <div className="size-8 bg-[#135bec] rounded-lg flex items-center justify-center text-white">
                    <Layers className="size-4" />
                  </div>
                  <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">TaskHub</h2>
                </div>
                <div className="inline-flex items-center justify-center size-10 bg-[#135bec]/10 rounded-full mb-2">
                  <Mail className="text-[#135bec] size-5" />
                </div>
                <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Forgot password?</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">We'll send reset instructions</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  className="block w-full h-10 px-3 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#135bec] focus:ring-[#135bec]/20 transition-all text-sm"
                  placeholder="Email address"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />

                <button
                  className="w-full h-10 bg-[#135bec] hover:bg-[#135bec]/90 text-white font-bold rounded-lg shadow-lg shadow-[#135bec]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-4 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-[#135bec] dark:hover:text-[#135bec]">
                  <ArrowLeft className="size-3.5" />
                  Back to log in
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center size-10 bg-green-100 dark:bg-green-900/20 rounded-full mb-2">
                  <Mail className="text-green-600 dark:text-green-400 size-5" />
                </div>
                <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-1.5">Check your email</h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
                  We sent a reset link to <strong>{email}</strong>
                </p>
                <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-[#135bec] font-semibold hover:underline">
                  <ArrowLeft className="size-3.5" />
                  Back to log in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
          <a className="hover:text-slate-800 dark:hover:text-slate-300" href="#">Privacy</a>
          <a className="hover:text-slate-800 dark:hover:text-slate-300" href="#">Terms</a>
          <span>© 2024 TaskHub</span>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#135bec]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#135bec]/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
