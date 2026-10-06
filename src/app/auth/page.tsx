'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed.');

      // 1. Önce okul koordinatörü mü kontrol edelim
      const { data: schoolMem } = await supabase
        .from('school_memberships')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'coordinator')
        .maybeSingle();

      if (schoolMem) {
        window.location.href = '/school-admin';
        return;
      }

      // 2. Kullanıcının veritabanındaki gerçek rolünü çekelim
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      // 3. Role göre yönlendirme yapalım
      if (profile?.role === 'student') {
        window.location.href = '/student';
      } else if (profile?.role === 'teacher') {
        window.location.href = '/teacher';
      } else {
        window.location.href = '/student';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-3">
            IB English B Assessment Portal
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Sign in to access your dashboard, portfolios, or school license
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@school.org"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}