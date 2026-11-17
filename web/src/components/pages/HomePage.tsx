import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import ProductCard from '../ui/ProductCard';
import LiveAuctionCard from '../ui/LiveAuctionCard';
import { ProductItem } from '../../types';
import { categories } from '../../lib/data';
import {
  ArrowRight,
  Radio,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Play,
  Truck,
  RotateCcw,
  Headphones,
  Star,
  Store,
  RefreshCw,
  AlertCircle,
  Video,
} from 'lucide-react';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  onSelectProduct: (product: ProductItem) => void;
  onSelectCategory?: (category: string) => void;
  onOpenStorefront?: (sellerId: string) => void;
}

export default function HomePage({
  setCurrentTab,
  onSelectProduct,
  onSelectCategory,
  onOpenStorefront,
}: HomePageProps) {
  const {
    products,
    storefronts,
    liveRooms,
    auctions,
    follows,
    currentUser,
    isApprovedSeller,
    platformConfig,
    catalogState,
    storefrontsState,
    liveState,
    reloadMarketplace,
    placeBid,
    followSeller,
  } = useStore();

  const [activeProductFilter, setActiveProductFilter] = useState<string>('all');

  const publishedProducts = useMemo(
    () => products.filter((p) => p.publication === 'published' && !p.archived),
    [products]
  );

  const activeLiveRooms = useMemo(
    () => liveRooms.filter((r) => r.status === 'live'),
    [liveRooms]
  );

  const filteredProducts = useMemo(
    () =>
      publishedProducts.filter((p) => {
        if (activeProductFilter === 'all') return true;
        if (activeProductFilter === 'electronics') return p.category === 'tech';
        return p.category === activeProductFilter;
      }),
    [publishedProducts, activeProductFilter]
  );

  const productFilterTabs = [
    { id: 'all', label: 'All' },
    { id: 'phones', label: 'Phones' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'fashion', label: 'Fashion' },
    { id: 'home', label: 'Home' },
    { id: 'beauty', label: 'Beauty' },
  ];

  return (
    <div className="space-y-7 pb-10">
      {/* HERO SECTION */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
        <section className="lg:col-span-8 relative overflow-hidden rounded-2xl bg-[#084d2c] p-6 sm:p-8 text-white flex flex-col justify-between">
          <div className="relative z-10 max-w-xl space-y-4">

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl sm:leading-[1.12]">
              Watch live. <br />
              <span className="text-white">Discover. </span>
              <span className="text-orange-400">Shop.</span>
            </h1>

            <p className="text-xs sm:text-sm leading-relaxed text-emerald-100/90 max-w-md">
              Shop Nigerian products, discover sellers and watch live shopping.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentTab('shop')}
                className="flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 text-xs font-black text-white shadow-lg transition hover:bg-orange-800"
              >
                <span>Explore Shop</span>
                <ArrowRight size={15} />
              </button>

              {activeLiveRooms.length > 0 && <button
                type="button"
                onClick={() => setCurrentTab('live')}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-semibold text-white border border-white/20 transition hover:bg-white/20"
              >
                <Play size={14} className="fill-white" />
                <span>Watch Live</span>
              </button>}
            </div>

            {/* Live Database Counts Only (Zero Fabricated Numbers) */}
            {(storefronts.length > 0 || publishedProducts.length > 0 || activeLiveRooms.length > 0) && <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">{storefronts.length}</div>
                <div className="text-[11px] text-emerald-200/80">Verified Sellers</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">{publishedProducts.length}</div>
                <div className="text-[11px] text-emerald-200/80">Products</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-white">{activeLiveRooms.length}</div>
                <div className="text-[11px] text-emerald-200/80">Live Now</div>
              </div>
            </div>}
          </div>
        </section>

        {(publishedProducts.length > 0 || activeLiveRooms.length > 0) && <div className="lg:col-span-4 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setCurrentTab('flash-deals')}
            className="flex-1 cursor-pointer rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-lg transition hover:scale-[1.01] flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="space-y-1 relative z-10 max-w-[75%]">
              <h3 className="text-xl font-black tracking-tight">Marketplace Deals</h3>
              <p className="text-xs text-amber-100">Discounted items from verified Nigerian sellers</p>
              <div className="pt-2 flex items-center gap-1.5 text-xs font-black text-white group-hover:underline">
                <span>Browse Deals</span>
                <ArrowRight size={14} />
              </div>
            </div>
            <div className="absolute right-3 bottom-2 text-white/30">
              <Zap size={72} className="fill-white/30 stroke-none" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('for-you')}
            className="flex-1 cursor-pointer rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition hover:border-[#0c5c36] flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Short Video Feed</span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                For You Video Feed
              </h3>
              <p className="text-xs text-slate-500">Watch real product clips from verified merchants.</p>
              <div className="pt-2 flex items-center gap-1.5 text-xs font-black text-[#0c5c36] group-hover:underline">
                <span>Watch Clips</span>
                <ArrowRight size={14} />
              </div>
            </div>
            <div className="absolute right-5 bottom-5 text-emerald-100">
              <Video size={48} />
            </div>
          </button>
        </div>}
      </div>

      {/* SHOP BY CATEGORY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">Shop by category</h2>
          <button
            type="button"
            onClick={() => setCurrentTab('shop')}
            className="text-xs font-bold text-[#0c5c36] hover:underline flex items-center gap-1"
          >
            <span>View all categories</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.slice(0, 8).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectCategory?.(cat.id);
                setCurrentTab('shop');
              }}
              className="group flex min-h-24 flex-col items-center justify-center rounded-xl p-3 text-white transition-colors focus-visible:outline-2 text-center"
              style={{ backgroundColor: cat.bgHex }}
            >
              <span className="flex h-10 w-10 items-center justify-center text-2xl">{cat.icon}</span>
              <span className="mt-2 text-xs font-black tracking-tight leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* VERIFIED SELLERS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">Sellers</h2>
          <button
            type="button"
            onClick={() => setCurrentTab('shop')}
            className="text-xs font-bold text-[#0c5c36] hover:underline"
          >
            Browse products →
          </button>
        </div>

        {storefrontsState.status === 'error' ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex items-center justify-between gap-4 text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{storefrontsState.error || 'Failed to load sellers.'}</span>
            </div>
            <button
              type="button"
              onClick={() => void reloadMarketplace()}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-700 px-3 py-1.5 font-bold text-white"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : storefronts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-600">
            No sellers available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storefronts.slice(0, 6).map((seller) => {
              const isFollowing = follows.includes(seller.id);
              return (
                <div
                  key={seller.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0c5c36] space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenStorefront?.(seller.id)}
                      className="flex items-center gap-3 min-w-0 text-left group/seller"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-black text-[#0c5c36] border border-emerald-200">
                        {seller.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-xs font-black text-slate-900 truncate group-hover/seller:text-[#0c5c36]">
                            {seller.name}
                          </h3>
                          {seller.verified && <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {seller.location} · {seller.category}
                        </div>
                        <div className="text-[11px] font-bold text-slate-600">
                          {seller.followersCount} followers
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => void followSeller(seller.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition shrink-0 ${
                        isFollowing
                          ? 'border border-slate-200 bg-slate-100 text-slate-700'
                          : 'bg-[#0c5c36] text-white hover:bg-emerald-900 shadow-sm'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                  {seller.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{seller.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* LIVE SHOPPING */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-rose-600" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900">Live shopping</h2>
          </div>
          <button
            type="button"
            onClick={() => setCurrentTab('live')}
            className="text-xs font-bold text-[#0c5c36] hover:underline"
          >
            View live rooms →
          </button>
        </div>

        {liveState.status === 'error' ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex items-center justify-between gap-4 text-xs text-rose-800">
            <span>{liveState.error || 'Failed to load livestreams.'}</span>
            <button
              type="button"
              onClick={() => void reloadMarketplace()}
              className="rounded-xl bg-rose-700 px-3 py-1.5 font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : activeLiveRooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-600">No one is live right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeLiveRooms.slice(0, 4).map((room) => (
              <div
                key={room.id}
                className="rounded-3xl bg-slate-950 text-white p-6 shadow-lg flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black uppercase">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE · {room.viewerCount} watching
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black">{room.title}</h3>
                  <div className="text-xs text-emerald-300 font-bold mt-1">By {room.sellerName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('live')}
                  className="self-start flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-xs font-black text-white hover:bg-emerald-600 transition"
                >
                  <Play size={13} className="fill-white" />
                  <span>Join Stream</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PRODUCTS CATALOGUE */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">Products</h2>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {productFilterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveProductFilter(tab.id)}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                    activeProductFilter === tab.id
                      ? 'bg-[#0c5c36] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className="text-xs font-bold text-[#0c5c36] hover:underline whitespace-nowrap"
            >
              View all →
            </button>
          </div>
        </div>

        {catalogState.status === 'error' ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex items-center justify-between gap-4 text-xs text-rose-800">
            <span>{catalogState.error || 'Failed to load products.'}</span>
            <button
              type="button"
              onClick={() => void reloadMarketplace()}
              className="rounded-xl bg-rose-700 px-3 py-1.5 font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-sm font-semibold text-slate-600">
            No products available yet. Check back soon for new arrivals.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        )}
      </section>

      {/* LIVE AUCTIONS */}
      {auctions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">Live Auctions</h2>
            <button
              type="button"
              onClick={() => setCurrentTab('auctions')}
              className="text-xs font-bold text-[#0c5c36] hover:underline"
            >
              View all auctions →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.slice(0, 3).map((auction) => (
              <LiveAuctionCard
                key={auction.id}
                auction={auction}
                currentUserId={currentUser.id}
                paymentsEnabled={platformConfig.paymentsEnabled}
                onPlaceBid={(auctionId, amount) => void placeBid(auctionId, amount)}
                onClaimWin={() => setCurrentTab('auctions')}
                onInspectSeller={(sellerId) => onOpenStorefront?.(sellerId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* TRUST STRIP */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c5c36]">
              <Truck size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">Nationwide Delivery</div>
              <div className="text-[11px] text-slate-500">Across Nigeria</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c5c36]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">Verified Merchants</div>
              <div className="text-[11px] text-slate-500">Admin-reviewed sellers</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c5c36]">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">Returns Support</div>
              <div className="text-[11px] text-slate-500">Track requests online</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c5c36]">
              <Headphones size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">Seller Messaging</div>
              <div className="text-[11px] text-slate-500">Direct inquiries</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-3 justify-center sm:justify-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c5c36]">
              <Star size={20} />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">Authentic Catalog</div>
              <div className="text-[11px] text-slate-500">Moderated product listings</div>
            </div>
          </div>
        </div>
      </section>

      {/* SELLER CALLOUT */}
      {!isApprovedSeller && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#073c22] via-[#0c5c36] to-[#073c22] p-8 md:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-2xl space-y-2 text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              SELL ON CASH N CARRY NIGERIA
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Reach shoppers across Nigeria.
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
              Apply for a verified seller account to list products, post For You videos, and host live shopping sessions.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentTab('seller-kyc')}
              className="rounded-full bg-orange-700 px-6 py-3 text-xs font-black text-white hover:bg-orange-800 transition shadow-lg"
            >
              {currentUser.sellerStatus === 'pending' ? 'Application Pending →' : 'Start Selling →'}
            </button>
          </div>

          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none select-none">
            <Store size={240} />
          </div>
        </section>
      )}
    </div>
  );
}
