import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, Loader2 } from 'lucide-react';
import DepthArtwork from './DepthArtwork';

type NewsletterSignupProps = { onPrivacy: () => void };

export default function NewsletterSignup({ onPrivacy }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [topics, setTopics] = useState<string[]>(['deals', 'livestreams']);
  const [state, setState] = useState<'idle'|'sending'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const toggleTopic = (topic: string) => {
    setTopics(previous => previous.includes(topic) ? previous.filter(item => item !== topic) : [...previous, topic]);
  };

  const subscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) { setState('error'); setMessage('Please agree to receive marketing emails.'); return; }
    setState('sending');
    setMessage('');
    try {
      const result = await fetch('/api/newsletter/subscribe', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: true, topics, source: 'footer' }),
      });
      const data = await result.json() as { message?: string; error?: string };
      if (!result.ok) throw new Error(data.error || 'Signup is temporarily unavailable.');
      setState('success');
      setMessage(data.message || 'Check your email to confirm your subscription.');
      setEmail('');
      setConsent(false);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <section aria-labelledby="cnc-newsletter-heading" className="cnc-newsletter rounded-2xl border border-emerald-100 bg-white p-4 sm:p-6 lg:p-7 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="cnc-newsletter-intro">
          <DepthArtwork icon={Mail} />
          <div>
            <h2 id="cnc-newsletter-heading" className="text-lg font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-2xl">Deals. Drops. Live shopping.</h2>
            <p className="mt-1 text-sm leading-5 text-slate-700">Get Cash N Carry updates by email.</p>
          </div>
        </div>
        <form onSubmit={subscribe} className="w-full max-w-xl space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="cnc-newsletter-email" className="sr-only">Email address</label>
            <input id="cnc-newsletter-email" type="email" autoComplete="email" inputMode="email" required maxLength={254}
              value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700" />
            <button type="submit" disabled={state === 'sending'}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#075a37] px-6 text-sm font-bold text-white hover:bg-[#06492e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60">
              {state === 'sending' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
              {state === 'sending' ? 'Sending…' : 'Subscribe'}
            </button>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-600">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-800" required />
            <span>I agree to receive Cash N Carry marketing emails. I can unsubscribe at any time. <button type="button" onClick={onPrivacy} className="font-semibold text-emerald-900 underline underline-offset-2">Privacy policy</button></span>
          </label>
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer font-semibold text-emerald-900">Choose topics (optional)</summary>
            <div className="mt-2 flex flex-wrap gap-3">
              {[['deals','Offers'],['livestreams','Live shopping'],['news','Marketplace news']].map(([id,label])=>
                <label key={id} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={topics.includes(id)} onChange={() => toggleTopic(id)} className="accent-emerald-800" />{label}</label>)}
            </div>
          </details>
          {message && <p role={state === 'error' ? 'alert' : 'status'} aria-live="polite"
            className={state === 'error' ? 'flex items-center gap-2 text-xs text-rose-700' : 'flex items-center gap-2 text-xs text-emerald-800'}>
            {state === 'success' && <CheckCircle2 size={15} aria-hidden="true" />}{message}</p>}
        </form>
      </div>
    </section>
  );
}
