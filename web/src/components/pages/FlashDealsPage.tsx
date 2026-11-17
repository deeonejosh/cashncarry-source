import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductItem } from '../../types';
import { ShoppingBag, Flame, AlertCircle, RefreshCw } from 'lucide-react';

interface FlashDealsPageProps {
  onSelectProduct: (p: ProductItem) => void;
  onProceedToCheckout: () => void;
}

export default function FlashDealsPage({ onSelectProduct, onProceedToCheckout }: FlashDealsPageProps) {
  const { products, catalogState, reloadMarketplace, addToCart } = useStore();

  const flashItems = products.filter((p) => p.compareAt > p.price);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 p-8 text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black backdrop-blur-md">
            <Flame size={14} className="text-yellow-300" />
            <span>MARKDOWN DEALS</span>
          </div>
          <h1 className="text-2xl font-black sm:text-4xl">Flash Deals</h1>
          <p className="max-w-md text-xs text-orange-100 sm:text-sm">
            Current deals from sellers.
          </p>
        </div>
      </div>

      {catalogState.status === 'error' ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
          <AlertCircle size={28} className="mx-auto text-rose-600" />
          <p className="text-xs font-bold text-rose-900">{catalogState.error || 'Could not load deals.'}</p>
          <button
            type="button"
            onClick={() => void reloadMarketplace()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : catalogState.status === 'loading' ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading deals...</div>
      ) : flashItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <p className="text-sm font-bold text-slate-700">
            No products available yet. Check back soon for new arrivals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {flashItems.map((prod) => {
            const discount = Math.round(((prod.compareAt - prod.price) / prod.compareAt) * 100);
            return (
              <div
                key={prod.id}
                className="overflow-hidden rounded-3xl border border-orange-100 bg-white p-4 shadow-sm hover:shadow-lg transition space-y-3"
              >
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100">
                  {prod.image ? (
                    <img src={prod.image} alt={prod.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                      No Image
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-md bg-orange-600 px-2 py-0.5 text-xs font-black text-white shadow">
                    -{discount}% OFF
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {prod.brand}
                  </span>
                  <h3
                    onClick={() => onSelectProduct(prod)}
                    className="mt-0.5 text-xs font-black text-slate-900 line-clamp-1 cursor-pointer hover:text-orange-700"
                  >
                    {prod.title}
                  </h3>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-base font-black text-slate-900">
                      ₦{prod.price.toLocaleString('en-NG')}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      ₦{prod.compareAt.toLocaleString('en-NG')}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] font-bold text-orange-700">
                    {prod.stock > 0 ? `${prod.stock} in stock` : 'Out of stock'}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => void addToCart(prod, 1)}
                      disabled={prod.stock <= 0}
                      className="flex items-center justify-center gap-1 rounded-xl border border-orange-500 bg-orange-50 py-2.5 text-xs font-bold text-orange-700 hover:bg-orange-500 hover:text-white transition disabled:opacity-50"
                    >
                      <ShoppingBag size={14} /> Add
                    </button>
                    <button
                      disabled={prod.stock <= 0}
                      onClick={() => {
                        void addToCart(prod, 1);
                        onProceedToCheckout();
                      }}
                      className="rounded-xl bg-orange-600 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition shadow disabled:opacity-50"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
