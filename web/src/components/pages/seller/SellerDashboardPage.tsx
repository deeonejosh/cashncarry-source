import storefrontArtwork from '../../../assets/home-seller-storefront.webp';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { categories } from '../../../lib/data';
import { NIGERIAN_STATES } from '../../../lib/design-tokens';
import {
  Store,
  Package,
  Plus,
  Radio,
  ShieldCheck,
  DollarSign,
  Truck,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface SellerDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCreate?: () => void;
}

export default function SellerDashboardPage({ onNavigate, onOpenCreate }: SellerDashboardProps) {
  const {
    currentUser,
    sellerStore,
    sellerProducts,
    sellerOrders,
    liveRooms,
    saveSellerStore,
    showToast,
  } = useStore();

  const [editingStore, setEditingStore] = useState(false);
  const [storeName, setStoreName] = useState(sellerStore?.name || currentUser.storeName || '');
  const [storeCategory, setStoreCategory] = useState(sellerStore?.category || 'fashion');
  const [storeLocation, setStoreLocation] = useState(sellerStore?.location || currentUser.selectedState || 'Lagos');
  const [storePhone, setStorePhone] = useState(sellerStore?.phone || '');
  const [storeDesc, setStoreDesc] = useState(sellerStore?.description || '');
  const [savingStore, setSavingStore] = useState(false);

  useEffect(() => {
    if (sellerStore) {
      setStoreName(sellerStore.name);
      setStoreCategory(sellerStore.category);
      setStoreLocation(sellerStore.location);
      setStorePhone(sellerStore.phone || '');
      setStoreDesc(sellerStore.description);
    }
  }, [sellerStore]);

  const totalRevenue = sellerOrders
    .filter((o) => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
    .reduce((acc, o) => acc + o.total, 0);

  const pendingFulfillments = sellerOrders.filter(
    (o) => o.status === 'paid' || o.status === 'processing' || o.status === 'packed'
  ).length;
  const publishedCount = sellerProducts.filter((p) => p.publication === 'published').length;
  const pendingReviewCount = sellerProducts.filter((p) => p.publication === 'pending').length;
  const activeLives = liveRooms.filter((r) => r.sellerId === currentUser.id && r.status === 'live').length;

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeDesc.trim()) {
      showToast('Enter a storefront name and description.', 'error');
      return;
    }
    setSavingStore(true);
    const res = await saveSellerStore({
      name: storeName.trim(),
      category: storeCategory,
      location: storeLocation,
      phone: storePhone.trim(),
      description: storeDesc.trim(),
    });
    setSavingStore(false);
    if (res.ok) {
      setEditingStore(false);
    } else {
      showToast(res.error || 'Could not save storefront.', 'error');
    }
  };

  return (
    <div className="cnc-seller-overview space-y-4 pb-12">
      <div className="cnc-workspace-hero cnc-seller-hero grid items-center gap-3 rounded-3xl px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-900">
              SELLER CENTRE
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-100">
              <CheckCircle2 size={13} /> Approved Seller
            </span>
          </div>
          <h1 className="break-words text-2xl font-black sm:text-4xl">
            {sellerStore?.name || currentUser.storeName || currentUser.name}
          </h1>
        </div>

        <img src={storefrontArtwork} alt="" width={620} height={490} decoding="async" className="cnc-seller-hero-art block h-28 w-36 object-contain md:h-32 md:w-44" />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('seller-products')}
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0c5c36] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 transition"
          >
            <Plus size={15} /> Products
          </button>
          <a href="/?tab=seller-products&amp;bulkImport=1"
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-800 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-950 hover:bg-emerald-100 transition">
            <Package size={15} /> Bulk Upload Excel
          </a>
          <button
            onClick={() => (onOpenCreate ? onOpenCreate() : onNavigate('live'))}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Radio size={15} /> Go Live ({activeLives})
          </button>
        </div>
      </div>

      {/* Storefront Profile Card */}
      <div className="cnc-workspace-panel rounded-3xl border p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Store size={18} className="text-[#0c5c36]" />
            <span>{sellerStore ? 'Public Storefront Settings' : 'Create Your Public Storefront'}</span>
          </div>
          <button
            type="button"
            onClick={() => setEditingStore(!editingStore)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Edit3 size={14} />
            <span>{sellerStore ? 'Edit Storefront' : 'Setup Storefront'}</span>
          </button>
        </div>

        {!sellerStore && !editingStore && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3">
            Set up your public storefront profile so buyers can discover your brand and follow your store.
          </p>
        )}

        {editingStore && (
          <form onSubmit={handleSaveStore} className="space-y-3 border-t border-slate-100 pt-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700">Storefront Name *</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
              <div>
                <label htmlFor="seller-store-category" className="font-bold text-slate-700">Primary Category</label>
                <select
                  id="seller-store-category"
                  value={storeCategory}
                  onChange={(e) => setStoreCategory(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="seller-store-state" className="font-bold text-slate-700">Location State</label>
                <select
                  id="seller-store-state"
                  value={storeLocation}
                  onChange={(e) => setStoreLocation(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 bg-white"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Support Phone</label>
                <input
                  type="tel"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3"
                />
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-700">Store Description *</label>
              <textarea
                rows={2}
                required
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingStore}
                className="rounded-xl bg-[#0c5c36] px-5 py-2.5 font-black text-white hover:bg-emerald-900 disabled:opacity-50"
              >
                {savingStore ? 'Saving...' : 'Save Storefront'}
              </button>
              <button
                type="button"
                onClick={() => setEditingStore(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Real Analytics Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="cnc-seller-metric cnc-workspace-panel cnc-workspace-mint rounded-2xl border p-3 sm:p-4 space-y-1">
          <div className="text-xs font-bold text-slate-700">Paid & Shipped Orders Total</div>
          <div className="text-2xl font-black text-[#0c5c36]">₦{totalRevenue.toLocaleString('en-NG')}</div>
          <div className="text-[11px] text-slate-500">From real store orders</div>
          <Truck className="cnc-seller-metric-art" size={26} aria-hidden="true" />
        </div>
        <div className="cnc-seller-metric cnc-workspace-panel cnc-workspace-mint rounded-2xl border p-3 sm:p-4 space-y-1">
          <div className="text-xs font-bold text-slate-700">Pending Fulfillment</div>
          <div className="text-2xl font-black text-orange-800">{pendingFulfillments}</div>
          <div className="text-[11px] text-slate-500">Orders ready to dispatch</div>
          <Package className="cnc-seller-metric-art" size={26} aria-hidden="true" />
        </div>
        <div className="cnc-seller-metric cnc-workspace-panel cnc-workspace-mint rounded-2xl border p-3 sm:p-4 space-y-1">
          <div className="text-xs font-bold text-slate-700">Published Products</div>
          <div className="text-2xl font-black text-slate-900">{publishedCount}</div>
          <div className="text-[11px] text-slate-500">Live in catalog</div>
          <Store className="cnc-seller-metric-art" size={26} aria-hidden="true" />
        </div>
        <div className="cnc-seller-metric cnc-workspace-panel cnc-workspace-mint rounded-2xl border p-3 sm:p-4 space-y-1">
          <div className="text-xs font-bold text-slate-700">Moderation Queue</div>
          <div className="text-2xl font-black text-amber-800">{pendingReviewCount}</div>
          <div className="text-[11px] text-slate-500">Awaiting admin review</div>
          <ShieldCheck className="cnc-seller-metric-art" size={26} aria-hidden="true" />
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => onNavigate('seller-products')}
          className="cnc-seller-shortcut cnc-workspace-panel flex flex-col items-start rounded-2xl border p-3 text-left hover:border-emerald-600 sm:p-4"
        >
          <Package className="text-[#0c5c36]" size={22} />
          <span className="mt-2 text-xs font-black text-slate-900">Products & Inventory</span>
          <span className="text-[11px] text-slate-600">Create & submit listings</span>
        </button>

        <button
          onClick={() => onNavigate('seller-orders')}
          className="cnc-seller-shortcut cnc-workspace-panel flex flex-col items-start rounded-2xl border p-3 text-left hover:border-emerald-600 sm:p-4"
        >
          <Truck className="text-blue-600" size={22} />
          <span className="mt-2 text-xs font-black text-slate-900">Order Dispatch</span>
          <span className="text-[11px] text-slate-600">Pack & add tracking</span>
        </button>

        <button
          onClick={() => onNavigate('seller-kyc')}
          className="cnc-seller-shortcut cnc-workspace-panel flex flex-col items-start rounded-2xl border p-3 text-left hover:border-emerald-600 sm:p-4"
        >
          <ShieldCheck className="text-purple-600" size={22} />
          <span className="mt-2 text-xs font-black text-slate-900">Verification Status</span>
          <span className="text-[11px] text-slate-600">Business & compliance</span>
        </button>

        <button
          onClick={() => onNavigate('seller-settlements')}
          className="cnc-seller-shortcut cnc-workspace-panel flex flex-col items-start rounded-2xl border p-3 text-left hover:border-emerald-600 sm:p-4"
        >
          <DollarSign className="text-amber-800" size={22} />
          <span className="mt-2 text-xs font-black text-slate-900">Settlements</span>
          <span className="text-[11px] text-slate-600">Order ledger & status</span>
        </button>
      </div>

      {/* Recent Orders */}
      <div className="cnc-workspace-panel rounded-3xl border p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black text-slate-900">Recent Store Orders</h3>
          <button
            onClick={() => onNavigate('seller-orders')}
            className="text-xs font-bold text-[#0c5c36] hover:underline"
          >
            View all orders →
          </button>
        </div>

        {sellerOrders.length === 0 ? (
          <div className="grid justify-items-center gap-2 p-6 text-center text-sm text-slate-600">
            <Package size={34} className="text-emerald-700" aria-hidden="true" />
            No orders placed yet for your storefront.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sellerOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-900">{order.id}</span>
                  <div className="text-slate-500 text-[11px]">Buyer: {order.buyerName || order.buyerEmail}</div>
                </div>
                <div className="text-slate-600 font-bold">₦{order.total.toLocaleString('en-NG')}</div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                    {order.status}
                  </span>
                  <button
                    onClick={() => onNavigate('seller-orders')}
                    className="text-xs font-bold text-[#0c5c36] hover:underline"
                  >
                    Fulfill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
