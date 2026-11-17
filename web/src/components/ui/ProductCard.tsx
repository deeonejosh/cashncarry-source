import React from 'react';
import { ProductItem } from '../../types';
import { useStore } from '../../context/StoreContext';
import { Heart, Star, ShoppingBag, Eye, CheckCircle2, Package } from 'lucide-react';

interface ProductCardProps {
  product: ProductItem;
  onSelectProduct: (product: ProductItem) => void;
  onQuickBuy?: (product: ProductItem) => void;
}

export default function ProductCard({ product, onSelectProduct }: ProductCardProps) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  const discountPercent =
    product.compareAt > product.price
      ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
      : null;

  return (
    <article className="group relative min-w-0 flex flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl">
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Package size={36} />
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1 z-10">
            {discountPercent ? (
              <span className="rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                -{discountPercent}%
              </span>
            ) : null}
            {product.stock <= 3 && product.stock > 0 && (
              <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold text-white">
                Only {product.stock} left
              </span>
            )}
            {product.stock === 0 && (
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-extrabold text-white">
                Out of Stock
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void toggleWishlist(product.id);
            }}
            className="absolute right-2.5 top-2.5 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm backdrop-blur-sm transition hover:scale-110 hover:bg-white"
            aria-label="Save to wishlist"
          >
            <Heart
              size={16}
              className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}
            />
          </button>

          <button
            type="button"
            onClick={() => onSelectProduct(product)}
            className="absolute inset-x-3 bottom-3 flex sm:hidden sm:group-hover:flex items-center justify-center gap-1.5 rounded-xl bg-slate-900/85 py-2 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-slate-900"
          >
            <Eye size={14} /> Quick View
          </button>
        </div>

        <div className="pt-3">
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <span className="truncate font-bold uppercase tracking-wider text-slate-400">
              {product.brand || product.sellerName}
            </span>
            <span className="flex items-center gap-0.5 font-bold text-emerald-800 text-[10px]">
              <CheckCircle2 size={11} className="text-emerald-600" />
              Verified
            </span>
          </div>

          <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">
            <button
              type="button"
              className="text-left hover:text-[#0c5c36]"
              onClick={() => onSelectProduct(product)}
            >
              {product.title}
            </button>
          </h3>

          <div className="mt-1.5 flex items-center gap-1 text-xs">
            {product.reviews > 0 ? (
              <>
                <div className="flex items-center text-amber-500">
                  <Star size={13} className="fill-amber-400" />
                  <span className="ml-1 font-extrabold text-slate-800">{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-[11px] text-slate-400">({product.reviews})</span>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">No reviews yet</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-black text-slate-900">
            ₦{product.price.toLocaleString('en-NG')}
          </span>
          {product.compareAt > product.price && (
            <span className="text-xs text-slate-400 line-through">
              ₦{product.compareAt.toLocaleString('en-NG')}
            </span>
          )}
        </div>

        <div className="mt-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void addToCart(product, 1);
            }}
            disabled={product.stock <= 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0c5c36] py-2 text-xs font-black text-white shadow-sm transition hover:bg-emerald-900 active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingBag size={14} />
            <span>{product.stock > 0 ? 'Add to Cart' : 'Unavailable'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
