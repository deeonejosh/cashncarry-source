import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import accountArtwork from '../../assets/account-welcome.webp';
import { NIGERIAN_STATES } from '../../lib/design-tokens';
import {
  ArrowRight,
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
  initialAddressSetup?: boolean;
}

export default function ProfilePage({ onNavigate, initialAddressSetup = false }: ProfilePageProps) {
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

  const [showAddressForm, setShowAddressForm] = useState(initialAddressSetup);

  useEffect(() => {
    if (!initialAddressSetup) return;
    setShowAddressForm(true);
    const raf = window.requestAnimationFrame(() => {
      document.getElementById('delivery-addresses')?.scrollIntoView({
        behavior: 'smooth', block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [initialAddressSetup]);
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState(currentUser.selectedState || 'Lagos');

  const [editingProfile, setEditingProfile] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState(currentUser.name);
  const [bioDraft, setBioDraft] = useState(currentUser.bio || '');
  const [usernameDraft, setUsernameDraft] = useState(currentUser.username || '');
  const [photoDraft, setPhotoDraft] = useState<File | null>(null);
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
    try {
      let updatedPhoto: Blob | undefined;
      if (photoDraft) {
        const photo = await createImageBitmap(photoDraft);
        const size = Math.min(512, photo.width, photo.height);
        const crop = Math.min(photo.width, photo.height);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        try {
          if (!ctx) throw Error('Could not prepare the photo.');
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(photo, (photo.width - crop) / 2, (photo.height - crop) / 2, crop, crop, 0, 0, size, size);
        } finally {
          photo.close();
        }
        const resized = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .88));
        if (!resized) throw Error('Could not prepare the photo.');
        updatedPhoto = resized;
      }
      const ok = await updateProfile({
        name: displayNameDraft.trim(),
        username: usernameDraft.trim().toLowerCase(),
        bio: bioDraft.trim(),
        avatar: avatarDraft.trim(),
        selectedState: stateDraft,
      }, updatedPhoto);
      if (ok) setEditingProfile(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save the profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = (currentUser.name || currentUser.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');


  if (!currentUser.authenticated) {
    return (
      <section className="cnc-account-welcome mx-auto grid max-w-4xl items-center gap-4 rounded-3xl border p-5 sm:p-8 md:grid-cols-2">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.85rem,5vw,3.25rem)] font-black leading-tight tracking-tight text-emerald-950">Your Account</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">Sign in to see orders, addresses and saved items.</p>
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="cnc-auth-cta mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
          >
            Sign In / Create Account <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <img src={accountArtwork} width={520} height={450} decoding="async" alt=""
          className="cnc-account-art mx-auto h-auto w-full max-w-64 md:max-w-sm" />
      </section>
    );
  }

  return (
    <div className="cnc-account-page space-y-4 pb-24">
      {/* Profile Header */}
      <div className="cnc-workspace-hero rounded-3xl p-4 sm:p-6 space-y-5">
        <div className="cnc-account-identity grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-[#0E6B38] shadow-sm"
                />
              ) : (
                <div className="cnc-account-avatar grid h-14 w-14 place-items-center rounded-2xl text-2xl font-black sm:h-20 sm:w-20">
                  {initials || 'CN'}
                </div>
              )}
              {currentUser.authenticated && (
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#0E6B38] text-white shadow">
                  <CheckCircle2 size={14} />
                </span>
              )}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-all text-xl font-black text-white sm:text-3xl">{currentUser.name}</h1>
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

              {currentUser.username && <p className="break-all text-sm font-semibold text-emerald-100">@{currentUser.username}</p>}
              <p className="text-xs text-emerald-50 max-w-xl">
                {currentUser.bio ||
                  (currentUser.authenticated
                    ? 'Manage your account and orders.'
                    : 'Sign in to save your cart, track deliveries, or apply to sell.')}
              </p>

              <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
                {currentUser.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail size={13} className="shrink-0" /> <span className="break-all">{currentUser.email}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 font-bold text-emerald-100">
                  <MapPin size={13} /> Delivery State: {currentUser.selectedState || 'Lagos'}
                </span>
              </div>

              {currentUser.storeName && (
                <div className="text-xs font-bold text-orange-200 flex items-center gap-1">
                  <Store size={13} />
                  <span>Store: {currentUser.storeName}</span>
                </div>
              )}
            </div>
          </div>

          <img src={accountArtwork} alt="" width={520} height={450} decoding="async" className="cnc-seller-hero-art hidden h-28 w-32 object-contain md:block" />
          <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
            {currentUser.authenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayNameDraft(currentUser.name);
                    setBioDraft(currentUser.bio || '');
                    setAvatarDraft(currentUser.avatar || '');
                    setUsernameDraft(currentUser.username || '');
                    setPhotoDraft(null);
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
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-rose-200 bg-orange-200 px-4 text-xs font-black text-orange-950 hover:bg-orange-300 transition"
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">
                Username
                <input required value={usernameDraft} pattern="[A-Za-z0-9_]{3,24}" maxLength={24}
                  autoComplete="username" placeholder="e.g. gearpu_ng"
                  onChange={e => setUsernameDraft(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm" />
                <span className="mt-1 block font-normal">3–24 letters, numbers or underscores.</span>
              </label>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Profile picture
                  <input id="cnc-profile-photo" type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 15 * 1024 * 1024) {
                        showToast('Choose a photo under 15 MB.', 'error');
                        e.target.value = '';
                        setPhotoDraft(null);
                      } else setPhotoDraft(file ?? null);
                    }}
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs" />
                </label>
                {(avatarDraft || photoDraft) && <button type="button" className="mt-1 text-xs font-bold text-emerald-800"
                  onClick={() => {
                    const input = document.getElementById('cnc-profile-photo') as HTMLInputElement | null;
                    if (input) input.value = '';
                    setPhotoDraft(null);
                    setAvatarDraft('');
                  }}>
                  Remove photo
                </button>}
              </div>
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
      <div className="cnc-account-stats grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => navigateTo('orders')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-[#0E6B38] transition shadow-sm"
        >
          <div className="text-xl font-black text-slate-900">{orders.length}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-600">
            <Package size={13} className="text-[#0E6B38]" />
            <span>Orders</span>
          </div>
        </button>
        <button
          onClick={() => navigateTo('wishlist')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-[#0E6B38] transition shadow-sm"
        >
          <div className="text-xl font-black text-slate-900">{wishlist.length}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-600">
            <Heart size={13} className="text-rose-500" />
            <span>Wishlist</span>
          </div>
        </button>
        <button
          onClick={() => navigateTo('shop')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-center hover:border-[#0E6B38] transition shadow-sm"
        >
          <div className="text-xl font-black text-slate-900">{follows.length}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-600">
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
        <div className="cnc-workspace-panel cnc-workspace-mint rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div id="delivery-addresses" className="cnc-workspace-panel scroll-mt-20 space-y-4 rounded-3xl border p-4 sm:p-6">
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
                className="cnc-workspace-panel rounded-2xl border border-slate-200 bg-white p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{addr.recipient}</span>
                  <button
                    type="button"
                    onClick={() => void removeAddress(addr.id)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Delete address"
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
      <div className="cnc-workspace-panel cnc-workspace-mint rounded-3xl border border-emerald-200 bg-[#EAF7EF]/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
