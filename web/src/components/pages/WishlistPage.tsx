import React from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductItem } from '../../types';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';

interface WishlistPageProps {
  onSelectProduct: (p: ProductItem) => void;
  onExplore: () => void;
}

export default function WishlistPage({ onSelectProduct, onExplore }: WishlistPageProps) {
  const { wishlist, toggleWishlist, products, addToCart } = useStore();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">My Saved Wishlist</h1>
          <p className="text-xs text-slate-500 mt-1">
            Keep track of items you plan to purchase or monitor for price drops.
          </p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
          {wishlistedProducts.length} Saved Items
        </span>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-400">
            <Heart size={32} />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-800">Your wishlist is empty</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Save items by tapping the heart icon on any product card while browsing.
          </p>
          <button
            onClick={onExplore}
            className="mt-6 rounded-full bg-[#0c5c36] px-6 py-2.5 text-xs font-black text-white hover:bg-emerald-900 transition"
          >
            Explore Marketplace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wishlistedProducts.map((prod) => (
            <div
              key={prod.id}
              className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition gap-4"
            >
              {prod.image ? (
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="h-20 w-20 rounded-2xl object-cover border border-slate-100 shrink-0 cursor-pointer"
                  onClick={() => onSelectProduct(prod)}
                />
              ) : (
                <div
                  onClick={() => onSelectProduct(prod)}
                  className="h-20 w-20 rounded-2xl bg-slate-100 shrink-0 cursor-pointer"
                />
              )}

              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {prod.brand}
                </span>
                <h3
                  onClick={() => onSelectProduct(prod)}
                  className="text-xs font-black text-slate-900 truncate cursor-pointer hover:text-[#0c5c36]"
                >
                  {prod.title}
                </h3>
                <div className="mt-1 text-xs font-black text-[#0c5c36]">
                  ₦{prod.price.toLocaleString('en-NG')}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      void addToCart(prod, 1);
                      void toggleWishlist(prod.id);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-[#0c5c36] px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 transition"
                  >
                    <ShoppingBag size={12} />
                    <span>Move to Cart</span>
                  </button>
                  <button
                    onClick={() => void toggleWishlist(prod.id)}
                    className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 transition"
                    title="Remove from wishlist"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
