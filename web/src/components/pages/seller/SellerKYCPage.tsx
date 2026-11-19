import WorkflowBanner from '../../ui/WorkflowBanner';
import React, { useState, useEffect } from 'react';
import { useStore } from '../../../context/StoreContext';
import { NIGERIAN_STATES } from '../../../lib/design-tokens';
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, Lock, Store } from 'lucide-react';

interface SellerKYCPageProps {
  onNavigate?: (tab: string) => void;
}

export default function SellerKYCPage({ onNavigate }: SellerKYCPageProps) {
  const {
    currentUser,
    isApprovedSeller,
    sellerApplication,
    kycStatus,
    submitSellerApplication,
    showToast,
  } = useStore();

  const [businessName, setBusinessName] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [businessType, setBusinessType] = useState('Registered Business / Retail');
  const [stateLocation, setStateLocation] = useState(currentUser.selectedState || 'Lagos');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sellerApplication) {
      setBusinessName((prev) => prev || sellerApplication.businessName);
      setCacNumber((prev) => prev || sellerApplication.cacNumber);
      setBusinessType((prev) => prev || sellerApplication.businessType);
      setStateLocation((prev) => prev || sellerApplication.stateLocation);
      setPhone((prev) => prev || sellerApplication.phone);
      setDescription((prev) => prev || sellerApplication.description);
    }
  }, [sellerApplication]);

  const effectiveStatus = currentUser.sellerStatus || sellerApplication?.status || 'none';
  const isPending = effectiveStatus === 'pending';
  const isSuspended = effectiveStatus === 'suspended';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !phone.trim() || !description.trim()) {
      showToast('Please enter your business name, phone number, and business description.', 'error');
      return;
    }
    setSubmitting(true);
    const res = await submitSellerApplication({
      businessName: businessName.trim(),
      cacNumber: cacNumber.trim(),
      businessType: businessType.trim(),
      stateLocation: stateLocation.trim(),
      phone: phone.trim(),
      description: description.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      showToast(res.error || 'Could not submit application.', 'error');
    }
  };

  return (
    <div className="cnc-flow-page space-y-4 pb-16">
      <WorkflowBanner title="Seller Verification" icon={ShieldCheck}
        description="Submit your Nigerian business details for compliance review. Only administrator-approved sellers can access Seller Centre, publish products, post shoppable videos, or go live." />

      {!kycStatus.uploadsEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <Lock size={18} className="shrink-0 text-amber-700 mt-0.5" />
          <div>
            <div className="font-black">Sensitive ID / Certificate File Uploads Disabled</div>
            <p className="text-amber-800 mt-0.5">
              {kycStatus.reason || 'Private encrypted document storage is not yet configured. Binary ID/CAC file attachments remain disabled while your text business application is reviewed by administrators.'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {/* Verification Status Card */}
        <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            Application Status
          </h3>

          {isApprovedSeller ? (
            <div className="rounded-2xl bg-emerald-50 p-5 text-center space-y-3 border border-emerald-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-[#0c5c36]">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="text-sm font-black text-emerald-900">Approved Seller</h4>
              <p className="text-xs text-emerald-800">
                Your seller privileges are active. You can submit product listings for moderation and manage your storefront.
              </p>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('seller-dashboard')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-black text-white"
                >
                  <Store size={14} /> Open Seller Centre
                </button>
              )}
            </div>
          ) : isPending ? (
            <div className="rounded-2xl bg-amber-50 p-5 text-center space-y-2 border border-amber-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <Clock size={28} />
              </div>
              <h4 className="text-sm font-black text-amber-950">Your seller account is awaiting approval.</h4>
              <p className="text-xs text-amber-800">
                Submitted business: <b>{sellerApplication?.businessName || 'Pending review'}</b>. An administrator will approve or reject your application.
              </p>
            </div>
          ) : isSuspended ? (
            <div className="rounded-2xl bg-rose-50 p-5 text-center space-y-2 border border-rose-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle size={28} />
              </div>
              <h4 className="text-sm font-black text-rose-900">Seller Privileges Suspended</h4>
              <p className="text-xs text-rose-800">
                {sellerApplication?.reviewerNotes || 'Seller publishing access has been suspended by an administrator.'}
              </p>
            </div>
          ) : effectiveStatus === 'rejected' ? (
            <div className="rounded-2xl bg-rose-50 p-5 text-center space-y-2 border border-rose-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <AlertTriangle size={28} />
              </div>
              <h4 className="text-sm font-black text-rose-900">Application Not Approved</h4>
              <p className="text-xs text-rose-800">
                {sellerApplication?.reviewerNotes || 'Please update your business details below and resubmit.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-5 text-center space-y-2">
              <h4 className="text-sm font-black text-slate-700">Not Yet Applied</h4>
              <p className="text-xs text-slate-500">
                Complete the business application form to request seller privileges.
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
            <div className="font-bold text-slate-800">Onboarding Workflow:</div>
            <div>1. Submit Business Details</div>
            <div>2. Pending Admin Compliance Review</div>
            <div>3. Approval Unlocks Seller Centre</div>
          </div>
        </div>

        {/* Application Form */}
        <div className="cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            {isPending ? 'Submitted Application Details' : 'Business Registration Details'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="font-bold text-slate-700">Registered Business Name *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  disabled={isPending || isApprovedSeller || isSuspended}
                  placeholder="Your legal or store business name"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">CAC Registration Number (Optional)</label>
                <input
                  type="text"
                  value={cacNumber}
                  onChange={(e) => setCacNumber(e.target.value)}
                  disabled={isPending || isApprovedSeller || isSuspended}
                  placeholder="e.g. RC-123456 or BN-789012"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="font-bold text-slate-700">Business Type *</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  disabled={isPending || isApprovedSeller || isSuspended}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none bg-white disabled:bg-slate-50"
                >
                  <option>Registered Business / Retail</option>
                  <option>Wholesale Distributor</option>
                  <option>Manufacturer / Brand</option>
                  <option>Sole Proprietor</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Primary State *</label>
                <select
                  value={stateLocation}
                  onChange={(e) => setStateLocation(e.target.value)}
                  disabled={isPending || isApprovedSeller || isSuspended}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none bg-white disabled:bg-slate-50"
                >
                  {NIGERIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700">Business Phone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={isPending || isApprovedSeller || isSuspended}
                  placeholder="e.g. 0803..."
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700">Storefront & Catalog Description *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isPending || isApprovedSeller || isSuspended}
                placeholder="Describe what products you sell, warehouse location, and dispatch readiness..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-emerald-600 disabled:bg-slate-50"
              />
            </div>

            {!isPending && !isApprovedSeller && !isSuspended && (
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0c5c36] py-3.5 text-xs font-black text-white hover:bg-emerald-900 transition shadow-lg disabled:opacity-50"
              >
                <ShieldCheck size={15} />
                <span>{submitting ? 'Submitting Application...' : 'Submit Seller Application'}</span>
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
