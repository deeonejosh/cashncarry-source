import React, { useState } from 'react';
import { ShieldCheck, FileText, Lock, RefreshCw, Scale, Award, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export type PolicySection = 'terms' | 'privacy' | 'returns' | 'escrow' | 'seller-code';

interface PolicyPageProps {
  initialSection?: PolicySection;
  onBack: () => void;
}

export default function PolicyPage({ initialSection = 'terms', onBack }: PolicyPageProps) {
  const [activeSection, setActiveSection] = useState<PolicySection>(initialSection);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Header */}
      <div className="bg-[#073c22] text-white py-8 px-4 md:px-8 border-b border-emerald-950">
        <div className="max-w-5xl mx-auto space-y-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-200 hover:text-white transition"
          >
            <ArrowLeft size={16} />
            <span>Back to Marketplace</span>
          </button>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Legal & Policies</h1>
              <p className="text-xs md:text-sm text-emerald-200/90 font-medium">
                Policy information is under legal review. Statutory consumer rights remain applicable.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-xs text-emerald-100 font-semibold w-fit">
              <ShieldCheck size={16} className="text-emerald-300" />
              <span>Federal Republic of Nigeria</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Nav */}
          <div className="md:col-span-1 space-y-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm h-fit">
            <button
              onClick={() => setActiveSection('terms')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeSection === 'terms'
                  ? 'bg-[#0c5c36] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText size={16} />
              <span>Terms of Service</span>
            </button>

            <button
              onClick={() => setActiveSection('privacy')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeSection === 'privacy'
                  ? 'bg-[#0c5c36] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Lock size={16} />
              <span>Privacy & NDPA</span>
            </button>

            <button
              onClick={() => setActiveSection('returns')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeSection === 'returns'
                  ? 'bg-[#0c5c36] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RefreshCw size={16} />
              <span>Returns & Refunds</span>
            </button>

            <button
              onClick={() => setActiveSection('escrow')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeSection === 'escrow'
                  ? 'bg-[#0c5c36] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Scale size={16} />
              <span>CBN Escrow & Payouts</span>
            </button>

            <button
              onClick={() => setActiveSection('seller-code')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeSection === 'seller-code'
                  ? 'bg-[#0c5c36] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award size={16} />
              <span>Seller CAC Code</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="md:col-span-3 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            {activeSection === 'terms' && (
              <div className="space-y-5 text-slate-700 text-xs md:text-sm leading-relaxed">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-black text-slate-900">Terms and Conditions of Use</h2>
                  <p className="text-xs text-slate-500">Last updated: August 2026 · Governed by Nigerian Law</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">1. Regulatory Framework & Acceptance</h3>
                  <p>
                    These Terms govern your access to Cash N Carry Nigeria (&quot;Cash N Carry&quot;, &quot;we&quot;, &quot;us&quot;).
                    By creating an account, browsing products, or transacting on Cash N Carry, you agree to comply with
                    the Federal Competition and Consumer Protection Act 2019 (FCCPA), the Cybercrimes (Prohibition,
                    Prevention, etc.) Act 2015, and the Sales of Goods laws of Nigeria.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">2. Marketplace Model & Seller Verification</h3>
                  <p>
                    Cash N Carry operates an authenticated multi-vendor marketplace connecting verified Nigerian merchants
                    with nationwide buyers. All commercial sellers must complete Corporate Affairs Commission (CAC) business
                    registration validation and Bank Verification Number (BVN) / National Identification Number (NIN)
                    identity binding before their listings or livestreams are published.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">3. Pricing, Naira Currency & Tax (VAT)</h3>
                  <p>
                    All listed prices are displayed in Nigerian Naira (₦ / NGN). Under the Nigerian Value Added Tax (VAT)
                    Act, eligible consumer prices reflect statutory VAT where applicable. Sellers are prohibited from
                    demanding offline cash transfers or off-platform direct deposits.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">4. Prohibited Goods & Counterfeiting</h3>
                  <p>
                    Listing counterfeit electronics, expired cosmetics, unapproved pharmaceuticals (without NAFDAC registration),
                    or illegal materials results in immediate account suspension, forfeiture of escrowed balances, and
                    referral to the Standards Organisation of Nigeria (SON) and law enforcement.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-5 text-slate-700 text-xs md:text-sm leading-relaxed">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-black text-slate-900">Privacy Notice & NDPA 2023 Compliance</h2>
                  <p className="text-xs text-slate-500">Nigeria Data Protection Commission (NDPC) Registered</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">1. Lawful Basis for Processing</h3>
                  <p>
                    In strict accordance with the Nigeria Data Protection Act 2023 (NDPA) and the Nigeria Data Protection
                    Regulation (NDPR), Cash N Carry processes personal data solely for contractual fulfillment (order
                    delivery), legal compliance (KYC/AML), and explicit consent (opt-in email marketing).
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">2. Data Security & Encryption</h3>
                  <p>
                    Passwords are stored using per-user cryptographic salts and PBKDF2/SHA-256 key derivation, and sessions
                    use HttpOnly cookies with server-validated permissions. Sensitive identity document uploads remain disabled
                    unless private encrypted object storage is configured.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">3. Your Statutory Rights</h3>
                  <p>
                    As a Nigerian data subject, you possess the inalienable right to request access to your stored records,
                    rectification of inaccurate details, erasure of your account (&quot;right to be forgotten&quot;), and withdrawal
                    of newsletter marketing consent at any time without penalty.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'returns' && (
              <div className="space-y-5 text-slate-700 text-xs md:text-sm leading-relaxed">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-black text-slate-900">7-Day Return & Refund Policy</h2>
                  <p className="text-xs text-slate-500">Buyer Protection Guaranteed via Official Escrow</p>
                </div>

                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3 text-emerald-900">
                  <CheckCircle2 size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs">7 Calendar Days Return Window</p>
                    <p className="text-xs text-slate-600">
                      If an item received differs substantially from description, has factory defect, or arrives damaged,
                      you have 7 days from delivery to request a free return pickup.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">1. Return Eligibility</h3>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Items must be in original condition with manufacturer tags, accessories, and warranty cards intact.</li>
                    <li>Fashion apparel must remain unworn, unwashed, and in original packaging.</li>
                    <li>Phones and electronics must be factory-reset without active cloud locks (iCloud/Google account).</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">2. Refund Processing Timeline</h3>
                  <p>
                    Upon pickup by GIG Logistics and verification at our inspection hub, refunds are credited back to
                    the original payment channel (Flutterwave bank card/account) within 48 to 72 business hours.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'escrow' && (
              <div className="space-y-5 text-slate-700 text-xs md:text-sm leading-relaxed">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-black text-slate-900">Central Bank of Nigeria (CBN) Escrow Compliance</h2>
                  <p className="text-xs text-slate-500">Automated Settlement via Licensed Payment Solution Service Providers</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">1. Payment Hold in Escrow</h3>
                  <p>
                    When a buyer checks out on Cash N Carry via Flutterwave, customer funds do not immediately transfer to
                    the seller. Funds are held in a secure commercial escrow account until the logistics carrier confirms
                    physical parcel delivery to the recipient.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">2. 48-Hour Inspection Window</h3>
                  <p>
                    After delivery is logged, buyers have a 48-hour inspection period before escrow release. If no dispute
                    is raised, the payout automatically settles into the seller&apos;s verified Nigerian NUBAN bank account.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">3. Chargeback & Dispute Arbitrage</h3>
                  <p>
                    In accordance with CBN E-Payment Dispute Arbitration standards, in the event of an alleged fraudulent
                    claim or non-delivery dispute, Cash N Carry administrators review GPS delivery logs, digital signatures,
                    and carrier proof before ruling.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'seller-code' && (
              <div className="space-y-5 text-slate-700 text-xs md:text-sm leading-relaxed">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-black text-slate-900">Verified Seller Code of Conduct & CAC Protocol</h2>
                  <p className="text-xs text-slate-500">Corporate Affairs Commission Standards for Nigerian Merchants</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">1. Mandatory CAC Verification</h3>
                  <p>
                    All merchants operating stores on Cash N Carry must submit authentic Corporate Affairs Commission (CAC)
                    Registration Certificates (RC Number or Business Name BN Number). Submissions undergo automated ClamAV
                    security scanning and administrative audit.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">2. SLA for Fulfillment (48-Hour Dispatch)</h3>
                  <p>
                    Sellers must process, pack, and hand over orders to Cash N Carry logistics partners (GIG Logistics,
                    Kwik, DHL) within 48 business hours of order placement. Failure to fulfill within 72 hours triggers
                    automatic order cancellation and buyer refund.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">3. Zero-Tolerance Counterfeit Policy</h3>
                  <p>
                    Listing grey-market or counterfeit items results in permanent seller blacklisting across our platform
                    and reporting to the FCCPC.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
