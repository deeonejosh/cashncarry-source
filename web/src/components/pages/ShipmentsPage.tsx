import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Truck, Search, ShieldCheck, Package } from 'lucide-react';

interface ShipmentsPageProps {
  initialTracking?: string;
}

export default function ShipmentsPage({ initialTracking = '' }: ShipmentsPageProps) {
  const { orders, showToast } = useStore();
  const [searchTracking, setSearchTracking] = useState(initialTracking);
  const [activeQuery, setActiveQuery] = useState(initialTracking);

  const trackedOrders = useMemo(
    () => orders.filter((o) => Boolean(o.trackingNumber) || o.status === 'shipped' || o.status === 'delivered'),
    [orders]
  );

  const activeOrder = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    if (q) {
      return (
        orders.find(
          (o) =>
            (o.trackingNumber || '').toLowerCase() === q ||
            o.id.toLowerCase() === q
        ) || null
      );
    }
    return trackedOrders[0] || null;
  }, [orders, trackedOrders, activeQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTracking.trim();
    if (!q) return;
    const match = orders.find(
      (o) => (o.trackingNumber || '').toLowerCase() === q.toLowerCase() || o.id.toLowerCase() === q.toLowerCase()
    );
    if (!match) {
      showToast(`No shipment or order matching "${q}" found in your account.`, 'info');
    }
    setActiveQuery(q);
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="rounded-3xl bg-[#0c5c36] p-8 text-white shadow-lg space-y-4">
        <div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            ORDER & LOGISTICS TRACKING
          </span>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Tracking</h1>
          <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
            Track dispatched orders.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-xl flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchTracking}
              onChange={(e) => setSearchTracking(e.target.value)}
              placeholder="Enter order ID or tracking number..."
              className="h-11 w-full rounded-2xl bg-white pl-10 pr-4 text-xs font-mono font-bold text-slate-900 outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-orange-700 px-5 text-xs font-black text-white hover:bg-orange-800 shadow"
          >
            Track
          </button>
        </form>
      </div>

      {activeOrder ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Order & Tracking</div>
                <div className="font-mono text-lg font-black text-slate-900">
                  {activeOrder.trackingNumber || activeOrder.id}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase">
                  {activeOrder.status}
                </span>
                {activeOrder.carrier && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {activeOrder.carrier}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <b>Order Reference:</b> <span className="font-mono">{activeOrder.id}</span>
              </div>
              <div>
                <b>Destination:</b> {activeOrder.address.line || 'Saved buyer address'}
                {activeOrder.address.city ? `, ${activeOrder.address.city}` : ''}
              </div>
              <div>
                <b>Courier:</b> {activeOrder.carrier || 'Pending courier assignment'}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              Delivery Protection
            </h3>
            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <ShieldCheck size={16} className="text-emerald-700" />
                <span>Verified Order Tracking</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Tracking numbers appear here as soon as the approved seller dispatches your order.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center space-y-2">
          <Package size={30} className="mx-auto text-slate-300" />
          <p className="text-sm font-black text-slate-800">No active shipment tracking records found</p>
          <p className="text-xs text-slate-500">
            Dispatched orders with tracking codes will appear here.
          </p>
        </div>
      )}

      {trackedOrders.length > 1 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
          <h3 className="text-xs font-black uppercase text-slate-500">Your Shipped Orders</h3>
          <div className="flex flex-wrap gap-2">
            {trackedOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  const val = o.trackingNumber || o.id;
                  setSearchTracking(val);
                  setActiveQuery(val);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 hover:border-[#0c5c36]"
              >
                <Truck size={13} className="text-[#0c5c36]" />
                <span>{o.trackingNumber || o.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
