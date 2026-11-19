import type { Role, SellerStatus } from '../types';

export interface ApiCategory {
  id: string;
  name: string;
  active?: number;
  product_count?: number;
}

export interface ApiProduct {
  id: string;
  store: string;
  store_name?: string;
  name: string;
  description: string;
  category: string;
  brand?: string;
  price: number;
  price_minor?: number;
  compare_at?: number | null;
  stock: number;
  image: string;
  featured: number;
  publication?: string;
  created?: string;
  rating?: number;
  reviews_count?: number;
}

export interface ApiStorefront {
  id: string;
  owner_id?: string;
  name: string;
  description: string;
  category: string;
  location: string;
  verified: number;
  phone?: string;
  followers_count?: number;
}

export interface ApiReview {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created: string;
}

export interface ApiSellerApplication {
  id: string;
  user_id: string;
  email?: string;
  role?: Role;
  user_seller_status?: SellerStatus;
  suspended?: number | boolean;
  business_name: string;
  cac_number: string;
  business_type: string;
  state_location: string;
  phone: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  created: string;
  updated?: string;
}

export interface ApiSellerProduct {
  id: string;
  owner: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price_minor: number;
  compare_at_minor: number;
  stock: number;
  image_url: string;
  featured: number;
  revision: number;
  publication: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  created: string;
}

export interface ApiSupportTicket {
  id: string;
  requester_id?: string;
  requester_email?: string;
  subject: string;
  category: 'general' | 'order' | 'delivery' | 'product' | 'account' | 'technical';
  order_id: string;
  status: 'open' | 'in_progress' | 'waiting_for_customer' | 'escalated' | 'resolved';
  priority: 'normal' | 'high';
  created: number;
  updated: number;
}
export interface ApiSupportMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  internal: number;
  created: number;
}
export interface ApiSupportDetail {
  ticket: ApiSupportTicket;
  messages: ApiSupportMessage[];
  linkedOrder: { id: string; status: string; payment_state: string; created: number } | null;
}

export interface PlatformFeatureConfig {
  paymentsEnabled: boolean;
  coinsPurchasesEnabled: boolean;
  kycUploadsEnabled: boolean;
  orderReservationsEnabled: boolean;
  streamConfigured: boolean;
  liveStreamingConfigured: boolean;
  r2Configured: boolean;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformFeatureConfig = {
  paymentsEnabled: false,
  coinsPurchasesEnabled: false,
  kycUploadsEnabled: false,
  orderReservationsEnabled: true,
  streamConfigured: false,
  liveStreamingConfigured: false,
  r2Configured: false,
};

export interface ApiAuthUser {
  id: string;
  email: string;
  role: Role;
  sellerStatus: SellerStatus;
}

export interface HealthResponse {
  ok: boolean;
  status?: string;
  service?: string;
  environment?: string;
  dbConnected?: boolean;
  authDbConnected?: boolean;
  authenticated?: boolean;
  user?: ApiAuthUser | null;
  staging?: PlatformFeatureConfig;
  latencyMs: number;
}

export interface ApiUserProfile {
  user_id: string;
  display_name: string;
  username?: string | null;
  bio: string;
  avatar_url: string;
  selected_state: string;
  email: string;
  role: Role;
  sellerStatus: SellerStatus;
  updated_at?: string;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  }

