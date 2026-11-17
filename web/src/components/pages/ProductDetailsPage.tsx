import React, { useState, useEffect } from 'react';
import { ProductItem, ProductReview } from '../../types';
import { useStore } from '../../context/StoreContext';
import { api } from '../../lib/api';
import {
  Star,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  MessageCircle,
  Plus,
  Minus,
  Package,
} from 'lucide-react';

interface ProductDetailsPageProps {
  product: ProductItem | null;
  onBack: () => void;
  onSelectProduct: (p: ProductItem) => void;
  onProceedToCheckout: () => void;
  onOpenStorefront?: (sellerId: string) => void;
}

export default function ProductDetailsPage({
  product,
  onBack,
  onSelectProduct,
  onProceedToCheckout,
  onOpenStorefront,
}: ProductDetailsPageProps) {
  const { currentUser, addToCart, wishlist, toggleWishlist, products, sendMessage, openAuthModal, showToast } =
    useStore();

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'shipping' | 'reviews'>('description');
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!product?.id) return;
    setReviewsLoading(true);
    api.getProductReviews(product.id).then((res) => {
      setReviewsLoading(false);
      if (res.ok && Array.isArray(res.data?.reviews)) {
        setReviews(
          res.data.reviews.map((r) => ({
            id: r.id,
            productId: r.product_id,
            userId: r.user_id,
            authorName: r.author_name,
            rating: Number(r.rating),
            comment: r.comment,
            createdAt: r.created,
          }))
        );
      } else {
        setReviews([]);
      }
    });
  }, [product?.id]);

  if (!product) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4 rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-lg font-black text-slate-900">Product not found</h2>
        <p className="text-xs text-slate-500">This product is unavailable or has been removed.</p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-[#0c5c36] px-5 py-2.5 text-xs font-black text-white"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const isWishlisted = wishlist.includes(product.id);
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id && p.publication === 'published')
    .slice(0, 4);

  const discountPercent =
    product.compareAt > product.price
      ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
      : null;

  const avgRating =
    reviews.length > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : product.rating;

  const handleBuyNow = async () => {
    await addToCart(product, quantity);
    onProceedToCheckout();
  };

  const handleContactSeller = async () => {
    const ok = await sendMessage(
      product.sellerId,
      `Hello, I'm inquiring about ${product.title} (₦${product.price.toLocaleString('en-NG')})`
    );
    if (ok) showToast(`Sent inquiry to ${product.sellerName}`, 'success');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to leave a verified review.');
      return;
    }
    if (!reviewComment.trim()) return;
    setSubmittingReview(true);
    const res = await api.createProductReview(product.id, reviewRating, reviewComment.trim());
    setSubmittingReview(false);
    if (!res.ok || !res.data?.review) {
      showToast(res.error || 'Could not submit review.', 'error');
      return;
    }
    const r = res.data.review;
    setReviews((prev) => [
      {
        id: r.id,
        productId: r.product_id,
        userId: r.user_id,
        authorName: r.author_name,
        rating: Number(r.rating),
        comment: r.comment,
        createdAt: r.created,
      },
      ...prev,
    ]);
    setReviewComment('');
    showToast('Review posted.', 'success');
  };

  return (
    <div className="space-y-10 pb-16">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0c5c36] transition"
      >
        <ChevronLeft size={16} />
        <span>Back to products</span>
      </button>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-slate-100 border border-slate-200 shadow-md">
            {product.image ? (
              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Package size={64} />
              </div>
            )}
            {discountPercent && (
              <span className="absolute left-4 top-4 rounded-xl bg-orange-600 px-3 py-1 text-xs font-black text-white shadow-md">
                -{discountPercent}% OFF
              </span>
            )}
            <button
              type="button"
              onClick={() => void toggleWishlist(product.id)}
              className="absolute right-4 top-4 rounded-full bg-white/90 p-3 text-slate-700 shadow-md hover:bg-white transition"
            >
              <Heart size={20} className={isWishlisted ? 'fill-rose-500 text-rose-500' : ''} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="uppercase tracking-wider text-slate-400">{product.brand || product.sellerName}</span>
              <span className="flex items-center gap-1 text-emerald-800">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Verified Seller
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl leading-snug">{product.title}</h1>

            <div className="mt-3 flex items-center gap-3 text-xs">
              {reviews.length > 0 ? (
                <>
                  <div className="flex items-center text-amber-500 font-extrabold">
                    <Star size={15} className="fill-amber-400" />
                    <span className="ml-1 text-slate-900">{avgRating}</span>
                  </div>
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-slate-600">{reviews.length} customer reviews</span>
                </>
              ) : (
                <span className="font-semibold text-slate-500">No reviews yet</span>
              )}
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-400 text-[11px]">ID: {product.id}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100 flex items-baseline justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">Price (NGN):</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-black text-slate-900">₦{product.price.toLocaleString('en-NG')}</span>
                {product.compareAt > product.price && (
                  <span className="text-base text-slate-400 line-through">
                    ₦{product.compareAt.toLocaleString('en-NG')}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span
                className={`inline-block rounded-full px-3 py-1 text-[11px] font-black text-white ${
                  product.stock > 0 ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-700">Quantity:</span>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="rounded-lg p-2 text-slate-600 hover:bg-white transition"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-black text-sm text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(Math.max(1, product.stock), quantity + 1))}
                  className="rounded-lg p-2 text-slate-600 hover:bg-white transition"
                  disabled={quantity >= product.stock}
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Total: <b>₦{(product.price * quantity).toLocaleString('en-NG')}</b>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void addToCart(product, quantity)}
                disabled={product.stock <= 0}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#0c5c36] bg-emerald-50/50 py-3.5 text-xs font-black text-[#0c5c36] hover:bg-[#0c5c36] hover:text-white transition disabled:opacity-50"
              >
                <ShoppingBag size={17} />
                <span>Add to Cart</span>
              </button>

              <button
                type="button"
                onClick={() => void handleBuyNow()}
                disabled={product.stock <= 0}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 transition shadow-lg disabled:opacity-50"
              >
                <span>Checkout Now</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onOpenStorefront?.(product.sellerId)}
                className="flex items-center gap-3 text-left"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800 font-black text-white text-base">
                  {product.sellerName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-black text-slate-900 hover:underline">{product.sellerName}</h4>
                    <CheckCircle2 size={13} className="text-[#0c5c36]" />
                  </div>
                  <div className="text-[11px] text-slate-500">View Storefront</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleContactSeller()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
              >
                <MessageCircle size={14} />
                <span>Message</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
            <div className="p-2">
              <Truck size={18} className="mx-auto text-[#0c5c36]" />
              <div className="mt-1 text-[11px] font-bold text-slate-900">Nationwide Dispatch</div>
            </div>
            <div className="p-2">
              <ShieldCheck size={18} className="mx-auto text-[#0c5c36]" />
              <div className="mt-1 text-[11px] font-bold text-slate-900">Verified Seller</div>
            </div>
            <div className="p-2">
              <RotateCcw size={18} className="mx-auto text-[#0c5c36]" />
              <div className="mt-1 text-[11px] font-bold text-slate-900">Returns Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex border-b border-slate-100 pb-3 gap-6 text-xs font-black overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`pb-2 border-b-2 transition ${
              activeTab === 'description' ? 'border-[#0c5c36] text-[#0c5c36]' : 'border-transparent text-slate-500'
            }`}
          >
            Product Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`pb-2 border-b-2 transition ${
              activeTab === 'specs' ? 'border-[#0c5c36] text-[#0c5c36]' : 'border-transparent text-slate-500'
            }`}
          >
            Specifications
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`pb-2 border-b-2 transition ${
              activeTab === 'shipping' ? 'border-[#0c5c36] text-[#0c5c36]' : 'border-transparent text-slate-500'
            }`}
          >
            Delivery &amp; Returns
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-2 border-b-2 transition ${
              activeTab === 'reviews' ? 'border-[#0c5c36] text-[#0c5c36]' : 'border-transparent text-slate-500'
            }`}
          >
            Reviews ({reviews.length})
          </button>
        </div>

        <div className="pt-6 text-xs leading-relaxed text-slate-600">
          {activeTab === 'description' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-900">{product.title}</p>
              <p>{product.description || 'No description provided.'}</p>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 py-2">
                <span className="font-bold text-slate-800">Brand</span>
                <span>{product.brand || product.sellerName}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 py-2">
                <span className="font-bold text-slate-800">Category</span>
                <span className="capitalize">{product.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 py-2">
                <span className="font-bold text-slate-800">Stock Available</span>
                <span>{product.stock}</span>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-3">
              <h4 className="font-black text-slate-800">Nationwide Fulfilment</h4>
              <p>Sellers fulfil orders. Track delivery in Orders.</p>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-5">
              <form onSubmit={handleSubmitReview} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="text-xs font-black text-slate-900">Write a Review</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Rating:</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Stars
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your honest experience with this product..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#0c5c36]"
                />
                <button
                  type="submit"
                  disabled={submittingReview || !reviewComment.trim()}
                  className="rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </form>

              {reviewsLoading ? (
                <div className="text-xs text-slate-500">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No customer reviews yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 space-y-3">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rev.authorName}</span>
                        <span className="text-[11px] font-bold text-amber-600">{'★'.repeat(rev.rating)}</span>
                      </div>
                      <p className="text-slate-700">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900">Similar Products</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition"
              >
                {p.image && <img src={p.image} alt={p.title} className="aspect-square w-full rounded-xl object-cover" />}
                <h4 className="mt-2 text-xs font-bold text-slate-900 truncate">{p.title}</h4>
                <div className="mt-1 text-xs font-black text-[#0c5c36]">₦{p.price.toLocaleString('en-NG')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
