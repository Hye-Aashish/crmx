import React, { useState } from 'react';
import {
  TrendingUp,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const isDev = import.meta.env.DEV;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.22),_transparent_55%)] pointer-events-none" />
      <div className="absolute top-[12%] left-[18%] w-[28rem] h-[28rem] bg-emerald-500/20 rounded-full blur-[130px] pointer-events-none animate-soft-pulse" />
      <div className="absolute bottom-[8%] right-[12%] w-[24rem] h-[24rem] bg-teal-400/15 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.055] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }}
      />

      <div className="max-w-[420px] w-full relative z-10 animate-rise">
        <div className="text-center mb-6 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40 ring-1 ring-white/25">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">CRMX</h1>
          <p className="text-xs text-slate-400 font-medium">Enterprise CRM & Order Tracking</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-2xl border border-emerald-400/15 rounded-[1.75rem] p-7 sm:p-8 shadow-2xl shadow-emerald-950/50 text-white space-y-5 ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-300/90">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure staff portal
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3 py-3 bg-slate-950/60 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-3 bg-slate-950/60 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {isDev && (
            <div className="pt-4 border-t border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Dev-only quick login
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                {[
                  { e: 'admin@crmx.io', p: 'admin123', label: 'Admin', sub: 'Full System' },
                  { e: 'manager@crmx.io', p: 'manager123', label: 'Manager', sub: 'Sales Head' },
                  { e: 'agent@crmx.io', p: 'agent123', label: 'Agent', sub: 'My Leads' }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setPreset(item.e, item.p)}
                    className="p-2.5 bg-slate-950/50 hover:bg-emerald-500/10 border border-slate-700/70 hover:border-emerald-500/40 rounded-xl text-center transition-all"
                  >
                    <div className="font-bold text-slate-200">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
