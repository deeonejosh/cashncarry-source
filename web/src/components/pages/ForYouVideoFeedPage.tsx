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
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const filteredVideos = shortVideos.filter((v) =>
    feedMode === 'following' ? Boolean(v.following) : true
  );

  const safeIndex = filteredVideos.length > 0 ? Math.min(activeIndex, filteredVideos.length - 1) : 0;
  const activeVideo = filteredVideos[safeIndex] || null;

  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === safeIndex && isPlaying) {
        vid.muted = isMuted;
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
      } else {
        vid.pause();
      }
    });
  }, [safeIndex, isPlaying, isMuted, filteredVideos.length]);

  useEffect(() => {
    if (commentsOpen && activeVideo?.id) {
      void loadVideoComments(activeVideo.id);
    }
  }, [commentsOpen, activeVideo?.id, loadVideoComments]);

  const handleNext = () => {
    if (filteredVideos.length === 0) return;
    setActiveIndex((prev) => (prev + 1 < filteredVideos.length ? prev + 1 : 0));
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setActiveIndex(safeIndex - 1);
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    const currentVideo = videoRefs.current[safeIndex];
    if (!currentVideo) return;
    if (isPlaying) {
      currentVideo.pause();
      setIsPlaying(false);
    } else {
      currentVideo.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const diff = touchStartY - e.changedTouches[0].clientY;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    setTouchStartY(null);
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
    await addToCart(product, 1);
    onProceedToCheckout();
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-emerald-400">
          <Video size={32} />
        </div>
        <h2 className="text-xl font-black text-white">
          {feedMode === 'following'
            ? 'No videos yet.'
            : 'No videos yet.'}
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
              onClick={() => setFeedMode('for-you')}
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
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 h-[100dvh] w-screen bg-black text-white select-none overflow-hidden flex items-center justify-center p-0 m-0'
          : 'relative w-full h-[100dvh] md:h-[100vh] bg-black text-white select-none overflow-hidden flex items-center justify-center p-0 m-0'
      }
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="relative h-[100dvh] md:h-[100vh] w-full [aspect-ratio:9/16] md:max-w-[calc(100vh*9/16)] mx-auto cursor-pointer overflow-hidden bg-black flex items-center justify-center p-0 m-0"
        onClick={togglePlayPause}
      >
        <video
          key={activeVideo.id}
          ref={(el) => {
            videoRefs.current[safeIndex] = el;
          }}
          src={activeVideo.videoUrl}
          poster={activeVideo.posterUrl || undefined}
          loop
          playsInline
          muted={isMuted}
          className="absolute inset-0 h-full w-full object-cover"
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
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-4 pb-8 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
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
              <span className="hidden sm:inline">Shop</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm font-bold">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFeedMode('following');
              setActiveIndex(0);
            }}
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
              setFeedMode('for-you');
              setActiveIndex(0);
            }}
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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen((prev) => !prev);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white border border-white/20"
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
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

      {/* Desktop Navigation Arrows */}
      {filteredVideos.length > 1 && (
        <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={safeIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      )}

      {/* Right Sidebar Controls */}
      <div className="absolute right-3 bottom-[calc(9.8rem+env(safe-area-inset-bottom))] md:bottom-32 z-20 flex flex-col items-center gap-3.5">
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
            title={activeVideo.following ? 'Unfollow seller' : 'Follow seller'}
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
            setReportOpen(true);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/70 hover:text-white"
          title="Report video"
        >
          <Flag size={14} />
        </button>
      </div>

      {/* Bottom Product Pill */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/85 to-transparent px-4 pt-12 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6 space-y-2.5">
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
              <div
                onClick={() => onSelectProduct(activeVideo.taggedProduct!)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
              >
                {activeVideo.taggedProduct.image && (
                  <img
                    src={activeVideo.taggedProduct.image}
                    alt={activeVideo.taggedProduct.title}
                    className="h-12 w-12 rounded-xl object-cover shrink-0 border border-white/20"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white truncate">{activeVideo.taggedProduct.title}</div>
                  <div className="text-xs font-black text-emerald-400">
                    ₦{activeVideo.taggedProduct.price.toLocaleString('en-NG')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void addToCart(activeVideo.taggedProduct!, 1);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-white/20 hover:bg-white/30 text-white px-2.5 py-2 text-xs font-black"
                  title="Add to Cart"
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

      {/* Comments Drawer */}
      {commentsOpen && (
        <div
          onClick={() => setCommentsOpen(false)}
          className="absolute inset-0 z-40 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[70%] flex-col rounded-t-3xl bg-white text-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="text-sm font-black text-slate-900">
                Comments ({activeVideo.comments?.length ?? activeVideo.commentsCount})
              </div>
              <button type="button" onClick={() => setCommentsOpen(false)} className="rounded-full p-1 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
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
                placeholder="Ask a question about this item..."
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
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
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
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
