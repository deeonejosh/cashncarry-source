import React, { useState } from 'react';
import { Order } from '../../types';
import { useStore } from '../../context/StoreContext';
import { ShieldCheck, Lock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';

interface FlutterwaveModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string, txRef: string) => void;
}

export default function FlutterwaveModal({ order, isOpen, onClose }: FlutterwaveModalProps) {
  const { platformConfig } = useStore();
  const paymentsEnabled = platformConfig.paymentsEnabled;
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInitialize = async () => {
    if (!paymentsEnabled) {
      setErrorMessage('Online payments are currently disabled on this server.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    const res = await api.initializePayment(order.id);
    setIsProcessing(false);
    if (res.checkout_url) {
      setCheckoutUrl(res.checkout_url);
    } else {
      setErrorMessage(res.error || 'Online payments are currently unavailable.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0c5c36] p-5 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">
              {paymentsEnabled ? 'Secure Checkout' : 'Payments Unavailable'}
            </div>
            <h3 className="text-sm font-black">Cash N Carry Nigeria</h3>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-emerald-200">Order: {order.id}</div>
            <div className="text-base font-black">₦{order.total.toLocaleString('en-NG')}</div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!paymentsEnabled && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-700" />
              <div>
                <div className="font-black">Online payments are disabled</div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  No simulated card, bank transfer, or USSD payments are accepted. Your order remains saved as awaiting_payment.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900"
            >
              <ExternalLink size={15} />
              <span>Continue to Payment Provider</span>
            </a>
          ) : (
            <button
              type="button"
              disabled={!paymentsEnabled || isProcessing}
              onClick={() => void handleInitialize()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              <span>{paymentsEnabled ? 'Initialize Payment' : 'Payments Temporarily Unavailable'}</span>
            </button>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-emerald-700" />
              <span>Verified Gateway Integration Required</span>
            </span>
            <button onClick={onClose} className="font-bold text-slate-600 hover:text-slate-900">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
