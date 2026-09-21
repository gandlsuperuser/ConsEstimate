'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UserOption {
  email: string;
  name: string;
  role: string;
}

const PRESET_USERS: UserOption[] = [
  { email: 'helenguerra@gmail.com', name: 'Helen Guerra', role: 'Administrator' },
  { email: 'btxsupply@yahoo.com', name: 'BTX Supply', role: 'Administrator' },
  { email: 'gandl.superuser@gmail.com', name: 'G&L Superuser', role: 'Administrator' },
  { email: 'rwmason3@gmail.com', name: 'RW Mason', role: 'Administrator' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/projects';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent, overrideEmail?: string, overridePass?: string) => {
    if (e) e.preventDefault();
    setError(null);

    const loginEmail = (overrideEmail || email).trim();
    const loginPass = overridePass || password;

    if (!loginEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!loginPass) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        setIsLoading(false);
        return;
      }

      setSuccessUser(data.user?.name || loginEmail);
      
      // Smooth redirect
      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 400);
    } catch (err: any) {
      console.error('Login error:', err);
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (user: UserOption) => {
    setEmail(user.email);
    setPassword('123123');
    handleSubmit(undefined, user.email, '123123');
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Background Decorative Gradient Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-orange-500/15 via-orange-600/5 to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] bg-blue-500/10 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-xl mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-orange-500/20">
              C
            </div>
            <div className="ml-3 text-left">
              <span className="text-xs font-bold uppercase tracking-widest text-orange-400 block leading-tight">
                BTX Construction
              </span>
              <span className="text-base font-extrabold text-[#f4f4f5] tracking-tight block">
                ConsEstimate Platform
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f4f4f5] tracking-tight">
            Sign In to Control Center
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5">
            Enterprise Estimating, Scheduling & Project Management
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-md relative overflow-hidden">
          {/* Subtle top amber border highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <span className="text-base leading-none">⚠️</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          {successUser && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
              <span className="text-base leading-none">✅</span>
              <span>Welcome back, <strong>{successUser}</strong>! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#f4f4f5] placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-zinc-400">Default: 123123</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-4 py-2.5 text-[#f4f4f5] placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1 text-xs"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-[#09090b] border-[#27272a] text-orange-500 focus:ring-orange-500/20"
                />
                <span>Remember this device</span>
              </label>
              <span className="text-zinc-400">Admin Clearance</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !!successUser}
              className="w-full mt-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#27272a]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#121215] px-3 text-zinc-400 font-semibold tracking-wider">
                1-Click Quick Admin Login
              </span>
            </div>
          </div>

          {/* Quick-select Admin Users */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => handleQuickLogin(user)}
                disabled={isLoading}
                className="group text-left p-2.5 rounded-xl border border-[#27272a] bg-[#18181b]/70 hover:bg-[#202025] hover:border-orange-500/50 transition-all flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#f4f4f5] group-hover:text-orange-400 truncate transition-colors">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {user.email.split('@')[0]}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Credentials Info Footer */}
          <div className="mt-5 pt-4 border-t border-[#27272a] text-center">
            <p className="text-[11px] text-zinc-400">
              All 4 users have full administrator access · Password: <code className="px-1.5 py-0.5 rounded bg-black border border-zinc-800 text-orange-400 font-mono">123123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