  private async requestJson<T>(
    path: string,
    init?: RequestInit & { timeoutMs?: number }
  ): Promise<ApiResult<T>> {
    try {
      const { timeoutMs = 8000, headers, ...rest } = init || {};
      const res = await fetch(`${this.baseUrl}${path}`, {
        credentials: 'include',
        headers: {
          ...(rest.body && !(rest.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
          ...(headers || {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
        ...rest,
      });
      const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: data?.error || (!res.ok ? `Request failed (${res.status})` : undefined),
        code: data?.code,
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : 'Network unreachable',
      };
    }
  }

  async checkHealth(): Promise<HealthResponse> {
    const start = performance.now();
    const res = await this.requestJson<Partial<HealthResponse>>('/api/health', { timeoutMs: 4500 });
    const latencyMs = Math.round(performance.now() - start);
    if (res.ok && res.data) {
      return {
        ok: true,
        status: res.data.status || 'ok',
        service: res.data.service,
        environment: res.data.environment,
        dbConnected: res.data.dbConnected,
        authDbConnected: res.data.authDbConnected,
        authenticated: Boolean(res.data.authenticated),
        user: res.data.user ?? null,
        staging: res.data.staging ? { ...DEFAULT_PLATFORM_CONFIG, ...res.data.staging } : DEFAULT_PLATFORM_CONFIG,
        latencyMs,
      };
    }
    return { ok: false, staging: DEFAULT_PLATFORM_CONFIG, latencyMs };
  }

  async login(
    email: string,
    password: string,
    totpCode?: string
  ): Promise<{ signedIn?: boolean; user?: ApiAuthUser; error?: string; mfaRequired?: boolean }> {
    const payload: Record<string, string> = { email, password };
    const adminCode = totpCode?.trim() || '';
    if (adminCode) payload.code = adminCode;
    const res = await this.requestJson<{ signedIn?: boolean; user?: ApiAuthUser; mfaRequired?: boolean }>(
      adminCode ? '/api/auth/admin-login' : '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return res.ok
      ? { signedIn: Boolean(res.data?.signedIn), user: res.data?.user }
      : { error: res.error || 'Sign-in failed', mfaRequired: Boolean(res.data?.mfaRequired) };
  }

  async register(email: string): Promise<{ accepted?: boolean; verificationToken?: string; error?: string }> {
    const res = await this.requestJson<{ accepted?: boolean; verificationToken?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return res.ok
      ? { accepted: Boolean(res.data?.accepted), verificationToken: res.data?.verificationToken }
      : { error: res.error || 'Registration unavailable' };
  }

  async verifyAccount(token: string, password: string): Promise<{ completed?: boolean; error?: string }> {
    const res = await this.requestJson<{ completed?: boolean }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    return res.ok ? { completed: Boolean(res.data?.completed) } : { error: res.error || 'Verification failed' };
  }

  async requestPasswordReset(email: string): Promise<{ accepted?: boolean; error?: string }> {
    const res = await this.requestJson<{ accepted?: boolean }>('/api/auth/request-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return res.ok ? { accepted: Boolean(res.data?.accepted) } : { error: res.error || 'Reset unavailable' };
  }

  async logout(): Promise<void> {
    await this.requestJson('/api/auth/logout', { method: 'POST', body: '{}' });
  }

  async getAuthMe(): Promise<{ user: ApiAuthUser | null; error?: string; ok: boolean }> {
    const res = await this.requestJson<{ user?: ApiAuthUser }>('/api/auth/me', { timeoutMs: 4500 });
    return { ok: res.ok, user: res.ok ? res.data?.user ?? null : null, error: res.error };
  }

  async getProfile(): Promise<ApiResult<{ profile?: ApiUserProfile }>> {
    return this.requestJson<{ profile?: ApiUserProfile }>('/api/v1/profile');
  }

  async updateProfile(input: {
    displayName: string;
    username?: string;
    bio: string;
    avatarUrl: string;
    selectedState: string;
  }, photo?: Blob): Promise<{ updated: boolean; profile?: ApiUserProfile; error?: string }> {
    let body: string | FormData = JSON.stringify(input);
    if (photo) {
      body = new FormData();
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) body.append(key, value);
      }
      body.append('photo', photo, 'profile-photo.jpg');
    }
    const res = await this.requestJson<{ updated?: boolean; profile?: ApiUserProfile }>('/api/v1/profile', {
      method: 'PUT', body, timeoutMs: 20000,
    });
    return { updated: Boolean(res.ok && res.data?.updated), profile: res.data?.profile, error: res.error };
  }

  async getCategories(search = ''): Promise<ApiResult<{ categories?: ApiCategory[] }>> {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    return this.requestJson<{ categories?: ApiCategory[] }>(`/api/categories${query}`);
  }

  async getProducts(params?: {
    q?: string;
    store?: string;
    category?: string;
    offset?: number;
  }): Promise<ApiResult<{ products?: ApiProduct[] }>> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.store) sp.set('store', params.store);
    if (params?.category) sp.set('category', params.category);
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString();
    return this.requestJson<{ products?: ApiProduct[] }>(`/api/products${qs ? `?${qs}` : ''}`);
  }

  async getProduct(id: string): Promise<ApiResult<{ product?: ApiProduct }>> {
    return this.requestJson<{ product?: ApiProduct }>(`/api/products/${encodeURIComponent(id)}`);
  }

  async getStorefronts(): Promise<ApiResult<{ storefronts?: ApiStorefront[] }>> {
    return this.requestJson<{ storefronts?: ApiStorefront[] }>('/api/storefronts');
  }

  async getStorefront(storeId: string): Promise<ApiResult<{ storefront?: ApiStorefront }>> {
    return this.requestJson<{ storefront?: ApiStorefront }>(`/api/storefronts/${encodeURIComponent(storeId)}`);
  }

  async getProductReviews(productId: string): Promise<ApiResult<{ reviews?: ApiReview[] }>> {
    return this.requestJson<{ reviews?: ApiReview[] }>(
      `/api/reviews?product_id=${encodeURIComponent(productId)}`
    );
  }

  async createProductReview(productId: string, rating: number, comment: string) {
    return this.requestJson<{ review?: ApiReview }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId, rating, comment }),
    });
  }

  // Seller onboarding
  async getSellerApplication() {
    return this.requestJson<{ sellerStatus?: SellerStatus; application?: ApiSellerApplication | null }>(
      '/api/v1/seller/application'
    );
  }

  async submitSellerApplication(input: {
    businessName: string;
    cacNumber: string;
    businessType: string;
    stateLocation: string;
    phone: string;
    description: string;
  }) {
    return this.requestJson<{
      submitted?: boolean;
      sellerStatus?: SellerStatus;
      application?: ApiSellerApplication;
    }>('/api/v1/seller/application', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getKycStatus(): Promise<{ uploadsEnabled: boolean; r2Configured?: boolean; reason?: string }> {
    const res = await this.requestJson<{ uploadsEnabled: boolean; r2Configured?: boolean; reason?: string }>(
      '/api/sellers/kyc',
      { timeoutMs: 4500 }
    );
    if (res.ok && res.data) return res.data;
    return {
      uploadsEnabled: false,
      r2Configured: false,
      reason: 'Encrypted KYC document storage is not currently enabled on this environment.',
    };
  }

  // Approved Seller APIs
  async getSellerStore() {
    return this.requestJson<{ storefront?: ApiStorefront | null }>('/api/seller/store');
  }

  async upsertSellerStore(input: {
    name: string;
    description: string;
    category: string;
    location: string;
    phone?: string;
  }) {
    return this.requestJson<{ saved?: boolean; storefront?: ApiStorefront }>('/api/seller/store', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getSellerProducts() {
    return this.requestJson<{ items?: ApiSellerProduct[] }>('/api/seller/products');
  }

  async uploadSellerProductPhoto(photo: Blob) {
    return this.requestJson<{ imageUrl?: string }>('/api/seller/product-photo', {
      method: 'POST',
      headers: { 'Content-Type': photo.type },
      body: photo,
      timeoutMs: 20000,
    });
  }

  async mutateSellerProduct(input: {
    action: 'create' | 'update' | 'submit' | 'unpublish' | 'archive';
    id?: string;
    revision?: number;
    name?: string;
    description?: string;
    category?: string;
    brand?: string;
    priceNaira?: number;
    compareAtNaira?: number;
    stock?: number;
    imageUrl?: string;
    featured?: boolean;
  }) {
    return this.requestJson<{ id?: string; publication?: string; revision?: number; ok?: boolean }>(
      '/api/seller/products',
      {
        method: 'POST',
        body: JSON.stringify({
          action: input.action,
          id: input.action === 'create' ? (input.id || crypto.randomUUID()) : input.id,
          revision: input.revision,
          name: input.name,
          description: input.description,
          category: input.category,
          brand: input.brand,
          priceMinor: typeof input.priceNaira === 'number' ? Math.round(input.priceNaira * 100) : undefined,
          compareAtMinor:
            typeof input.compareAtNaira === 'number' ? Math.round(input.compareAtNaira * 100) : undefined,
          stock: input.stock,
          imageUrl: input.imageUrl,
          featured: input.featured,
        }),
      }
    );
  }

  async getSellerOrders() {
    return this.requestJson<{ orders?: Array<Record<string, unknown>> }>('/api/seller/orders');
  }

  async fulfillOrder(orderId: string, status: string, carrier: string, trackingNumber: string) {
    return this.requestJson<{ updated?: boolean }>('/api/seller/orders/fulfil', {
      method: 'POST',
      body: JSON.stringify({ orderId, status, carrier, trackingNumber }),
    });
  }

  // Admin APIs
  async getAdminOverview() {
    return this.requestJson<{
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
      auditLogs: Array<Record<string, unknown>>;
    }>('/api/admin/overview');
  }

  async getAdminSellerApplications() {
    return this.requestJson<{ applications?: ApiSellerApplication[]; available?: boolean; warning?: string }>('/api/admin/seller-applications');
  }

  async reviewSellerApplication(input: {
    applicationId?: string;
    userId?: string;
    decision: 'approve' | 'reject' | 'suspend';
    notes?: string;
  }) {
    return this.requestJson<{ updated?: boolean; sellerStatus?: SellerStatus }>(
      '/api/admin/seller-applications/review',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  }

  async getAdminModerationQueue() {
    return this.requestJson<{ products?: Array<Record<string, unknown>> }>('/api/admin/moderation');
  }

  async moderateProduct(id: string, revision: number, decision: 'approve' | 'reject') {
    return this.requestJson<{ updated?: boolean; publication?: string }>('/api/admin/moderation', {
      method: 'POST',
      body: JSON.stringify({ id, revision, decision }),
    });
  }

  // Cart & Orders & Returns
  async getCart() {
    return this.requestJson<{ items?: Array<Record<string, unknown>> }>('/api/cart');
  }

  async updateCartItem(id: string, quantity: number, source: 'legacy' | 'replacement' = 'replacement') {
    return this.requestJson<{ updated?: boolean }>('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ id, quantity, source }),
    });
  }

  async getAddresses(): Promise<ApiResult<{ addresses?: Array<Record<string, unknown>> }>> {
    return this.requestJson<{ addresses?: Array<Record<string, unknown>> }>('/api/v1/addresses');
  }

  async createAddress(input: { recipient: string; phone?: string; line: string; city: string; state: string }) {
    return this.requestJson<{ address?: Record<string, unknown> }>('/api/v1/addresses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteAddress(id: string) {
    return this.requestJson<{ deleted?: boolean }>('/api/v1/addresses', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  }

  async checkoutCart(requestId: string, addressId: string) {
    return this.requestJson<{ order?: Record<string, unknown> }>('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, address_id: addressId }),
    });
  }

  async getOrders() {
    return this.requestJson<{ orders?: Array<Record<string, unknown>> }>('/api/orders');
  }

  async cancelOrder(orderId: string) {
    return this.requestJson<{ cancelled?: boolean }>('/api/orders/cancel', {
      method: 'POST',
      body: JSON.stringify({ id: orderId }),
    });
  }

  async getReturns() {
    return this.requestJson<{ returns?: Array<Record<string, unknown>> }>('/api/returns');
  }

  async createReturnRequest(orderId: string, reason: string) {
    return this.requestJson<{ return?: Record<string, unknown> }>('/api/returns', {
      method: 'POST',
      body: JSON.stringify({ orderId, reason }),
    });
  }

  // Wishlist, Follows, Messages, Notifications
  async getWishlist(): Promise<ApiResult<{ wishlist?: Array<{ product_id: string }> }>> {
    return this.requestJson<{ wishlist?: Array<{ product_id: string }> }>('/api/v1/wishlist');
  }

  async toggleWishlist(productId: string) {
    return this.requestJson<{ wishlisted?: boolean }>('/api/v1/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  async getFollows(): Promise<ApiResult<{ following?: Array<{ seller_id: string }> }>> {
    return this.requestJson<{ following?: Array<{ seller_id: string }> }>('/api/v1/follows');
  }

  async toggleFollow(sellerId: string) {
    return this.requestJson<{ following?: boolean }>('/api/v1/follows', {
      method: 'POST',
      body: JSON.stringify({ sellerId }),
    });
  }

  async getMessages() {
    return this.requestJson<{ messages?: Array<Record<string, unknown>> }>('/api/v1/messages');
  }

  async sendMessage(input: { receiverId: string; body: string; orderId?: string; productId?: string }) {
    return this.requestJson<{ success?: boolean; id?: string }>('/api/v1/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // First-party, human-operated support inbox (no automatic AI or email send).
  async listSupportTickets(status?: ApiSupportTicket['status']) {
    const query = status ? '?status=' + encodeURIComponent(status) : '';
    return this.requestJson<{ tickets: ApiSupportTicket[]; role: string }>('/api/support/tickets' + query);
  }

  async getSupportTicket(id: string) {
    return this.requestJson<ApiSupportDetail>('/api/support/tickets/' + encodeURIComponent(id));
  }

  async createSupportTicket(input: {
    subject: string; category: ApiSupportTicket['category']; message: string; orderId?: string;
  }) {
    return this.requestJson<{ ticket: { id: string; status: string } }>('/api/support/tickets', {
      method: 'POST', body: JSON.stringify(input),
    });
  }

  async replySupportTicket(id: string, message: string, internal = false) {
    return this.requestJson<{ created: boolean; id: string }>(
      '/api/support/tickets/' + encodeURIComponent(id) + '/messages', {
        method: 'POST', body: JSON.stringify({ message, internal }),
      }
    );
  }

  async updateSupportTicket(id: string, input: {
    status?: ApiSupportTicket['status']; priority?: ApiSupportTicket['priority']; action?: 'escalate';
  }) {
    return this.requestJson<{ updated: boolean; status?: string }>(
      '/api/support/tickets/' + encodeURIComponent(id), {
        method: 'PATCH', body: JSON.stringify(input),
      }
    );
  }

  async getSupportReplyTemplates(id: string) {
    return this.requestJson<{ source: string; aiGenerated: boolean; suggestions: string[] }>(
      '/api/support/tickets/' + encodeURIComponent(id) + '/reply-templates'
    );
  }

  async getNotifications() {
    return this.requestJson<{ notifications?: Array<Record<string, unknown>> }>('/api/v1/notifications');
  }

  async markNotificationsRead() {
    return this.requestJson<{ updated?: boolean }>('/api/v1/notifications', {
      method: 'PATCH',
      body: '{}',
    });
  }

  // Videos
  async getVideos() {
    return this.requestJson<{ videos?: Array<Record<string, unknown>> }>('/api/v1/videos');
  }

  async getVideoComments(videoId: string) {
    return this.requestJson<{ comments?: Array<Record<string, unknown>> }>(
      `/api/v1/videos/comments?video_id=${encodeURIComponent(videoId)}`
    );
  }

  async toggleVideoLike(videoId: string) {
    return this.requestJson<{ liked?: boolean }>('/api/v1/videos/like', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
  }

  async addVideoComment(videoId: string, body: string) {
    return this.requestJson<{ success?: boolean; id?: string }>('/api/v1/videos/comments', {
      method: 'POST',
      body: JSON.stringify({ videoId, body }),
    });
  }

  async deleteVideo(videoId: string) {
    return this.requestJson<{ deleted?: boolean }>(`/api/v1/videos/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
    });
  }

  async reportVideo(videoId: string, reason: string) {
    return this.requestJson<{ reported?: boolean }>('/api/v1/videos/report', {
      method: 'POST',
      body: JSON.stringify({ videoId, reason }),
    });
  }

  uploadVideoWithProgress(
    input: {
      file: File;
      title: string;
      caption: string;
      productId: string;
      coverUrl?: string;
    },
    onProgress: (percent: number) => void
  ): Promise<ApiResult<{ success?: boolean; id?: string; videoUrl?: string; processingStatus?: string }>> {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('video', input.file);
      formData.append('title', input.title);
      formData.append('caption', input.caption);
      formData.append('productId', input.productId);
      if (input.coverUrl) formData.append('coverUrl', input.coverUrl);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/api/v1/videos/upload`, true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      };

      xhr.onload = () => {
        onProgress(100);
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(xhr.responseText || '{}') as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        const ok = xhr.status >= 200 && xhr.status < 300;
        resolve({
          ok,
          status: xhr.status,
          data: parsed as { success?: boolean; id?: string; videoUrl?: string; processingStatus?: string },
          error: typeof parsed.error === 'string' ? parsed.error : !ok ? `Upload failed (${xhr.status})` : undefined,
          code: typeof parsed.code === 'string' ? parsed.code : undefined,
        });
      };

      xhr.onerror = () => {
        resolve({ ok: false, status: 0, error: 'Network error while uploading video' });
      };

      xhr.send(formData);
    });
  }

  // Live Streaming
  async getLiveRooms() {
    return this.requestJson<{ rooms?: Array<Record<string, unknown>>; liveStreamingConfigured?: boolean }>(
      '/api/v1/live'
    );
  }

  async createLiveRoom(input: { title: string; category: string; pinnedProductId?: string }) {
    return this.requestJson<{ success?: boolean; roomId?: string }>('/api/v1/live', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateLiveRoom(input: {
    roomId: string;
    action: 'join' | 'like' | 'pin' | 'end';
    pinnedProductId?: string;
  }) {
    return this.requestJson<{ ok?: boolean; room?: Record<string, unknown> }>('/api/v1/live', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async getLiveComments(roomId: string) {
    return this.requestJson<{ comments?: Array<Record<string, unknown>> }>(
      `/api/v1/live/comments?room_id=${encodeURIComponent(roomId)}`
    );
  }

  async addLiveComment(roomId: string, body: string) {
    return this.requestJson<{ success?: boolean; id?: string }>('/api/v1/live/comments', {
      method: 'POST',
      body: JSON.stringify({ roomId, body }),
    });
  }

  // Auctions & Coins
  async getAuctions() {
    return this.requestJson<{ paymentsEnabled?: boolean; auctions?: Array<Record<string, unknown>> }>(
      '/api/auctions'
    );
  }

  async createAuction(input: { productId: string; startingBidNaira: number; durationHours: number }) {
    return this.requestJson<{ created?: boolean; id?: string }>('/api/auctions', {
      method: 'POST',
      body: JSON.stringify({
        productId: input.productId,
        startingBidKobo: Math.round(input.startingBidNaira * 100),
        durationMinutes: Math.round(input.durationHours * 60),
      }),
    });
  }

  async placeBid(auctionId: string, amountNaira: number) {
    return this.requestJson<{ success?: boolean; bidId?: string }>('/api/auctions', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'bid', id: auctionId, amountKobo: Math.round(amountNaira * 100) }),
    });
  }

  async getCoins() {
    return this.requestJson<{ balance?: number; purchasesEnabled?: boolean; activity?: Array<Record<string, unknown>> }>(
      '/api/coins'
    );
  }

  async sendGift(recipientId: string, gift: 'rose' | 'star' | 'lion', requestId: string) {
    return this.requestJson<{ success?: boolean; giftId?: string }>('/api/coins', {
      method: 'POST',
      body: JSON.stringify({ action: 'gift', recipientId, gift, requestId }),
    });
  }

  async initializePayment(orderId: string): Promise<{ checkout_url?: string; error?: string; code?: string }> {
    const res = await this.requestJson<{ checkout_url?: string; error?: string; code?: string }>(
      '/api/payments/initialize',
      {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
      }
    );
    return res.data ?? { error: res.error || 'Payments are currently disabled', code: res.code || 'PAYMENTS_DISABLED' };
  }

  async getPaymentStatus(orderId: string): Promise<{ status?: string; paymentsEnabled?: boolean; error?: string }> {
    const res = await this.requestJson<{ status?: string; paymentsEnabled?: boolean; error?: string }>(
      `/api/payments/status?order_id=${encodeURIComponent(orderId)}`,
      { timeoutMs: 4500 }
    );
    return res.data ?? { error: res.error || 'Payment status unavailable', paymentsEnabled: false };
  }
}

export const api = new ApiClient();
