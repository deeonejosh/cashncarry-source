import React, { useState, useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { ProductItem, Order } from './types';
import Navbar from './components/ui/Navbar';
import MobileNav from './components/ui/MobileNav';
import Footer from './components/ui/Footer';
import CartDrawer from './components/ui/CartDrawer';
import SEOHead from './components/seo/SEOHead';
import AuthModal from './components/ui/AuthModal';
import CreateModal from './components/ui/CreateModal';
import NewsletterModal from './components/ui/NewsletterModal';

// Pages
import HomePage from './components/pages/HomePage';
import ShopPage from './components/pages/ShopPage';
import ForYouVideoFeedPage from './components/pages/ForYouVideoFeedPage';
import ProductDetailsPage from './components/pages/ProductDetailsPage';
import CheckoutPage from './components/pages/CheckoutPage';
import CheckoutCompletePage from './components/pages/CheckoutCompletePage';
import OrdersPage from './components/pages/OrdersPage';
import ProfilePage from './components/pages/ProfilePage';
import LiveShoppingPage from './components/pages/LiveShoppingPage';
import AuctionsPage from './components/pages/AuctionsPage';
import CoinsPage from './components/pages/CoinsPage';
import FlashDealsPage from './components/pages/FlashDealsPage';
import WishlistPage from './components/pages/WishlistPage';
import ShipmentsPage from './components/pages/ShipmentsPage';
import MessagesPage from './components/pages/MessagesPage';
import NotificationsPage from './components/pages/NotificationsPage';
import ReturnsPage from './components/pages/ReturnsPage';
import EmailMarketingPage from './components/pages/EmailMarketingPage';
import PolicyPage, { type PolicySection } from './components/pages/PolicyPage';
import StorefrontPage from './components/pages/StorefrontPage';

// Seller Centre Pages
import SellerDashboardPage from './components/pages/seller/SellerDashboardPage';
import SellerProductsPage from './components/pages/seller/SellerProductsPage';
import SellerOrdersPage from './components/pages/seller/SellerOrdersPage';
import SellerKYCPage from './components/pages/seller/SellerKYCPage';
import SellerSettlementsPage from './components/pages/seller/SellerSettlementsPage';

// Admin Pages
import AdminDashboardPage from './components/pages/admin/AdminDashboardPage';
import { Lock, ShieldAlert, Store, Clock } from 'lucide-react';

const SELLER_CENTRE_TABS = new Set([
  'seller-dashboard',
  'seller-products',
  'seller-orders',
  'seller-settlements',
]);

const ADMIN_TABS = new Set(['admin-dashboard', 'email-marketing']);

const AUTH_REQUIRED_TABS = new Set([
  'checkout',
  'checkout-complete',
  'orders',
  'wishlist',
  'messages',
  'notifications',
  'returns',
  'seller-kyc',
]);

function AccessDeniedPanel({
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel = 'Return to Shop',
  onSecondary,
  icon = 'lock',
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary: () => void;
  icon?: 'lock' | 'pending' | 'seller';
}) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center space-y-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm my-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
        {icon === 'pending' ? <Clock size={28} /> : icon === 'seller' ? <Store size={28} /> : <ShieldAlert size={28} />}
      </div>
      <h1 className="text-xl font-black text-slate-900">{title}</h1>
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <button
          type="button"
          onClick={onAction}
          className="rounded-xl bg-[#0c5c36] px-6 py-3 text-xs font-black text-white hover:bg-emerald-900 transition"
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={onSecondary}
          className="rounded-xl border border-slate-200 px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

function MainApp() {
  const {
    currentUser,
    isApprovedSeller,
    isAdmin,
    isAuthReady,
    isCartOpen,
    setCartOpen,
    toasts,
    products,
    orders,
    openAuthModal,
  } = useStore();

  const [currentTab, setCurrentTab] = useState<string>(
    () => new URLSearchParams(window.location.search).get('tab') || 'home'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => new URLSearchParams(window.location.search).get('category') || 'all'
  );
  const [policySection, setPolicySection] = useState<PolicySection>('terms');
  const [shopSearchQuery, setShopSearchQuery] = useState<string>(
    () => new URLSearchParams(window.location.search).get('q') || ''
  );
  const [selectedStorefrontId, setSelectedStorefrontId] = useState<string>(
    () => new URLSearchParams(window.location.search).get('seller') || ''
  );
  const historyReady = useRef(false);
  const deepLinkProductResolved = useRef(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string>('');
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false);

  // Deep linking for product id / slug
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const idParam = searchParams.get('id') || searchParams.get('productId');
      if (idParam && products.length > 0 && !deepLinkProductResolved.current) {
        deepLinkProductResolved.current = true;
        const found = products.find((p) => p.id === idParam || p.slug === idParam);
        if (found) {
          setSelectedProduct(found);
          if (!searchParams.has('tab')) setCurrentTab('product-detail');
        }
      }
      const sellerParam = searchParams.get('seller');
      if (sellerParam) setSelectedStorefrontId(sellerParam);
    } catch {
      // ignore
    }
  }, [products]);

  // Synchronize URL bar and history state
  useEffect(() => {
    try {
      const params = new URLSearchParams();
      if (currentTab !== 'home') params.set('tab', currentTab);
      if (currentTab === 'shop' && selectedCategory !== 'all') params.set('category', selectedCategory);
      if (currentTab === 'shop' && shopSearchQuery.trim()) params.set('q', shopSearchQuery.trim());
      if (currentTab === 'product-detail' && selectedProduct) {
        params.set('id', selectedProduct.slug || selectedProduct.id);
      }
      if (currentTab === 'storefront' && selectedStorefrontId) {
        params.set('seller', selectedStorefrontId);
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      if (!historyReady.current) {
        historyReady.current = true;
        window.history.replaceState({ tab: currentTab }, '', newUrl);
      } else if (newUrl !== window.location.pathname + window.location.search) {
        window.history.pushState({ tab: currentTab }, '', newUrl);
      }
    } catch {
      // ignore
    }
  }, [currentTab, selectedCategory, selectedProduct, shopSearchQuery, selectedStorefrontId]);

  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentTab(params.get('tab') || 'home');
      setSelectedCategory(params.get('category') || 'all');
      setShopSearchQuery(params.get('q') || '');
      const seller = params.get('seller');
      if (seller) setSelectedStorefrontId(seller);
      const id = params.get('id');
      if (id) setSelectedProduct(products.find((p) => p.id === id || p.slug === id) || null);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [products]);

  const openPolicy = (section: PolicySection) => {
    setPolicySection(section);
    navigateTab('policies');
  };

  const navigateTab = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: ProductItem) => {
    setSelectedProduct(product);
    navigateTab('product-detail');
  };

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    navigateTab('shop');
  };

  const handleOpenStorefront = (sellerId: string) => {
    setSelectedStorefrontId(sellerId);
    navigateTab('storefront');
  };

  const handleProceedToCheckout = () => {
    if (!currentUser.authenticated) {
      openAuthModal('Please sign in to proceed to checkout.');
      return;
    }
    navigateTab('checkout');
  };

  const handleOrderSuccess = (order: Order) => {
    setLastCompletedOrder(order);
    navigateTab('checkout-complete');
  };

  const handleTrackShipment = (trackingNumber: string) => {
    setActiveTrackingNumber(trackingNumber);
    navigateTab('shipments');
  };

  const handleOpenReturns = (order: Order) => {
    setReturnOrder(order);
    navigateTab('returns');
  };

  // Strict route guard evaluation
  const renderMainContent = () => {
    const needsAuthWait =
      !isAuthReady &&
      (SELLER_CENTRE_TABS.has(currentTab) || ADMIN_TABS.has(currentTab) || AUTH_REQUIRED_TABS.has(currentTab));

    if (needsAuthWait) {
      return (
        <div className="py-20 text-center text-sm font-semibold text-slate-500">
          Verifying account permissions...
        </div>
      );
    }

    // 1. Seller Centre routes: strictly require approved seller
    if (SELLER_CENTRE_TABS.has(currentTab)) {
      if (!currentUser.authenticated) {
        return (
          <AccessDeniedPanel
            title="Sign In Required"
            message="Please sign in with an approved seller account to access Seller Centre."
            actionLabel="Sign In"
            onAction={() => openAuthModal('Sign in to access Seller Centre.')}
            onSecondary={() => navigateTab('shop')}
          />
        );
      }
      if (!isApprovedSeller) {
        if (currentUser.sellerStatus === 'pending') {
          return (
            <AccessDeniedPanel
              icon="pending"
              title="Seller Verification Pending"
              message="Your seller account is awaiting approval. You will be able to access Seller Centre once an administrator approves your application."
              actionLabel="View Application Status"
              onAction={() => navigateTab('seller-kyc')}
              onSecondary={() => navigateTab('shop')}
            />
          );
        }
        return (
          <AccessDeniedPanel
            icon="seller"
            title="Seller Access Restricted (403)"
            message={
              currentUser.sellerStatus === 'suspended'
                ? 'Your seller privileges are currently suspended. Please review your application status or contact support.'
                : currentUser.sellerStatus === 'rejected'
                ? 'Your previous seller application was not approved. Update your business details and reapply.'
                : 'Buyer accounts cannot access Seller Centre. Apply to become a verified seller to publish products and broadcast live.'
            }
            actionLabel={currentUser.sellerStatus === 'rejected' ? 'Review Application' : 'Become a Seller'}
            onAction={() => navigateTab('seller-kyc')}
            onSecondary={() => navigateTab('shop')}
          />
        );
      }
    }

    // 2. Admin routes: strictly require admin
    if (ADMIN_TABS.has(currentTab) && !isAdmin) {
      return (
        <AccessDeniedPanel
          title="Administrator Access Required (403)"
          message="This console is restricted to verified administrators with MFA authentication."
          actionLabel={currentUser.authenticated ? 'Go to Profile' : 'Administrator Sign In'}
          onAction={() =>
            currentUser.authenticated ? navigateTab('profile') : openAuthModal('Sign in with your administrator credentials.')
          }
          onSecondary={() => navigateTab('home')}
        />
      );
    }

    // 3. Authenticated buyer/account routes
    if (AUTH_REQUIRED_TABS.has(currentTab) && !currentUser.authenticated) {
      return (
        <AccessDeniedPanel
          title="Account Sign In Required"
          message="Please sign in or create an account to continue."
          actionLabel="Sign In / Register"
          onAction={() => openAuthModal('Sign in to continue.')}
          onSecondary={() => navigateTab('shop')}
        />
      );
    }

    switch (currentTab) {
      case 'for-you':
        return (
          <ForYouVideoFeedPage
            onSelectProduct={handleSelectProduct}
            onProceedToCheckout={handleProceedToCheckout}
            onBack={() => navigateTab('shop')}
            onOpenCreate={() => setIsCreateModalOpen(true)}
          />
        );
      case 'home':
        return (
          <HomePage
            setCurrentTab={navigateTab}
            onSelectProduct={handleSelectProduct}
            onSelectCategory={handleSelectCategory}
            onOpenStorefront={handleOpenStorefront}
          />
        );
      case 'shop':
        return (
          <ShopPage
            onSelectProduct={handleSelectProduct}
            onQuickBuy={handleProceedToCheckout}
            selectedCategory={selectedCategory}
            searchTerm={shopSearchQuery}
            onSearchCommit={setShopSearchQuery}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />
        );
      case 'product-detail':
        return (
          <ProductDetailsPage
            product={selectedProduct}
            onBack={() => navigateTab('shop')}
            onSelectProduct={handleSelectProduct}
            onProceedToCheckout={handleProceedToCheckout}
            onOpenStorefront={handleOpenStorefront}
          />
        );
      case 'checkout':
        return (
          <CheckoutPage
            onSuccessOrder={handleOrderSuccess}
            onBackToCart={() => setCartOpen(true)}
          />
        );
      case 'checkout-complete':
        return (
          <CheckoutCompletePage
            order={lastCompletedOrder || orders[0] || null}
            onGoToOrders={() => navigateTab('orders')}
            onContinueShopping={() => navigateTab('shop')}
            onTrackOrder={handleTrackShipment}
          />
        );
      case 'orders':
        return (
          <OrdersPage
            onTrackOrder={handleTrackShipment}
            onOpenReturns={handleOpenReturns}
          />
        );
      case 'profile':
        return <ProfilePage onNavigate={navigateTab} />;
      case 'live':
        return (
          <LiveShoppingPage
            onSelectProduct={handleSelectProduct}
            onProceedToCheckout={handleProceedToCheckout}
            onOpenCreate={() => setIsCreateModalOpen(true)}
          />
        );
      case 'auctions':
        return (
          <AuctionsPage
            onOpenStorefront={handleOpenStorefront}
          />
        );
      case 'coins':
        return <CoinsPage />;
      case 'flash-deals':
        return (
          <FlashDealsPage
            onSelectProduct={handleSelectProduct}
            onProceedToCheckout={handleProceedToCheckout}
          />
        );
      case 'wishlist':
        return (
          <WishlistPage
            onSelectProduct={handleSelectProduct}
            onExplore={() => navigateTab('shop')}
          />
        );
      case 'shipments':
        return <ShipmentsPage initialTracking={activeTrackingNumber} />;
      case 'messages':
        return (
          <MessagesPage
            onSelectProduct={handleSelectProduct}
            onNavigateOrder={handleTrackShipment}
          />
        );
      case 'notifications':
        return <NotificationsPage />;
      case 'returns':
        return <ReturnsPage initialOrder={returnOrder} onBack={() => navigateTab('orders')} />;
      case 'seller-dashboard':
        return <SellerDashboardPage onNavigate={navigateTab} onOpenCreate={() => setIsCreateModalOpen(true)} />;
      case 'seller-products':
        return <SellerProductsPage />;
      case 'seller-orders':
        return <SellerOrdersPage />;
      case 'seller-kyc':
        return <SellerKYCPage onNavigate={navigateTab} />;
      case 'seller-settlements':
        return <SellerSettlementsPage />;
      case 'admin-dashboard':
        return <AdminDashboardPage onNavigate={navigateTab} />;
      case 'email-marketing':
        return (
          <EmailMarketingPage
            onSelectProduct={handleSelectProduct}
            onOpenNewsletterModal={() => setNewsletterModalOpen(true)}
          />
        );
      case 'storefront':
        return (
          <StorefrontPage
            sellerId={selectedStorefrontId}
            onBack={() => navigateTab('shop')}
            onSelectProduct={handleSelectProduct}
            onOpenLive={() => navigateTab('live')}
            onOpenVideo={() => navigateTab('for-you')}
          />
        );
      case 'policies':
        return <PolicyPage key={policySection} initialSection={policySection} onBack={() => navigateTab('home')} />;
      default:
        return (
          <HomePage
            setCurrentTab={navigateTab}
            onSelectProduct={handleSelectProduct}
            onSelectCategory={handleSelectCategory}
            onOpenStorefront={handleOpenStorefront}
          />
        );
    }
  };

  return (
    <div
      className={`cnc-app min-h-screen min-w-0 flex flex-col font-sans overflow-x-clip ${
        currentTab === 'for-you' ? 'h-[100dvh] overflow-hidden bg-black p-0 m-0' : 'bg-white text-slate-900'
      }`}
    >
      <SEOHead
        currentTab={currentTab}
        selectedProduct={selectedProduct}
        selectedCategory={selectedCategory}
        products={products}
      />

      <Navbar
        currentTab={currentTab}
        setCurrentTab={navigateTab}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        onSearch={(query) => {
          setShopSearchQuery(query);
          navigateTab('shop');
        }}
      />

      <main
        data-cnc-route={currentTab}
        className={
          currentTab === 'for-you'
            ? 'w-full h-[100dvh] md:h-[100vh] p-0 m-0 overflow-hidden bg-black flex-1'
            : `cnc-page ${SELLER_CENTRE_TABS.has(currentTab) || ADMIN_TABS.has(currentTab) ? 'cnc-dashboard' : ''} flex-1 min-w-0 mx-auto max-w-7xl w-full px-3 pt-4 pb-24 sm:px-4 md:px-8 md:pt-6 md:pb-8`
        }
      >
        {renderMainContent()}
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <NewsletterModal
        isOpen={newsletterModalOpen}
        onClose={() => setNewsletterModalOpen(false)}
        onOpenEmailPreview={isAdmin ? () => navigateTab('email-marketing') : undefined}
      />

      {currentTab !== 'for-you' && !ADMIN_TABS.has(currentTab) && !SELLER_CENTRE_TABS.has(currentTab) && (
        <MobileNav
          currentTab={currentTab}
          setCurrentTab={navigateTab}
          onOpenCreate={() => setIsCreateModalOpen(true)}
        />
      )}

      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onNavigate={navigateTab}
      />

      <AuthModal />

      {toasts.length > 0 && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex flex-col gap-2 md:bottom-6">
          {toasts.slice(-2).map((toast) => (
            <div
              key={toast.id}
              className={`rounded-full px-6 py-3 text-xs font-bold text-white shadow-2xl backdrop-blur-md border border-white/10 ${
                toast.type === 'error'
                  ? 'bg-rose-700/95'
                  : toast.type === 'success'
                  ? 'bg-emerald-900/95'
                  : 'bg-slate-900/95'
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>
      )}

      {currentTab !== 'for-you' && <Footer setCurrentTab={navigateTab} onSelectPolicy={openPolicy} />}
    </div>
  );
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-lg space-y-3 text-center">
            <Lock className="mx-auto text-slate-400" size={28} />
            <h1 className="text-lg font-black text-slate-900">Unable to display view</h1>
            <p className="text-xs text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#0c5c36] px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 transition"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <StoreProvider>
        <MainApp />
      </StoreProvider>
    </AppErrorBoundary>
  );
}
