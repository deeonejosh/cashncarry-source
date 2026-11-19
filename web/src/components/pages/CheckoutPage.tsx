import WorkflowBanner from '../ui/WorkflowBanner';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { NIGERIAN_STATES } from '../../lib/design-tokens';
import { Order } from '../../types';
import {
  ShieldCheck,
  MapPin,
  Plus,
  ShoppingBag,
  CreditCard,
  Lock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface CheckoutPageProps {
  onSuccessOrder: (order: Order) => void;
  onBackToCart: () => void;
}

export default function CheckoutPage({ onSuccessOrder, onBackToCart }: CheckoutPageProps) {
  const {
    platformConfig,
    cart,
    addresses,
    addAddress,
    placeOrder,
    showToast,
  } = useStore();
  const paymentsEnabled = platformConfig.paymentsEnabled;

  const [selectedAddressId, setSelectedAddressId] = useState<string>(addresses[0]?.id || '');

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLine, setNewLine] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('Lagos');
  const [submitting, setSubmitting] = useState(false);

  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  // Staging has no shipping quote API; never represent an unverified delivery fee as free.
  const estimatedSubtotal = cartSubtotal;

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipient.trim() || !newLine.trim() || !newCity.trim()) {
      showToast('Please fill out recipient, street address, and city.', 'error');
      return;
    }
    const created = await addAddress({
      recipient: newRecipient.trim(),
      phone: newPhone.trim(),
      line: newLine.trim(),
      city: newCity.trim(),
      state: newState,
    });
    if (created) {
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
      setNewRecipient('');
      setNewPhone('');
      setNewLine('');
      setNewCity('');
    }
  };

  const handleInitiateOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select or add a delivery address first.', 'error');
      return;
    }
    setSubmitting(true);
    const order = await placeOrder(selectedAddressId);
    setSubmitting(false);
    if (order) {
      onSuccessOrder(order);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag size={48} className="text-slate-300" />
        <h2 className="mt-4 text-lg font-black text-slate-800">Cart is empty</h2>
        <button
          onClick={onBackToCart}
          className="mt-5 rounded-full bg-[#0c5c36] px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-900"
        >
          Return to Cart
        </button>
      </div>
    );
  }

  return (
    <div className="cnc-flow-page space-y-5 pb-16">
      <WorkflowBanner title="Checkout" description="Choose a delivery address and review your order." icon={ShoppingBag} />
      {!paymentsEnabled && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-700" />
          <div>
            <div className="font-black text-sm">Online Payments Temporarily Unavailable</div>
            <p className="mt-0.5 text-amber-800">
              Online card and bank transfer settlement is currently disabled on this server. You can create a reserved
              unpaid order (<code className="font-mono">awaiting_payment</code>) to hold inventory while payment integration
              is offline.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left 2 Cols: Delivery Address & Payment Status */}
        <div className="min-w-0 space-y-4">
          <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <MapPin size={18} className="text-[#0c5c36]" />
                <span>1. Select Delivery Address</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                className="flex items-center gap-1 text-xs font-bold text-[#0c5c36] hover:underline"
              >
                <Plus size={14} /> Add New Address
              </button>
            </div>

            {addresses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                No saved delivery addresses yet. Add a delivery address below to continue.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <button
                    type="button"
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`text-left rounded-2xl border p-4 transition ${
                      selectedAddressId === addr.id
                        ? 'border-[#0c5c36] bg-emerald-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-black text-slate-900">{addr.recipient}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 leading-relaxed">{addr.line}</div>
                    <div className="mt-0.5 text-xs font-bold text-slate-700">
                      {addr.city}, {addr.state}
                    </div>
                    {addr.phone && <div className="mt-1 text-[11px] text-slate-400">{addr.phone}</div>}
                  </button>
                ))}
              </div>
            )}

            {showNewAddressForm && (
              <form onSubmit={handleAddNewAddress} className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/30 p-4 space-y-3">
                <h4 className="text-xs font-black text-[#0c5c36]">Add New Delivery Address</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Recipient Name</label>
                    <input
                      type="text"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      required
                      placeholder="Full recipient name"
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">Phone</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      required
                      placeholder="e.g. 0803..."
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Street Address</label>
                  <input
                    type="text"
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    required
                    placeholder="Street, estate, landmark"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700">City</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      required
                      placeholder="City / LGA"
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-delivery-state" className="text-[11px] font-bold text-slate-700">State</label>
                    <select
                      id="checkout-delivery-state"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 bg-white"
                    >
                      {NIGERIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-black text-white hover:bg-emerald-900"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <CreditCard size={18} className="text-[#0c5c36]" />
              <span>2. Payment Gateway Status</span>
            </div>

            <div className={`rounded-2xl border-2 p-4 ${paymentsEnabled ? 'border-[#0c5c36] bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900">Payment Gateway Escrow</h4>
                  <p className="text-[11px] text-slate-600">
                    {paymentsEnabled
                      ? 'Card, bank transfer, and USSD settlement active.'
                      : 'Online checkout payments are currently disabled until merchant payment keys are configured.'}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${paymentsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                  {paymentsEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck size={16} className="text-emerald-700" />
              <span>Orders reserve inventory server-side and are never marked paid without verified processor confirmation.</span>
            </div>
          </div>
        </div>

        {/* Right Col: Order Summary */}
        <div className="cnc-flow-summary min-w-0 space-y-4">
          <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              Order Summary ({cart.length} items)
            </h3>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 space-y-2 pr-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400">
                        Qty: {item.quantity} × ₦{item.price.toLocaleString('en-NG')}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-black text-slate-900 shrink-0">
                    ₦{(item.price * item.quantity).toLocaleString('en-NG')}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">Shipping cost and final payable total are pending an authorised shipping quote. No international delivery estimate or customs fee has been verified.</p>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">₦{cartSubtotal.toLocaleString('en-NG')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
                <span>Subtotal (shipping not included):</span>
                <span className="text-[#0c5c36]">₦{estimatedSubtotal.toLocaleString('en-NG')}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {!paymentsEnabled && (
                <div className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-[11px] font-bold text-slate-600">
                  <Lock size={13} />
                  <span>Online Payments Disabled</span>
                </div>
              )}
              <button
                type="button"
                disabled={submitting || !selectedAddressId}
                onClick={handleInitiateOrder}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white shadow-md transition hover:bg-emerald-900 disabled:opacity-50"
              >
                <span>{submitting ? 'Reserving Inventory...' : 'Reserve Order (awaiting_payment)'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
