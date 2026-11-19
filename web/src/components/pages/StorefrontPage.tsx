import DepthArtwork from '../ui/DepthArtwork';
import React, { useState, useEffect } from 'react';
import { Store, ArrowLeft, CheckCircle2, MapPin, Play, Radio, ShieldCheck, Users } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../lib/api';
import type { ProductItem, StorefrontSummary } from '../../types';
import ProductCard from '../ui/ProductCard';

interface StorefrontPageProps {
  sellerId: string;
  onBack: () => void;
  onSelectProduct: (product: ProductItem) => void;
  onOpenLive: () => void;
  onOpenVideo: () => void;
}

export default function StorefrontPage({
  sellerId,
  onBack,
  onSelectProduct,
  onOpenLive,
  onOpenVideo,
}: StorefrontPageProps) {
  const { products, storefronts, liveRooms, shortVideos, follows, followSeller } = useStore();
  const [activeTab, setActiveTab] = useState<'products' | 'live' | 'videos' | 'about'>('products');
  const [fetchedStorefront, setFetchedStorefront] = useState<StorefrontSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const localStorefront = storefronts.find((s) => s.id === sellerId || s.slug === sellerId || s.ownerId === sellerId);

  useEffect(() => {
    if (!sellerId || localStorefront) {
      setFetchedStorefront(null);
      return;
    }
    setLoading(true);
    api.getStorefront(sellerId).then((res) => {
      setLoading(false);
      if (res.ok && res.data?.storefront) {
        const s = res.data.storefront;
        setFetchedStorefront({
          id: s.id,
          ownerId: s.owner_id || s.id,
          slug: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          location: s.location,
          verified: Boolean(s.verified),
          phone: s.phone,
          followersCount: Number(s.followers_count ?? 0),
        });
      }
    });
  }, [sellerId, localStorefront]);

  const sellerMeta = localStorefront || fetchedStorefront;

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading seller storefront...</div>;
  }

  if (!sellerMeta) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4 rounded-3xl border border-slate-200 bg-white p-8">
        <h2 className="text-lg font-black text-slate-900">Seller not found</h2>
        <p className="text-xs text-slate-500">No verified seller storefront matches this URL.</p>
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

  const sellerProducts = products.filter(
    (p) => (p.sellerId === sellerMeta.id || p.sellerId === sellerMeta.ownerId) && !p.archived && p.publication === 'published'
  );
  const sellerLives = liveRooms.filter(
    (r) => (r.sellerId === sellerMeta.ownerId || r.sellerId === sellerMeta.id) && r.status === 'live'
  );
  const sellerVideos = shortVideos.filter(
    (v) => v.sellerId === sellerMeta.ownerId || v.sellerId === sellerMeta.id
  );
  const isFollowing = follows.includes(sellerMeta.id) || follows.includes(sellerMeta.ownerId);

  return (
    <div className="space-y-6 pb-20">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft size={14} />
        <span>Back to Marketplace</span>
      </button>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="cnc-depth-banner bg-gradient-to-r from-[#093B22] via-[#0E6B38] to-[#084B26] p-6 sm:p-8 text-white">
        <DepthArtwork icon={Store} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black">{sellerMeta.name}</h1>
                {sellerMeta.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-100">
                    <CheckCircle2 size={12} /> Verified Store
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100 pt-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} /> {sellerMeta.location}, Nigeria
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={13} /> {sellerMeta.followersCount} followers · {sellerProducts.length} products
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void followSeller(sellerMeta.ownerId || sellerMeta.id)}
              className={`min-h-[44px] rounded-2xl px-6 text-xs font-black shadow transition ${
                isFollowing
                  ? 'bg-white/15 text-white border border-white/25 hover:bg-white/25'
                  : 'bg-[#FF6B00] text-white hover:bg-orange-600'
              }`}
            >
              {isFollowing ? 'Following Store' : '+ Follow Store'}
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 px-4 overflow-x-auto">
          {[
            { id: 'products', label: `Products (${sellerProducts.length})` },
            { id: 'live', label: `Livestreams (${sellerLives.length})` },
            { id: 'videos', label: `Videos (${sellerVideos.length})` },
            { id: 'about', label: 'About Store' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-xs font-black transition ${
                activeTab === t.id
                  ? 'border-[#0E6B38] text-[#0E6B38]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'products' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sellerProducts.map((product) => (
            <ProductCard key={product.id} product={product} onSelectProduct={onSelectProduct} />
          ))}
          {sellerProducts.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No products available yet. Check back soon for new arrivals.
            </div>
          )}
        </div>
      )}

      {activeTab === 'live' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sellerLives.map((room) => (
            <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
                  <Radio size={11} /> {room.status}
                </span>
                <h3 className="mt-2 font-black text-slate-900">{room.title}</h3>
                <p className="text-xs text-slate-500">{room.viewerCount.toLocaleString()} watching</p>
              </div>
              <button
                type="button"
                onClick={onOpenLive}
                className="rounded-xl bg-[#0E6B38] px-4 py-2.5 text-xs font-black text-white"
              >
                Watch Live
              </button>
            </div>
          ))}
          {sellerLives.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No one is live right now.
            </div>
          )}
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sellerVideos.map((vid) => (
            <button
              key={vid.id}
              type="button"
              onClick={onOpenVideo}
              className="group relative aspect-[9/14] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-left shadow-sm"
            >
              {vid.posterUrl && <img src={vid.posterUrl} alt={vid.caption} className="h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              <div className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white">
                <Play size={14} className="fill-white" />
              </div>
              <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                <p className="line-clamp-2 text-xs font-bold">{vid.caption}</p>
                {vid.taggedProduct && (
                  <span className="inline-block rounded bg-[#FF6B00] px-2 py-0.5 text-[10px] font-black">
                    ₦{vid.taggedProduct.price.toLocaleString('en-NG')}
                  </span>
                )}
              </div>
            </button>
          ))}
          {sellerVideos.length === 0 && (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No videos have been posted yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <ShieldCheck size={18} className="text-[#0E6B38]" />
            <span>Storefront Overview</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {sellerMeta.description || `${sellerMeta.name} operates from ${sellerMeta.location}, Nigeria.`}
          </p>
        </div>
      )}
    </div>
  );
}
