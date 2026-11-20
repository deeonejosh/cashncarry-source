import MobileLiveStage from './MobileLiveStage';
import MobileLiveEmptyStage from './MobileLiveEmptyStage';
import DesktopLiveEmptyStage from './DesktopLiveEmptyStage';
import DesktopHostPreview from './DesktopHostPreview';
import DesktopLiveMediaControls from './DesktopLiveMediaControls';
import './desktop-live-glass.css';
import CloudflareStreamPlayer from './CloudflareStreamPlayer';
import {getLivePublisherPreview,stopCloudflareStream,validWhep} from '../../lib/cloudflare-stream-webrtc';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { LiveComment, ProductItem } from '../../types';
import {
  Radio,
  Heart,
  MessageCircle,
  Send,
  Users,
  X,
  Coins,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Package,
  Pin,
  Share2,
  BarChart3,
} from 'lucide-react';

interface LiveShoppingPageProps {
  selectedRoomId: string;
  onChangeRoom: (roomId: string) => void;
  onSelectProduct: (p: ProductItem) => void;
  onProceedToCheckout: () => void;
  onOpenCreate?: () => void;
  onExit?: () => void;
  onSellerCentre?: () => void;
}

export default function LiveShoppingPage({
  selectedRoomId,
  onChangeRoom,
  onSelectProduct,
  onProceedToCheckout,
  onOpenCreate,
  onExit,
  onSellerCentre,
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
  const activeRoom = activeRooms.find((r) => r.id === selectedRoomId) || activeRooms[0] || null;

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [, setViewerCount] = useState(0);
  const [heartsCount, setHeartsCount] = useState(0);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [giftingModalOpen, setGiftingModalOpen] = useState(false);
  const [desktopEndConfirm, setDesktopEndConfirm] = useState(false);
  const [desktopAnalyticsOpen, setDesktopAnalyticsOpen] = useState(false);

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
    // Server response updates the room counts; never display a fake local reaction.
    await likeLiveRoom(activeRoom.id);
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
      <MobileLiveEmptyStage
        isApprovedSeller={isApprovedSeller}
        liveStreamingConfigured={liveStreamingConfigured}
        onOpenCreate={onOpenCreate}
        onExit={onExit}
      />
      <DesktopLiveEmptyStage isApprovedSeller={isApprovedSeller}
        liveStreamingConfigured={liveStreamingConfigured}
        hasEndedRoom={liveRooms.some(room=>room.status==='ended' && room.sellerId===currentUser.id)}
        onOpenCreate={onOpenCreate}
        onExit={onExit}
        onSellerCentre={onSellerCentre}
      />
      </>
    );
  }

  const pinnedProduct = activeRoom.pinnedProduct || (activeRoom.pinnedProductId ? products.find((p) => p.id === activeRoom.pinnedProductId) || null : null);

  const sellerPublished = products.filter(product =>
    product.sellerId === activeRoom.sellerId && product.publication === 'published' && !product.archived
  );
  const addMobileCart = async (product: ProductItem) => { await addToCart(product, 1); };
  const endMobileRoom = async () => {
    await stopCloudflareStream();
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
      onChangeRoom={onChangeRoom}
      onAddToCart={(product) => void addMobileCart(product)}
      onBuy={(product) => void handleBuyPinned(product)}
      onSelectProduct={onSelectProduct}
      onShareNotice={(text) => showToast(text, 'info')}
    />
    <div className="cnc-desktop-live-workspace hidden md:block space-y-6 pb-16">
      <div className="cnc-desktop-live-heading">
        <div>
          <span className="cnc-desktop-live-eyebrow"><Radio size={15}/> CASH N CARRY LIVE</span>
          <h1>Livestreaming <span>Seller Experience</span></h1>
          <p>Shop live, pin products and chat with buyers.</p>
        </div>
        <div className="cnc-desktop-live-heading-actions">
          <span className="cnc-desktop-live-heading-pill"><CheckCircle2 size={16}/>
            {liveStreamingConfigured ? 'Cloudflare Stream configured' : 'Stream not configured'}
          </span>
          <button type="button" className="cnc-desktop-neon-secondary" onClick={()=>{
            if(isHost)setDesktopEndConfirm(true);
            else onExit?.();
          }}> {isHost ? 'End or leave room' : 'Return to shop'}</button>
        </div>
      </div>
      {/* Room Selector */}
      {activeRooms.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {activeRooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => onChangeRoom(room.id)}
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

      <div className="cnc-desktop-live-grid grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Room Stage */}
        <div className="cnc-desktop-live-stage relative aspect-[4/3] sm:aspect-video w-full overflow-hidden rounded-3xl bg-slate-950 shadow-2xl lg:col-span-2 border border-slate-800 flex flex-col justify-between p-6 text-white">
          <div className="cnc-desktop-live-stage-top flex items-center justify-between gap-3">
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

          <div className="cnc-desktop-live-stage-art" aria-hidden="true"><Radio size={78}/></div>
          {isHost && getLivePublisherPreview() ? (
            <DesktopHostPreview />
          ) : liveStreamingConfigured && validWhep(activeRoom.streamUrl) ? (
            <div className="cnc-desktop-live-stage-video">
              <CloudflareStreamPlayer url={activeRoom.streamUrl} className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="cnc-desktop-live-stage-title my-auto text-center space-y-2 py-8 relative z-10">
            <h1 className="text-xl sm:text-2xl font-black">{activeRoom.title}</h1>
            {!validWhep(activeRoom.streamUrl) && (
              <p className="text-xs">Live video is not connected to this room.</p>
            )}
          </div>

          <div className="cnc-desktop-live-stage-bottom flex flex-wrap items-end justify-between gap-3">
            {pinnedProduct ? (
              <div className="cnc-desktop-live-pinned flex max-w-sm items-center gap-3 rounded-2xl bg-black/80 p-2.5 border border-white/20">
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
                  onClick={() => isHost ? onSelectProduct(pinnedProduct) : void handleBuyPinned(pinnedProduct)}
                  className="shrink-0 rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-500"
                  disabled={pinnedProduct.stock < 1}
                >
                  {pinnedProduct.stock < 1 ? 'Sold out' : isHost ? 'View product' : 'Buy now'}
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300">
                No product pinned yet.
              </div>
            )}


          </div>
        </div>

        {/* Live Audience Chat */}
        <div className="cnc-desktop-live-chat flex h-[min(58dvh,500px)] min-h-[280px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="cnc-desktop-live-chat-head flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <MessageCircle size={15} className="text-[#0c5c36]" />
              <span>Live Chat</span>
            </div>
          </div>

          <div className="cnc-desktop-live-chat-list flex-1 overflow-y-auto p-4 space-y-2.5" role="log" aria-label="Live chat messages">
            {comments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No messages yet. Say hello to the seller!
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="cnc-desktop-live-comment rounded-2xl bg-slate-50 p-2.5 text-xs text-slate-800">
                  <div className="font-bold text-[11px] text-[#0c5c36]">{c.userName}</div>
                  <div>{c.body}</div>
                </div>
              ))
            )}
          </div>

          <div className="cnc-desktop-live-chat-actions flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
            {!isHost && (            <button
              type="button"
              onClick={() => setGiftingModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-extrabold text-amber-900"
            >
              <Coins size={14} className="text-amber-600" />
              <span>Send Gift ({(currentUser.coins ?? 0).toLocaleString()} coins)</span>
            </button>)}

            <button
              type="button"
              onClick={() => void handleHeart()}
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100"
            >
              <Heart size={15} className="fill-rose-500 text-rose-500" />
              <span>{heartsCount.toLocaleString()}</span>
            </button>
          </div>

          <form onSubmit={handleSendComment} className="cnc-desktop-live-chat-form border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-2">
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
      <div className="cnc-desktop-live-toolbar" aria-label="Livestream controls">
        {isHost && <DesktopLiveMediaControls/>}
        <button type="button" onClick={async()=>{
          const url=new URL(window.location.href);url.searchParams.set('tab','live');url.searchParams.set('room',activeRoom.id);
          try{
            if(navigator.share) await navigator.share({title:activeRoom.title,url:url.href});
            else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);showToast('Livestream link copied.','info');}
            else showToast('Sharing is unavailable in this browser.','info');
          }catch(error){if(!(error instanceof Error&&error.name==='AbortError'))showToast('Could not share livestream.','error');}
        }}><Share2 size={18}/> Share</button>
        <button type="button" onClick={()=>setDesktopAnalyticsOpen(x=>!x)}
          aria-expanded={desktopAnalyticsOpen}><BarChart3 size={19}/> Analytics</button>
        {isHost && <button type="button" onClick={()=>setPinModalOpen(true)}><Pin size={19}/> Pin product</button>}
        {isHost && <button type="button" className="cnc-desktop-live-end" onClick={()=>setDesktopEndConfirm(true)}>
          <X size={18}/> End live</button>}
      </div>
      {desktopAnalyticsOpen&&<div className="cnc-desktop-live-analytics" aria-label="Loaded live room metrics">
        <strong>Room activity</strong>
        <span><Users size={16}/>{activeRoom.viewerCount.toLocaleString('en-NG')} viewers reported</span>
        <span><Heart size={16}/>{activeRoom.heartsCount.toLocaleString('en-NG')} likes</span>
        <span><MessageCircle size={16}/>{comments.length} comments loaded</span>
      </div>}
    </div>
    {desktopEndConfirm&&isHost&&(
      <div className="cnc-desktop-live-end-backdrop">
        <div className="cnc-desktop-live-end-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cnc-desktop-end-title">
          <Radio size={34}/>
          <h2 id="cnc-desktop-end-title">End this livestream?</h2>
          <p>Buyers will leave the live shopping room and your Cloudflare broadcast will stop.</p>
          <div>
            <button type="button" className="cnc-desktop-neon-secondary" onClick={()=>setDesktopEndConfirm(false)}>Keep streaming</button>
            <button type="button" className="cnc-desktop-neon-primary" onClick={async()=>{
              setDesktopEndConfirm(false);
              await stopCloudflareStream();
              const result=await endLiveRoom(activeRoom.id);
              if(!result.ok)showToast(result.error||'Could not end livestream.','error');
            }}>End livestream</button>
          </div>
        </div>
      </div>
    )}

      {/* Host Pin Product Modal */}
      {pinModalOpen && isHost && (
        <div className="cnc-live-backdrop-glass fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="cnc-live-dialog-glass w-full max-w-md rounded-3xl bg-white p-6 space-y-4 shadow-2xl">
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
        <div className="cnc-live-backdrop-glass fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="cnc-live-dialog-glass w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center space-y-4">
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
