'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, loginWithGoogle } from '@/lib/auth';
import { signInWithGoogle } from '@/lib/firebase';
import { Layers, LockOpen, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      const idToken = await result.user.getIdToken();
      
      // Send ID token to backend
      await loginWithGoogle(idToken);
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up blocked. Please allow pop-ups for this site');
      } else if (err.code === 'auth/configuration-not-found') {
        setError('Google Sign-In is not enabled. Please enable it in Firebase Console: Authentication → Sign-in method → Google → Enable');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please add it to Firebase Console.');
      } else if (err.code === 'auth/invalid-api-key') {
        setError('Invalid Firebase configuration. Please check your API key.');
      } else {
        setError(err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center p-3 font-sans">
      <div className="w-full max-w-[400px]">
        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
          {/* Brand & Title */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 text-[#135bec] mb-2">
              <div className="size-8 bg-[#135bec] rounded-lg flex items-center justify-center text-white">
                <Layers className="size-4" />
              </div>
              <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold">TaskHub</h2>
            </div>
            <div className="inline-flex items-center justify-center size-10 bg-[#135bec]/10 rounded-full mb-2">
              <LockOpen className="text-[#135bec] size-5" />
            </div>
            <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">Sign in to continue</p>
          </div>

          {/* Social Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="flex items-center justify-center gap-2 w-full h-9 px-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {googleLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Separator */}
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">or</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              className="block w-full h-10 px-3 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#135bec] focus:ring-[#135bec]/20 transition-all text-sm"
              placeholder="Email address"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            <div className="relative">
              <input
                className="block w-full h-10 pl-3 pr-9 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#135bec] focus:ring-[#135bec]/20 transition-all text-sm"
                placeholder="Password"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  className="size-3.5 rounded border-slate-300 dark:border-slate-700 text-[#135bec] focus:ring-[#135bec]"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#135bec] hover:text-[#135bec]/80">
                Forgot?
              </Link>
            </div>

            <button
              className="w-full h-10 bg-[#135bec] hover:bg-[#135bec]/90 text-white font-bold rounded-lg shadow-lg shadow-[#135bec]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-3"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link href="/register" className="text-[#135bec] font-bold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
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
