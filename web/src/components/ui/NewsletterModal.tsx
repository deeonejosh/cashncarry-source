import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, X } from 'lucide-react';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEmailPreview?: () => void;
}

const choices = [
  { id: 'deals', label: 'Deals & offers' },
  { id: 'livestreams', label: 'Live shopping' },
  { id: 'news', label: 'Marketplace news' },
];

export default function NewsletterModal({ isOpen, onClose }: NewsletterModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [topics, setTopics] = useState<string[]>(['deals', 'livestreams']);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  if (!isOpen) return null;

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) { setMessage('Please agree to receive emails before subscribing.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
        body:JSON.stringify({email:email.trim(),name,topics,consent:true,source:'modal'}),
      });
      const result = await response.json() as {error?:string;message?:string};
      if (!response.ok) throw new Error(result.error || 'Please try again.');
      setSuccess(true);
      setMessage(result.message || 'Check your inbox to confirm your subscription.');
    } catch(error) { setSuccess(false); setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="newsletter-modal-title" onClick={e => e.stopPropagation()}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
        <button onClick={onClose} aria-label="Close newsletter signup" type="button" className="absolute right-5 top-5 rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <X size={18} />
        </button>
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800"><Mail size={15}/> Cash N Carry updates</span>
        <h2 id="newsletter-modal-title" className="mt-3 pr-8 text-2xl font-extrabold text-slate-900">Get the good stuff</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Deals, seller livestreams and useful marketplace news. Choose what interests you.</p>
        {success ? <div role="status" className="mt-6 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 size={28} aria-hidden="true"/><p className="text-sm font-semibold">{message}</p>
          <button type="button" onClick={onClose} className="rounded-xl bg-[#075a37] px-5 py-3 text-sm font-bold text-white">Continue shopping</button>
        </div> :
        <form onSubmit={send} className="mt-5 space-y-4">
          <div><label htmlFor="newsletter-modal-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
            <input id="newsletter-modal-email" type="email" required maxLength={254} autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"/></div>
          <div><label htmlFor="newsletter-modal-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Name <span className="font-normal text-slate-400">(optional)</span></label>
            <input id="newsletter-modal-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} autoComplete="name"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"/></div>
          <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">Email topics</legend><div className="grid grid-cols-2 gap-2">{choices.map(c =>
            <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={topics.includes(c.id)} onChange={() => setTopics(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev,c.id])} className="accent-emerald-800"/>{c.label}</label>)}</div></fieldset>
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-600">
            <input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-800"/>
            I agree to receive Cash N Carry marketing emails and understand I can unsubscribe at any time.
          </label>
          <p className="text-xs text-slate-500">Your email stays unconfirmed until you click the confirmation email. Read our <a href="/privacy" className="font-semibold text-emerald-800 underline">Privacy policy</a>.</p>
          <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#075a37] px-4 text-sm font-bold text-white disabled:opacity-50">
            {loading ? 'Sending…' : 'Subscribe'} <ArrowRight size={16} aria-hidden="true"/>
          </button>
          {message && <p role="alert" className="text-sm text-rose-700">{message}</p>}
        </form>}
      </section>
    </div>
  );
}
