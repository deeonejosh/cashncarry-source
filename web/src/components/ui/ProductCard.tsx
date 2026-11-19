import React from 'react';
import { ProductItem } from '../../types';
import { useStore } from '../../context/StoreContext';
import { Heart, Star, ShoppingBag, Package, BadgeCheck } from 'lucide-react';

interface ProductCardProps {
  product: ProductItem;
  onSelectProduct: (product: ProductItem) => void;
  onQuickBuy?: (product: ProductItem) => void;
}

export default function ProductCard({ product, onSelectProduct }: ProductCardProps) {
  const { wishlist, toggleWishlist, addToCart, storefronts } = useStore();
  const isWishlisted = wishlist.includes(product.id);
  const isVerifiedSeller = storefronts.some(seller => seller.id === product.sellerId && seller.verified);

  const discountPercent =
    product.compareAt > product.price
      ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
      : null;

  return (
    <article className="cnc-product-card group relative min-w-0 flex flex-col overflow-hidden rounded-2xl border p-2 sm:p-3">
      <div className="flex-1">
        <div className="cnc-product-stage relative aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="cnc-product-image h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Package size={36} />
            </div>
          )}

          <div className="absolute left-1.5 top-2 flex max-w-[calc(100%-3.25rem)] flex-col items-start gap-1 z-10 sm:left-2.5">
            {discountPercent ? (
              <span className="rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                -{discountPercent}%
              </span>
            ) : null}
            {product.stock <= 3 && product.stock > 0 && (
              <span className="cnc-product-stock rounded-full px-2 py-1 text-[10px] font-extrabold">
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
            className="cnc-product-wishlist absolute right-1.5 top-1.5 z-10 grid h-10 w-10 place-items-center rounded-full sm:right-2 sm:top-2"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={isWishlisted}
          >
            <Heart
              size={16}
              className={isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}
            />
          </button>

        </div>

        <div className="pt-3">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-emerald-900">
            {isVerifiedSeller && <BadgeCheck size={15} className="shrink-0" aria-hidden="true" />}
            <span className="truncate">{isVerifiedSeller ? 'Verified Seller' : product.brand || product.sellerName}</span>
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
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-black text-emerald-950 sm:text-lg">
            ₦{product.price.toLocaleString('en-NG')}
          </span>
          {product.compareAt > product.price && (
            <span className="text-xs text-slate-400 line-through">
              ₦{product.compareAt.toLocaleString('en-NG')}
            </span>
          )}
        </div>

        <p className="mt-1 text-[11px] text-slate-500">Delivery shown at checkout</p>
        <div className="mt-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void addToCart(product, 1);
            }}
            disabled={product.stock <= 0}
            className="cnc-product-cart flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <ShoppingBag size={14} />
            <span>{product.stock > 0 ? 'Add to Cart' : 'Unavailable'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
