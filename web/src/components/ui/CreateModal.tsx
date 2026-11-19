import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import {publishCloudflareStream,stopCloudflareStream} from '../../lib/cloudflare-stream-webrtc';
import {
  X,
  Upload,
  Radio,
  Video,
  Sparkles,
  Store,
  Tag,
  CheckCircle2,
  Camera,
  Mic,
  MicOff,
  RotateCcw,
  Eye,
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock,
  LogIn,
  FileVideo,
} from 'lucide-react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);

export default function CreateModal({ isOpen, onClose, onNavigate }: CreateModalProps) {
  const {
    currentUser,
    isApprovedSeller,
    sellerApplication,
    sellerProducts,
    liveStreamingConfigured,
    uploadSellerVideo,
    createLiveRoom,
    endLiveRoom,
    openAuthModal,
    showToast,
  } = useStore();

  const [activeView, setActiveView] = useState<'menu' | 'upload-video' | 'go-live' | 'broadcasting'>('menu');

  // Video Upload State (Real File Picker + XHR upload)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCaption, setVideoCaption] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Go Live State
  const [streamTitle, setStreamTitle] = useState('');
  const [streamCategory, setStreamCategory] = useState('general');
  const [streamProductId, setStreamProductId] = useState<string>('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Only seller's OWN published products may be tagged
  const ownPublishedProducts = sellerProducts.filter((p) => p.publication === 'published');

  useEffect(() => {
    if (isOpen) {
      setActiveView('menu');
      setSelectedFile(null);
      setVideoTitle('');
      setVideoCaption('');
      setUploadProgress(0);
      setIsUploading(false);
      setUploadError(null);
      setStreamTitle('');
      setActiveRoomId(null);
      if (ownPublishedProducts.length > 0) {
        setSelectedProductId(ownPublishedProducts[0].id);
        setStreamProductId(ownPublishedProducts[0].id);
      } else {
        setSelectedProductId('');
        setStreamProductId('');
      }
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: true,
        });
        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } else {
        setCameraActive(false);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    }
    setMicMuted((m) => !m);
  };

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    stopCamera();
    await startCamera(nextFacing);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const lowerName = file.name.toLowerCase();
    const validType =
      ALLOWED_VIDEO_TYPES.has(file.type) ||
      lowerName.endsWith('.mp4') ||
      lowerName.endsWith('.webm');
    if (!validType) {
      setSelectedFile(null);
      setUploadError('Unsupported video format. Please choose an MP4 or WebM video file.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setSelectedFile(null);
      setUploadError('Video exceeds 25 MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!isApprovedSeller) {
      setUploadError('Only approved sellers can upload videos.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please choose a video file from your device.');
      return;
    }
    if (!videoTitle.trim() || !videoCaption.trim()) {
      setUploadError('Please provide both a video title and caption.');
      return;
    }
    if (!selectedProductId) {
      setUploadError('Please tag one of your published products.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    const res = await uploadSellerVideo(
      {
        file: selectedFile,
        title: videoTitle.trim(),
        caption: videoCaption.trim(),
        productId: selectedProductId,
      },
      (pct) => setUploadProgress(pct)
    );

    setIsUploading(false);
    if (!res.ok) {
      setUploadError(res.error || 'Video upload failed.');
      return;
    }
    onClose();
    onNavigate('for-you');
  };

  const handleCreateLiveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApprovedSeller) {
      showToast('Only approved sellers can start a livestream.', 'error');
      return;
    }
    if (!streamTitle.trim()) {
      showToast('Please enter a title for your livestream.', 'error');
      return;
    }

    if (!liveStreamingConfigured) {
      showToast('Cloudflare Stream is not connected for this seller yet.', 'error');
      return;
    }
    setIsCreatingRoom(true);
    let media = mediaStreamRef.current;
    try {
      if (!media?.active) {
        await startCamera(cameraFacing);
        media = mediaStreamRef.current;
      }
      if (!media?.active) throw new Error('Allow camera and microphone access to broadcast.');
      // Cloudflare WHIP must negotiate and report a connected WebRTC peer before
      // this staging browser can create a public shopping room.
      await publishCloudflareStream(media);
      const res = await createLiveRoom({
        title: streamTitle.trim(),
        category: streamCategory,
        pinnedProductId: streamProductId || undefined,
        broadcastConnected: true,
      });
      if (!res.ok || !res.roomId) {
        await stopCloudflareStream();
        throw new Error(res.error || 'Could not start a shopping room.');
      }
      setActiveRoomId(res.roomId);
      // Transfer media ownership from this modal to the app-level publisher.
      // The broadcast persists when the seller opens the full live page.
      mediaStreamRef.current = null;
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      onClose();
      onNavigate('live');
    } catch(error) {
      showToast(error instanceof Error ? error.message : 'Unable to start broadcast.', 'error');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleEndBroadcast = async () => {
    await stopCloudflareStream();
    if (activeRoomId) {
      await endLiveRoom(activeRoomId);
    }
    stopCamera();
    setActiveRoomId(null);
    onClose();
    onNavigate('live');
  };

  if (!isOpen) return null;

  const isGuest = !currentUser.authenticated;
  const isPendingSeller = !isGuest && currentUser.sellerStatus === 'pending';
  const isRejectedOrSuspended =
    !isGuest && (currentUser.sellerStatus === 'rejected' || currentUser.sellerStatus === 'suspended');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className={'cnc-depth-dialog relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 border border-slate-100 ' + (isApprovedSeller && (activeView === 'go-live' || activeView === 'broadcasting') ? 'cnc-mobile-studio-shell' : '')}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 font-black">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                {isGuest
                  ? 'Sign In Required'
                  : isPendingSeller
                  ? 'Seller Verification Status'
                  : !isApprovedSeller
                  ? 'Become a Seller'
                  : activeView === 'upload-video'
                  ? 'Upload Product Video'
                  : activeView === 'go-live'
                  ? 'Start Livestream'
                  : activeView === 'broadcasting'
                  ? 'Live Room Active'
                  : 'Seller Studio'}
              </h2>
              <p className="text-[10px] text-slate-500">
                {isApprovedSeller
                  ? 'Publish videos, broadcast live, or manage your catalog'
                  : 'Cash N Carry Nigeria Marketplace'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STATE 1: GUEST */}
          {isGuest && (
            <div className="space-y-5 py-2 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#0c5c36]">
                <LogIn size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">Sign in to Continue</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Please sign in or create an account to check your selling permissions or apply to become a verified seller.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal('Sign in or create an account to continue.');
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white shadow-md hover:bg-emerald-900 transition"
              >
                <LogIn size={16} />
                <span>Sign In / Create Account</span>
              </button>
            </div>
          )}

          {/* STATE 2: PENDING SELLER */}
          {isPendingSeller && (
            <div className="space-y-5 py-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                  <Clock size={28} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Your seller account is awaiting approval.
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {sellerApplication?.businessName ? (
                    <>
                      Application for <b>{sellerApplication.businessName}</b> is under review by our moderation team. Video uploads and livestream broadcasting unlock automatically upon approval.
                    </>
                  ) : (
                    'Video uploads and livestream broadcasting unlock once an administrator approves your seller application.'
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('seller-kyc');
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 transition"
              >
                <span>View Application Status</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* STATE 3: BUYER (or Rejected/Suspended Seller) */}
          {!isGuest && !isPendingSeller && !isApprovedSeller && (
            <div className="space-y-5 py-2">
              <div className="rounded-2xl bg-gradient-to-br from-[#0c5c36] to-[#06331e] p-6 text-white text-center space-y-3 shadow-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 text-orange-400">
                  <Store size={28} />
                </div>
                <h3 className="text-lg font-black tracking-tight">Become a Seller</h3>
                <p className="text-xs text-emerald-100/90 leading-relaxed max-w-sm mx-auto">
                  {isRejectedOrSuspended
                    ? currentUser.sellerStatus === 'suspended'
                      ? 'Your seller permissions are currently suspended. Contact support or review your seller status.'
                      : 'Your previous seller application was not approved. Update your business information and reapply to start selling.'
                    : 'Only approved sellers can post product videos, host livestreams, and publish products on Cash N Carry Nigeria.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Verified Seller Storefront:</span> Showcase products to shoppers across Nigeria.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Short Video &amp; Live Selling:</span> Pin your verified products in For You clips and live rooms.
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('seller-kyc');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-xs font-black text-white shadow-lg hover:bg-orange-600 transition"
                >
                  <Store size={16} />
                  <span>Start Selling</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: APPROVED SELLER MENU */}
          {isApprovedSeller && activeView === 'menu' && (
            <div className="space-y-4 py-1">
              <button
                type="button"
                onClick={() => setActiveView('upload-video')}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#0c5c36] hover:bg-emerald-50/40"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 group-hover:bg-[#0c5c36] group-hover:text-white transition">
                  <Video size={26} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-black text-slate-900">Upload Video</span>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload an MP4/WebM/MOV video from your device and tag a published product.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('go-live')}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-500 hover:bg-orange-50/40"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition">
                  <Radio size={26} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-black text-slate-900">Set Up Live Room</span>
                  <p className="mt-1 text-xs text-slate-500">
                    {liveStreamingConfigured
                      ? 'Set up a room for product pinning and chat. Video requires a separate broadcast connection.'
                      : 'Set up a room for product pinning and chat. Video streaming is unavailable in this environment.'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('seller-products');
                }}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-500 hover:bg-amber-50/40"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white transition">
                  <Zap size={26} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-black text-slate-900">Manage Products</span>
                  <p className="mt-1 text-xs text-slate-500">
                    Create, update, and submit inventory for publication.
                  </p>
                </div>
              </button>

              <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  <b>Account:</b> {currentUser.storeName || currentUser.name}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <ShieldCheck size={14} /> Approved Seller
                </span>
              </div>
            </div>
          )}

          {/* UPLOAD VIDEO VIEW */}
          {isApprovedSeller && activeView === 'upload-video' && (
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  Select Video File (MP4 or WebM · max 25 MB)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-5 px-4 text-xs font-bold text-slate-700 hover:border-[#0c5c36] hover:bg-emerald-50/40 transition"
                >
                  <FileVideo size={18} className="text-[#0c5c36]" />
                  <span>
                    {selectedFile
                      ? `${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`
                      : 'Choose video file from device'}
                  </span>
                </button>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700">Video Title</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Short product demo title"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-[#0c5c36] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700">Caption</label>
                <textarea
                  required
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="Describe your product clearly for shoppers..."
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-[#0c5c36] focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="video-product" className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                  <Tag size={14} className="text-orange-500" />
                  <span>Tag Your Published Product</span>
                </label>
                {ownPublishedProducts.length === 0 ? (
                  <div className="mt-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    You do not have any published products yet. Publish a product in Seller Centre before uploading a video.
                  </div>
                ) : (
                  <select
                    id="video-product"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold outline-none focus:border-[#0c5c36]"
                  >
                    {ownPublishedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₦{Math.round(p.priceMinor / 100).toLocaleString()}) · {p.stock} in stock
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isUploading && (
                <div className="space-y-1.5 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                  <div className="flex justify-between text-xs font-bold text-emerald-900">
                    <span>Uploading video to server...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-emerald-200 overflow-hidden">
                    <div
                      className="h-full bg-[#0c5c36] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView('menu')}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  disabled={isUploading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isUploading || ownPublishedProducts.length === 0 || !selectedFile}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3 text-xs font-black text-white hover:bg-emerald-900 disabled:opacity-50 transition"
                >
                  <Upload size={16} />
                  <span>{isUploading ? `Uploading ${uploadProgress}%` : 'Upload & Publish'}</span>
                </button>
              </div>
            </form>
          )}

          {/* GO LIVE VIEW */}
          {isApprovedSeller && activeView === 'go-live' && (
            <form onSubmit={handleCreateLiveRoom} className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="note">
                Starting a room opens shopping chat and product pinning. The camera shown here is a local preview only; it does not publish live video. {liveStreamingConfigured ? 'A separate streaming broadcast connection is required for viewers to receive video.' : 'Video relay ingestion is not configured.'}
              </div>

              <div className="cnc-mobile-studio-preview relative aspect-[9/10] w-full rounded-3xl bg-slate-900 overflow-hidden flex items-center justify-center">
                {cameraActive ? (
                  <video ref={videoPreviewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center p-6 space-y-3 text-white">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-400">
                      <Camera size={28} />
                    </div>
                    <div className="text-xs font-bold">Camera Preview</div>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-white"
                    >
                      Enable Camera
                    </button>
                  </div>
                )}

                <div className="cnc-mobile-studio-preview-pill">Camera preview only</div>
                <div className="cnc-mobile-studio-controls absolute top-3 right-3 flex gap-2 text-white">
                  <button
                    type="button"
                    onClick={() => void toggleCameraFacing()}
                    className="rounded-full bg-black/60 p-2"
                    title="Flip camera"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className="rounded-full bg-black/60 p-2"
                    title="Toggle mic"
                  >
                    {micMuted ? <MicOff size={16} className="text-rose-400" /> : <Mic size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700">Livestream Title</label>
                <input
                  type="text"
                  required
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="Enter your live shopping session title"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold outline-none focus:border-[#0c5c36]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="broadcast-category" className="text-xs font-black text-slate-700">Category</label>
                  <select
                    id="broadcast-category"
                    value={streamCategory}
                    onChange={(e) => setStreamCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold outline-none focus:border-[#0c5c36]"
                  >
                    <option value="general">General</option>
                    <option value="fashion">Fashion</option>
                    <option value="tech">Electronics</option>
                    <option value="phones">Phones</option>
                    <option value="beauty">Beauty</option>
                    <option value="home">Home &amp; Living</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="broadcast-product" className="text-xs font-black text-slate-700">Pin Published Product</label>
                  <select
                    id="broadcast-product"
                    value={streamProductId}
                    onChange={(e) => setStreamProductId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold outline-none focus:border-[#0c5c36]"
                  >
                    <option value="">None</option>
                    {ownPublishedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveView('menu');
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  <Radio size={16} />
                  <span>{isCreatingRoom ? 'Starting...' : 'Start Live Room'}</span>
                </button>
              </div>
            </form>
          )}

          {/* BROADCASTING VIEW */}
          {isApprovedSeller && activeView === 'broadcasting' && (
            <div className="space-y-4">
              <div className="cnc-mobile-studio-broadcasting rounded-2xl bg-slate-950 p-5 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-black">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Eye size={14} /> Room ID: {activeRoomId}
                  </span>
                </div>
                <div className="text-sm font-black">{streamTitle}</div>
                <p className="text-xs text-slate-300">
                  Your shopping room is open for chat and pinned items. The camera preview does not transmit video to viewers.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onNavigate('live');
                    }}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white"
                  >
                    Open Live Room View
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEndBroadcast()}
                    className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white"
                  >
                    End Live
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
