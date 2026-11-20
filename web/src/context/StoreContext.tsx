import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserAccount,
  ProductItem,
  StorefrontSummary,
  CartItem,
  Address,
  Order,
  AuctionItem,
  LiveRoom,
  LiveComment,
  CoinActivity,
  SellerApplication,
  SellerProductItem,
  ReturnRequest,
  Message,
  NotificationItem,
  ShortVideo,
  ShortVideoComment,
  NewsletterSubscriber,
  EmailCampaign,
  SectionLoadState,
  Role,
  SellerStatus,
} from '../types';
import { api, ApiAuthUser, ApiSellerApplication, DEFAULT_PLATFORM_CONFIG, PlatformFeatureConfig } from '../lib/api';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'error';
}

interface AuthModalOptions {
  show: boolean;
  reason?: string;
}

interface StoreContextType {
  currentUser: UserAccount;
  isApprovedSeller: boolean;
  isAdmin: boolean;
  isAuthReady: boolean;
  platformConfig: PlatformFeatureConfig;
  healthStatus: { ok: boolean; latencyMs: number; dbConnected: boolean };

  // Section load states
  catalogState: SectionLoadState;
  storefrontsState: SectionLoadState;
  videosState: SectionLoadState;
  liveState: SectionLoadState;
  auctionsState: SectionLoadState;
  ordersState: SectionLoadState;
  reloadMarketplace: () => Promise<void>;
  refreshLiveRooms: () => Promise<void>;

  // Auth modal
  authModal: AuthModalOptions;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;

  // Auth actions
  loginWithApi: (
    email: string,
    password: string,
    totpCode?: string
  ) => Promise<{ ok: boolean; error?: string; mfaRequired?: boolean; user?: ApiAuthUser }>;
  registerWithApi: (
    email: string
  ) => Promise<{ ok: boolean; verificationToken?: string; error?: string }>;
  verifyWithApi: (token: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserAccount>, photo?: Blob) => Promise<boolean>;

  // Marketplace data
  products: ProductItem[];
  storefronts: StorefrontSummary[];
  shortVideos: ShortVideo[];
  liveRooms: LiveRoom[];
  liveStreamingConfigured: boolean;
  auctions: AuctionItem[];
  cart: CartItem[];
  wishlist: string[];
  follows: string[];
  addresses: Address[];
  orders: Order[];
  returns: ReturnRequest[];
  messages: Message[];
  notifications: NotificationItem[];
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  coinActivity: CoinActivity[];
  newsletterSubscribers: NewsletterSubscriber[];
  emailCampaigns: EmailCampaign[];

