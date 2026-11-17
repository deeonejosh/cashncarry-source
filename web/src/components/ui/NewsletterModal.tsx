import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Mail, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEmailPreview?: () => void;
}

export default function NewsletterModal({ isOpen, onClose, onOpenEmailPreview }: NewsletterModalProps) {
  const { currentUser } = useStore();
  const [email, setEmail] = useState(currentUser.email || '');
  const [name, setName] = useState(currentUser.authenticated ? currentUser.name : '');
  const [preferences, setPreferences] = useState<string[]>([
    'flash-deals',
    'livestreams',
    'tech',
    'fashion',
  ]);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const togglePref = (id: string) => {
    setPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-[#0c5c36] via-[#09472a] to-[#042415] p-6 text-white sm:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl font-black tracking-tight sm:text-3xl leading-snug">
            Marketplace Updates &amp; Live Alerts
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Preview this signup experience. It does not submit or save email addresses.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-[#0c5c36]">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900">Preview Complete</h3>
                <p className="mt-1 text-xs text-slate-500">
                  This is a preview only. No email preferences were stored or sent.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onOpenEmailPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEmailPreview();
                    }}
                    className="w-full sm:w-auto rounded-xl border border-[#0c5c36] bg-emerald-50 px-4 py-2.5 text-xs font-black text-[#0c5c36]"
                  >
                    Open Email Studio
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl bg-[#0c5c36] px-6 py-2.5 text-xs font-black text-white"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative mt-1">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0c5c36] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Full Name (Optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#0c5c36] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Topics</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'flash-deals', label: 'Daily Deals' },
                    { id: 'livestreams', label: 'Livestreams' },
                    { id: 'tech', label: 'Electronics' },
                    { id: 'fashion', label: 'Fashion' },
                  ].map((item) => {
                    const active = preferences.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => togglePref(item.id)}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition text-left ${
                          active ? 'border-[#0c5c36] bg-emerald-50/60 text-[#0c5c36]' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c5c36] py-3 text-xs font-black text-white shadow-md hover:bg-emerald-900 transition"
              >
                <span>Preview Signup</span>
                <ArrowRight size={15} />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck size={13} className="text-emerald-700" />
                <span>Preview only. No data is submitted.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
