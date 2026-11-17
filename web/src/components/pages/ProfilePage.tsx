import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { NIGERIAN_STATES } from '../../lib/design-tokens';
import {
  MapPin,
  ShieldCheck,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  Package,
  Heart,
  Users,
  Coins,
  Store,
  LogOut,
  LogIn,
  Edit3,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface ProfilePageProps {
  onNavigate?: (tab: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const {
    currentUser,
    isApprovedSeller,
    isAdmin,
    openAuthModal,
    updateProfile,
    logout,
    addresses,
    addAddress,
    removeAddress,
    orders,
    wishlist,
    follows,
    showToast,
  } = useStore();

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState(currentUser.selectedState || 'Lagos');

  const [editingProfile, setEditingProfile] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(currentUser.name);
  const [bioDraft, setBioDraft] = useState(currentUser.bio || '');
  const [avatarDraft, setAvatarDraft] = useState(currentUser.avatar || '');
  const [stateDraft, setStateDraft] = useState(currentUser.selectedState || 'Lagos');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const navigateTo = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !line.trim() || !city.trim()) {
      showToast('Please enter recipient name, street address, and city.', 'error');
      return;
    }
    setSavingAddress(true);
    const created = await addAddress({
      recipient: recipient.trim(),
      phone: phone.trim(),
      line: line.trim(),
      city: city.trim(),
      state,
    });
    setSavingAddress(false);
    if (created) {
      setShowAddressForm(false);
      setRecipient('');
      setPhone('');
      setLine('');
      setCity('');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    const ok = await updateProfile({
      name: displayNameDraft.trim(),
      bio: bioDraft.trim(),
      avatar: avatarDraft.trim(),
      selectedState: stateDraft,
    });
    setSavingProfile(false);
    if (ok) {
      setEditingProfile(false);
    }
  };

  const initials = (currentUser.name || currentUser.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="space-y-6 pb-24">
      {/* Profile Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-20 w-20 rounded-3xl object-cover border-2 border-[#0E6B38] shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0E6B38] text-2xl font-black text-white shadow-sm">
                  {initials || 'CN'}
                </div>
              )}
              {currentUser.authenticated && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#0E6B38] text-white shadow">
                  <CheckCircle2 size={14} />
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{currentUser.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7EF] px-2.5 py-0.5 text-xs font-bold text-[#0E6B38]">
                  <CheckCircle2 size={12} /> {currentUser.authenticated ? 'Signed In' : 'Guest Visitor'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-700">
                  {currentUser.role}
                </span>
                {currentUser.sellerStatus !== 'none' && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      currentUser.sellerStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentUser.sellerStatus === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Seller: {currentUser.sellerStatus}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 max-w-xl">
                {currentUser.bio ||
                  (currentUser.authenticated
                    ? 'Manage your account and orders.'
                    : 'Sign in to save your cart, track deliveries, or apply to sell.')}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {currentUser.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail size={13} /> {currentUser.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-bold text-[#0E6B38]">
                  <MapPin size={13} /> Delivery State: {currentUser.selectedState || 'Lagos'}
                </span>
              </div>

              {currentUser.storeName && (
                <div className="text-xs font-bold text-[#FF6B00] flex items-center gap-1">
                  <Store size={13} />
                  <span>Store: {currentUser.storeName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {currentUser.authenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayNameDraft(currentUser.name);
                    setBioDraft(currentUser.bio || '');
                    setAvatarDraft(currentUser.avatar || '');
                    setStateDraft(currentUser.selectedState || 'Lagos');
                    setEditingProfile(!editingProfile);
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-800 hover:bg-slate-100 transition"
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-xs font-black text-rose-700 hover:bg-rose-100 transition"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('Sign in or register a Cash N Carry Nigeria account.')}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-[#0E6B38] px-5 text-xs font-black text-white hover:bg-[#084B26] transition shadow-sm"
              >
                <LogIn size={14} />
                <span>Sign In / Create Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Inline Edit Profile Form */}
        {editingProfile && currentUser.authenticated && (
          <form onSubmit={handleSaveProfile} className="rounded-2xl border border-emerald-200 bg-[#EAF7EF]/60 p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#084B26]">
              Edit Account Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Display Name</label>
                <input
                  type="text"
                  value={displayNameDraft}
                  onChange={(e) => setDisplayNameDraft(e.target.value)}
                  required
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#0E6B38]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700">Primary Delivery State</label>
                <select
                  value={stateDraft}
                  onChange={(e) => setStateDraft(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#0E6B38]"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Avatar Image URL (Optional)</label>
              <input
                type="url"
                value={avatarDraft}
                onChange={(e) => setAvatarDraft(e.target.value)}
                placeholder="https://..."
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#0E6B38]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Bio / About</label>
              <textarea
                rows={2}
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#0E6B38]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="min-h-[40px] rounded-xl bg-[#0E6B38] px-5 text-xs font-black text-white hover:bg-[#084B26] disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => navigateTo('orders')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-[#0E6B38] transition shadow-sm"
        >
          <div className="text-xl font-black text-slate-900">{orders.length}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
            <Package size={13} className="text-[#0E6B38]" />
            <span>Orders</span>
          </div>
        </button>
        <button
          onClick={() => navigateTo('wishlist')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-[#0E6B38] transition shadow-sm"
        >
          <div className="text-xl font-black text-slate-900">{wishlist.length}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
            <Heart size={13} className="text-rose-500" />
            <span>Wishlist</span>
          </div>
        </button>
        <button
          onClick={() => navigateTo('shop')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-[#0E6B38] transition shadow-sm"
        >
          <div className="text-xl font-black text-slate-900">{follows.length}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
            <Users size={13} className="text-blue-500" />
            <span>Following</span>
          </div>
        </button>
        <button
          onClick={() => navigateTo('coins')}
          className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-center hover:border-amber-400 transition shadow-sm"
        >
          <div className="text-xl font-black text-amber-900">{(currentUser.coins ?? 0).toLocaleString()}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-700">
            <Coins size={13} className="text-amber-600" />
            <span>Coins</span>
          </div>
        </button>
      </div>

      {/* Role-Aware Seller / Onboarding Card */}
      {isApprovedSeller ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0E6B38] text-white shadow">
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Seller Centre Management</h3>
              <p className="text-xs text-slate-600">
                Your seller account is approved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('seller-dashboard')}
            className="shrink-0 rounded-xl bg-[#0E6B38] px-5 py-2.5 text-xs font-black text-white hover:bg-[#084B26]"
          >
            Open Seller Centre
          </button>
        </div>
      ) : currentUser.sellerStatus === 'pending' ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-950">Your seller account is awaiting approval.</h3>
              <p className="text-xs text-amber-800">
                An administrator is reviewing your business application. Seller Centre, video posting, and livestreaming unlock after approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('seller-kyc')}
            className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100"
          >
            View Application Status
          </button>
        </div>
      ) : currentUser.sellerStatus === 'rejected' || currentUser.sellerStatus === 'suspended' ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white shadow">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-950">
                Seller Application {currentUser.sellerStatus === 'suspended' ? 'Suspended' : 'Not Approved'}
              </h3>
              <p className="text-xs text-rose-800">
                {currentUser.sellerStatus === 'suspended'
                  ? 'Your seller publishing access is currently suspended. View your status or contact compliance.'
                  : 'Review feedback from the admin team and submit an updated business application.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('seller-kyc')}
            className="shrink-0 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-800"
          >
            Review Seller Status
          </button>
        </div>
      ) : (
        !isAdmin && (
          <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-50/40 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF6B00] text-white shadow">
                <Store size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Become a Seller</h3>
                <p className="text-xs text-slate-600">
                  Apply to sell products and go live.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!currentUser.authenticated) {
                  openAuthModal('Sign in to apply to become a seller.');
                } else {
                  navigateTo('seller-kyc');
                }
              }}
              className="shrink-0 rounded-xl bg-[#0E6B38] px-5 py-2.5 text-xs font-black text-white hover:bg-[#084B26]"
            >
              Start Selling
            </button>
          </div>
        )
      )}

      {/* Saved Nigerian Delivery Addresses */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <MapPin size={18} className="text-[#0E6B38]" />
            <span>Saved Delivery Addresses ({addresses.length})</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!currentUser.authenticated) {
                openAuthModal('Sign in to save a delivery address.');
              } else {
                setRecipient(currentUser.name);
                setShowAddressForm(!showAddressForm);
              }
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#0E6B38] px-4 py-2 text-xs font-bold text-white hover:bg-[#084B26] transition"
          >
            <Plus size={14} /> Add Address
          </button>
        </div>

        {showAddressForm && (
          <form onSubmit={handleSaveAddress} className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-5 space-y-3">
            <h4 className="text-xs font-black text-[#0E6B38]">New Delivery Location</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Recipient Name</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                  placeholder="Full recipient name"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="e.g. 0803..."
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none bg-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Street Address</label>
              <input
                type="text"
                value={line}
                onChange={(e) => setLine(e.target.value)}
                required
                placeholder="House number, street, landmark"
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">City / LGA</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="City or LGA"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none bg-white"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={savingAddress}
                className="rounded-xl bg-[#0E6B38] px-5 py-2 text-xs font-black text-white hover:bg-[#084B26] disabled:opacity-50"
              >
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddressForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            No saved delivery addresses yet. Add an address to speed up checkout.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{addr.recipient}</span>
                  <button
                    type="button"
                    onClick={() => void removeAddress(addr.id)}
                    className="text-slate-400 hover:text-rose-600 transition p-1"
                    title="Delete address"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{addr.line}</p>
                <div className="text-xs font-bold text-slate-800">
                  {addr.city}, {addr.state}
                </div>
                {addr.phone && <div className="text-[11px] text-slate-400">{addr.phone}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Security Card */}
      <div className="rounded-3xl border border-emerald-200 bg-[#EAF7EF]/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <ShieldCheck size={22} className="text-[#0E6B38] shrink-0" />
          <div>
            <div className="font-black text-slate-900">Account & Session Synchronization</div>
            <p className="text-slate-600">
              Your account is synced across devices.
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigateTo('email-marketing')}
            className="shrink-0 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
          >
            Email Studio
          </button>
        )}
      </div>
    </div>
  );
}
