import React, { useState } from 'react';
import {
  TrendingUp,
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Users2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@crmx.io');
  const [password, setPassword] = useState('admin123');
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background visual glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in text-white space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">CRMX Enterprise</h1>
          <p className="text-xs text-slate-400">
            Advanced CRM & 3-Location Order Tracking Management
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@crmx.io"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Role Logins for Fast Review */}
        <div className="pt-4 border-t border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Quick Demo Credentials:
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setPreset('admin@crmx.io', 'admin123')}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-center transition-colors"
            >
              <div className="font-bold text-slate-200">Admin</div>
              <div className="text-[10px] text-slate-500">Full System</div>
            </button>
            <button
              type="button"
              onClick={() => setPreset('manager@crmx.io', 'manager123')}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-center transition-colors"
            >
              <div className="font-bold text-slate-200">Manager</div>
              <div className="text-[10px] text-slate-500">Sales Head</div>
            </button>
            <button
              type="button"
              onClick={() => setPreset('agent@crmx.io', 'agent123')}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-center transition-colors"
            >
              <div className="font-bold text-slate-200">Agent</div>
              <div className="text-[10px] text-slate-500">My Leads</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