  // Seller onboarding & Seller Centre data
  sellerApplication: SellerApplication | null;
  sellerStore: StorefrontSummary | null;
  sellerProducts: SellerProductItem[];
  sellerOrders: Order[];
  kycStatus: { uploadsEnabled: boolean; r2Configured?: boolean; reason?: string };
  refreshSellerData: () => Promise<void>;
  submitSellerApplication: (input: {
    businessName: string;
    cacNumber: string;
    businessType: string;
    stateLocation: string;
    phone: string;
    description: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  saveSellerStore: (input: {
    name: string;
    description: string;
    category: string;
    location: string;
    phone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createSellerProduct: (input: {
    name: string;
    description: string;
    category: string;
    brand: string;
    priceNaira: number;
    compareAtNaira?: number;
    stock: number;
    imageUrl: string;
    featured?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateSellerProduct: (input: {
    id: string;
    name?: string;
    description?: string;
    category?: string;
    brand?: string;
    priceNaira?: number;
    compareAtNaira?: number;
    stock?: number;
    imageUrl?: string;
    featured?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  submitSellerProductForReview: (id: string) => Promise<{ ok: boolean; error?: string }>;
  unpublishSellerProduct: (id: string) => Promise<{ ok: boolean; error?: string }>;
  archiveSellerProduct: (id: string) => Promise<{ ok: boolean; error?: string }>;
  updateSellerOrderStatus: (
    orderId: string,
    status: 'processing' | 'packed' | 'shipped' | 'delivered',
    carrier?: string,
    trackingNumber?: string
  ) => Promise<{ ok: boolean; error?: string }>;

  // Cart & Wishlist & Checkout
  isCartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  addToCart: (product: ProductItem, quantity?: number) => Promise<boolean>;
  removeFromCart: (productId: string) => Promise<void>;
  updateCartQty: (productId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<Address | null>;
  removeAddress: (id: string) => Promise<void>;
  placeOrder: (addressId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<boolean>;
  submitReturnRequest: (orderId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;

  // Auctions & Coins
  placeBid: (auctionId: string, amount: number) => Promise<boolean>;
  createSellerAuction: (input: {
    productId: string;
    startingBidNaira: number;
    durationHours: number;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendCoinGift: (recipientId: string, gift: 'rose' | 'star' | 'lion') => Promise<boolean>;

  // Video & Social
  likeVideo: (videoId: string) => Promise<void>;
  loadVideoComments: (videoId: string) => Promise<ShortVideoComment[]>;
  addVideoComment: (videoId: string, content: string) => Promise<boolean>;
  deleteVideo: (videoId: string) => Promise<boolean>;
  reportVideo: (videoId: string, reason: string) => Promise<boolean>;
  followSeller: (sellerId: string) => Promise<void>;
  uploadSellerVideo: (
    input: {
      file: File;
      title: string;
      caption: string;
      productId: string;
      coverUrl?: string;
    },
    onProgress: (percent: number) => void
  ) => Promise<{ ok: boolean; id?: string; error?: string }>;

  // Live Rooms
  createLiveRoom: (input: {
    title: string;
    category: string;
    pinnedProductId?: string;
    broadcastConnected?: boolean;
  }) => Promise<{ ok: boolean; roomId?: string; error?: string; code?: string }>;
  joinLiveRoom: (roomId: string) => Promise<void>;
  likeLiveRoom: (roomId: string) => Promise<void>;
  pinLiveProduct: (roomId: string, productId: string) => Promise<{ ok: boolean; error?: string }>;
  endLiveRoom: (roomId: string) => Promise<{ ok: boolean; error?: string }>;
  loadLiveComments: (roomId: string) => Promise<LiveComment[]>;
  addLiveComment: (roomId: string, body: string) => Promise<boolean>;

  // Messages & Notifications
  sendMessage: (receiverId: string, content: string, orderId?: string, attachedProduct?: ProductItem) => Promise<boolean>;
  markMessageRead: (senderId: string) => void;
  markNotificationsRead: () => Promise<void>;

  // Newsletter (local preference list for admins only; no fake seed records)
  subscribeNewsletter: (email: string, name?: string, source?: NewsletterSubscriber['source'], preferences?: string[]) => void;

  // Toasts
  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

const GUEST_USER: UserAccount = {
  id: '',
  name: 'Guest Shopper',
  email: '',
  role: 'buyer',
  sellerStatus: 'none',
  verified: false,
  suspended: false,
  avatar: '',
  bio: '',
  selectedState: 'Lagos',
  authenticated: false,
  coins: 0,
};

const StoreContext = createContext<StoreContextType | null>(null);

// Catalog rows can use canonical D1 names while the UI uses short category IDs.
function normalizeMarketplaceCategory(raw: string): string {
  const category = raw.trim().toLowerCase();
  if (category === 'electronics') return 'tech';
  if (category === 'kids') return 'baby';
  return category || 'general';
}

export function mapApiProduct(raw: Record<string, unknown>): ProductItem {
  const priceNaira = Number(raw.price ?? 0) || Math.round(Number(raw.price_minor ?? 0) / 100);
  const compareAtNaira = Number(raw.compare_at ?? 0) || priceNaira;
  const id = String(raw.id || '');
  const title = String(raw.name || '');
  return {
    id,
    slug: id,
    title,
    brand: String(raw.brand || raw.store_name || 'Verified Seller'),
    price: priceNaira,
    compareAt: compareAtNaira,
    stock: Number(raw.stock ?? 0),
    category: normalizeMarketplaceCategory(String(raw.category || 'general')),
    badge: compareAtNaira > priceNaira ? `-${Math.round(((compareAtNaira - priceNaira) / compareAtNaira) * 100)}%` : undefined,
    featured: Boolean(raw.featured),
    description: String(raw.description || ''),
    image: String(raw.image || ''),
    sellerId: String(raw.store || ''),
    sellerName: String(raw.store_name || raw.brand || 'Seller'),
    rating: Number(raw.rating ?? 0),
    reviews: Number(raw.reviews_count ?? 0),
    publication: (raw.publication as ProductItem['publication']) || 'published',
    archived: false,
    createdAt: String(raw.created || ''),
  };
}

function mapApiStorefront(raw: Record<string, unknown>): StorefrontSummary {
  const id = String(raw.id || '');
  return {
    id,
    ownerId: String(raw.owner_id || id),
    slug: id,
    name: String(raw.name || ''),
    description: String(raw.description || ''),
    category: normalizeMarketplaceCategory(String(raw.category || 'general')),
    location: String(raw.location || 'Nigeria'),
    verified: Boolean(Number(raw.verified ?? 0)),
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    followersCount: Number(raw.followers_count ?? 0),
  };
}

function mapApiSellerApp(raw: ApiSellerApplication | null | undefined): SellerApplication | null {
  if (!raw) return null;
  return {
    id: raw.id,
    userId: raw.user_id,
    email: raw.email,
    role: raw.role,
    userSellerStatus: raw.user_seller_status,
    suspended: Boolean(raw.suspended),
    businessName: raw.business_name,
    cacNumber: raw.cac_number,
    businessType: raw.business_type,
    stateLocation: raw.state_location,
    phone: raw.phone,
    description: raw.description,
    status: raw.status,
    reviewerNotes: raw.reviewer_notes,
    reviewedAt: raw.reviewed_at,
    createdAt: raw.created,
    updatedAt: raw.updated,
  };
}

function mapApiVideo(raw: Record<string, unknown>, products: ProductItem[]): ShortVideo {
  const productId = String(raw.product_id || '');
  const matchedProduct = products.find((p) => p.id === productId);
  const productPriceMinor = Number(raw.product_price_minor ?? 0);
  const taggedProduct: ProductItem | null =
    matchedProduct ||
    (productId && raw.product_name
      ? {
          id: productId,
          slug: productId,
          title: String(raw.product_name),
          brand: String(raw.seller_name || 'Seller'),
          price: Math.round(productPriceMinor / 100),
          compareAt: Math.round(productPriceMinor / 100),
          stock: Number(raw.product_stock ?? 0),
          category: String(raw.product_category || 'general'),
          description: '',
          image: String(raw.product_image_url || ''),
          sellerId: String(raw.seller_id || ''),
          sellerName: String(raw.seller_name || 'Seller'),
          rating: 0,
          reviews: 0,
          publication: 'published',
          archived: false,
          createdAt: '',
        }
      : null);

  return {
    id: String(raw.id || ''),
    sellerId: String(raw.seller_id || ''),
    sellerName: String(raw.seller_name || 'Verified Seller'),
    sellerAvatar: '',
    sellerVerified: Boolean(Number(raw.seller_verified ?? 1)),
    videoUrl: String(raw.video_url || ''),
    posterUrl: String(raw.cover_url || ''),
    title: String(raw.title || ''),
    caption: String(raw.caption || ''),
    taggedProduct,
    likesCount: Number(raw.likes_count ?? 0),
    commentsCount: Number(raw.comments_count ?? 0),
    sharesCount: 0,
    savesCount: 0,
    liked: Boolean(raw.liked),
    saved: false,
    following: Boolean(raw.following),
    processingStatus: String(raw.processing_status || 'ready'),
    published: Boolean(Number(raw.published ?? 1)),
    createdAt: String(raw.created || ''),
  };
}

function mapApiLiveRoom(raw: Record<string, unknown>, products: ProductItem[]): LiveRoom {
  const pinnedId = typeof raw.pinned_product_id === 'string' ? raw.pinned_product_id : null;
  const pinnedProduct = pinnedId ? products.find((p) => p.id === pinnedId) || null : null;
  return {
    id: String(raw.room_id || raw.id || ''),
    sellerId: String(raw.seller_id || ''),
    sellerName: String(raw.seller_name || 'Verified Seller'),
    title: String(raw.title || ''),
    category: String(raw.category || 'general'),
    status: (String(raw.status || 'live') as 'live' | 'ended'),
    viewerCount: Number(raw.viewer_count ?? 0),
    heartsCount: Number(raw.hearts_count ?? 0),
    pinnedProduct,
    pinnedProductId: pinnedId,
    streamUrl: typeof raw.stream_url === 'string' ? raw.stream_url : undefined,
    createdAt: typeof raw.created === 'string' ? raw.created : undefined,
  };
}

function mapApiOrder(raw: Record<string, unknown>): Order {
  const totalMinor = Number(raw.total_minor ?? 0);
  const total = totalMinor > 0 ? totalMinor / 100 : Number(raw.total ?? 0);
  const deliveryAddrStr = typeof raw.delivery_address === 'string' ? raw.delivery_address : '';
  let savedAddress: Record<string, unknown> = {};
  if (deliveryAddrStr.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(deliveryAddrStr);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        savedAddress = parsed as Record<string, unknown>;
      }
    } catch { /* Invalid legacy address is handled as plain text below. */ }
  }
  const rawAddr = raw.address && typeof raw.address === 'object' && !Array.isArray(raw.address)
    ? raw.address as Record<string, unknown> : savedAddress;
  const itemsRaw = Array.isArray(raw.items) ? (raw.items as Array<Record<string, unknown>>) : [];
  const rawFulfilments = Array.isArray(raw.fulfilments)
    ? raw.fulfilments as Array<Record<string, unknown>> : [];
  const fulfilments: NonNullable<Order['fulfilments']> = rawFulfilments.map(row => ({
    sellerId: String(row.seller_id || ''),
    storeName: String(row.store_name || 'Seller'),
    status: String(row.status || 'processing') as NonNullable<Order['fulfilments']>[number]['status'],
    carrier: String(row.carrier || ''),
    trackingNumber: String(row.tracking_number || ''),
    updatedAt: Number(row.updated_at || 0),
  }));
  const paymentConfirmed = String(raw.payment_state || '') === 'paid';
  let orderStatus = String(raw.fulfilment_status || raw.status || 'awaiting_payment');
  if (paymentConfirmed && orderStatus === 'awaiting_payment') {
    orderStatus = fulfilments.length === 1 ? fulfilments[0].status
      : fulfilments.length > 1 && fulfilments.every(f => f.status === 'delivered')
      ? 'delivered' : 'paid';
  }
  const soleShipment = fulfilments.length === 1 ? fulfilments[0] : null;

  return {
    id: String(raw.id || ''),
    buyerId: String(raw.buyer || raw.buyer_id || ''),
    buyerName: String(raw.buyer_name || rawAddr.recipient || ''),
    buyerEmail: String(raw.buyer_email || ''),
    requestId: String(raw.request_id || ''),
    address: {
      id: String(rawAddr.id || ''),
      recipient: String(rawAddr.recipient || ''),
      phone: String(rawAddr.phone || ''),
      line: String(rawAddr.line || (deliveryAddrStr.startsWith('{') ? '' : deliveryAddrStr) || ''),
      city: String(rawAddr.city || ''),
      state: String(rawAddr.state || ''),
    },
    items: itemsRaw.map((item) => ({
      productId: String(item.product_id || item.productId || ''),
      name: String(item.name || item.title || 'Item'),
      sellerId: String(item.seller_id || item.sellerId || ''),
      sellerName: String(item.seller_name || item.sellerName || ''),
      quantity: Number(item.quantity ?? 1),
      price: item.price_minor ? Number(item.price_minor) / 100 : Number(item.price ?? 0),
      image: typeof item.image === 'string' ? item.image : undefined,
    })),
    subtotal: total,
    shipping: 0,
    total,
    status: orderStatus as Order['status'],
    createdAt: typeof raw.created === 'number'
      ? new Date(raw.created * 1000).toISOString()
      : String(raw.created || ''),
    reservationEndsAt: String(raw.reservation_ends_at || ''),
    trackingNumber: soleShipment?.trackingNumber
      || (typeof raw.tracking_number === 'string' ? raw.tracking_number : undefined),
    carrier: soleShipment?.carrier
      || (typeof raw.carrier === 'string' ? raw.carrier : undefined),
    fulfilments,
  };
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount>(GUEST_USER);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<PlatformFeatureConfig>(DEFAULT_PLATFORM_CONFIG);
  const [healthStatus, setHealthStatus] = useState<{ ok: boolean; latencyMs: number; dbConnected: boolean }>({
    ok: false,
    latencyMs: 0,
    dbConnected: false,
  });

  const [catalogState, setCatalogState] = useState<SectionLoadState>({ status: 'loading' });
  const [storefrontsState, setStorefrontsState] = useState<SectionLoadState>({ status: 'loading' });
  const [videosState, setVideosState] = useState<SectionLoadState>({ status: 'loading' });
  const [liveState, setLiveState] = useState<SectionLoadState>({ status: 'loading' });
  const [auctionsState, setAuctionsState] = useState<SectionLoadState>({ status: 'loading' });
  const [ordersState, setOrdersState] = useState<SectionLoadState>({ status: 'ready' });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [storefronts, setStorefronts] = useState<StorefrontSummary[]>([]);
  const [shortVideos, setShortVideos] = useState<ShortVideo[]>([]);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [liveStreamingConfigured, setLiveStreamingConfigured] = useState(false);
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [coinActivity, setCoinActivity] = useState<CoinActivity[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [emailCampaigns] = useState<EmailCampaign[]>([]);

  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);
  const [sellerStore, setSellerStore] = useState<StorefrontSummary | null>(null);
  const [sellerProducts, setSellerProducts] = useState<SellerProductItem[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [kycStatus, setKycStatus] = useState<{ uploadsEnabled: boolean; r2Configured?: boolean; reason?: string }>({
    uploadsEnabled: false,
    r2Configured: false,
    reason: 'Encrypted KYC document storage is currently unavailable.',
  });

  const [isCartOpen, setCartOpen] = useState(false);
  const [authModal, setAuthModal] = useState<AuthModalOptions>({ show: false });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isApprovedSeller = useMemo(
    () =>
      Boolean(
        currentUser.authenticated &&
          currentUser.role === 'seller' &&
          currentUser.sellerStatus === 'approved' &&
          currentUser.verified &&
          !currentUser.suspended
      ),
    [currentUser]
  );

  const isAdmin = useMemo(
    () => Boolean(currentUser.authenticated && currentUser.role === 'admin' && !currentUser.suspended),
    [currentUser]
  );

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const openAuthModal = useCallback((reason?: string) => {
    setAuthModal({ show: true, reason });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModal({ show: false });
  }, []);

  const loadAuthenticatedUserData = useCallback(async (authUser: ApiAuthUser) => {
    const [
      profRes,
      cartRes,
      addrRes,
      ordRes,
      retRes,
      wishRes,
      folRes,
      msgRes,
      notiRes,
      coinRes,
      appRes,
      kycRes,
    ] = await Promise.all([
      api.getProfile(),
      api.getCart(),
      api.getAddresses(),
      api.getOrders(),
      api.getReturns(),
      api.getWishlist(),
      api.getFollows(),
      api.getMessages(),
      api.getNotifications(),
      api.getCoins(),
      api.getSellerApplication(),
      api.getKycStatus(),
    ]);

    const prof = profRes.ok ? profRes.data?.profile : null;
    const role: Role = prof?.role || authUser.role;
    const sellerStatus: SellerStatus = appRes.data?.sellerStatus || prof?.sellerStatus || authUser.sellerStatus || 'none';
    const coinBalance = coinRes.ok ? Number(coinRes.data?.balance ?? 0) : 0;

    setCurrentUser({
      id: authUser.id,
      username: prof?.username ?? undefined,
      name: prof?.display_name || authUser.email.split('@')[0] || 'Account',
      email: prof?.email || authUser.email,
      role,
      sellerStatus,
      verified: true,
      suspended: sellerStatus === 'suspended',
      avatar: prof?.avatar_url || '',
      bio: prof?.bio || '',
      selectedState: prof?.selected_state || 'Lagos',
      authenticated: true,
      coins: coinBalance,
    });

    setKycStatus(kycRes);
    setSellerApplication(mapApiSellerApp(appRes.data?.application));

    if (cartRes.ok && Array.isArray(cartRes.data?.items)) {
      setCart(
        cartRes.data.items.map((item) => {
          const details = (item.details || {}) as Record<string, unknown>;
          return {
            productId: String(item.product || ''),
            title: String(details.name || 'Product'),
            price: Number(details.price ?? 0),
            image: String(details.image || ''),
            quantity: Number(item.quantity ?? 1),
            sellerId: String(details.sellerId || ''),
            sellerName: String(details.sellerName || 'Seller'),
            stock: Number(details.stock ?? 0),
            source: (item.source as 'legacy' | 'replacement') || 'replacement',
          };
        })
      );
    } else {
      setCart([]);
    }

    if (addrRes.ok && Array.isArray(addrRes.data?.addresses)) {
      setAddresses(
        addrRes.data.addresses.map((a) => ({
          id: String(a.id || ''),
          recipient: String(a.recipient || ''),
          phone: String(a.phone || ''),
          line: String(a.line || ''),
          city: String(a.city || ''),
          state: String(a.state || 'Lagos'),
        }))
      );
    } else {
      setAddresses([]);
    }

    if (ordRes.ok && Array.isArray(ordRes.data?.orders)) {
      setOrders(ordRes.data.orders.map(mapApiOrder));
      setOrdersState({ status: 'ready' });
    } else if (!ordRes.ok) {
      setOrders([]);
      setOrdersState({ status: 'error', error: ordRes.error || 'Could not load orders.' });
    }

    if (retRes.ok && Array.isArray(retRes.data?.returns)) {
      setReturns(
        retRes.data.returns.map((r) => ({
          id: String(r.id || ''),
          orderId: String(r.order_id || r.orderId || ''),
          buyerId: String(r.buyer_id || r.buyerId || ''),
          reason: String(r.reason || ''),
          status: String(r.status || 'requested'),
          createdAt: String(r.created || ''),
        }))
      );
    } else {
      setReturns([]);
    }

    if (wishRes.ok && Array.isArray(wishRes.data?.wishlist)) {
      setWishlist(wishRes.data.wishlist.map((w) => w.product_id));
    } else {
      setWishlist([]);
    }

    if (folRes.ok && Array.isArray(folRes.data?.following)) {
      setFollows(folRes.data.following.map((f) => f.seller_id));
    } else {
      setFollows([]);
    }

    if (msgRes.ok && Array.isArray(msgRes.data?.messages)) {
      setMessages(
        msgRes.data.messages.map((m) => ({
          id: String(m.id || ''),
          senderId: String(m.sender_id || ''),
          senderName: String(m.sender_name || m.sender_id || ''),
          receiverId: String(m.receiver_id || ''),
          content: String(m.body || ''),
          timestamp: String(m.created || ''),
          read: Boolean(Number(m.read ?? 0)),
          orderId: typeof m.order_id === 'string' ? m.order_id : undefined,
        }))
      );
    } else {
      setMessages([]);
    }

    if (notiRes.ok && Array.isArray(notiRes.data?.notifications)) {
      setNotifications(
        notiRes.data.notifications.map((n) => ({
          id: String(n.id || ''),
          title: String(n.title || 'Update'),
          message: String(n.message || ''),
          type: (String(n.type || 'system') as NotificationItem['type']),
          timestamp: String(n.created || ''),
          read: Boolean(Number(n.read ?? 0)),
          link: typeof n.link === 'string' ? n.link : undefined,
        }))
      );
    } else {
      setNotifications([]);
    }

    if (coinRes.ok && Array.isArray(coinRes.data?.activity)) {
      setCoinActivity(
        coinRes.data.activity.map((a) => ({
          id: String(a.id || ''),
          delta: Number(a.delta ?? 0),
          reason: String(a.reason || ''),
          createdAt: String(a.created || ''),
        }))
      );
    } else {
      setCoinActivity([]);
    }

    // Load seller-only workspace records only if approved seller
    if (role === 'seller' && sellerStatus === 'approved') {
      const [sStoreRes, sProdRes, sOrdRes] = await Promise.all([
        api.getSellerStore(),
        api.getSellerProducts(),
        api.getSellerOrders(),
      ]);
      if (sStoreRes.ok && sStoreRes.data?.storefront) {
        setSellerStore(mapApiStorefront(sStoreRes.data.storefront as unknown as Record<string, unknown>));
      } else {
        setSellerStore(null);
      }
      if (sProdRes.ok && Array.isArray(sProdRes.data?.items)) {
        setSellerProducts(
          sProdRes.data.items.map((item) => ({
            id: item.id,
            owner: item.owner,
            name: item.name,
            description: item.description,
            category: normalizeMarketplaceCategory(item.category),
            brand: item.brand,
            priceMinor: Number(item.price_minor ?? 0),
            compareAtMinor: Number(item.compare_at_minor ?? item.price_minor ?? 0),
            stock: Number(item.stock ?? 0),
            imageUrl: item.image_url || '',
            featured: Boolean(item.featured),
            revision: Number(item.revision ?? 1),
            publication: item.publication,
            created: item.created,
          }))
        );
      } else {
        setSellerProducts([]);
      }
      if (sOrdRes.ok && Array.isArray(sOrdRes.data?.orders)) {
        setSellerOrders(sOrdRes.data.orders.map(mapApiOrder));
      } else {
        setSellerOrders([]);
      }
    } else {
      setSellerStore(null);
      setSellerProducts([]);
      setSellerOrders([]);
    }
  }, []);

  const clearAuthenticatedUserData = useCallback(() => {
    setCurrentUser(GUEST_USER);
    setSellerApplication(null);
    setSellerStore(null);
    setSellerProducts([]);
    setSellerOrders([]);
    setCart([]);
    setAddresses([]);
    setOrders([]);
    setReturns([]);
    setWishlist([]);
    setFollows([]);
    setMessages([]);
    setNotifications([]);
    setCoinActivity([]);
    setOrdersState({ status: 'ready' });
  }, []);

  const refreshLiveRooms = useCallback(async () => {
    const response = await api.getLiveRooms();
    if (response.ok) {
      setLiveRooms((response.data?.rooms ?? []).map(room => mapApiLiveRoom(room, products)));
    }
  }, [products]);

  const reloadMarketplace = useCallback(async () => {
    setCatalogState({ status: 'loading' });
    setStorefrontsState({ status: 'loading' });
    setVideosState({ status: 'loading' });
    setLiveState({ status: 'loading' });
    setAuctionsState({ status: 'loading' });

    const [health, prodRes, storeRes, vidRes, liveRes, aucRes] = await Promise.all([
      api.checkHealth(),
      api.getProducts(),
      api.getStorefronts(),
      api.getVideos(),
      api.getLiveRooms(),
      api.getAuctions(),
    ]);

    setHealthStatus({ ok: health.ok, latencyMs: health.latencyMs, dbConnected: Boolean(health.dbConnected) });
    if (health.staging) setPlatformConfig(health.staging);

    let mappedProducts: ProductItem[] = [];
    if (prodRes.ok) {
      mappedProducts = (prodRes.data?.products ?? []).map((p) => mapApiProduct(p as unknown as Record<string, unknown>));
      setProducts(mappedProducts);
      setCatalogState({ status: 'ready' });
    } else {
      setProducts([]);
      setCatalogState({ status: 'error', error: prodRes.error || 'Unable to load products right now.' });
    }

    if (storeRes.ok) {
      setStorefronts(
        (storeRes.data?.storefronts ?? []).map((s) => mapApiStorefront(s as unknown as Record<string, unknown>))
      );
      setStorefrontsState({ status: 'ready' });
    } else {
      setStorefronts([]);
      setStorefrontsState({ status: 'error', error: storeRes.error || 'Unable to load sellers right now.' });
    }

    if (vidRes.ok) {
      setShortVideos((vidRes.data?.videos ?? []).map((v) => mapApiVideo(v, mappedProducts)));
      setVideosState({ status: 'ready' });
    } else {
      setShortVideos([]);
      setVideosState({ status: 'error', error: vidRes.error || 'Unable to load videos right now.' });
    }

    if (liveRes.ok) {
      setLiveRooms((liveRes.data?.rooms ?? []).map((r) => mapApiLiveRoom(r, mappedProducts)));
      setLiveStreamingConfigured(Boolean(liveRes.data?.liveStreamingConfigured));
      setLiveState({ status: 'ready' });
    } else {
      setLiveRooms([]);
      setLiveState({ status: 'error', error: liveRes.error || 'Unable to load livestreams right now.' });
    }

    if (aucRes.ok) {
      setAuctions(
        (aucRes.data?.auctions ?? []).map((a) => ({
          id: String(a.id || ''),
          sellerId: String(a.sellerId || ''),
          storefrontName: String(a.storefrontName || 'Verified Seller'),
          productId: String(a.productId || ''),
          title: String(a.title || ''),
          image: String(a.image || ''),
          startingBid: Number(a.startingBid ?? 0),
          currentBid: a.currentBid !== null && a.currentBid !== undefined ? Number(a.currentBid) : null,
          winnerId: typeof a.winnerId === 'string' ? a.winnerId : null,
          winnerName: typeof a.winnerName === 'string' ? a.winnerName : null,
          endsAt: String(a.endsAt || ''),
          closedAt: typeof a.closedAt === 'string' ? a.closedAt : null,
          orderId: typeof a.orderId === 'string' ? a.orderId : null,
          bidsCount: Number(a.bidsCount ?? 0),
          own: Boolean(a.own),
          winning: Boolean(a.winning),
        }))
      );
      setAuctionsState({ status: 'ready' });
    } else {
      setAuctions([]);
      setAuctionsState({ status: 'error', error: aucRes.error || 'Unable to load auctions right now.' });
    }

    if (health.authenticated && health.user) {
      await loadAuthenticatedUserData(health.user);
    } else {
      const me = await api.getAuthMe();
      if (me.user) {
        await loadAuthenticatedUserData(me.user);
      } else {
        clearAuthenticatedUserData();
      }
    }
    setIsAuthReady(true);
  }, [loadAuthenticatedUserData, clearAuthenticatedUserData]);

  useEffect(() => {
    void reloadMarketplace();
  }, [reloadMarketplace]);

  const refreshSellerData = useCallback(async () => {
    if (!currentUser.authenticated) return;
    await loadAuthenticatedUserData({
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      sellerStatus: currentUser.sellerStatus,
    });
  }, [currentUser, loadAuthenticatedUserData]);

  const loginWithApi = async (email: string, password: string, totpCode?: string) => {
    const res = await api.login(email, password, totpCode);
    if (!res.signedIn || !res.user) {
      return { ok: false, error: res.error || 'Invalid email or password', mfaRequired: res.mfaRequired };
    }
    await loadAuthenticatedUserData(res.user);
    await reloadMarketplace();
    showToast(`Signed in as ${res.user.email}`, 'success');
    return { ok: true, user: res.user };
  };

  const registerWithApi = async (email: string) => {
    const res = await api.register(email);
    if (!res.accepted) {
      return { ok: false, error: res.error || 'Registration failed' };
    }
    return { ok: true, verificationToken: res.verificationToken };
  };

  const verifyWithApi = async (token: string, password: string) => {
    const res = await api.verifyAccount(token, password);
    if (!res.completed) {
      return { ok: false, error: res.error || 'Verification failed' };
    }
    showToast('Account verified! Please sign in with your password.', 'success');
    return { ok: true };
  };

  const logout = async () => {
    await api.logout();
    clearAuthenticatedUserData();
    await reloadMarketplace();
    showToast('You have signed out.', 'info');
  };

  const updateProfile = async (updates: Partial<UserAccount>, photo?: Blob) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to update your profile.');
      return false;
    }
    const res = await api.updateProfile({
      displayName: updates.name ?? currentUser.name,
      username: updates.username,
      bio: updates.bio ?? currentUser.bio ?? '',
      avatarUrl: updates.avatar ?? currentUser.avatar ?? '',
      selectedState: updates.selectedState ?? currentUser.selectedState ?? 'Lagos',
    }, photo);
    if (!res.updated) {
      showToast(res.error || 'Could not update profile.', 'error');
      return false;
    }
    setCurrentUser((prev) => ({
      ...prev,
      username: res.profile?.username ?? updates.username ?? prev.username,
      name: res.profile?.display_name ?? updates.name ?? prev.name,
      bio: res.profile?.bio ?? updates.bio ?? prev.bio,
      avatar: res.profile?.avatar_url ?? updates.avatar ?? prev.avatar,
      selectedState: res.profile?.selected_state ?? updates.selectedState ?? prev.selectedState,
    }));
    showToast('Profile saved.', 'success');
    return true;
  };

  // Seller onboarding & Seller Centre actions
  const submitSellerApplication = async (input: {
    businessName: string;
    cacNumber: string;
    businessType: string;
    stateLocation: string;
    phone: string;
    description: string;
  }) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to apply as a seller.');
      return { ok: false, error: 'Authentication required' };
    }
    const res = await api.submitSellerApplication(input);
    if (!res.ok) {
      return { ok: false, error: res.error || 'Could not submit application.' };
    }
    setSellerApplication(mapApiSellerApp(res.data?.application));
    setCurrentUser((prev) => ({
      ...prev,
      sellerStatus: res.data?.sellerStatus || 'pending',
    }));
    showToast('Seller application submitted for admin review.', 'success');
    return { ok: true };
  };

  const saveSellerStore = async (input: {
    name: string;
    description: string;
    category: string;
    location: string;
    phone?: string;
  }) => {
    const res = await api.upsertSellerStore(input);
    if (!res.ok || !res.data?.storefront) {
      return { ok: false, error: res.error || 'Could not save storefront.' };
    }
    setSellerStore(mapApiStorefront(res.data.storefront as unknown as Record<string, unknown>));
    await reloadMarketplace();
    showToast('Storefront saved.', 'success');
    return { ok: true };
  };

  const createSellerProduct = async (input: {
    name: string;
    description: string;
    category: string;
    brand: string;
    priceNaira: number;
    compareAtNaira?: number;
    stock: number;
    imageUrl: string;
    featured?: boolean;
  }) => {
    const res = await api.mutateSellerProduct({ action: 'create', ...input });
    if (!res.ok) return { ok: false, error: res.error || 'Could not create product.' };
    await refreshSellerData();
    showToast('Product saved as draft.', 'success');
    return { ok: true };
  };

  const updateSellerProduct = async (input: {
    id: string;
    name?: string;
    description?: string;
    category?: string;
    brand?: string;
    priceNaira?: number;
    compareAtNaira?: number;
    stock?: number;
    imageUrl?: string;
    featured?: boolean;
  }) => {
    const revision = sellerProducts.find((item) => item.id === input.id)?.revision;
    if (!revision) return { ok: false, error: 'Product changed. Reload listings and try again.' };
    const res = await api.mutateSellerProduct({ action: 'update', revision, ...input });
    if (!res.ok) return { ok: false, error: res.error || 'Could not update product.' };
    await refreshSellerData();
    await reloadMarketplace();
    showToast('Product updated.', 'success');
    return { ok: true };
  };

  const submitSellerProductForReview = async (id: string) => {
    const revision = sellerProducts.find((item) => item.id === id)?.revision;
    if (!revision) return { ok: false, error: 'Product changed. Reload listings and try again.' };
    const res = await api.mutateSellerProduct({ action: 'submit', id, revision });
    if (!res.ok) return { ok: false, error: res.error || 'Submit failed.' };
    await refreshSellerData();
    showToast('Submitted for admin moderation review.', 'success');
    return { ok: true };
  };

  const unpublishSellerProduct = async (id: string) => {
    const revision = sellerProducts.find((item) => item.id === id)?.revision;
    if (!revision) return { ok: false, error: 'Product changed. Reload listings and try again.' };
    const res = await api.mutateSellerProduct({ action: 'unpublish', id, revision });
    if (!res.ok) return { ok: false, error: res.error || 'Unpublish failed.' };
    await refreshSellerData();
    await reloadMarketplace();
    showToast('Product moved back to draft.', 'info');
    return { ok: true };
  };

  const archiveSellerProduct = async (id: string) => {
    const revision = sellerProducts.find((item) => item.id === id)?.revision;
    if (!revision) return { ok: false, error: 'Product changed. Reload listings and try again.' };
    const res = await api.mutateSellerProduct({ action: 'archive', id, revision });
    if (!res.ok) return { ok: false, error: res.error || 'Archive failed.' };
    await refreshSellerData();
    await reloadMarketplace();
    showToast('Product archived.', 'info');
    return { ok: true };
  };

  const updateSellerOrderStatus = async (
    orderId: string,
    status: 'processing' | 'packed' | 'shipped' | 'delivered',
    carrier = 'GIG Logistics',
    trackingNumber = ''
  ) => {
    const res = await api.fulfillOrder(orderId, status, carrier, trackingNumber);
    if (!res.ok) {
      return { ok: false, error: res.error || 'Could not update order status.' };
    }
    await refreshSellerData();
    showToast(`Order ${orderId} updated to ${status}.`, 'success');
    return { ok: true };
  };

  // Cart & Checkout
  const addToCart = async (product: ProductItem, quantity = 1) => {
    if (!currentUser.authenticated) {
      openAuthModal('Please sign in to add items to your cart.');
      return false;
    }
    const existing = cart.find((c) => c.productId === product.id);
    const nextQty = (existing?.quantity || 0) + quantity;
    const res = await api.updateCartItem(product.id, nextQty, 'replacement');
    if (!res.ok) {
      showToast(res.error || 'Could not update cart.', 'error');
      return false;
    }
    setCart((prev) => {
      if (existing) {
        return prev.map((c) => (c.productId === product.id ? { ...c, quantity: nextQty } : c));
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          quantity,
          sellerId: product.sellerId,
          sellerName: product.sellerName,
          stock: product.stock,
          source: 'replacement',
        },
      ];
    });
    setCartOpen(true);
    showToast(`Added ${product.title} to your cart.`, 'success');
    return true;
  };

  const updateCartQty = async (productId: string, qty: number) => {
    if (!currentUser.authenticated) return;
    if (qty <= 0) {
      await removeFromCart(productId);
      return;
    }
    const res = await api.updateCartItem(productId, qty, 'replacement');
    if (!res.ok) {
      showToast(res.error || 'Could not update quantity.', 'error');
      return;
    }
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)));
  };

  const removeFromCart = async (productId: string) => {
    if (!currentUser.authenticated) return;
    const res = await api.updateCartItem(productId, 0, 'replacement');
    if (!res.ok) {
      showToast(res.error || 'Could not remove item.', 'error');
      return;
    }
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const clearCart = async () => {
    if (!currentUser.authenticated) return;
    await Promise.all(cart.map((item) => api.updateCartItem(item.productId, 0, item.source)));
    setCart([]);
  };

  const toggleWishlist = async (productId: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to save products to your wishlist.');
      return;
    }
    const res = await api.toggleWishlist(productId);
    if (!res.ok) {
      showToast(res.error || 'Could not update wishlist.', 'error');
      return;
    }
    const added = Boolean(res.data?.wishlisted);
    setWishlist((prev) => (added ? [...prev.filter((id) => id !== productId), productId] : prev.filter((id) => id !== productId)));
    showToast(added ? 'Saved to wishlist.' : 'Removed from wishlist.', 'info');
  };

  const addAddress = async (address: Omit<Address, 'id'>): Promise<Address | null> => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to save a delivery address.');
      return null;
    }
    const res = await api.createAddress({
      recipient: address.recipient,
      phone: address.phone,
      line: address.line,
      city: address.city,
      state: address.state,
    });
    if (!res.ok || !res.data?.address) {
      showToast(res.error || 'Could not save address.', 'error');
      return null;
    }
    const a = res.data.address;
    const created: Address = {
      id: String(a.id || ''),
      recipient: String(a.recipient || address.recipient),
      phone: String(a.phone || address.phone || ''),
      line: String(a.line || address.line),
      city: String(a.city || address.city),
      state: String(a.state || address.state),
    };
    setAddresses((prev) => [created, ...prev]);
    showToast('Delivery address saved.', 'success');
    return created;
  };

  const removeAddress = async (id: string) => {
    const res = await api.deleteAddress(id);
    if (!res.ok) {
      showToast(res.error || 'Could not delete address.', 'error');
      return;
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const placeOrder = async (addressId: string): Promise<Order | null> => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to place an order.');
      return null;
    }
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await api.checkoutCart(requestId, addressId);
    if (!res.ok || !res.data?.order) {
      showToast(res.error || 'Checkout could not be completed.', 'error');
      return null;
    }
    const mapped = mapApiOrder(res.data.order);
    await refreshSellerData();
    await reloadMarketplace();
    showToast('Order created and inventory reserved.', 'success');
    return mapped;
  };

  const cancelOrder = async (orderId: string) => {
    const res = await api.cancelOrder(orderId);
    if (!res.ok) {
      showToast(res.error || 'Could not cancel order.', 'error');
      return false;
    }
    await refreshSellerData();
    await reloadMarketplace();
    showToast('Order cancelled.', 'info');
    return true;
  };

  const submitReturnRequest = async (orderId: string, reason: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to request a return.');
      return { ok: false, error: 'Authentication required' };
    }
    const res = await api.createReturnRequest(orderId, reason);
    if (!res.ok) {
      return { ok: false, error: res.error || 'Could not submit return request.' };
    }
    await refreshSellerData();
    showToast('Return request submitted.', 'success');
    return { ok: true };
  };

  // Auctions & Coins
  const placeBid = async (auctionId: string, amount: number) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to place a bid.');
      return false;
    }
    const res = await api.placeBid(auctionId, amount);
    if (!res.ok) {
      showToast(res.error || 'Bid rejected.', 'error');
      return false;
    }
    await reloadMarketplace();
    showToast(`Bid of ₦${amount.toLocaleString('en-NG')} placed.`, 'success');
    return true;
  };

