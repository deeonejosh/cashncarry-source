import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, Gift, Heart, MessageCircle, MoreHorizontal, Package,
  Pin, Radio, Send, Share2, ShoppingBag, Sparkles, Users, X, ShieldCheck,
} from 'lucide-react';
import type { LiveRoom, ProductItem, LiveComment } from '../../types';
import './mobile-live-glass.css';
import CloudflareStreamPlayer from './CloudflareStreamPlayer';
import {validWhep} from '../../lib/cloudflare-stream-webrtc';

interface Props {
  room: LiveRoom;
  rooms: LiveRoom[];
  sellerProducts: ProductItem[];
  comments: LiveComment[];
  commentValue: string;
  heartsCount: number;
  coinBalance: number;
  isHost: boolean;
  videoConfigured: boolean;
  onCommentChange: (value: string) => void;
  onSendComment: (event: React.FormEvent) => void;
  onHeart: () => void;
  onOpenGift: () => void;
  onPin: () => void;
  onEndRoom: () => void;
  onExit: () => void;
  onChangeRoom: (roomId: string) => void;
  onAddToCart: (product: ProductItem) => void;
  onBuy: (product: ProductItem) => void;
  onSelectProduct: (product: ProductItem) => void;
  onShareNotice: (message: string) => void;
}
const naira = (value: number) => '₦' + value.toLocaleString('en-NG');

