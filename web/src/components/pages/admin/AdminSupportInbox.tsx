import React, { useCallback, useEffect, useState } from 'react';
import { api, type ApiSupportDetail, type ApiSupportTicket } from '../../../lib/api';
import { useStore } from '../../../context/StoreContext';
import { Headphones, RefreshCw, Send, ShieldAlert, FileText } from 'lucide-react';

const availableStatuses: ApiSupportTicket['status'][] = [
  'open', 'in_progress', 'waiting_for_customer', 'escalated', 'resolved',
];
const label = (status: string) => status.replaceAll('_', ' ');
const formatTime = (seconds: number) => seconds
  ? new Date(seconds * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function AdminSupportInbox() {
  const { showToast } = useStore();
  const [tickets, setTickets] = useState<ApiSupportTicket[]>([]);
  const [detail, setDetail] = useState<ApiSupportDetail | null>(null);
  const [selected, setSelected] = useState('');
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await api.listSupportTickets(statusFilter
      ? statusFilter as ApiSupportTicket['status'] : undefined);
    if (!res.ok) setError(res.error || 'Could not load support tickets.');
    else { setTickets(res.data?.tickets || []); setError(''); }
    setLoading(false);
  }, [statusFilter]);

  const openTicket = useCallback(async (id: string) => {
    setSelected(id);
    const res = await api.getSupportTicket(id);
    if (res.ok && res.data) {
      setDetail(res.data);
      setError('');
    } else {
      setDetail(null);
      setError(res.error || 'Could not retrieve this ticket.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const updateTicket = async (
    patch: { status?: ApiSupportTicket['status']; priority?: ApiSupportTicket['priority'] }
  ) => {
    if (!selected || busy) return;
    setBusy(true);
    const res = await api.updateSupportTicket(selected, patch);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error || 'Unable to update ticket.', 'error');
      return;
    }
    await Promise.all([openTicket(selected), refresh()]);
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim() || busy) return;
    setBusy(true);
    const res = await api.replySupportTicket(selected, reply.trim(), internalNote);
    setBusy(false);
    if (!res.ok) {
      showToast(res.error || 'Could not add support message.', 'error');
      return;
    }
    setReply('');
    setInternalNote(false);
    await Promise.all([openTicket(selected), refresh()]);
  };

  const suggestReply = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const res = await api.getSupportReplyTemplates(selected);
    setBusy(false);
    if (!res.ok || !res.data?.suggestions?.length) {
      showToast(res.error || 'Reply template unavailable.', 'error');
      return;
    }
    setReply(res.data.suggestions[0]);
    showToast('Editable template inserted. Review before sending.', 'info');
  };

  return (
    <section aria-label="Admin customer support inbox" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Headphones size={18} /> Customer Support Inbox
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Owner-only triage, authorised order summaries, private notes and human escalation.
          </p>
        </div>
        <button type="button" onClick={() => void refresh()}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label htmlFor="support-admin-filter" className="font-semibold text-slate-700">Status</label>
        <select id="support-admin-filter" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <option value="">All tickets</option>
          {availableStatuses.map((s) => <option value={s} key={s} className="capitalize">{label(s)}</option>)}
        </select>
        <span className="text-slate-500">{tickets.length} tickets</span>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <div className="grid min-h-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[minmax(240px,340px)_minmax(0,1fr)]">
        <div className="max-h-[570px] overflow-y-auto border-b border-slate-200 lg:border-b-0 lg:border-r">
          {loading ? <p className="p-4 text-xs">Loading support tickets…</p>
            : tickets.length === 0 ? <p className="p-4 text-xs text-slate-500">No tickets match this filter.</p>
            : tickets.map((ticket) => (
              <button type="button" onClick={() => void openTicket(ticket.id)} key={ticket.id}
                className={'block w-full border-b border-slate-100 p-4 text-left hover:bg-emerald-50 ' +
                  (selected === ticket.id ? 'bg-emerald-50' : '')}>
                <span className="block truncate text-xs font-black text-slate-900">{ticket.subject}</span>
                <span className="mt-1 block truncate text-[11px] text-slate-600">{ticket.requester_email || ticket.requester_id}</span>
                <span className="mt-1 flex justify-between gap-1 text-[11px] text-slate-500">
                  <span className="capitalize">{label(ticket.status)}</span>
                  <span>{formatTime(ticket.updated)}</span>
                </span>
              </button>
            ))}
        </div>
        <div className="flex min-w-0 flex-col">
          {!detail ? <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
            Select a customer ticket to review it.
          </div> : <>
            <div className="space-y-3 border-b border-slate-100 p-4">
              <h4 className="text-sm font-black text-slate-900">{detail.ticket.subject}</h4>
              <p className="text-xs capitalize text-slate-500">
                {detail.ticket.category} · {formatTime(detail.ticket.created)}
              </p>
              {detail.linkedOrder && <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                <FileText className="mr-1 inline-block" size={15} />
                Order {detail.linkedOrder.id}: {detail.linkedOrder.status}
                {' · '}Payment {detail.linkedOrder.payment_state}
              </div>}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label htmlFor="support-owner-status" className="font-semibold">Status</label>
                <select id="support-owner-status" value={detail.ticket.status}
                  disabled={busy}
                  onChange={(e) => void updateTicket({ status: e.target.value as ApiSupportTicket['status'] })}
                  className="rounded-lg border border-slate-200 bg-white p-2 capitalize">
                  {availableStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                <label htmlFor="support-owner-priority" className="font-semibold">Priority</label>
                <select id="support-owner-priority" value={detail.ticket.priority}
                  disabled={busy}
                  onChange={(e) => void updateTicket({ priority: e.target.value as ApiSupportTicket['priority'] })}
                  className="rounded-lg border border-slate-200 bg-white p-2">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="min-h-[140px] max-h-[370px] flex-1 space-y-3 overflow-y-auto p-4">
              {detail.messages.map((item) => (
                <article key={item.id} className={
                  'rounded-xl p-3 text-xs ' +
                  (item.internal ? 'border border-amber-200 bg-amber-50'
                    : item.author_id === detail.ticket.requester_id ? 'bg-slate-50' : 'bg-emerald-50')
                }>
                  <p className="mb-1 font-bold text-slate-600">
                    {item.internal ? 'Private admin note' :
                      item.author_id === detail.ticket.requester_id ? 'Customer' : 'Support team'}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-slate-800">{item.body}</p>
                  <span className="mt-1 block text-[10px] text-slate-500">{formatTime(item.created)}</span>
                </article>
              ))}
            </div>
            <div className="space-y-2 border-t border-slate-100 p-4">
              <p className="flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldAlert size={14} className="shrink-0" />
                AI reply generation is not configured. Templates are not AI-generated and never send automatically.
              </p>
              <button type="button" onClick={() => void suggestReply()} disabled={busy}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                Insert editable reply template
              </button>
              <form onSubmit={(e) => void sendReply(e)} className="space-y-2">
                <label htmlFor="support-admin-reply" className="sr-only">Support reply</label>
                <textarea id="support-admin-reply" rows={3} maxLength={1600} value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a personal response to this customer"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={internalNote}
                      onChange={(e) => setInternalNote(e.target.checked)} /> Internal note (not visible to customer)
                  </label>
                  <button type="submit" disabled={busy || !reply.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#0c5c36] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                    <Send size={14} /> {internalNote ? 'Save Private Note' : 'Send Reply'}
                  </button>
                </div>
              </form>
            </div>
          </>}
        </div>
      </div>
    </section>
  );
}
