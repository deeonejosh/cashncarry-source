import DepthArtwork from '../ui/DepthArtwork';
import MobileLiveStage from './MobileLiveStage';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { LiveComment, ProductItem } from '../../types';
import {
  Radio,
  Heart,
  MessageCircle,
  ShoppingBag,
  Send,
  Users,
  X,
  Coins,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Package,
} from 'lucide-react';

interface LiveShoppingPageProps {
  onSelectProduct: (p: ProductItem) => void;
  onProceedToCheckout: () => void;
  onOpenCreate?: () => void;
  onExit?: () => void;
}

export default function LiveShoppingPage({
  onSelectProduct,
  onProceedToCheckout,
  onOpenCreate,
  onExit,
}: LiveShoppingPageProps) {
  const {
    currentUser,
    isApprovedSeller,
    liveRooms,
    liveStreamingConfigured,
    liveState,
    sellerProducts,
    products,
    reloadMarketplace,
    joinLiveRoom,
    likeLiveRoom,
    pinLiveProduct,
    endLiveRoom,
    loadLiveComments,
    addLiveComment,
    addToCart,
    sendCoinGift,
    showToast,
  } = useStore();

  const activeRooms = liveRooms.filter((r) => r.status === 'live');
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => new URLSearchParams(window.location.search).get('room') || '');
  const activeRoom = activeRooms.find((r) => r.id === selectedRoomId) || activeRooms[0] || null;

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [, setViewerCount] = useState(0);
  const [heartsCount, setHeartsCount] = useState(0);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [giftingModalOpen, setGiftingModalOpen] = useState(false);

  const isHost = Boolean(isApprovedSeller && activeRoom && activeRoom.sellerId === currentUser.id);
  const ownPublishedProducts = sellerProducts.filter((p) => p.publication === 'published' && p.stock > 0);

  useEffect(() => {
    if (!activeRoom?.id) return;
    setViewerCount(activeRoom.viewerCount);
    setHeartsCount(activeRoom.heartsCount);
    // The backend currently has no /live/:id/events SSE route. Poll the actual
    // persisted comments until a supported authenticated event stream is built.
    let cancelled = false;
    const refresh = async () => {
      try {
        const updated = await loadLiveComments(activeRoom.id);
        if (!cancelled) setComments(updated);
      } catch {
        // Keep previously displayed comments while temporarily disconnected.
      }
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.id]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !newComment.trim()) return;
    const text = newComment.trim();
    const ok = await addLiveComment(activeRoom.id, text);
    if (ok) {
      setNewComment('');
      const refreshed = await loadLiveComments(activeRoom.id);
      setComments(refreshed);
    }
  };

  const handleHeart = async () => {
    if (!activeRoom) return;
    await likeLiveRoom(activeRoom.id);
    // Guest reactions require authentication; do not display an unpersisted like.
    if (currentUser.authenticated) setHeartsCount((c) => c + 1);
  };

  const handleSendGift = async (giftType: 'rose' | 'star' | 'lion') => {
    if (!activeRoom) return;
    const ok = await sendCoinGift(activeRoom.sellerId, giftType);
    if (ok) setGiftingModalOpen(false);
  };

  const handleBuyPinned = async (product: ProductItem) => {
    // Do not send a guest or an out-of-stock buyer to checkout unless the
    // actual backend has accepted the cart mutation.
    const added = await addToCart(product, 1);
    if (added) onProceedToCheckout();
  };

  if (liveState.status === 'loading') {
    return <div className="py-20 text-center text-sm font-semibold text-slate-500">Loading live rooms...</div>;
  }

  if (liveState.status === 'error') {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center space-y-3 my-8">
        <AlertCircle size={32} className="mx-auto text-rose-600" />
        <h2 className="text-base font-black text-rose-900">Unable to load livestreams</h2>
        <p className="text-xs text-rose-700">{liveState.error}</p>
        <button
          type="button"
          onClick={() => void reloadMarketplace()}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-xs font-bold text-white"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!activeRoom) {
    return (
      <>
      <div className="cnc-mobile-live-empty-room md:hidden" style={{minHeight:'min(82dvh,760px)', padding:'clamp(22px,6vw,46px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,color:'#fff',background:'radial-gradient(circle at 40% 30%,#362281,#0b1231 56%,#050918 90%)',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div aria-hidden="true" style={{borderRadius:'50%',width:170,height:170,display:'grid',placeItems:'center',background:'linear-gradient(135deg,#661dd8,#092e56)',boxShadow:'0 0 58px #543fddcc, inset 0 2px 2px #ffffff70',transform:'rotate(-6deg)'}}><Radio size={73} color="#b4ffff"/></div>
        <h1 style={{fontSize:26,fontWeight:950,letterSpacing:'-0.04em'}}>The live stage is ready</h1>
        <p style={{fontSize:13,lineHeight:1.5,color:'#d0ddf6',maxWidth:280}}>No shopping rooms are active right now. Real buyer and seller livestream tools appear when a seller starts a room.</p>
        {isApprovedSeller && onOpenCreate && <button type="button" onClick={onOpenCreate} style={{padding:'14px 30px',background:'linear-gradient(110deg,#fe347e,#8936ec)',color:'white',borderRadius:18,fontWeight:900,boxShadow:'0 8px 32px #b833e68a'}}>Set up live room</button>}
        <button type="button" onClick={() => onExit?.()} style={{fontSize:12,fontWeight:800,color:'#bbfbff',padding:12,textDecoration:'underline'}}>Return to shop</button>
        <small style={{color:'#aab4cf',fontSize:11}}>Video broadcasting requires a connected streaming service.</small>
      </div>
      <div className="hidden md:block mx-auto max-w-xl rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4 my-8">
        <DepthArtwork icon={Radio} />
        <h1 className="text-xl font-black text-slate-900">No live streams</h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Live seller streams will appear here.
        </p>
        {isApprovedSeller && onOpenCreate && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="rounded-xl bg-rose-600 px-6 py-3 text-xs font-black text-white hover:bg-rose-700 transition"
          >
            Go Live Now
          </button>
        )}
      </div>
      </>
    );
  }

  const pinnedProduct = activeRoom.pinnedProduct || (activeRoom.pinnedProductId ? products.find((p) => p.id === activeRoom.pinnedProductId) || null : null);

  const sellerPublished = products.filter(product =>
    product.sellerId === activeRoom.sellerId && product.publication === 'published' && !product.archived
  );
  const addMobileCart = async (product: ProductItem) => { await addToCart(product, 1); };
  const endMobileRoom = async () => {
    const result = await endLiveRoom(activeRoom.id);
    if (!result.ok) showToast(result.error || 'Could not end the room.', 'error');
  };

  return (
    <>
    <MobileLiveStage
      room={activeRoom}
      rooms={activeRooms}
      sellerProducts={sellerPublished}
      comments={comments}
      commentValue={newComment}
      heartsCount={Math.max(heartsCount, activeRoom.heartsCount)}
      coinBalance={currentUser.coins ?? 0}
      isHost={isHost}
      videoConfigured={liveStreamingConfigured}
      onCommentChange={setNewComment}
      onSendComment={handleSendComment}
      onHeart={() => void handleHeart()}
      onOpenGift={() => setGiftingModalOpen(true)}
      onPin={() => setPinModalOpen(true)}
      onEndRoom={() => void endMobileRoom()}
      onExit={() => onExit?.()}
      onChangeRoom={setSelectedRoomId}
      onAddToCart={(product) => void addMobileCart(product)}
      onBuy={(product) => void handleBuyPinned(product)}
      onSelectProduct={onSelectProduct}
      onShareNotice={(text) => showToast(text, 'info')}
    />
    <div className="hidden md:block space-y-6 pb-16">
      {/* Room Selector */}
      {activeRooms.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {activeRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedRoomId(room.id)}
              className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap border transition ${
                room.id === activeRoom.id
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {room.title} · {room.sellerName}
            </button>
          ))}
        </div>
      )}

      {!liveStreamingConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
          <span>
            Video broadcasting is unavailable until the streaming connection is configured and verified.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Room Stage */}
        <div className="relative aspect-[4/3] sm:aspect-video w-full overflow-hidden rounded-3xl bg-slate-950 shadow-2xl lg:col-span-2 border border-slate-800 flex flex-col justify-between p-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 rounded-full bg-black/60 px-3.5 py-1.5 border border-white/10">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-black">
                {activeRoom.sellerName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black">{activeRoom.sellerName}</span>
                  <CheckCircle2 size={12} className="text-emerald-400" />
                </div>
                <div className="text-[10px] text-emerald-300 capitalize">{activeRoom.category || 'general'}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-black uppercase">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                LIVE
              </span>
              <span className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-bold border border-white/10">
                <Users size={13} className="text-emerald-300" />
                <span>Viewers unverified</span>
              </span>
            </div>
          </div>

          <div className="my-auto text-center space-y-2 py-8">
            <h1 className="text-xl sm:text-2xl font-black">{activeRoom.title}</h1>
            <p className="text-xs text-slate-400">
              {liveStreamingConfigured
                ? 'Video connection pending verification.'
                : 'Broadcast unavailable in this staging environment.'}
            </p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            {pinnedProduct ? (
              <div className="flex max-w-sm items-center gap-3 rounded-2xl bg-black/80 p-2.5 border border-white/20">
                {pinnedProduct.image ? (
                  <img
                    src={pinnedProduct.image}
                    alt={pinnedProduct.title}
                    className="h-14 w-14 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                    <Package size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="rounded bg-orange-600 px-1.5 py-0.5 text-[9px] font-black uppercase">
                    PINNED
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectProduct(pinnedProduct)}
                    className="block mt-0.5 text-xs font-bold truncate hover:underline text-left"
                  >
                    {pinnedProduct.title}
                  </button>
                  <div className="text-xs font-black text-emerald-400">
                    ₦{pinnedProduct.price.toLocaleString('en-NG')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleBuyPinned(pinnedProduct)}
                  className="shrink-0 rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-500"
                >
                  Buy Now
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                No product pinned yet.
              </div>
            )}

            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPinModalOpen(true)}
                  className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-black text-white hover:bg-emerald-600"
                >
                  Pin Product
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await endLiveRoom(activeRoom.id);
                    if (!result.ok) showToast(result.error || 'Could not end the stream.', 'error');
                  }}
                  className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-black text-white hover:bg-rose-700"
                >
                  End Stream
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Audience Chat */}
        <div className="flex h-[min(58dvh,500px)] min-h-[280px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <MessageCircle size={15} className="text-[#0c5c36]" />
              <span>Live Chat</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {comments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No messages yet. Say hello to the seller!
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-2xl bg-slate-50 p-2.5 text-xs text-slate-800">
                  <div className="font-bold text-[11px] text-[#0c5c36]">{c.userName}</div>
                  <div>{c.body}</div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
            <button
              type="button"
              onClick={() => setGiftingModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-900"
            >
              <Coins size={14} className="text-amber-600" />
              <span>Send Gift ({(currentUser.coins ?? 0).toLocaleString()} coins)</span>
            </button>

            <button
              type="button"
              onClick={() => void handleHeart()}
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
            >
              <Heart size={15} className="fill-rose-500 text-rose-500" />
              <span>{heartsCount.toLocaleString()}</span>
            </button>
          </div>

          <form onSubmit={handleSendComment} className="border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask the seller a question..."
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c5c36] text-white disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>

    </div>

      {/* Host Pin Product Modal */}
      {pinModalOpen && isHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Pin Your Published Product</h3>
              <button type="button" onClick={() => setPinModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            {ownPublishedProducts.length === 0 ? (
              <p className="text-xs text-slate-500">No published products in your catalog yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {ownPublishedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={async () => {
                      const result = await pinLiveProduct(activeRoom.id, p.id);
                      if (result.ok) setPinModalOpen(false);
                      else showToast(result.error || 'Could not pin this product.', 'error');
                    }}
                    className="w-full flex items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:bg-emerald-50 text-xs"
                  >
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="font-black text-[#0c5c36]">
                      ₦{Math.round(p.priceMinor / 100).toLocaleString('en-NG')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gifting Modal */}
      {giftingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Send Creator Gift</h3>
              <button type="button" onClick={() => setGiftingModalOpen(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'rose' as const, label: 'Rose', coins: 10 },
                { key: 'star' as const, label: 'Star', coins: 100 },
                { key: 'lion' as const, label: 'Lion', coins: 1000 },
              ].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => void handleSendGift(g.key)}
                  className="flex flex-col items-center rounded-2xl border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100"
                >
                  <span className="text-xs font-bold text-slate-800">{g.label}</span>
                  <span className="text-[11px] font-black text-amber-700">{g.coins} coins</span>
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
              Balance: <b>{(currentUser.coins ?? 0).toLocaleString()} coins</b>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
