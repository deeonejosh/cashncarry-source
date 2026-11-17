import React from 'react';
import { useStore } from '../../context/StoreContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Package } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export default function CartDrawer({ isOpen, onClose, onProceedToCheckout }: CartDrawerProps) {
  const { cart, removeFromCart, updateCartQty } = useStore();

  if (!isOpen) return null;

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm">
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-[#0c5c36]" size={22} />
            <h2 className="text-lg font-black text-slate-900">Your Cart ({cartCount})</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShoppingBag size={36} />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-800">Your cart is empty</h3>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Browse verified products and add items to your cart.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-[#0c5c36] px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 transition"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex gap-4 py-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-20 w-20 rounded-xl object-cover border border-slate-100 bg-slate-50 shrink-0"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400">
                    <Package size={24} />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h4>
                      <button
                        type="button"
                        onClick={() => void removeFromCart(item.productId)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{item.sellerName}</span>
                    <div className="mt-1 text-xs font-extrabold text-[#0c5c36]">
                      ₦{item.price.toLocaleString('en-NG')}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => void updateCartQty(item.productId, item.quantity - 1)}
                        className="rounded p-1 text-slate-600 hover:bg-white transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => void updateCartQty(item.productId, item.quantity + 1)}
                        className="rounded p-1 text-slate-600 hover:bg-white transition"
                        aria-label="Increase quantity"
                        disabled={item.stock > 0 && item.quantity >= item.stock}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div className="text-right text-xs font-bold text-slate-700">
                      ₦{(item.price * item.quantity).toLocaleString('en-NG')}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50/80 p-6 space-y-3">
            <div className="flex justify-between text-sm font-black text-slate-900">
              <span>Subtotal:</span>
              <span className="text-[#0c5c36]">₦{cartSubtotal.toLocaleString('en-NG')}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white shadow-lg transition hover:bg-emerald-900"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
