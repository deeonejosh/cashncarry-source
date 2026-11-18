import React from 'react';
import { useStore } from '../../../context/StoreContext';
import { Building2, AlertTriangle, Lock } from 'lucide-react';

export default function SellerSettlementsPage() {
  const { sellerOrders, platformConfig } = useStore();
  const paymentsEnabled = platformConfig.paymentsEnabled;

  const paidOrders = sellerOrders.filter(
    (o) => ['paid', 'processing', 'packed', 'shipped', 'delivered'].includes(o.status)
  );

  const totalEarned = paidOrders.reduce((acc, o) => acc + o.total, 0);
  const platformFee = Math.round(totalEarned * 0.05);
  const netPayable = totalEarned - platformFee;

  return (
    <div className="space-y-8 pb-16">
      {!paymentsEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle size={18} className="shrink-0 text-amber-700 mt-0.5" />
          <div>
            <div className="font-black">Financial settlements temporarily unavailable</div>
            <p className="text-amber-800 mt-0.5">
              Automated escrow capture and bank payouts are disabled while payment processor keys are offline. Totals below reflect real database orders for your storefront.
            </p>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Settlements</h1>
        <p className="mt-1 text-xs text-slate-500">
          View earnings and payout status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Paid Order Volume</div>
          <div className="text-2xl font-black text-slate-900">₦{totalEarned.toLocaleString('en-NG')}</div>
          <div className="text-[11px] text-slate-400">Calculated from real orders</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400">Estimated Platform Commission (5%)</div>
          <div className="text-2xl font-black text-slate-500">₦{platformFee.toLocaleString('en-NG')}</div>
          <div className="text-[11px] text-slate-400">Marketplace service fee</div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm space-y-1">
          <div className="text-xs font-bold text-emerald-800">Estimated Net Earnings</div>
          <div className="text-2xl font-black text-[#0c5c36]">₦{netPayable.toLocaleString('en-NG')}</div>
          <div className="text-[11px] text-emerald-700">
            Automated payouts are unavailable.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            <Building2 size={18} className="text-[#0c5c36]" />
            <span>Payout Bank Account</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600">
            Bank account verification and automated NUBAN payouts are unavailable in this environment.
          </div>

          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-200 py-3.5 text-xs font-black text-slate-500 cursor-not-allowed"
          >
            <Lock size={15} />
            <span>Payouts Disabled</span>
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Paid Order Ledger</h3>
            <span className="text-xs text-slate-400">{paidOrders.length} Orders</span>
          </div>

          {paidOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No paid orders yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {paidOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-mono font-bold text-slate-900">{o.id}</div>
                    <div className="text-[11px] text-slate-400">
                      Buyer: {o.buyerName || o.buyerEmail} · {o.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-[#0c5c36]">₦{o.total.toLocaleString('en-NG')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
