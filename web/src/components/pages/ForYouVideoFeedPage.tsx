import DepthArtwork from '../ui/DepthArtwork';
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ShortVideo, ProductItem } from '../../types';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  ShoppingBag,
  Zap,
  CheckCircle2,
  Plus,
  X,
  Send,
  Flag,
  ChevronDown,
  ChevronUp,
  Video,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface ForYouVideoFeedProps {
  onSelectProduct: (product: ProductItem) => void;
  onProceedToCheckout: () => void;
  onBack?: () => void;
  onOpenCreate?: () => void;
}

export default function ForYouVideoFeedPage({
  onSelectProduct,
  onProceedToCheckout,
  onBack,
  onOpenCreate,
}: ForYouVideoFeedProps) {
  const {
    currentUser,
    isApprovedSeller,
    isAdmin,
    shortVideos,
    videosState,
    reloadMarketplace,
    likeVideo,
    followSeller,
    loadVideoComments,
    addVideoComment,
    deleteVideo,
    reportVideo,
    addToCart,
    showToast,
  } = useStore();

  const [feedMode, setFeedMode] = useState<'for-you' | 'following'>('for-you');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [canUseFullscreen, setCanUseFullscreen] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogControl = useRef<HTMLButtonElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const wheel = useRef({ total: 0, lastEvent: -Infinity, advanced: false });

  const filteredVideos = shortVideos.filter((v) =>
    feedMode === 'following' ? Boolean(v.following) : true
  );

  const safeIndex = filteredVideos.length > 0 ? Math.min(activeIndex, filteredVideos.length - 1) : 0;
  const activeVideo = filteredVideos[safeIndex] || null;

  const activeVideoId = activeVideo?.id;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {
        if (videoRef.current === video && !video.muted) setIsMuted(true);
      });
    } else {
      video.pause();
    }
  }, [activeVideoId, isPlaying, isMuted, videosState.status]);

  useEffect(() => {
    setCanUseFullscreen(document.fullscreenEnabled === true);
    const updateFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current && stageRef.current !== null);
    };
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    if (activeVideoId && document.activeElement === document.body) stageRef.current?.focus({ preventScroll: true });
  }, [activeVideoId]);

  useEffect(() => {
    if (commentsOpen || reportOpen) {
      dialogControl.current?.focus();
    } else if (dialogTrigger.current) {
      dialogTrigger.current.focus();
      dialogTrigger.current = null;
    }
  }, [commentsOpen, reportOpen]);

  useEffect(() => {
    if (commentsOpen && activeVideoId) void loadVideoComments(activeVideoId);
  }, [commentsOpen, activeVideoId, loadVideoComments]);

  const moveVideo = (direction: -1 | 1) => {
    const next = safeIndex + direction;
    if (next < 0 || next >= filteredVideos.length) return;
    setActiveIndex(next);
    setIsPlaying(true);
    setCommentInput('');
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (commentsOpen || reportOpen || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const state = wheel.current;
    const now = performance.now();
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? event.currentTarget.clientHeight : 1);
    if (now - state.lastEvent > 160) {
      state.total = 0;
      state.advanced = false;
    }
    state.lastEvent = now;
    if (state.advanced) return;
    if (Math.sign(pixels) !== Math.sign(state.total)) state.total = 0;
    state.total += pixels;
    if (Math.abs(state.total) >= 45) {
      moveVideo(state.total > 0 ? 1 : -1);
      state.advanced = true;
    }
  };

  const handleKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (commentsOpen || reportOpen) {
      if (event.key === 'Escape') {
        setCommentsOpen(false);
        setReportOpen(false);
        event.stopPropagation();
      }
      return;
    }
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]'))) return;
    if (['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      moveVideo(event.key === 'ArrowDown' || event.key === 'PageDown' ? 1 : -1);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStart.current = null;
    const vertical = start.y - event.clientY;
    const horizontal = start.x - event.clientX;
    suppressClick.current = Math.hypot(vertical, horizontal) > 15;
    if (Math.abs(vertical) >= 45 && Math.abs(vertical) > Math.abs(horizontal)) {
      moveVideo(vertical > 0 ? 1 : -1);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === stageRef.current) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      showToast('Browser full screen is unavailable.', 'info');
    }
  };

  const handleShare = async (video: ShortVideo) => {
    const shareUrl = `${window.location.origin}/?tab=for-you`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title || video.caption, url: shareUrl });
      } catch {
        // dismissed
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied to clipboard.', 'info');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeVideo) return;
    const ok = await addVideoComment(activeVideo.id, commentInput.trim());
    if (ok) setCommentInput('');
  };

  const handleBuyNow = async (product: ProductItem) => {
    if (await addToCart(product, 1)) onProceedToCheckout();
  };

  if (videosState.status === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950 text-white p-6">
        <p className="text-sm font-semibold text-slate-300">Loading videos...</p>
      </div>
    );
  }

  if (videosState.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
        <AlertCircle size={40} className="text-rose-400" />
        <h2 className="text-lg font-black">Video unavailable</h2>
        <p className="text-xs text-slate-300 max-w-xs">{videosState.error}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void reloadMarketplace()}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-xs font-black text-white"
          >
            <RefreshCw size={14} /> Retry
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/20 px-5 py-2.5 text-xs font-bold text-white"
            >
              Back to Shop
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!activeVideo) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950 text-white p-6 text-center space-y-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
          >
            <ArrowLeft size={16} /> Back to Shop
          </button>
        )}
        <DepthArtwork icon={Video} />
        <h2 className="text-xl font-black text-white">
          No videos yet.
        </h2>
        <p className="text-xs text-slate-400 max-w-xs">
          {feedMode === 'following'
            ? 'Follow sellers in the marketplace to see their uploaded product videos here.'
            : isApprovedSeller
            ? 'Upload a product video from your Seller Studio to appear in For You.'
            : 'Verified sellers will publish vertical product clips here.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {feedMode === 'following' && (
            <button
              type="button"
              onClick={() => { setFeedMode('for-you'); setActiveIndex(0); setIsPlaying(true); }}
              className="rounded-full bg-[#0c5c36] px-6 py-2.5 text-xs font-black text-white"
            >
              View All Videos
            </button>
          )}
          {isApprovedSeller && onOpenCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="rounded-full bg-orange-500 px-6 py-2.5 text-xs font-black text-white"
            >
              Upload Video
            </button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/20 px-6 py-2.5 text-xs font-bold text-white"
            >
              Explore Shop
            </button>
          )}
        </div>
      </div>
    );
  }

  const canDelete = isAdmin || (isApprovedSeller && activeVideo.sellerId === currentUser.id);

  return (
    <div
      ref={stageRef}
      className="cnc-for-you relative h-full w-full overflow-hidden bg-black text-white"
      aria-label="For You video feed"
      tabIndex={0}
      onWheel={handleWheel}
      onKeyDown={handleKeys}
    >
      <div className="absolute inset-0" inert={commentsOpen || reportOpen}>
        <video
          key={activeVideo.id}
          ref={videoRef}
          src={activeVideo.videoUrl}
          poster={activeVideo.posterUrl || undefined}
          loop
          playsInline
          muted={isMuted}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <button type="button"
          className="cnc-for-you-surface absolute inset-0 h-full w-full"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStart.current = null; }}
          onClick={(event) => {
            if (event.detail > 0 && suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            setIsPlaying((playing) => !playing);
          }}
        />

        {!isPlaying && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white border border-white/30">
              <Play size={32} className="fill-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Top Overlay */}
      <div inert={commentsOpen || reportOpen} className="cnc-for-you-top pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-3 pb-6 sm:px-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white border border-white/20 hover:bg-black/60"
            >
              <ArrowLeft size={16} />
              <span className="sr-only sm:not-sr-only">Back to Shop</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm font-bold">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(true);
              setFeedMode('following');
              setActiveIndex(0);
            }}
            aria-pressed={feedMode === 'following'}
            className={`transition ${
              feedMode === 'following' ? 'font-black text-white border-b-2 border-white pb-0.5' : 'text-white/60 hover:text-white'
            }`}
          >
            Following
          </button>
          <span className="text-white/30 text-xs">|</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(true);
              setFeedMode('for-you');
              setActiveIndex(0);
            }}
            aria-pressed={feedMode === 'for-you'}
            className={`transition ${
              feedMode === 'for-you' ? 'font-black text-orange-400 border-b-2 border-orange-500 pb-0.5' : 'text-white/60 hover:text-white'
            }`}
          >
            For You
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void deleteVideo(activeVideo.id);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600/80 text-white hover:bg-rose-700"
              title="Delete video"
              aria-label="Delete video"
            >
              <Trash2 size={15} />
            </button>
          )}
          {canUseFullscreen && (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="cnc-for-you-control"
              aria-label={isFullscreen ? 'Exit browser full screen' : 'Enter browser full screen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted((prev) => !prev);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white border border-white/20"
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      <div inert={commentsOpen || reportOpen} className="cnc-for-you-actions absolute z-20 flex flex-col items-center">
        {filteredVideos.length > 1 && (
          <div className="flex flex-col gap-1" aria-label="Video navigation">
            <button type="button" onClick={() => moveVideo(-1)} disabled={safeIndex === 0}
              className="cnc-for-you-control" aria-label="Previous video">
              <ChevronUp size={19} />
            </button>
            <button type="button" onClick={() => moveVideo(1)} disabled={safeIndex === filteredVideos.length - 1}
              className="cnc-for-you-control" aria-label="Next video">
              <ChevronDown size={19} />
            </button>
          </div>
        )}

        <div className="relative mb-2 flex flex-col items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#0c5c36] text-xs font-black text-white shadow-lg">
            {activeVideo.sellerName.slice(0, 2).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void followSeller(activeVideo.sellerId);
            }}
            className={`absolute -bottom-2 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-md ${
              activeVideo.following ? 'bg-emerald-600' : 'bg-orange-500'
            }`}
            aria-label={activeVideo.following ? 'Unfollow seller' : 'Follow seller'}
            aria-pressed={Boolean(activeVideo.following)}
          >
            {activeVideo.following ? <CheckCircle2 size={13} /> : <Plus size={13} />}
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void likeVideo(activeVideo.id);
          }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Like video"
          aria-pressed={Boolean(activeVideo.liked)}
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md ${
              activeVideo.liked ? 'bg-rose-500 text-white' : 'bg-black/40 text-white'
            }`}
          >
            <Heart size={22} className={activeVideo.liked ? 'fill-white stroke-none' : ''} />
          </div>
          <span className="text-[11px] font-black">{activeVideo.likesCount.toLocaleString()}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dialogTrigger.current = e.currentTarget;
            setCommentsOpen(true);
          }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Comments"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white">
            <MessageCircle size={22} />
          </div>
          <span className="text-[11px] font-black">{activeVideo.commentsCount.toLocaleString()}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleShare(activeVideo);
          }}
          className="flex flex-col items-center gap-1 text-white"
          aria-label="Share video"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white">
            <Share2 size={20} />
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dialogTrigger.current = e.currentTarget;
            setReportOpen(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/70 hover:text-white"
          aria-label="Report video"
        >
          <Flag size={14} />
        </button>
      </div>

      {/* Bottom Product Pill */}
      <div inert={commentsOpen || reportOpen} className="cnc-for-you-caption pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/75 to-transparent px-3 pt-6 sm:px-4">
        <div className="max-w-lg space-y-2.5">
        <div className="pr-16 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white">{activeVideo.sellerName}</span>
            {activeVideo.sellerVerified && (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-700/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                <CheckCircle2 size={10} /> Verified
              </span>
            )}
          </div>
          <p className="text-xs text-white/90 line-clamp-2">{activeVideo.caption}</p>
        </div>

        {activeVideo.taggedProduct && (
          <div className="rounded-2xl border border-white/20 bg-white/15 backdrop-blur-md p-2.5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <button type="button"
                onClick={() => onSelectProduct(activeVideo.taggedProduct!)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                {activeVideo.taggedProduct.image && (
                  <img
                    src={activeVideo.taggedProduct.image}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover shrink-0 border border-white/20"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white truncate">{activeVideo.taggedProduct.title}</div>
                  <div className="text-xs font-black text-emerald-400">
                    ₦{activeVideo.taggedProduct.price.toLocaleString('en-NG')}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void addToCart(activeVideo.taggedProduct!, 1);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-white/20 hover:bg-white/30 text-white px-2.5 py-2 text-xs font-black"
                  aria-label="Add to Cart"
                >
                  <ShoppingBag size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleBuyNow(activeVideo.taggedProduct!);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 text-xs font-black"
                >
                  <Zap size={14} className="fill-white" />
                  <span>Buy</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Comments Drawer */}
      {commentsOpen && (
        <div
          onClick={() => setCommentsOpen(false)}
          className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Video comments"
            className="cnc-for-you-sheet flex max-h-[75%] flex-col rounded-t-3xl bg-white text-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="text-sm font-black text-slate-900">
                Comments ({activeVideo.comments?.length ?? activeVideo.commentsCount})
              </div>
              <button type="button" ref={dialogControl} onClick={() => setCommentsOpen(false)} aria-label="Close comments" className="rounded-full p-2 text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 divide-y divide-slate-100">
              {!activeVideo.comments || activeVideo.comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No comments yet.</div>
              ) : (
                activeVideo.comments.map((comment) => (
                  <div key={comment.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-[#0c5c36]">
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{comment.userName}</span>
                        <span className="text-[10px] text-slate-400">{comment.createdAt.slice(0, 10)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="border-t border-slate-100 p-3 flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                aria-label="Comment"
                placeholder="Ask a question about this item..."
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                aria-label="Send comment"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0c5c36] text-white disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div
          onClick={() => setReportOpen(false)}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Report video" className="w-full max-w-xs rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
            <h3 className="text-sm font-black text-slate-900">Report Video</h3>
            <div className="mt-3 space-y-1.5 text-xs font-semibold text-slate-700">
              {['Counterfeit product', 'Misleading price', 'Inappropriate content', 'Spam or scam'].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    void reportVideo(activeVideo.id, reason);
                    setReportOpen(false);
                  }}
                  className="w-full rounded-xl bg-slate-50 p-2 text-left hover:bg-rose-50 hover:text-rose-700"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              type="button"
              ref={dialogControl}
              onClick={() => setReportOpen(false)}
              className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
