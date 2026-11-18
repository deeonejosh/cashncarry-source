import React, { useState } from 'react';
import BrandLogo from './BrandLogo';
import { useStore } from '../../context/StoreContext';
import {
  Search,
  ShoppingBag,
  Heart,
  Bell,
  User,
  ChevronDown,
  Sparkles,
  Radio,
  Gavel,
  Zap,
  Store,
  ShieldCheck,
  Menu,
  X,
  Package,
  Layers,
  Coins,
  PlaySquare,
  Mail,
  LogIn,
  LogOut,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenCreate: () => void;
  onSearch: (query: string) => void;
}

export default function Navbar({
  currentTab,
  setCurrentTab,
  onSelectCategory,
  onOpenCreate,
  onSearch,
}: NavbarProps) {
  const {
    currentUser,
    isApprovedSeller,
    isAdmin,
    cart,
    wishlist,
    unreadNotificationsCount,
    setCartOpen,
    openAuthModal,
    logout,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery.trim());
    setMobileMenuOpen(false);
  };

  const navCategories = [
    { id: 'fashion', label: 'Fashion & Ankara' },
    { id: 'tech', label: 'Electronics & Tech' },
    { id: 'phones', label: 'Phones & Accessories' },
    { id: 'beauty', label: 'Beauty & Skincare' },
    { id: 'home', label: 'Home & Living' },
    { id: 'health', label: 'Health & Wellness' },
  ];

  const initials = (currentUser.name || 'G').trim().charAt(0).toUpperCase();

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md ${currentTab === 'for-you' ? 'hidden' : ''}`}>
      {/* Main Header */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <button
          type="button"
          onClick={() => setCurrentTab('home')}
          className="flex items-center gap-2 shrink-0 text-left"
        >
          <BrandLogo />
        </button>

        {/* Category Menu */}
        <div className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            Categories <ChevronDown size={14} className={`transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {categoryDropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl z-50">
              {navCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory?.(cat.id);
                    setCategoryDropdownOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
                >
                  {cat.label}
                  <ChevronDown size={12} className="-rotate-90 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden min-w-0 flex-1 max-w-xl lg:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products and stores"
            placeholder="Search products and stores"
            className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-24 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[#0c5c36] px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 transition"
          >
            Search
          </button>
        </form>

        {/* Desktop Quick Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          {!currentUser.authenticated && (
            <button type="button" onClick={() => openAuthModal()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0c5c36] px-3.5 py-2 text-xs font-bold text-[#0c5c36] hover:bg-emerald-50">
              <LogIn size={15} /> Sign In
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCreate}
            className="hidden lg:flex items-center gap-1.5 rounded-full bg-orange-700 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-orange-800 transition"
          >
            <PlusCircle size={15} />
            <span>{isApprovedSeller ? 'Create / Live' : currentUser.sellerStatus === 'pending' ? 'Seller Status' : 'Create'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('coins')}
            className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-900 hover:bg-amber-100 transition"
            title="Coins & Gifts"
            aria-label="Coins and gifts"
          >
            <Coins size={14} className="text-amber-600" />
            <span>{(currentUser.coins ?? 0).toLocaleString()}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('wishlist')}
            className="relative rounded-full p-2.5 text-slate-700 hover:bg-slate-100 transition"
            aria-label="Wishlist"
          >
            <Heart size={20} className={wishlist.length > 0 ? 'fill-rose-500 text-rose-500' : ''} />
            {wishlist.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                {wishlist.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('notifications')}
            className="relative rounded-full p-2.5 text-slate-700 hover:bg-slate-100 transition"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-700 text-[10px] font-black text-white">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-label="Account menu"
              aria-expanded={profileDropdownOpen}
              className="flex items-center gap-2 rounded-full p-1.5 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-8 w-8 rounded-full object-cover border border-emerald-700"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0c5c36] text-xs font-black text-white">
                  {initials}
                </div>
              )}
              <span className="hidden max-w-28 truncate text-xs font-bold text-slate-800 xl:block">
                {currentUser.authenticated ? currentUser.name.split(' ')[0] : 'Account'}
              </span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-xs font-black text-slate-900">{currentUser.name}</div>
                  {currentUser.email && (
                    <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                  )}
                  <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {!currentUser.authenticated
                      ? 'Guest'
                      : isAdmin
                      ? 'Admin'
                      : isApprovedSeller
                      ? 'Approved Seller'
                      : currentUser.sellerStatus === 'pending'
                      ? 'Pending Seller'
                      : 'Buyer'}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User size={15} /> My Profile & Addresses
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('orders');
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Package size={15} /> Orders & Tracking
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('messages');
                      setProfileDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Layers size={15} /> Messages
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('email-marketing');
                        setProfileDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Mail size={15} /> Email Studio (Admin)
                    </button>
                  )}

                  {/* Strictly RBAC-gated Seller Link */}
                  <div className="border-t border-slate-100 my-1 pt-1">
                    {isApprovedSeller ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('seller-dashboard');
                          setProfileDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                      >
                        <Store size={15} /> Seller Centre
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('seller-kyc');
                          setProfileDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                      >
                        <Store size={15} />{' '}
                        {currentUser.sellerStatus === 'pending'
                          ? 'Seller Application Status'
                          : 'Become a Seller'}
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="border-t border-slate-100 my-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTab('admin-dashboard');
                          setProfileDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-purple-800 hover:bg-purple-50"
                      >
                        <ShieldCheck size={15} /> Admin Console
                      </button>
                    </div>
                  )}

                  <div className="border-t border-slate-100 my-1 pt-1">
                    {currentUser.authenticated ? (
                      <button
                        type="button"
                        onClick={() => {
                          void logout();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          openAuthModal();
                          setProfileDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#0E6B38] hover:bg-emerald-50"
                      >
                        <LogIn size={15} /> Sign In / Create Account
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 rounded-full bg-[#0c5c36] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-900"
          >
            <ShoppingBag size={16} />
            <span>Cart</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-700 text-[10px] text-white">
              {cartCount}
            </span>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative rounded-full p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Cart"
          >
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-orange-700 text-[10px] font-black text-white">
                {cartCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close mobile menu' : 'Open mobile menu'}
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Secondary Navigation */}
      <nav className="mx-auto hidden max-w-7xl items-center gap-5 px-8 pb-3 text-xs font-bold text-slate-700 lg:flex overflow-x-auto">
        <button
          type="button"
          onClick={() => setCurrentTab('shop')}
          className={`whitespace-nowrap transition ${
            currentTab === 'shop' || currentTab === 'home'
              ? 'text-[#0c5c36] font-extrabold border-b-2 border-[#0c5c36] pb-1'
              : 'hover:text-[#0c5c36]'
          }`}
        >
          Shop
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('for-you')}
          className={`flex items-center gap-1.5 whitespace-nowrap transition ${
            currentTab === 'for-you'
              ? 'text-[#0c5c36] font-extrabold border-b-2 border-[#0c5c36] pb-1'
              : 'hover:text-[#0c5c36]'
          }`}
        >
          <PlaySquare size={14} className="text-orange-500" />
          For You
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('live')}
          className={`flex items-center gap-1.5 whitespace-nowrap transition ${
            currentTab === 'live'
              ? 'text-rose-600 font-extrabold border-b-2 border-rose-600 pb-1'
              : 'hover:text-rose-600'
          }`}
        >
          <Radio size={14} className="text-rose-500" />
          Livestreams
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('flash-deals')}
          className={`flex items-center gap-1.5 whitespace-nowrap transition ${
            currentTab === 'flash-deals'
              ? 'text-orange-700 font-extrabold border-b-2 border-orange-600 pb-1'
              : 'hover:text-orange-700'
          }`}
        >
          <Zap size={14} className="text-orange-500" />
          Deals
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('auctions')}
          className={`flex items-center gap-1.5 whitespace-nowrap transition ${
            currentTab === 'auctions'
              ? 'text-amber-700 font-extrabold border-b-2 border-amber-700 pb-1'
              : 'hover:text-amber-700'
          }`}
        >
          <Gavel size={14} className="text-amber-600" />
          Auctions
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              isApprovedSeller ? setCurrentTab('seller-dashboard') : setCurrentTab('seller-kyc')
            }
            className="flex items-center gap-1.5 rounded-full bg-orange-700 px-3.5 py-1.5 text-xs font-black text-white hover:bg-orange-800 shadow-sm transition"
          >
            <Store size={13} />
            <span>
              {isApprovedSeller
                ? 'Seller Centre'
                : currentUser.sellerStatus === 'pending'
                ? 'Application Pending'
                : 'Start Selling'}
            </span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setCurrentTab('admin-dashboard')}
              className="flex items-center gap-1.5 rounded-full bg-[#073c22] px-3.5 py-1.5 text-xs font-black text-white hover:bg-emerald-950 transition"
            >
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Admin Console</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentTab('policies')}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              <ShieldCheck size={13} className="text-slate-500" />
              <span>Policies &amp; Trust</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="max-h-[70dvh] overflow-y-auto border-t border-slate-200 bg-white p-4 lg:hidden">
          <form onSubmit={handleSearchSubmit} className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products and stores"
              placeholder="Search products and stores"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-16 text-xs outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-[#0c5c36] px-3 py-1 text-[11px] font-bold text-white"
            >
              Search
            </button>
          </form>

          {!currentUser.authenticated && (
            <button type="button" onClick={() => { openAuthModal(); setMobileMenuOpen(false); }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c5c36] p-3 text-xs font-black text-white">
              <LogIn size={16} /> Sign In / Create Account
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800">
            <button
              type="button"
              onClick={() => { setCurrentTab('for-you'); setMobileMenuOpen(false); }}
              className="hidden items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-left"
            >
              <Sparkles size={16} className="text-amber-500" /> For You
            </button>
            <button
              type="button"
              onClick={() => { setCurrentTab('shop'); setMobileMenuOpen(false); }}
              className="hidden items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-left"
            >
              <ShoppingBag size={16} className="text-emerald-700" /> Shop Catalog
            </button>
            <button
              type="button"
              onClick={() => { setCurrentTab('live'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-left text-rose-700"
            >
              <Radio size={16} /> Livestreams
            </button>
            <button
              type="button"
              onClick={() => { setCurrentTab('auctions'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-left text-amber-800"
            >
              <Gavel size={16} /> Auctions
            </button>
            <button
              type="button"
              onClick={() => { setCurrentTab('orders'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-left"
            >
              <Package size={16} /> Orders
            </button>
            <button
              type="button"
              onClick={() => { setCurrentTab('profile'); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-left"
            >
              <User size={16} /> Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentTab(isApprovedSeller ? 'seller-dashboard' : 'seller-kyc');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-left text-emerald-800 font-black"
            >
              <Store size={16} /> {isApprovedSeller ? 'Seller Centre' : 'Become a Seller'}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setCurrentTab('admin-dashboard'); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 rounded-xl bg-purple-50 p-2.5 text-left text-purple-800 font-black"
              >
                <ShieldCheck size={16} /> Admin Console
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
