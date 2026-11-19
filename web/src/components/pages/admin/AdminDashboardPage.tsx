import DepthArtwork from '../../ui/DepthArtwork';
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../context/StoreContext';
import { api, ApiSellerApplication } from '../../../lib/api';
import { AdminOverview } from '../../../types';
import './admin-console.css';
import AdminSupportInbox from './AdminSupportInbox';
import {
  ShieldCheck,
  Package,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Coins,
  CreditCard,
  FileUp,
  Film,
  MessagesSquare,
  Store,
  Users,
  Mail,
  RefreshCw,
  AlertTriangle,
  Activity,
  ArrowLeft,
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
  const [selectedApplication, setSelectedApplication] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerApplicationsAvailable, setSellerApplicationsAvailable] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [applications, setApplications] = useState<ApiSellerApplication[]>([]);
  const [moderationQueue, setModerationQueue] = useState<ModerationProductRow[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);

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
    } else {
      setModerationQueue([]);
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
    setReviewing(true);
    const res = await api.reviewSellerApplication({
      applicationId,
      userId,
      decision,
      notes: notesById[applicationId] ?? undefined,
    });
    if (!res.ok) {
      setReviewing(false);
      showToast(res.error || 'Failed to update seller application.', 'error');
      return;
    }
    showToast(`Seller application ${{ approve: 'approved', reject: 'rejected', suspend: 'suspended' }[decision]}.`, 'success');
    await loadAdminData();
    setReviewing(false);
    await reloadMarketplace();
  };

  const handleModerateProduct = async (prod: ModerationProductRow, decision: 'approve' | 'reject') => {
    setReviewing(true);
    const res = await api.moderateProduct(prod.id, Number(prod.revision ?? 1), decision);
    if (!res.ok) {
      setReviewing(false);
      showToast(res.error || 'Failed to moderate product.', 'error');
      return;
    }
    showToast(`Product ${decision === 'approve' ? 'published' : 'rejected'}.`, 'success');
    await loadAdminData();
    setReviewing(false);
    await reloadMarketplace();
  };

  const application = selectedApplication === null ? undefined : applications.find((item) => item.id === selectedApplication) ?? applications[0];
  const counts = overview?.counts;
  const navigation = [
    { id: 'applications', label: 'Seller Reviews', icon: Store },
    { id: 'products', label: 'Product Moderation', icon: Package },
    { id: 'support', label: 'Support Inbox', icon: MessagesSquare },
    { id: 'audit', label: 'Audit & Settings', icon: Activity },
  ] as const;
  const metrics = [
    { label: 'Total Users', value: counts?.totalUsers, detail: counts ? `${counts.approvedSellers} approved sellers` : '', icon: Users },
    { label: 'Pending Seller Apps', value: sellerApplicationsAvailable ? counts?.pendingApplications : undefined, detail: sellerApplicationsAvailable === false ? 'Review service unavailable' : 'Awaiting a decision', icon: Store },
    { label: 'Pending Product Reviews', value: counts?.pendingProducts, detail: 'Awaiting moderation', icon: Package },
    { label: 'Published Products', value: counts?.publishedProducts, detail: counts ? `${counts.totalOrders} orders · ${counts.totalVideos} videos` : '', icon: CheckCircle2 },
  ];
  const featureFlags = [
    { label: 'Online Payments', enabled: platformConfig.paymentsEnabled, icon: CreditCard },
    { label: 'Coin Purchases', enabled: platformConfig.coinsPurchasesEnabled, icon: Coins },
    { label: 'KYC Binary Uploads', enabled: platformConfig.kycUploadsEnabled, icon: FileUp },
    { label: 'Open Video Reports', enabled: null, icon: Film },
  ];

  return (
    <div className="cnc-admin-console">
      <aside className="cnc-admin-sidebar">
        <img src="/brand/logo.png" alt="Cash N Carry" className="cnc-admin-logo" />
        <nav aria-label="Admin Console sections">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-current={activeTab === id ? 'true' : undefined}
              onClick={() => setActiveTab(id)}>
              <Icon size={19} aria-hidden="true" /> {label}
            </button>
          ))}
          {onNavigate && (
            <button type="button" className="cnc-admin-email" onClick={() => onNavigate('email-marketing')}>
              <Mail size={19} aria-hidden="true" /> Email Studio
            </button>
          )}
        </nav>
        {onNavigate && <button type="button" className="cnc-admin-back" onClick={() => onNavigate('shop')}>
          <ArrowLeft size={17} aria-hidden="true" /> Back to Marketplace
        </button>}
        <div className="cnc-admin-sidebar-art"><DepthArtwork icon={Store} /></div>
      </aside>

      <div className="cnc-admin-main">
        <header className="cnc-admin-header">
          <div className="flex items-center gap-3">
            <span className="cnc-admin-emblem"><ShieldCheck size={23} aria-hidden="true" /></span>
            <div><h1>Admin Console</h1><p>Cash N Carry Nigeria</p></div>
          </div>
          {activeTab !== 'support' && (
            <button type="button" onClick={() => void loadAdminData()} className="cnc-admin-button" disabled={loading || reviewing}>
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
          )}
        </header>

        <div className="cnc-admin-content">
          {activeTab === 'support' ? <AdminSupportInbox /> : <>
            {error && <div role="alert" className="cnc-admin-error">
              <AlertTriangle size={18} /> {error}
              <button type="button" className="cnc-admin-button" onClick={() => void loadAdminData()}>Retry</button>
            </div>}
            {loading ? <p role="status" className="cnc-admin-empty">Loading admin console records…</p>
              : activeTab === 'audit' ? (
                <>
                  <section className="cnc-admin-panel">
                    <div className="cnc-admin-panel-title">
                      <div><h2>Server Feature Flags</h2><p>Current status of platform features.</p></div>
                      <span className="cnc-admin-emblem"><ShieldCheck size={23} /></span>
                    </div>
                    <div className="cnc-admin-metrics">
                      {featureFlags.map(({ label, enabled, icon: Icon }) => (
                        <div className="cnc-admin-metric" key={label}>
                          <span className="cnc-admin-emblem"><Icon size={20} /></span>
                          <h3>{label}</h3>
                          <span className="cnc-admin-status" data-status={enabled === null ? 'pending' : enabled ? 'approved' : 'rejected'}>
                            {enabled === null ? 'Not configured' : enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="cnc-admin-panel">
                    <div className="cnc-admin-panel-title">
                      <div><h2>Recent Audit Log</h2><p>Latest recorded administrative actions.</p></div>
                      <span className="cnc-admin-emblem"><ClipboardList size={23} /></span>
                    </div>
                    {!overview?.auditLogs.length ? <p className="cnc-admin-empty">No audit entries recorded yet.</p> :
                      <ul className="cnc-admin-audit">
                        {overview.auditLogs.map((log) => (
                          <li key={log.id}>
                            <span className="cnc-admin-emblem"><Activity size={18} /></span>
                            <div className="break-words">
                              <strong className="capitalize">{log.action.replace(/[_-]/g, ' ')}</strong>
                              <p>{log.targetType} · {log.targetId}</p>
                              {log.detail && <p>{log.detail}</p>}
                            </div>
                            <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</span>
                          </li>
                        ))}
                      </ul>}
                  </section>
                </>
              ) : (
                <>
                  <div className="cnc-admin-page-title">
                    <h2>{activeTab === 'applications' ? 'Seller Reviews' : 'Product Moderation'}</h2>
                    <p>{activeTab === 'applications' ? 'Review seller applications and manage seller status.' : 'Review submitted listings and decide what appears on the marketplace.'}</p>
                  </div>
                  <div className="cnc-admin-metrics">
                    {(activeTab === 'applications' ? metrics : metrics.slice(2)).map(({ label, value, detail, icon: Icon }) => (
                      <div className="cnc-admin-metric" key={label}>
                        <span className="cnc-admin-emblem"><Icon size={19} /></span>
                        <h3>{label}</h3><strong>{value?.toLocaleString('en-NG') ?? '—'}</strong>
                        {detail && <p>{detail}</p>}
                      </div>
                    ))}
                  </div>
                  {activeTab === 'applications' ? (
                    <section className="cnc-admin-panel" data-admin-view="applications">
                      <div className="cnc-admin-panel-title">
                        <div><h2>Seller Applications</h2><p>Review applications and record your decision.</p></div>
                        <span className="cnc-admin-status">{applications.length}</span>
                      </div>
                      <div className="cnc-admin-queue">
                        {!applications.length && <p className="cnc-admin-empty">
                          {sellerApplicationsAvailable === false ? 'Seller application reviews are unavailable.' : 'No seller applications submitted yet.'}
                        </p>}
                        {applications.map((item) => {
                          const expanded = application?.id === item.id;
                          return (
                            <article className="cnc-admin-seller" key={item.id}>
                              <button type="button" aria-expanded={expanded} aria-controls={`review-${item.id}`}
                                onClick={() => setSelectedApplication(expanded ? null : item.id)}>
                                <Store size={20} aria-hidden="true" />
                                <span className="cnc-admin-queue-name"><strong>{item.business_name}</strong><small>{item.state_location}</small></span>
                                <span className="cnc-admin-seller-email">{item.email || item.user_id}</span>
                                <span className="cnc-admin-status" data-status={item.status}>{item.status}</span>
                              </button>
                              <div id={`review-${item.id}`} hidden={!expanded} className="cnc-admin-review">
                                <dl className="cnc-admin-facts">
                                  <div><dt>Account</dt><dd>{item.email || item.user_id}</dd></div>
                                  <div><dt>CAC number</dt><dd>{item.cac_number || '—'}</dd></div>
                                  <div><dt>Business type</dt><dd>{item.business_type}</dd></div>
                                  <div><dt>Location</dt><dd>{item.state_location}</dd></div>
                                  <div><dt>Phone</dt><dd>{item.phone}</dd></div>
                                </dl>
                                {item.description && <p className="cnc-admin-description">{item.description}</p>}
                                <label className="cnc-admin-field">
                                  Review note
                                  <textarea rows={3} maxLength={1000} value={notesById[item.id] ?? item.reviewer_notes ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setNotesById((prev) => ({ ...prev, [item.id]: value }));
                                    }} placeholder="Optional compliance review note" />
                                </label>
                                <div className="cnc-admin-actions">
                                  {(item.status === 'pending' || item.status === 'suspended') && <button type="button" className="cnc-admin-button cnc-admin-primary" disabled={reviewing}
                                    onClick={() => void handleReviewApplication(item.id, item.user_id, 'approve')}><CheckCircle2 size={16} /> Approve</button>}
                                  {item.status === 'pending' && <button type="button" className="cnc-admin-button cnc-admin-danger" disabled={reviewing}
                                    onClick={() => void handleReviewApplication(item.id, item.user_id, 'reject')}><XCircle size={16} /> Reject</button>}
                                  {item.status === 'approved' && <button type="button" className="cnc-admin-button cnc-admin-danger" disabled={reviewing}
                                    onClick={() => void handleReviewApplication(item.id, item.user_id, 'suspend')}><Ban size={16} /> Suspend</button>}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ) : (
                    <section className="cnc-admin-panel" data-admin-view="products">
                      <div className="cnc-admin-panel-title">
                        <div><h2>Product Moderation Queue</h2><p>Listings awaiting review.</p></div>
                        <span className="cnc-admin-status">{moderationQueue.length}</span>
                      </div>
                      <div className="cnc-admin-queue">
                        {!moderationQueue.length && <p className="cnc-admin-empty">No products currently awaiting moderation.</p>}
                        {moderationQueue.map((product) => (
                          <article key={product.id} className="cnc-admin-product">
                            <span className="cnc-admin-emblem"><Package size={28} aria-hidden="true" /></span>
                            <div className="cnc-admin-product-name">
                              <h3>{product.name}</h3>
                              <p>{product.store_name || product.seller_email || 'Seller'}</p>
                              {product.category && <p className="capitalize">{product.category}</p>}
                            </div>
                            <dl className="cnc-admin-product-facts">
                              <div><dt>Stock</dt><dd>{product.stock}</dd></div>
                              <div><dt>Revision</dt><dd>{product.revision}</dd></div>
                              <div><dt>Price</dt><dd>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format((product.price_minor || 0) / 100)}</dd></div>
                            </dl>
                            <div className="cnc-admin-actions">
                              <button type="button" className="cnc-admin-button cnc-admin-primary" disabled={reviewing}
                                onClick={() => void handleModerateProduct(product, 'approve')}><CheckCircle2 size={16} /> Approve &amp; Publish</button>
                              <button type="button" className="cnc-admin-button cnc-admin-danger" disabled={reviewing}
                                onClick={() => void handleModerateProduct(product, 'reject')}><XCircle size={16} /> Reject</button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
          </>}
        </div>
      </div>
    </div>
  );
}
