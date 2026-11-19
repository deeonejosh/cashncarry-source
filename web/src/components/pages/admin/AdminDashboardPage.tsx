import DepthArtwork from '../../ui/DepthArtwork';
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../context/StoreContext';
import { api, ApiSellerApplication } from '../../../lib/api';
import { AdminOverview } from '../../../types';
import AdminSupportInbox from './AdminSupportInbox';
import {
  ShieldCheck,
  Package,
  CheckCircle2,
  XCircle,
  Lock,
  Mail,
  RefreshCw,
  AlertTriangle,
  Activity,
  Ban,
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate?: (tab: string) => void;
}

interface ModerationProductRow {
  id: string;
  name: string;
  category: string;
  price_minor: number;
  stock: number;
  revision: number;
  publication: string;
  seller_email?: string;
  store_name?: string;
}

export default function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { platformConfig, reloadMarketplace, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<'applications' | 'products' | 'audit' | 'support'>('applications');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerApplicationsAvailable, setSellerApplicationsAvailable] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [applications, setApplications] = useState<ApiSellerApplication[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationProductRow[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOverview(null);
    setSellerApplicationsAvailable(null);
    const [ovRes, appRes, modRes] = await Promise.all([
      api.getAdminOverview(),
      api.getAdminSellerApplications(),
      api.getAdminModerationQueue(),
    ]);

    if (!ovRes.ok) {
      setError(ovRes.error || 'Could not load admin dashboard.');
      setLoading(false);
      return;
    }

    if (ovRes.data) {
      setOverview({
        counts: ovRes.data.counts,
        auditLogs: (ovRes.data.auditLogs || []).map((a) => ({
          id: String(a.id || ''),
          actorId: String(a.actor_id || ''),
          actorRole: String(a.actor_role || ''),
          action: String(a.action || ''),
          targetType: String(a.target_type || ''),
          targetId: String(a.target_id || ''),
          detail: String(a.detail || ''),
          createdAt: String(a.created || ''),
        })),
      });
    }

    setSellerApplicationsAvailable(appRes.ok && appRes.data?.available !== false);
    setApplications(appRes.ok && Array.isArray(appRes.data?.applications) ? appRes.data.applications : []);
    if (modRes.ok && Array.isArray(modRes.data?.products)) {
      setModerationQueue(modRes.data.products as unknown as ModerationProductRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleReviewApplication = async (
    applicationId: string,
    userId: string,
    decision: 'approve' | 'reject' | 'suspend'
  ) => {
    setBusyId(applicationId);
    const res = await api.reviewSellerApplication({
      applicationId,
      userId,
      decision,
      notes: notesById[applicationId] || undefined,
    });
    setBusyId(null);
    if (!res.ok) {
      showToast(res.error || 'Failed to update seller application.', 'error');
      return;
    }
    showToast(`Seller application ${decision}d.`, 'success');
    await loadAdminData();
    await reloadMarketplace();
  };

  const handleModerateProduct = async (prod: ModerationProductRow, decision: 'approve' | 'reject') => {
    setBusyId(prod.id);
    const res = await api.moderateProduct(prod.id, Number(prod.revision ?? 1), decision);
    setBusyId(null);
    if (!res.ok) {
      showToast(res.error || 'Failed to moderate product.', 'error');
      return;
    }
    showToast(`Product ${decision}d.`, 'success');
    await loadAdminData();
    await reloadMarketplace();
  };

  const pendingApplicationsCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12">
      <div className="cnc-depth-banner flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-slate-900">
        <DepthArtwork icon={ShieldCheck} />
        <h1 className="text-xl font-bold sm:text-2xl">Admin Console</h1>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAdminData()}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {onNavigate && (
            <button
              onClick={() => onNavigate('email-marketing')}
              className="flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition"
            >
              <Mail size={14} />
              <span>Email</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={() => void loadAdminData()}
            className="rounded-xl bg-rose-700 px-4 py-2 font-bold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real Database Counts */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-400">Total Users</div>
          <div className="text-2xl font-black text-slate-900">{overview ? overview.counts.totalUsers : '—'}</div>
          <div className="text-[11px] text-slate-500">
            {overview ? overview.counts.approvedSellers : '—'} approved sellers
          </div>
        </div>
        <div className="rounded-3xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold text-purple-800">Pending Seller Apps</div>
          <div className="text-2xl font-black text-purple-700">{sellerApplicationsAvailable === false ? '—' : overview?.counts.pendingApplications ?? pendingApplicationsCount}</div>
          <div className="text-[11px] text-purple-800">{sellerApplicationsAvailable === false ? 'Review service not configured' : 'Awaiting admin decision'}</div>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold text-amber-800">Pending Product Reviews</div>
          <div className="text-2xl font-black text-amber-700">{overview ? overview.counts.pendingProducts : '—'}</div>
          <div className="text-[11px] text-amber-800">Awaiting moderation</div>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm space-y-1">
          <div className="text-xs font-bold text-emerald-800">Published Products</div>
          <div className="text-2xl font-black text-emerald-700">{overview ? overview.counts.publishedProducts : '—'}</div>
          <div className="text-[11px] text-emerald-800">
            {overview ? overview.counts.totalOrders : '—'} orders · {overview ? overview.counts.totalVideos : '—'} videos
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 pb-3 gap-3 overflow-x-auto text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            activeTab === 'applications' ? 'bg-[#0c5c36] text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Seller Reviews ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            activeTab === 'products' ? 'bg-[#0c5c36] text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          <Package size={15} />
          <span>Products ({moderationQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            activeTab === 'support' ? 'bg-[#0c5c36] text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          <Mail size={15} />
          <span>Support Inbox</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
            activeTab === 'audit' ? 'bg-[#0c5c36] text-white shadow' : 'hover:bg-slate-100'
          }`}
        >
          <Activity size={15} />
          <span>Audit & Settings</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading admin console records...</div>
      ) : activeTab === 'support' ? (
        <AdminSupportInbox />
      ) : activeTab === 'applications' ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Seller Applications</h3>
          </div>

          {applications.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              {sellerApplicationsAvailable === false ? 'Seller application reviews are not configured in staging.' : 'No seller applications submitted yet.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="py-4 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{app.business_name}</span>
                        {app.cac_number && (
                          <span className="font-mono text-emerald-800 font-bold">({app.cac_number})</span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            app.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Account: <b>{app.email || app.user_id}</b> · {app.business_type} · {app.state_location} · {app.phone}
                      </div>
                      <p className="text-slate-600">{app.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {app.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void handleReviewApplication(app.id, app.user_id, 'approve')}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3.5 py-2 font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                      )}
                      {app.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void handleReviewApplication(app.id, app.user_id, 'reject')}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-2 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      )}
                      {app.status !== 'suspended' && (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void handleReviewApplication(app.id, app.user_id, 'suspend')}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Ban size={14} /> Suspend
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={notesById[app.id] ?? app.reviewer_notes ?? ''}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    placeholder="Optional compliance review note..."
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-[#0c5c36] focus:bg-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'products' ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Product Moderation Queue</h3>
            <p className="text-xs text-slate-500">
              Approve listings submitted by approved sellers to make them live in the catalog.
            </p>
          </div>

          {moderationQueue.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              No products currently awaiting moderation.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {moderationQueue.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 text-xs">
                  <div>
                    <h4 className="font-black text-slate-900">{p.name}</h4>
                    <div className="text-slate-500 mt-0.5">
                      Seller: <b>{p.store_name || p.seller_email || 'Seller'}</b> · Category:{' '}
                      <span className="capitalize">{p.category}</span> · Stock: {p.stock} · Rev {p.revision}
                    </div>
                    <div className="font-black text-[#0c5c36] mt-0.5">
                      ₦{Math.round((p.price_minor || 0) / 100).toLocaleString('en-NG')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void handleModerateProduct(p, 'approve')}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-black text-white hover:bg-emerald-500 shadow disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Approve & Publish
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void handleModerateProduct(p, 'reject')}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-2 text-xs">
            <h3 className="text-sm font-black text-slate-900">Server Feature Flags</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-400">Online Payments</div>
                <div className="font-black text-slate-900">{platformConfig.paymentsEnabled ? 'ENABLED' : 'DISABLED'}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-400">Coin Purchases</div>
                <div className="font-black text-slate-900">{platformConfig.coinsPurchasesEnabled ? 'ENABLED' : 'DISABLED'}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-400">KYC Binary Uploads</div>
                <div className="font-black text-slate-900">{platformConfig.kycUploadsEnabled ? 'ENABLED' : 'DISABLED'}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-slate-400">Open Video Reports</div>
                <div className="font-black text-slate-900">Not configured</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              Recent Audit Log
            </h3>
            {!overview || overview.auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No audit entries recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {overview.auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{log.action}</span>
                      <span className="text-slate-400">
                        {' '}
                        · {log.targetType} ({log.targetId})
                      </span>
                      {log.detail && <div className="text-slate-500 text-[11px]">{log.detail}</div>}
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
