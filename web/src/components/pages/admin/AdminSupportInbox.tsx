import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ApiSupportDetail, type ApiSupportTicket } from '../../../lib/api';
import { useStore } from '../../../context/StoreContext';
import { Headphones, RefreshCw, Send, Lock, Package, MessagesSquare } from 'lucide-react';

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
  const [listError, setListError] = useState('');
  const [threadError, setThreadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef(0);
  const listRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++listRequest.current;
    setLoading(true);
    const res = await api.listSupportTickets(statusFilter
      ? statusFilter as ApiSupportTicket['status'] : undefined);
    if (request !== listRequest.current) return;
    setListError(res.ok ? '' : res.error || 'Could not load support tickets.');
    if (res.ok) setTickets(res.data?.tickets || []);
    setLoading(false);
  }, [statusFilter]);

  const openTicket = useCallback(async (id: string) => {
    const request = ++detailRequest.current;
    setDetailLoading(true);
    const res = await api.getSupportTicket(id);
    if (request !== detailRequest.current) return;
    setDetailLoading(false);
    if (res.ok && res.data) {
      setDetail(res.data);
      setThreadError('');
    } else {
      setDetail(null);
      setThreadError(res.error || 'Could not retrieve this ticket.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const updateTicket = async (
    patch: { status?: ApiSupportTicket['status']; priority?: ApiSupportTicket['priority'] }
  ) => {
    if (!selected || busy) return;
    setBusy(true);
    const res = await api.updateSupportTicket(selected, patch);
    if (!res.ok) {
      setBusy(false);
      showToast(res.error || 'Unable to update ticket.', 'error');
      return;
    }
    await Promise.all([openTicket(selected), refresh()]);
    setBusy(false);
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim() || busy) return;
    setBusy(true);
    const res = await api.replySupportTicket(selected, reply.trim(), internalNote);
    if (!res.ok) {
      setBusy(false);
      showToast(res.error || 'Could not add support message.', 'error');
      return;
    }
    setReply('');
    setInternalNote(false);
    await Promise.all([openTicket(selected), refresh()]);
    setBusy(false);
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

  const chooseTicket = (id: string) => {
    if (id === selected && detail) return;
    setSelected(id);
    setDetail(null);
    setReply('');
    setInternalNote(false);
    setThreadError('');
    void openTicket(id);
  };

  return (
    <section aria-label="Admin customer support inbox" className="cnc-admin-support">
      <div className="cnc-admin-split">
        <div className="cnc-admin-panel">
          <div className="cnc-admin-panel-title">
            <div><h2>Support Inbox</h2><p>Customer messages and inquiries</p></div>
            <button type="button" className="cnc-admin-button" onClick={() => {
              void refresh();
              if (selected) void openTicket(selected);
            }} disabled={loading || busy || detailLoading}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
          </div>
          <label className="cnc-admin-field cnc-admin-filter">
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={busy}>
              <option value="">All statuses</option>
              {availableStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}
            </select>
          </label>
          {listError && <p role="alert" className="cnc-admin-error">{listError}</p>}
          <div className="cnc-admin-queue" aria-busy={loading}>
            {loading ? <p role="status" className="cnc-admin-empty">Loading support tickets…</p>
              : tickets.length === 0 ? <p className="cnc-admin-empty">No tickets match this filter.</p>
              : tickets.map((ticket) => (
                <button type="button" onClick={() => chooseTicket(ticket.id)} key={ticket.id}
                  aria-pressed={selected === ticket.id} disabled={busy}>
                  <MessagesSquare size={18} aria-hidden="true" />
                  <span className="cnc-admin-queue-name">
                    <strong>{ticket.subject}</strong>
                    <small>{ticket.requester_email || ticket.requester_id}</small>
                    <small>{formatTime(ticket.updated)}</small>
                  </span>
                  <span className="cnc-admin-status" data-status={ticket.status}>{label(ticket.status)}</span>
                </button>
              ))}
          </div>
        </div>

        <div className="cnc-admin-panel cnc-admin-thread" aria-busy={detailLoading}>
          {threadError && <p role="alert" className="cnc-admin-error">{threadError}</p>}
          {detailLoading ? <p role="status" className="cnc-admin-empty">Loading conversation…</p>
            : !detail ? <div className="cnc-admin-empty">
              <Headphones size={28} aria-hidden="true" />
              Select a customer ticket to review it.
            </div> : <>
              <div className="cnc-admin-panel-title">
                <div>
                  <h2>{detail.ticket.subject}</h2>
                  <p>Ticket #{detail.ticket.id} · {detail.ticket.requester_email || detail.ticket.requester_id} · {formatTime(detail.ticket.created)}</p>
                </div>
              </div>
              <div className="cnc-admin-order">
                {detail.linkedOrder && <div className="cnc-admin-linked-order">
                  <span className="cnc-admin-emblem"><Package size={20} aria-hidden="true" /></span>
                  <div>
                    <strong>Linked Order #{detail.linkedOrder.id}</strong>
                    <p>{detail.linkedOrder.status} · Payment {detail.linkedOrder.payment_state}</p>
                  </div>
                </div>}
                <label className="cnc-admin-field">
                  Status
                  <select value={detail.ticket.status} disabled={busy}
                    onChange={(e) => void updateTicket({ status: e.target.value as ApiSupportTicket['status'] })}>
                    {availableStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                  </select>
                </label>
                <label className="cnc-admin-field">
                  Priority
                  <select value={detail.ticket.priority} disabled={busy}
                    onChange={(e) => void updateTicket({ priority: e.target.value as ApiSupportTicket['priority'] })}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
              <h3>Conversation</h3>
              <div className="cnc-admin-messages">
                {detail.messages.map((item) => {
                  const customer = item.author_id === detail.ticket.requester_id;
                  return (
                    <article key={item.id} className="cnc-admin-message" data-kind={item.internal ? 'private' : customer ? 'customer' : 'support'}>
                      <header>
                        <strong>{item.internal ? <><Lock size={14} aria-hidden="true" /> Private admin note</> : customer ? 'Customer' : 'Cash N Carry Support'}</strong>
                        <span>{formatTime(item.created)}</span>
                      </header>
                      <p>{item.body}</p>
                    </article>
                  );
                })}
              </div>
              <form onSubmit={(e) => void sendReply(e)} className="cnc-admin-compose">
                <h3>{internalNote ? 'Write a Private Note' : 'Reply to Customer'}</h3>
                <div className="cnc-admin-actions">
                  <button type="button" onClick={() => void suggestReply()} disabled={busy} className="cnc-admin-button">
                    Insert editable reply template
                  </button>
                  <label className="cnc-admin-check">
                    <input type="checkbox" checked={internalNote} disabled={busy}
                      onChange={(e) => setInternalNote(e.target.checked)} />
                    Internal note (visible to admins only)
                  </label>
                </div>
                <label className="cnc-admin-field">
                  <span className="sr-only">{internalNote ? 'Private note' : 'Support reply'}</span>
                  <textarea rows={4} maxLength={1600} value={reply} disabled={busy}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={internalNote ? 'Write an internal note' : 'Type your reply to the customer'} />
                </label>
                <button type="submit" disabled={busy || !reply.trim()} className="cnc-admin-button cnc-admin-primary">
                  <Send size={16} aria-hidden="true" /> {internalNote ? 'Save Private Note' : 'Send Reply'}
                </button>
              </form>
            </>}
        </div>
      </div>
    </section>
  );
}
