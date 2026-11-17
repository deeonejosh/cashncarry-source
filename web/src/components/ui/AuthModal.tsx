import React, { useState } from 'react';
import { X, Lock, Mail, CheckCircle2, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { api } from '../../lib/api';
import { useStore } from '../../context/StoreContext';

type AuthTab = 'login' | 'register' | 'verify' | 'reset';

export default function AuthModal() {
  const { authModal, closeAuthModal, loginWithApi, registerWithApi, verifyWithApi } = useStore();
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authModal.show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    setErrorMsg(null);
    try {
      if (tab === 'login') {
        const res = await loginWithApi(email, password, showMfaInput ? totpCode : undefined);
        if (res.ok) {
          setPassword('');
          setTotpCode('');
          setShowMfaInput(false);
          closeAuthModal();
          // Preserve a buyer's current checkout; privileged roles open their authorised workspaces.
          if (res.user?.role === 'admin') window.location.assign('/admin');
          else if (res.user?.role === 'seller') window.location.assign('/seller-centre');
        } else {
          if (res.mfaRequired) setShowMfaInput(true);
          setErrorMsg(res.error || 'Sign-in failed. Check your email and password.');
        }
      } else if (tab === 'register') {
        const res = await registerWithApi(email);
        if (res.ok) {
          setFeedback(
            res.verificationToken
              ? `Verification token issued. Paste token into the Verify tab to set your password: ${res.verificationToken}`
              : 'Verification link/token sent if the account is eligible. Complete verification in the Verify tab.'
          );
          if (res.verificationToken) setToken(res.verificationToken);
          setTab('verify');
        } else {
          setErrorMsg(res.error || 'Unable to register account.');
        }
      } else if (tab === 'verify') {
        const res = await verifyWithApi(token, password);
        if (res.ok) {
          setFeedback('Account verified! Sign in now with your email and password.');
          setTab('login');
        } else {
          setErrorMsg(res.error || 'Invalid or expired verification token.');
        }
      } else if (tab === 'reset') {
        const res = await api.requestPasswordReset(email);
        if (res.accepted) {
          setFeedback('If a verified account exists for that email, a password reset link has been prepared.');
        } else {
          setErrorMsg(res.error || 'Unable to process reset request.');
        }
      }
    } catch {
      setErrorMsg('Connection failed. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 p-0 sm:p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Cash N Carry account" className="relative flex w-full max-w-md max-h-[95dvh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close sign in dialog"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>

        <div className="bg-gradient-to-br from-[#084B26] via-[#0E6B38] to-[#093B22] px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-1.5 shadow">
              <BrandLogo className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Cash N Carry Nigeria</h2>
              <p className="text-xs text-emerald-100/90">
                Sign in to your Cash N Carry account
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/25 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); }}
              className={`rounded-xl py-2 transition ${tab === 'login' ? 'bg-white text-[#0E6B38] shadow' : 'text-emerald-100'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMsg(null); }}
              className={`rounded-xl py-2 transition ${tab === 'register' || tab === 'verify' ? 'bg-white text-[#0E6B38] shadow' : 'text-emerald-100'}`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setTab('reset'); setErrorMsg(null); }}
              className={`rounded-xl py-2 transition ${tab === 'reset' ? 'bg-white text-[#0E6B38] shadow' : 'text-emerald-100'}`}
            >
              Recovery
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
          {authModal.reason && !feedback && !errorMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
              {authModal.reason}
            </div>
          )}

          {feedback && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-[#EAF7EF] p-3 text-xs font-semibold text-[#084B26] break-all">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#0E6B38]" />
              <span>{feedback}</span>
            </div>
          )}
          {errorMsg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {tab !== 'verify' && (
            <div>
              <label className="text-xs font-bold text-slate-700">Email address</label>
              <div className="relative mt-1">
                <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#0E6B38]"
                />
              </div>
            </div>
          )}

          {tab === 'verify' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700">Verification Token</label>
                <div className="relative mt-1">
                  <KeyRound size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste verification token"
                    className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-xs font-mono outline-none focus:border-[#0E6B38]"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600">
                New accounts must verify their email before signing in. Seller access requires separate approval.
              </div>
            </>
          )}

          {(tab === 'login' || tab === 'verify') && (
            <div>
              <label className="text-xs font-bold text-slate-700">Password (min 12 characters)</label>
              <div className="relative mt-1">
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#0E6B38]"
                />
              </div>
            </div>
          )}

          {tab === 'login' && (
            <div>
              {!showMfaInput ? (
                <button
                  type="button"
                  onClick={() => setShowMfaInput(true)}
                  className="text-[11px] font-bold text-[#0E6B38] hover:underline"
                >
                  Admin sign-in? Enter 6-digit authenticator code
                </button>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700">6-digit Authenticator Code (Admins)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="000000"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono tracking-widest outline-none focus:border-[#0E6B38]"
                  />
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0E6B38] text-sm font-black text-white shadow-md transition hover:bg-[#084B26] disabled:opacity-50"
          >
            <span>
              {loading
                ? 'Connecting...'
                : tab === 'login'
                ? 'Sign In'
                : tab === 'register'
                ? 'Create Buyer Account'
                : tab === 'verify'
                ? 'Verify & Set Password'
                : 'Send Reset Link'}
            </span>
            <ArrowRight size={15} />
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            <ShieldCheck size={14} className="shrink-0 text-[#0E6B38]" />
            <span>Roles and seller permissions are verified server-side.</span>
          </div>
        </form>
      </div>
    </div>
  );
}
