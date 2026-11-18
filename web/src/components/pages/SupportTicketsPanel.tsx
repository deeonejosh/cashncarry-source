import React, { useCallback, useEffect, useState } from 'react';
import { api, type ApiSupportDetail, type ApiSupportTicket } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { Headphones, Plus, RefreshCw, Send, AlertTriangle } from 'lucide-react';

const categories: Array<{ value: ApiSupportTicket['category']; label: string }> = [
  { value: 'general', label: 'General enquiry' },
  { value: 'order', label: 'Order' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'product', label: 'Product' },
  { value: 'account', label: 'Account' },
  { value: 'technical', label: 'Technical issue' },
];
const dateLabel = (value: number) => value
  ? new Date(value * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function SupportTicketsPanel() {
  const { showToast, currentUser } = useStore();
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);
  const [detail, setDetail] = useState<ApiSupportDetail | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<ApiSupportTicket['category']>('general');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const res = await api.listSupportTickets();
    if (res.ok) {
      setTickets(res.data?.tickets || []);
      setError('');
    } else {
      setError(res.error || 'Support inbox temporarily unavailable.');
    }
    setLoading(false);
  }, []);

  const openTicket = useCallback(async (id: string) => {
    setSelectedId(id);
    const res = await api.getSupportTicket(id);
    if (res.ok && res.data) {
      setDetail(res.data);
      setError('');
    } else {
      setDetail(null);
      setError(res.error || 'Could not load this ticket.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !subject.trim() || !message.trim()) return;
    setBusy(true);
    const res = await api.createSupportTicket({
      subject: subject.trim(),
      category,
      message: message.trim(),
      ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
    });
    setBusy(false);
    if (!res.ok || !res.data?.ticket?.id) {
      showToast(res.error || 'Could not create support ticket.', 'error');
      return;
    }
    setCreating(false);
    setSubject('');
    setCategory('general');
    setOrderId('');
    setMessage('');
    showToast('Support ticket created.', 'success');
    await refresh();
    await openTicket(res.data.ticket.id);
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reply.trim() || busy) return;
    setBusy(true);
    const result = await api.replySupportTicket(selectedId, reply.trim());
    setBusy(false);
    if (!result.ok) {
      showToast(result.error || 'Could not send reply.', 'error');
      return;
    }
    setReply('');
    await Promise.all([openTicket(selectedId), refresh()]);
  };

  const escalate = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    const result = await api.updateSupportTicket(selectedId, { action: 'escalate' });
    setBusy(false);
    if (!result.ok) {
      showToast(result.error || 'Could not escalate ticket.', 'error');
      return;
    }
    showToast('Ticket escalated for human review.', 'success');
    await Promise.all([openTicket(selectedId), refresh()]);
  };

  return (
    <section className="space-y-4" aria-label="Customer support tickets">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <Headphones size={20} /> Customer Support
          </h2>
          <p className="text-xs text-slate-500">
            Secure tickets for buyers and sellers. Our team reviews and replies to your messages.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void refresh()}
            aria-label="Refresh support tickets"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} />
          </button>
          <button type="button" onClick={() => { setCreating((v) => !v); setDetail(null); }}
            className="flex items-center gap-2 rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900">
            <Plus size={15} /> New Ticket
          </button>
        </div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        <AlertTriangle size={16} /> {error}
      </div>}

      {creating && <form onSubmit={(e) => void createTicket(e)}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="support-subject" className="block pb-1 text-xs font-bold">Subject</label>
          <input id="support-subject" required minLength={3} maxLength={160}
            value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
        </div>
        <div>
          <label htmlFor="support-category" className="block pb-1 text-xs font-bold">Category</label>
          <select id="support-category" value={category}
            onChange={(e) => setCategory(e.target.value as ApiSupportTicket['category'])}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="support-order" className="block pb-1 text-xs font-bold">Order ID (optional)</label>
          <input id="support-order" maxLength={128} value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Only an order linked to your account"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="support-message" className="block pb-1 text-xs font-bold">How can we help?</label>
          <textarea id="support-message" rows={4} maxLength={1600} required
            value={message} onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <p className="mt-1 text-[11px] text-slate-500">Never include passwords, card numbers or verification codes.</p>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy}
            className="rounded-xl bg-[#0c5c36] px-5 py-3 text-xs font-bold text-white disabled:opacity-50">
            {busy ? 'Creating…' : 'Send to Support'}
          </button>
        </div>
      </form>}

      <div className="grid min-h-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[minmax(230px,320px)_minmax(0,1fr)]">
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <h3 className="border-b border-slate-100 px-4 py-3 text-xs font-black uppercase text-slate-500">
            Your tickets
          </h3>
          {loading ? <p className="p-4 text-xs text-slate-500">Loading tickets…</p> :
            tickets.length === 0 ? <p className="p-4 text-xs text-slate-500">No tickets yet.</p> :
              tickets.map((ticket) => (
                <button type="button" key={ticket.id}
                  onClick={() => void openTicket(ticket.id)}
                  className={'block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-emerald-50 ' +
                    (selectedId === ticket.id ? 'bg-emerald-50' : '')}>
                  <span className="block truncate text-xs font-bold text-slate-900">{ticket.subject}</span>
                  <span className="mt-1 flex justify-between gap-2 text-[11px] text-slate-500">
                    <span className="capitalize">{ticket.status.replaceAll('_', ' ')}</span>
                    <span>{dateLabel(ticket.updated)}</span>
                  </span>
                </button>
              ))}
        </div>
        <div className="flex min-w-0 flex-col">
          {!detail ? <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
            Select a ticket to see its replies and status.
          </div> : <>
            <div className="space-y-1 border-b border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-900">{detail.ticket.subject}</h3>
              <p className="text-xs text-slate-500">
                {detail.ticket.status.replaceAll('_', ' ')} · {dateLabel(detail.ticket.created)}
              </p>
              {detail.linkedOrder && <p className="text-xs text-slate-600">
                Linked order: {detail.linkedOrder.id} · {detail.linkedOrder.status}
              </p>}
              {!['escalated', 'resolved'].includes(detail.ticket.status) && <button type="button"
                disabled={busy} onClick={() => void escalate()}
                className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                Request human escalation
              </button>}
            </div>
            <div className="max-h-[400px] min-h-[170px] flex-1 space-y-3 overflow-y-auto p-4">
              {detail.messages.map((item) => (
                <article key={item.id} className={'max-w-[90%] rounded-xl p-3 text-xs ' +
                  (item.author_id === currentUser.id ? 'ml-auto bg-emerald-50' : 'bg-slate-100')}>
                  <p className="whitespace-pre-wrap break-words">{item.body}</p>
                  <small className="mt-2 block text-slate-500">{dateLabel(item.created)}</small>
                </article>
              ))}
            </div>
            <form onSubmit={(e) => void sendReply(e)} className="flex flex-col gap-2 border-t border-slate-100 p-3 sm:flex-row">
              <label htmlFor="support-reply" className="sr-only">Reply to support</label>
              <textarea id="support-reply" rows={2} maxLength={1600} value={reply}
                onChange={(e) => setReply(e.target.value)} placeholder="Type your reply"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-xs" />
              <button type="submit" disabled={busy || !reply.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                <Send size={14} /> Send
              </button>
            </form>
          </>}
        </div>
      </div>
    </section>
  );
}
