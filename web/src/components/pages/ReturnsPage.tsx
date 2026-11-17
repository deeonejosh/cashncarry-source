import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { RotateCcw, CheckCircle2, ArrowLeft } from 'lucide-react';

interface ReturnsPageProps {
  initialOrder?: Order | null;
  onBack: () => void;
}

export default function ReturnsPage({ initialOrder, onBack }: ReturnsPageProps) {
  const { orders, returns, submitReturnRequest, showToast } = useStore();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialOrder?.id || orders[0]?.id || ''
  );
  const [reason, setReason] = useState('Item arrived with damaged packaging');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      showToast('Select an order to request a return.', 'error');
      return;
    }
    const fullReason = comments.trim() ? `${reason}: ${comments.trim()}` : reason;
    setSubmitting(true);
    const res = await submitReturnRequest(selectedOrderId, fullReason);
    setSubmitting(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      showToast(res.error || 'Could not submit return request.', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0c5c36]"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
            <RotateCcw size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">7-Day Returns & Refunds</h1>
            <p className="text-xs text-slate-500">
              Cash N Carry Nigeria Buyer Protection & Return Resolution.
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-emerald-50 p-6 text-center space-y-3 border border-emerald-200">
            <CheckCircle2 size={36} className="mx-auto text-emerald-700" />
            <h3 className="text-base font-black text-emerald-900">Return Request Submitted</h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Your return request for order <b>{selectedOrderId}</b> has been saved for review.
            </p>
            <button
              onClick={onBack}
              className="mt-2 rounded-xl bg-[#0c5c36] px-5 py-2 text-xs font-bold text-white"
            >
              Back to Orders
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
            You do not have any orders eligible for a return request yet.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700">Select Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 bg-white font-mono font-bold"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} — Total: ₦{o.total.toLocaleString('en-NG')} ({o.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700">Reason for Return</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 bg-white font-bold"
              >
                <option>Item arrived with damaged packaging</option>
                <option>Received wrong item or size</option>
                <option>Item defective or not functioning as described</option>
                <option>Changed mind (within 7 days)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700">Additional Details</label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe the issue with the item received..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 transition shadow disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </button>
          </form>
        )}

        {returns.length > 0 && (
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-500">Submitted Return Requests</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {returns.map((ret) => (
                <div key={ret.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-slate-900">{ret.orderId}</div>
                    <div className="text-slate-600">{ret.reason}</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-800">
                    {ret.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
