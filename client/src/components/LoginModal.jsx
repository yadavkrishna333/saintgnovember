import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { 
  Crown, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Store,
  KeyRound
} from 'lucide-react';

export function LoginModal({ isOpen, onClose }) {
  const { currentUser, login, register } = useInventory();
  
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const canDismiss = !!currentUser;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim()) {
      setError('कृपया Username दर्ज करें (Enter Username)');
      return;
    }
    if (!password.trim()) {
      setError('कृपया Password दर्ज करें (Enter Password)');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(username.trim(), password.trim());
        setSuccessMsg(`स्वागत है, ${user.username}! Welcome back.`);
        setTimeout(() => {
          if (onClose) onClose();
        }, 600);
      } else {
        const user = await register(username.trim(), password.trim());
        setSuccessMsg(`खाता सफलतापूर्वक बन गया! Welcome ${user.username}!`);
        setTimeout(() => {
          if (onClose) onClose();
        }, 600);
      }
    } catch (err) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickKrishan = async () => {
    setUsername('Krishan');
    setPassword('Krishan@123');
    setError('');
    setLoading(true);
    try {
      const user = await login('Krishan', 'Krishan@123');
      setSuccessMsg(`स्वागत है, ${user.username}! Store loaded.`);
      setTimeout(() => {
        if (onClose) onClose();
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden shadow-amber-500/10">
        
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 pb-4 border-b border-slate-800/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl text-white">KY</span>
                <span className="font-extrabold text-xl bg-gradient-to-r from-amber-300 via-yellow-200 to-white bg-clip-text text-transparent">
                  INVENTORY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {mode === 'login' ? 'Store Account Sign In / लॉगिन करें' : 'Create Isolated Store Account / नया खाता'}
              </p>
            </div>
          </div>

          {canDismiss && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Current User Info Banner (if switching) */}
        {currentUser && (
          <div className="mx-6 mt-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Store className="w-4 h-4 text-amber-400" />
              <span>Current Account: <strong className="text-amber-300">{currentUser.username}</strong></span>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
              Active
            </span>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Sign In (लॉग इन)
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Quick Register (नया खाता)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2 animate-shake">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Username / नाम
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4 text-amber-400/80" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Krishan"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-400/80 rounded-xl text-white text-sm focus:outline-none transition font-medium"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password / पासवर्ड
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4 text-amber-400/80" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? 'e.g. Krishan@123' : 'Create a secure password'}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-400/80 rounded-xl text-white text-sm focus:outline-none transition font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In / लॉगिन करें' : 'Create Account & Open Store'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>

          {/* 1-Click Master Account Access */}
          <div className="pt-2">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Quick 1-Click Access
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              type="button"
              onClick={fillQuickKrishan}
              disabled={loading}
              className="w-full p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 hover:border-amber-400 text-left flex items-center justify-between group transition active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300 group-hover:text-amber-200">
                    Krishan (Main Footwear Store)
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ID: Krishan | Pass: Krishan@123
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                1-Click Sign In
              </span>
            </button>
          </div>

          {/* Privacy Note */}
          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>हर ID का डाटा 100% अलग और सुरक्षित रहेगा (Fully Tenant Isolated)</span>
          </div>

        </form>

      </div>
    </div>
  );
}
