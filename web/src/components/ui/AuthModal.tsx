import React, { useState } from 'react';
import { X, Lock, Mail, CheckCircle2, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { api } from '../../lib/api';
import { useStore } from '../../context/StoreContext';

type AuthTab = 'login' | 'register' | 'verify' | 'reset';

export default function AuthModal({ onNavigate }: { onNavigate: (tab: string) => void }) {
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
  const formTitle = { login: 'Sign in to your account', register: 'Create your account', verify: 'Verify your account', reset: 'Recover your account' }[tab];

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
          if (res.user?.role === 'admin') onNavigate('admin-dashboard');
          else if (res.user?.role === 'seller') onNavigate('seller-dashboard');
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
      <div role="dialog" aria-modal="true" aria-labelledby="cnc-auth-title" className="cnc-auth-dialog relative flex w-full max-w-md max-h-[95dvh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close sign in dialog"
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/15"
        >
          <X size={18} />
        </button>

        <div className="cnc-auth-header px-4 py-4 text-white sm:px-6">
          <div className="cnc-auth-logo mr-11 inline-flex max-w-[calc(100%-3rem)]">
            <BrandLogo className="h-12 max-w-full w-auto sm:h-14" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-black/25 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(null); }}
              className={`min-h-11 rounded-xl px-1 py-2 transition-colors ${tab === 'login' ? 'cnc-auth-tab-active' : 'text-emerald-100'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMsg(null); }}
              className={`min-h-11 rounded-xl px-1 py-2 transition-colors ${tab === 'register' || tab === 'verify' ? 'cnc-auth-tab-active' : 'text-emerald-100'}`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setTab('reset'); setErrorMsg(null); }}
              className={`min-h-11 rounded-xl px-1 py-2 transition-colors ${tab === 'reset' ? 'cnc-auth-tab-active' : 'text-emerald-100'}`}
            >
              Recovery
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
          <h2 id="cnc-auth-title" className="cnc-auth-title rounded-xl px-3 py-2.5 text-lg font-extrabold text-emerald-950">{formTitle}</h2>
          {authModal.reason && !feedback && !errorMsg && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
              {authModal.reason}
            </div>
          )}

          {feedback && (
            <div role="status" className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-[#EAF7EF] p-3 text-xs font-semibold text-[#084B26] break-all">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#0E6B38]" />
              <span>{feedback}</span>
            </div>
          )}
          {errorMsg && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {tab !== 'verify' && (
            <div>
              <label htmlFor="cnc-auth-email" className="text-sm font-bold text-slate-800">Email address</label>
              <div className="relative mt-1">
                <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="cnc-auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setShowMfaInput(false);
                    setTotpCode('');
                  }}
                  placeholder="you@example.com"
                  className="cnc-auth-input h-11 w-full rounded-xl border pl-10 pr-3 text-base"
                />
              </div>
            </div>
          )}

          {tab === 'verify' && (
            <>
              <div>
                <label htmlFor="cnc-auth-token" className="text-sm font-bold text-slate-800">Verification Token</label>
                <div className="relative mt-1">
                  <KeyRound size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    id="cnc-auth-token"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste verification token"
                    className="cnc-auth-input h-11 w-full rounded-xl border pl-10 pr-3 text-base font-mono"
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
              <label htmlFor="cnc-auth-password" className="text-sm font-bold text-slate-800">Password</label>
              <div className="relative mt-1">
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  id="cnc-auth-password"
                  type="password"
                  autoComplete={tab === 'verify' ? 'new-password' : 'current-password'}
                  aria-describedby="cnc-auth-password-length"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="cnc-auth-input h-11 w-full rounded-xl border pl-10 pr-3 text-base"
                />
              </div>
              <p id="cnc-auth-password-length" className="mt-1 text-xs text-slate-600">Minimum 12 characters</p>
            </div>
          )}

          {tab === 'login' && showMfaInput && (
            <div>
              <label htmlFor="cnc-auth-code" className="text-sm font-bold text-slate-800">Authenticator code</label>
              <input
                id="cnc-auth-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                className="cnc-auth-input mt-1 h-11 w-full rounded-xl border px-3 text-base font-mono tracking-widest"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cnc-auth-cta flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white disabled:opacity-50"
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