  const createSellerAuction = async (input: {
    productId: string;
    startingBidNaira: number;
    durationHours: number;
  }) => {
    if (!isApprovedSeller) {
      return { ok: false, error: 'Only approved sellers can create auctions.' };
    }
    const res = await api.createAuction(input);
    if (!res.ok) {
      return { ok: false, error: res.error || 'Could not create auction.' };
    }
    await reloadMarketplace();
    showToast('Auction created.', 'success');
    return { ok: true };
  };

  const sendCoinGift = async (recipientId: string, gift: 'rose' | 'star' | 'lion') => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to send creator gifts.');
      return false;
    }
    const requestId = `gift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await api.sendGift(recipientId, gift, requestId);
    if (!res.ok) {
      showToast(res.error || 'Could not send gift.', 'error');
      return false;
    }
    await refreshSellerData();
    showToast(`Sent ${gift} gift!`, 'success');
    return true;
  };

  // Video & Social
  const likeVideo = async (videoId: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to like videos.');
      return;
    }
    const res = await api.toggleVideoLike(videoId);
    if (!res.ok) {
      showToast(res.error || 'Could not update like.', 'error');
      return;
    }
    const liked = Boolean(res.data?.liked);
    setShortVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              liked,
              likesCount: liked ? v.likesCount + 1 : Math.max(0, v.likesCount - 1),
            }
          : v
      )
    );
  };

  const loadVideoComments = async (videoId: string): Promise<ShortVideoComment[]> => {
    const res = await api.getVideoComments(videoId);
    if (!res.ok || !Array.isArray(res.data?.comments)) return [];
    const comments: ShortVideoComment[] = res.data.comments.map((c) => ({
      id: String(c.id || ''),
      userId: String(c.user_id || ''),
      userName: String(c.user_name || 'Shopper'),
      content: String(c.body || ''),
      createdAt: String(c.created || ''),
      likesCount: 0,
    }));
    setShortVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, comments } : v)));
    return comments;
  };

  const addVideoComment = async (videoId: string, content: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to post a comment.');
      return false;
    }
    const trimmed = content.trim();
    if (!trimmed) return false;
    const res = await api.addVideoComment(videoId, trimmed);
    if (!res.ok) {
      showToast(res.error || 'Could not post comment.', 'error');
      return false;
    }
    await loadVideoComments(videoId);
    setShortVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, commentsCount: v.commentsCount + 1 } : v))
    );
    return true;
  };

  const deleteVideo = async (videoId: string) => {
    const res = await api.deleteVideo(videoId);
    if (!res.ok) {
      showToast(res.error || 'Could not delete video.', 'error');
      return false;
    }
    setShortVideos((prev) => prev.filter((v) => v.id !== videoId));
    showToast('Video removed.', 'info');
    return true;
  };

  const reportVideo = async (videoId: string, reason: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to report content.');
      return false;
    }
    const res = await api.reportVideo(videoId, reason);
    if (!res.ok) {
      showToast(res.error || 'Could not submit report.', 'error');
      return false;
    }
    showToast('Report submitted for moderation review.', 'success');
    return true;
  };

  const followSeller = async (sellerId: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to follow sellers.');
      return;
    }
    const res = await api.toggleFollow(sellerId);
    if (!res.ok) {
      showToast(res.error || 'Could not update follow status.', 'error');
      return;
    }
    const following = Boolean(res.data?.following);
    setFollows((prev) =>
      following ? [...prev.filter((id) => id !== sellerId), sellerId] : prev.filter((id) => id !== sellerId)
    );
    setShortVideos((prev) => prev.map((v) => (v.sellerId === sellerId ? { ...v, following } : v)));
    showToast(following ? 'Following seller.' : 'Unfollowed seller.', 'info');
  };

  const uploadSellerVideo = async (
    input: {
      file: File;
      title: string;
      caption: string;
      productId: string;
      coverUrl?: string;
    },
    onProgress: (percent: number) => void
  ) => {
    const res = await api.uploadVideoWithProgress(input, onProgress);
    if (!res.ok || !res.data?.success) {
      return { ok: false, error: res.error || 'Video upload failed.' };
    }
    await reloadMarketplace();
    showToast('Video uploaded and published to For You.', 'success');
    return { ok: true, id: res.data.id };
  };

  // Live Rooms
  const createLiveRoom = async (input: { title: string; category: string; pinnedProductId?: string; broadcastConnected?: boolean }) => {
    if (!isApprovedSeller) {
      return { ok: false, error: 'Only approved sellers can start a livestream.' };
    }
    const res = await api.createLiveRoom(input);
    if (!res.ok || !res.data?.roomId) {
      return { ok: false, error: res.error || 'Could not start livestream.', code: res.code };
    }
    await reloadMarketplace();
    showToast('Live room created.', 'success');
    return { ok: true, roomId: res.data.roomId };
  };

  const joinLiveRoom = async (roomId: string) => {
    const res = await api.updateLiveRoom({ roomId, action: 'join' });
    if (res.ok && res.data?.room) {
      const updated = mapApiLiveRoom(res.data.room, products);
      setLiveRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
    }
  };

  const likeLiveRoom = async (roomId: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to send reactions in a livestream.');
      return;
    }
    const res = await api.updateLiveRoom({ roomId, action: 'like' });
    if (res.ok && res.data?.room) {
      const updated = mapApiLiveRoom(res.data.room, products);
      setLiveRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
    }
  };

  const pinLiveProduct = async (roomId: string, productId: string) => {
    const res = await api.updateLiveRoom({ roomId, action: 'pin', pinnedProductId: productId });
    if (!res.ok) return { ok: false, error: res.error || 'Could not pin product.' };
    await reloadMarketplace();
    return { ok: true };
  };

  const endLiveRoom = async (roomId: string) => {
    const res = await api.updateLiveRoom({ roomId, action: 'end' });
    if (!res.ok) return { ok: false, error: res.error || 'Could not end livestream.' };
    await reloadMarketplace();
    showToast('Livestream ended.', 'info');
    return { ok: true };
  };

  const loadLiveComments = async (roomId: string): Promise<LiveComment[]> => {
    const res = await api.getLiveComments(roomId);
    if (!res.ok || !Array.isArray(res.data?.comments)) return [];
    return res.data.comments.map((c) => ({
      id: String(c.id || ''),
      roomId: String(c.room_id || roomId),
      userId: String(c.user_id || ''),
      userName: String(c.author_name || c.user_name || 'Member'),
      body: String(c.body || ''),
      createdAt: String(c.created || ''),
    }));
  };

  const addLiveComment = async (roomId: string, body: string) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to chat in this livestream.');
      return false;
    }
    const trimmed = body.trim();
    if (!trimmed) return false;
    const res = await api.addLiveComment(roomId, trimmed);
    if (!res.ok) {
      showToast(res.error || 'Could not send message.', 'error');
      return false;
    }
    return true;
  };

  // Messages & Notifications
  const sendMessage = async (
    receiverId: string,
    content: string,
    orderId?: string
  ) => {
    if (!currentUser.authenticated) {
      openAuthModal('Sign in to message sellers.');
      return false;
    }
    const trimmed = content.trim();
    if (!trimmed) return false;
    const res = await api.sendMessage({ receiverId, body: trimmed, orderId });
    if (!res.ok) {
      showToast(res.error || 'Could not send message.', 'error');
      return false;
    }
    await refreshSellerData();
    return true;
  };

  const markMessageRead = (senderId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.senderId === senderId && m.receiverId === currentUser.id ? { ...m, read: true } : m))
    );
  };

  const markNotificationsRead = async () => {
    if (!currentUser.authenticated) return;
    await api.markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const subscribeNewsletter = (
    email: string,
    name?: string,
    source: NewsletterSubscriber['source'] = 'footer',
    preferences: string[] = ['flash-deals', 'livestreams']
  ) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setNewsletterSubscribers((prev) => {
      if (prev.some((s) => s.email === clean)) return prev;
      return [
        {
          id: `sub-${Date.now()}`,
          email: clean,
          name,
          subscribedAt: new Date().toISOString(),
          status: 'subscribed',
          preferences,
          source,
        },
        ...prev,
      ];
    });
    showToast('Subscriber added to the email studio preview only. No subscription was saved to the server.', 'info');
  };

  const unreadMessagesCount = useMemo(
    () => messages.filter((m) => m.receiverId === currentUser.id && !m.read).length,
    [messages, currentUser.id]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        isApprovedSeller,
        isAdmin,
        isAuthReady,
        platformConfig,
        healthStatus,
        catalogState,
        storefrontsState,
        videosState,
        liveState,
        auctionsState,
        ordersState,
        reloadMarketplace,
        refreshLiveRooms,
        authModal,
        openAuthModal,
        closeAuthModal,
        loginWithApi,
        registerWithApi,
        verifyWithApi,
        logout,
        updateProfile,
        products,
        storefronts,
        shortVideos,
        liveRooms,
        liveStreamingConfigured,
        auctions,
        cart,
        wishlist,
        follows,
        addresses,
        orders,
        returns,
        messages,
        notifications,
        unreadMessagesCount,
        unreadNotificationsCount,
        coinActivity,
        newsletterSubscribers,
        emailCampaigns,
        sellerApplication,
        sellerStore,
        sellerProducts,
        sellerOrders,
        kycStatus,
        refreshSellerData,
        submitSellerApplication,
        saveSellerStore,
        createSellerProduct,
        updateSellerProduct,
        submitSellerProductForReview,
        unpublishSellerProduct,
        archiveSellerProduct,
        updateSellerOrderStatus,
        isCartOpen,
        setCartOpen,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        toggleWishlist,
        addAddress,
        removeAddress,
        placeOrder,
        cancelOrder,
        submitReturnRequest,
        placeBid,
        createSellerAuction,
        sendCoinGift,
        likeVideo,
        loadVideoComments,
        addVideoComment,
        deleteVideo,
        reportVideo,
        followSeller,
        uploadSellerVideo,
        createLiveRoom,
        joinLiveRoom,
        likeLiveRoom,
        pinLiveProduct,
        endLiveRoom,
        loadLiveComments,
        addLiveComment,
        sendMessage,
        markMessageRead,
        markNotificationsRead,
        subscribeNewsletter,
        toasts,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
