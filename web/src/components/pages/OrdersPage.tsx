import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { Package, Truck, RotateCcw, CreditCard, AlertCircle } from 'lucide-react';

interface OrdersPageProps {
  onTrackOrder: (trackingNumber: string) => void;
  onOpenReturns: (order: Order) => void;
}

export default function OrdersPage({ onTrackOrder, onOpenReturns }: OrdersPageProps) {
  const { platformConfig, orders, ordersState, reloadMarketplace, cancelOrder } = useStore();
  const paymentsEnabled = platformConfig.paymentsEnabled;

  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'paid':
        return <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">Paid & Confirmed</span>;
      case 'awaiting_payment':
        return <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-800">Awaiting Payment</span>;
      case 'processing':
      case 'packed':
        return <span className="rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800 capitalize">{status}</span>;
      case 'shipped':
        return <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-800">In Transit</span>;
      case 'delivered':
        return <span className="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-bold text-teal-800">Delivered</span>;
      case 'cancelled':
        return <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-500">Cancelled</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">My Orders & Purchases</h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Track packages, manage reserved checkouts, and request returns.
        </p>
      </div>

      {!paymentsEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertCircle size={18} className="shrink-0 text-amber-700 mt-0.5" />
          <div>
            <div className="font-black">Online payments temporarily unavailable</div>
            <p className="text-amber-800 mt-0.5">
              Payment confirmation is disabled on this environment. You can view reserved orders and release reserved stock at any time.
            </p>
          </div>
        </div>
      )}

      {ordersState.status === 'error' && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between gap-3 text-xs text-rose-800">
          <span>{ordersState.error || 'Could not load your orders.'}</span>
          <button
            type="button"
            onClick={() => void reloadMarketplace()}
            className="rounded-xl bg-rose-700 px-4 py-2 font-bold text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex border-b border-slate-200 pb-2 gap-2 overflow-x-auto text-xs font-bold text-slate-600">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'awaiting_payment', label: 'Awaiting Payment' },
          { id: 'processing', label: 'Processing' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 transition ${
              filterStatus === tab.id
                ? 'bg-[#0c5c36] text-white shadow-sm'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package size={32} />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-800">No orders found</h3>
          <p className="mt-1 text-xs text-slate-500">
            You do not have any orders in this category yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4 text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-slate-400">Order ID: </span>
                    <span className="font-mono font-black text-slate-900">{order.id}</span>
                  </div>
                  {order.createdAt && (
                    <>
                      <span className="text-slate-300">·</span>
                      <div className="text-slate-500">
                        Placed: {new Date(order.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </>
                  )}
                </div>
                {getStatusBadge(order.status)}
              </div>

              <div className="p-5 space-y-4">
                <div className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover border border-slate-100" />
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                          <div className="text-[11px] text-slate-400">
                            {item.sellerName ? `Seller: ${item.sellerName} · ` : ''}Qty: {item.quantity}
                          </div>
                          <div className="text-xs font-black text-slate-800 mt-0.5">
                            ₦{item.price.toLocaleString('en-NG')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs font-black text-slate-900">
                        ₦{(item.price * item.quantity).toLocaleString('en-NG')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
                  <div className="text-slate-500 text-[11px]">
                    {order.address.line ? (
                      <span>
                        Delivery to: <b>{order.address.recipient || order.buyerName}</b> — {order.address.line}
                      </span>
                    ) : (
                      <span>Delivery address attached on server</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">Total: </span>
                    <span className="text-base font-black text-[#0c5c36]">
                      ₦{order.total.toLocaleString('en-NG')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  {order.status === 'awaiting_payment' && (
                    <>
                      <button
                        onClick={() => void cancelOrder(order.id)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 transition"
                      >
                        Cancel & Release Stock
                      </button>

                      {!paymentsEnabled && (
                        <span className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                          <CreditCard size={14} />
                          <span>Online Payment Offline</span>
                        </span>
                      )}
                    </>
                  )}

                  {order.trackingNumber && (
                    <button
                      onClick={() => onTrackOrder(order.trackingNumber!)}
                      className="flex items-center gap-1.5 rounded-xl border border-[#0c5c36] bg-emerald-50 px-4 py-2 text-xs font-bold text-[#0c5c36] hover:bg-emerald-100 transition"
                    >
                      <Truck size={14} />
                      <span>Track ({order.carrier || 'Carrier'})</span>
                    </button>
                  )}

                  {(order.status === 'delivered' || order.status === 'shipped' || order.status === 'paid') && (
                    <button
                      onClick={() => onOpenReturns(order)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      <RotateCcw size={14} />
                      <span>Request Return</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
