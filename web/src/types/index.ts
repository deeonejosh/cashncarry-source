export type Role = 'buyer' | 'seller' | 'admin';

export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface SectionLoadState {
  status: LoadStatus;
  error?: string;
}

export interface UserAccount {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: Role;
  sellerStatus: SellerStatus;
  verified: boolean;
  suspended: boolean;
  storeName?: string;
  avatar?: string;
  bio?: string;
  selectedState?: string;
  authenticated?: boolean;
  coins?: number;
}

export interface StorefrontSummary {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  location: string;
  verified: boolean;
  phone?: string;
  followersCount: number;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  slug: string;
  title: string;
  brand: string;
  price: number;
  compareAt: number;
  stock: number;
  category: string;
  badge?: string;
  featured?: boolean;
  description: string;
  image: string;
  sellerId: string;
  sellerName: string;
  rating: number;
  reviews: number;
  publication: 'draft' | 'pending' | 'published';
  archived: boolean;
  createdAt: string;
}

export interface SellerProductItem {
  id: string;
  owner: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  priceMinor: number;
  compareAtMinor: number;
  stock: number;
  imageUrl: string;
  featured: boolean;
  revision: number;
  publication: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  created: string;
}

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  sellerId: string;
  sellerName: string;
  stock: number;
  source: 'legacy' | 'replacement';
}

export interface Address {
  id: string;
  recipient: string;
  phone: string;
  line: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  requestId: string;
  address: Address;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: 'awaiting_payment' | 'paid' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  reservationEndsAt: string;
  flutterwaveRef?: string;
  flutterwaveTransactionId?: string;
  paymentUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  fulfilments?: {
    sellerId: string;
    storeName: string;
    status: 'processing' | 'packed' | 'shipped' | 'delivered';
    carrier: string;
    trackingNumber: string;
    updatedAt: number;
  }[];
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export interface AuctionItem {
  id: string;
  sellerId: string;
  storefrontName: string;
  productId: string;
  title: string;
  image: string;
  startingBid: number;
  currentBid: number | null;
  winnerId: string | null;
  winnerName: string | null;
  endsAt: string;
  closedAt: string | null;
  orderId: string | null;
  bidsCount: number;
  own?: boolean;
  winning?: boolean;
}

export interface LiveRoom {
  id: string;
  sellerId: string;
  sellerName: string;
  title: string;
  category?: string;
  status: 'live' | 'ended';
  viewerCount: number;
  heartsCount: number;
  pinnedProduct: ProductItem | null;
  pinnedProductId?: string | null;
  streamUrl?: string;
  createdAt?: string;
}

export interface LiveComment {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

export interface CoinActivity {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface SellerApplication {
  id: string;
  userId: string;
  email?: string;
  role?: Role;
  userSellerStatus?: SellerStatus;
  suspended?: boolean;
  businessName: string;
  cacNumber: string;
  businessType: string;
  stateLocation: string;
  phone: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  reviewerNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface KYCSubmission {
  id: string;
  sellerId: string;
  sellerName: string;
  businessName: string;
  cacNumber: string;
  businessType?: string;
  stateLocation?: string;
  phone?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  submittedAt: string;
  notes?: string;
}

export interface AdminOverview {
  counts: {
    totalUsers: number;
    approvedSellers: number;
    pendingApplications: number;
    pendingProducts: number;
    publishedProducts: number;
    totalOrders: number;
    totalVideos: number;
    openVideoReports: number;
  };
  auditLogs: Array<{
    id: string;
    actorId: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    detail: string;
    createdAt: string;
  }>;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  attachedProduct?: ProductItem;
  imageUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ShortVideoComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  likesCount: number;
  liked?: boolean;
}

export interface ShortVideo {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerVerified: boolean;
  isLiveNow?: boolean;
  videoUrl: string;
  posterUrl: string;
  title: string;
  caption: string;
  taggedProduct: ProductItem | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  liked?: boolean;
  saved?: boolean;
  following?: boolean;
  processingStatus?: string;
  published?: boolean;
  createdAt: string;
  soundTitle?: string;
  comments?: ShortVideoComment[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'live' | 'system' | 'gift' | 'auction' | 'seller';
  timestamp: string;
  read: boolean;
  link?: string;
}

export type EmailTemplateId =
  | 'welcome'
  | 'flash_sale'
  | 'order_confirmation'
  | 'abandoned_cart'
  | 'seller_weekly';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  subscribedAt: string;
  status: 'subscribed' | 'unconfirmed' | 'unsubscribed';
  preferences: string[];
  source: 'footer' | 'checkout' | 'modal' | 'profile' | 'admin';
  welcomeVoucherSent?: boolean;
}

export interface EmailTemplate {
  id: EmailTemplateId;
  name: string;
  category: 'onboarding' | 'promotional' | 'transactional' | 're-engagement' | 'seller';
  description: string;
  defaultSubject: string;
  defaultPreheader: string;
  defaultHeadline: string;
  defaultBody: string;
  defaultCtaText: string;
  defaultCtaUrl: string;
  thumbnail: string;
}

export interface EmailCampaign {
  id: string;
  title: string;
  subject: string;
  preheader: string;
  templateId: EmailTemplateId;
  status: 'draft' | 'scheduled' | 'sent';
  audienceSegment: 'all' | 'vip' | 'flash_deals' | 'fashion' | 'tech' | 'sellers';
  scheduledFor?: string;
  sentAt?: string;
  recipientsCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  content: {
    headline: string;
    body: string;
    ctaText: string;
    ctaUrl: string;
    voucherCode?: string;
    featuredProductIds?: string[];
  };
}