export default function MobileLiveStage({
  room, rooms, sellerProducts, comments, commentValue, heartsCount, coinBalance,
  isHost, videoConfigured, onCommentChange, onSendComment, onHeart, onOpenGift,
  onPin, onEndRoom, onExit, onChangeRoom, onAddToCart, onBuy, onSelectProduct,
  onShareNotice,
}: Props) {
  const [panel, setPanel] = useState<'products' | 'more' | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [moreRooms, setMoreRooms] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);
  const pinned = room.pinnedProduct || sellerProducts.find(p => p.id === room.pinnedProductId) || null;
  const featured = pinned || sellerProducts[0] || null;
  const available = sellerProducts.filter(p => p.publication === 'published' && !p.archived);
  const videoUrl = videoConfigured && validWhep(room.streamUrl) ? room.streamUrl : null;

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [comments.length, room.id]);
  useEffect(() => { setPanel(null); setConfirmEnd(false); setMoreRooms(false); }, [room.id]);

  const shareRoom = async () => {
    const url = window.location.origin + '/?tab=live&room=' + encodeURIComponent(room.id);
    try {
      if (navigator.share) await navigator.share({ title: room.title, text: 'Join Cash N Carry live shopping', url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        onShareNotice('Livestream link copied.');
      } else onShareNotice('Sharing is unavailable in this browser.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      onShareNotice('Could not share this livestream.');
    }
  };

  return (
    <section className="cnc-mobile-live-shell md:hidden" aria-label="Mobile livestream shopping room">
      <div className="cnc-mobile-live-universe" aria-hidden="true">
        <span className="cnc-mobile-live-orb cnc-mobile-live-orb--one" />
        <span className="cnc-mobile-live-orb cnc-mobile-live-orb--two" />
        <span className="cnc-mobile-live-orb cnc-mobile-live-orb--three" />
        <span className="cnc-mobile-live-planet" />
        <span className="cnc-mobile-live-floor" />
      </div>
      {videoUrl && <CloudflareStreamPlayer url={videoUrl} className="cnc-mobile-live-video" />}
      <div className="cnc-mobile-live-shade" aria-hidden="true" />

      <header className="cnc-mobile-live-top">
        <div className="cnc-mobile-live-top-row">
          <button type="button" className="cnc-live-icon-glass" onClick={isHost ? () => setConfirmEnd(true) : onExit} aria-label="Leave livestream"><ArrowLeft size={19}/></button>
          <span className="cnc-mobile-live-brand" aria-label="Cash N Carry">Cash<span>N</span>Carry</span>
          <span className="cnc-mobile-live-pill cnc-mobile-live-pill--live"><Radio size={13}/> LIVE ROOM</span>
          <button type="button" className="cnc-live-icon-glass" onClick={() => void shareRoom()} aria-label="Share livestream"><Share2 size={19}/></button>
        </div>
        <div className="cnc-mobile-live-host-strip">
          <div className="cnc-mobile-live-avatar">{room.sellerName.trim().slice(0, 1).toUpperCase()}</div>
          <div className="cnc-mobile-live-host-copy">
            <div className="cnc-mobile-live-seller-name">{room.sellerName}<CheckCircle2 size={13} color="#52f2b0"/></div>
            <span className="cnc-mobile-live-subtitle">{isHost ? 'Seller controls' : 'Shop with a verified seller'}</span>
          </div>
          <span className="cnc-mobile-live-pill"><Users size={12}/> {room.viewerCount > 0 ? room.viewerCount.toLocaleString('en-NG') : 'Room open'}</span>
        </div>
        {rooms.length > 1 && (
          <div className="cnc-mobile-live-room-switch">
            <button type="button" className="cnc-mobile-live-pill" onClick={() => setMoreRooms(v => !v)}
              aria-expanded={moreRooms} aria-controls="cnc-mobile-live-room-list">Switch live room</button>
            {moreRooms && <div id="cnc-mobile-live-room-list" className="cnc-mobile-live-room-list">
              {rooms.map(item => <button type="button" key={item.id} onClick={() => onChangeRoom(item.id)}
                aria-current={room.id === item.id ? 'true' : undefined}>{item.title} · {item.sellerName}</button>)}
            </div>}
          </div>
        )}
      </header>

      <div className="cnc-mobile-live-hero">
        {featured?.image && !videoUrl ? (
          <img className="cnc-mobile-live-hero-product" src={featured.image} alt={featured.title} loading="eager"/>
        ) : !videoUrl ? (
          <div className="cnc-mobile-live-hero-icon"><ShoppingBag size={66} strokeWidth={1.4}/></div>
        ) : null}
        {!videoUrl && <div className="cnc-mobile-live-video-state" role="status">
          <span className="cnc-mobile-live-video-dot"/>
          {videoConfigured ? 'Waiting for video connection' : 'Video broadcasting is not configured'}
        </div>}
        <div className="cnc-mobile-live-session-title">{room.title}</div>
      </div>

      <div className="cnc-mobile-live-chat" role="log" aria-label="Live chat messages">
        {comments.length === 0 ? (
          <p className="cnc-mobile-live-chat-empty">Welcome! Be the first to chat.</p>
        ) : comments.map(message =>
          <div key={message.id} className="cnc-mobile-live-chat-bubble"><strong>{message.userName}</strong> {message.body}</div>
        )}
        <div ref={chatEnd}/>
      </div>

      <div className="cnc-mobile-live-rail" aria-label={isHost ? 'Seller livestream controls' : 'Buyer livestream controls'}>
        <button type="button" className="cnc-mobile-live-rail-button" onClick={onHeart} aria-label="Like this room">
          <Heart size={22} className="cnc-mobile-live-heart"/><span>{heartsCount > 0 ? heartsCount.toLocaleString('en-NG') : 'Like'}</span>
        </button>
        <button type="button" className="cnc-mobile-live-rail-button" onClick={() => setPanel('products')} aria-label="View products">
          <ShoppingBag size={22}/><span>Products</span>
        </button>
        {isHost ? <>
          <button type="button" className="cnc-mobile-live-rail-button" onClick={onPin} aria-label="Pin a published product">
            <Pin size={22}/><span>Pin</span></button>
          <button type="button" className="cnc-mobile-live-rail-button cnc-mobile-live-rail-button--end"
            onClick={() => setConfirmEnd(true)} aria-label="End live room"><X size={22}/><span>End</span></button>
        </> : <>
          <button type="button" className="cnc-mobile-live-rail-button" onClick={onOpenGift} aria-label="Send a gift">
            <Gift size={22}/><span>Gift</span></button>
          <button type="button" className="cnc-mobile-live-rail-button" onClick={() => setPanel('more')} aria-label="More options">
            <MoreHorizontal size={22}/><span>More</span></button>
        </>}
      </div>

      {pinned ? (
        <div className="cnc-mobile-live-pinned" aria-label="Pinned product">
          <button type="button" className="cnc-mobile-live-pinned-photo" onClick={() => onSelectProduct(pinned)}
            aria-label={'View '+pinned.title}>{pinned.image ? <img src={pinned.image} alt=""/> : <Package size={25}/>}</button>
          <div className="cnc-mobile-live-pinned-copy">
            <span className="cnc-mobile-live-pinned-label"><Pin size={11}/> PINNED PRODUCT</span>
            <span className="cnc-mobile-live-pinned-title">{pinned.title}</span>
            <span className="cnc-mobile-live-pinned-price">{naira(pinned.price)}</span>
          </div>
          <button type="button" className="cnc-mobile-live-buy-button" onClick={() => onBuy(pinned)} disabled={pinned.stock < 1}>
            {pinned.stock < 1 ? 'Sold out' : 'Buy now'}
          </button>
        </div>
      ) : (
        <button type="button" className="cnc-mobile-live-no-pin" onClick={isHost ? onPin : () => setPanel('products')}>
          <Sparkles size={16}/> {isHost ? 'Tap to pin a published product' : 'Browse this seller’s products'}
        </button>
      )}

      <form className="cnc-mobile-live-composer" onSubmit={onSendComment}>
        <MessageCircle size={18} className="cnc-mobile-live-compose-icon"/>
        <label className="sr-only" htmlFor="cnc-mobile-live-comment">Live comment</label>
        <input id="cnc-mobile-live-comment" value={commentValue} onChange={event => onCommentChange(event.target.value)}
          placeholder="Comment on this live..." maxLength={300} autoComplete="off"/>
        <button type="submit" disabled={!commentValue.trim()} aria-label="Send live comment"><Send size={19}/></button>
      </form>

      {panel && <div className="cnc-mobile-live-modal-backdrop" onClick={() => setPanel(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="cnc-mobile-live-sheet-title"
          className="cnc-mobile-live-sheet" onClick={event => event.stopPropagation()}>
          <div className="cnc-mobile-live-sheet-head">
            <div><span className="cnc-mobile-live-eyebrow">CASH N CARRY LIVE</span>
              <h2 id="cnc-mobile-live-sheet-title">{panel === 'products' ? 'Shop live products' : 'Room options'}</h2></div>
            <button type="button" onClick={() => setPanel(null)} className="cnc-live-icon-glass" aria-label="Close"><X size={20}/></button>
          </div>
          {panel === 'products' ? <div className="cnc-mobile-live-products">
            {available.length === 0 ? <p className="cnc-mobile-live-empty">No published products available from this seller yet.</p>
              : available.map(product => <article className="cnc-mobile-live-product-row" key={product.id}>
                <button type="button" className="cnc-mobile-live-product-thumb" onClick={() => { setPanel(null); onSelectProduct(product); }}>
                  {product.image ? <img src={product.image} alt={product.title}/> : <Package size={26}/>}
                </button>
                <div><h3>{product.title}</h3><p>{naira(product.price)}</p><span>{product.stock > 0 ? product.stock + ' in stock' : 'Out of stock'}</span></div>
                <button type="button" className="cnc-mobile-live-cart-add" disabled={product.stock < 1}
                  onClick={() => onAddToCart(product)} aria-label={'Add '+product.title+' to cart'}>
                  <ShoppingBag size={18}/></button>
              </article>)}
          </div> : <div className="cnc-mobile-live-more-actions">
            <p><ShieldCheck size={18}/> Prices and checkout are checked on the server.</p>
            <p>◉ Coin balance: {coinBalance.toLocaleString('en-NG')}</p>
            <button type="button" onClick={() => { setPanel(null); void shareRoom(); }}><Share2 size={17}/> Share livestream</button>
            <button type="button" onClick={() => { setPanel(null); onOpenGift(); }}><Gift size={17}/> Send gift</button>
          </div>}
        </section>
      </div>}

      {confirmEnd && isHost && <div className="cnc-mobile-live-modal-backdrop" onClick={() => setConfirmEnd(false)}>
        <section role="alertdialog" aria-modal="true" aria-label="Confirm end live room"
          className="cnc-mobile-live-sheet cnc-mobile-live-confirm" onClick={event => event.stopPropagation()}>
          <h2>End this shopping room?</h2>
          <p>Buyers will no longer be able to chat or shop from this active room.</p>
          <div className="cnc-mobile-live-confirm-actions">
            <button type="button" onClick={() => setConfirmEnd(false)}>Keep room open</button>
            <button type="button" onClick={() => { setConfirmEnd(false); onEndRoom(); }}>End live room</button>
          </div>
        </section>
      </div>}
    </section>
  );
}
