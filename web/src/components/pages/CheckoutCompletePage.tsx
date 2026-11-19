import WorkflowBanner from '../ui/WorkflowBanner';
import React from 'react';
import { Order } from '../../types';
import { CheckCircle2, Package, Truck, ArrowRight } from 'lucide-react';

interface CheckoutCompletePageProps {
  order: Order | null;
  onGoToOrders: () => void;
  onContinueShopping: () => void;
  onTrackOrder: (trackingNumber: string) => void;
}

export default function CheckoutCompletePage({
  order,
  onGoToOrders,
  onContinueShopping,
  onTrackOrder,
}: CheckoutCompletePageProps) {
  if (!order) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <Package size={44} className="mx-auto text-slate-300" />
        <h1 className="text-xl font-black text-slate-900">Order unavailable</h1>
        <p className="text-xs text-slate-500">
          View your account order history or continue browsing products.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onGoToOrders}
            className="rounded-xl bg-[#0c5c36] px-5 py-2.5 text-xs font-black text-white"
          >
            View My Orders
          </button>
          <button
            onClick={onContinueShopping}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700"
          >
            Browse Shop
          </button>
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered';

  return (
    <div className="cnc-flow-page mx-auto max-w-3xl space-y-4 pb-16">
      <WorkflowBanner
        title={isPaid ? 'Order Confirmed' : 'Order Created & Inventory Reserved'}
        description={isPaid
          ? 'Thank you for shopping with Cash N Carry Nigeria.'
          : 'Your inventory reservation is saved with status awaiting_payment. Online payment capture is currently offline.'}
        icon={isPaid ? CheckCircle2 : Package}
      />
      <div className="cnc-flow-card rounded-2xl border px-4 py-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 break-all text-sm">
          <div>
            <span className="text-slate-400">Order ID: </span>
            <span className="font-mono font-black text-slate-900">{order.id}</span>
          </div>
          <div>
            <span className="text-slate-400">Status: </span>
            <span className="font-mono font-bold uppercase text-amber-800">{order.status}</span>
          </div>
          {order.flutterwaveRef && (
            <div>
              <span className="text-slate-400">Payment Ref: </span>
              <span className="font-mono font-bold text-emerald-800">{order.flutterwaveRef}</span>
            </div>
          )}
        </div>
      </div>

      <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Truck size={18} className="text-[#0c5c36]" />
          <span>Delivery Details</span>
        </div>

        <div className="rounded-2xl bg-emerald-50/50 p-4 border border-emerald-100 text-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Destination:</span>
            <span className="font-bold text-slate-900 text-right">
              {order.address.line || 'Saved delivery address'}
              {order.address.city ? `, ${order.address.city}` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Recipient:</span>
            <span className="font-bold text-slate-900">
              {order.address.recipient || order.buyerName}
              {order.address.phone ? ` (${order.address.phone})` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Carrier:</span>
            <span className="font-bold text-[#0c5c36]">{order.carrier || 'Pending fulfillment'}</span>
          </div>
          {order.trackingNumber && (
            <div className="flex items-center justify-between pt-1 border-t border-emerald-100">
              <span className="text-slate-500">Tracking Code:</span>
              <span className="font-mono font-black text-slate-900">{order.trackingNumber}</span>
            </div>
          )}
        </div>

        {order.trackingNumber && (
          <button
            onClick={() => onTrackOrder(order.trackingNumber!)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 py-3 text-xs font-bold text-white hover:bg-emerald-900 transition"
          >
            <Truck size={14} />
            <span>View Shipment Status</span>
          </button>
        )}
      </div>

      <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-900">Order items</h3>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-12 w-12 rounded-xl object-cover border border-slate-100" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                  <div className="text-[11px] text-slate-400">
                    Qty: {item.quantity} {item.sellerName ? `· Seller: ${item.sellerName}` : ''}
                  </div>
                </div>
              </div>
              <div className="text-xs font-black text-slate-900">
                ₦{(item.price * item.quantity).toLocaleString('en-NG')}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-black text-slate-900">
          <span>{isPaid ? 'Amount Paid (NGN):' : 'Order Total (awaiting_payment):'}</span>
          <span className={isPaid ? 'text-[#0c5c36]' : 'text-amber-800'}>₦{order.total.toLocaleString('en-NG')}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onGoToOrders}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 transition shadow-md"
        >
          <Package size={16} />
          <span>View in Order History</span>
        </button>

        <button
          onClick={onContinueShopping}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          <span>Continue Shopping</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
