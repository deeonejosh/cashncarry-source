import DepthArtwork from '../../ui/DepthArtwork';
import React, { useState } from 'react';
import { useStore } from '../../../context/StoreContext';
import { ShoppingBag, Truck, CheckCircle2 } from 'lucide-react';

export default function SellerOrdersPage() {
  const { sellerOrders, updateSellerOrderStatus, showToast } = useStore();

  const [dispatchingOrderId, setDispatchingOrderId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<'processing' | 'packed' | 'shipped' | 'delivered'>('shipped');
  const [carrier, setCarrier] = useState('GIG Logistics');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchingOrderId) return;
    if (nextStatus === 'shipped' && !trackingNumber.trim()) {
      showToast('Enter a courier waybill/tracking number when marking an order shipped.', 'error');
      return;
    }
    setUpdating(true);
    const res = await updateSellerOrderStatus(dispatchingOrderId, nextStatus, carrier, trackingNumber.trim());
    setUpdating(false);
    if (res.ok) {
      setDispatchingOrderId(null);
      setTrackingNumber('');
    } else {
      showToast(res.error || 'Could not update order status.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="cnc-depth-banner cnc-depth-light-banner border-b border-slate-200 pb-4">
        <DepthArtwork icon={ShoppingBag} />
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Orders</h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage fulfilment and tracking.
        </p>
      </div>

      <div className="space-y-4">
        {sellerOrders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
            No customer orders received yet.
          </div>
        ) : (
          sellerOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs">
                <div>
                  <span className="text-slate-400">Order Ref: </span>
                  <span className="font-mono font-black text-slate-900">{order.id}</span>
                  {order.createdAt && (
                    <span className="text-slate-400 ml-2">· {new Date(order.createdAt).toLocaleDateString()}</span>
                  )}
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 uppercase text-[10px]">
                  {order.status}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400">Qty: {item.quantity}</div>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      ₦{(item.price * item.quantity).toLocaleString('en-NG')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                <div className="text-slate-500 text-[11px]">
                  {order.address.line ? (
                    <>
                      <span>Ship To: </span>
                      <b className="text-slate-800">{order.address.recipient}</b> — {order.address.line}, {order.address.city}
                    </>
                  ) : (
                    <span>Buyer: {order.buyerName || order.buyerEmail}</span>
                  )}
                </div>

                <div>
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <button
                      onClick={() => {
                        setDispatchingOrderId(order.id);
                        setNextStatus(order.status === 'shipped' ? 'delivered' : 'shipped');
                        setTrackingNumber(order.trackingNumber || '');
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-[#0c5c36] px-4 py-2 font-black text-white hover:bg-emerald-900 transition shadow"
                    >
                      <Truck size={14} />
                      <span>Update Fulfillment</span>
                    </button>
                  )}
                  {order.trackingNumber && (
                    <div className="mt-1 flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                      <CheckCircle2 size={14} />
                      <span>{order.carrier || 'Carrier'}: {order.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {dispatchingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Update Order {dispatchingOrderId}</h3>
              <button onClick={() => setDispatchingOrderId(null)}>✕</button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700">Fulfillment Stage</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as 'processing' | 'packed' | 'shipped' | 'delivered')}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold bg-white"
                >
                  <option value="processing">Processing</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Courier Partner</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-bold bg-white"
                >
                  <option>GIG Logistics</option>
                  <option>Kwik Delivery</option>
                  <option>DHL Express Nigeria</option>
                  <option>Red Star Express</option>
                  <option>Self Dispatch</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Waybill / Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter courier tracking code"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full rounded-2xl bg-[#0c5c36] py-3 text-xs font-black text-white hover:bg-emerald-900 transition disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Save Fulfillment Status'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
