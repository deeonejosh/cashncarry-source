import WorkflowBanner from '../ui/WorkflowBanner';
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { EMAIL_TEMPLATES, generateHtmlEmail } from '../../lib/emailTemplates';
import { EmailTemplateId, ProductItem } from '../../types';
import {
  Send,
  Users,
  Copy,
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  Plus,
  FileCode,
  X,
} from 'lucide-react';

interface EmailMarketingPageProps {
  onSelectProduct?: (product: ProductItem) => void;
  onOpenNewsletterModal?: () => void;
}

export default function EmailMarketingPage({ onOpenNewsletterModal }: EmailMarketingPageProps) {
  const { products, newsletterSubscribers, emailCampaigns, subscribeNewsletter, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<'designer' | 'campaigns' | 'subscribers'>('designer');
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>('welcome');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [addSubscriberModalOpen, setAddSubscriberModalOpen] = useState(false);

  const currentTemplate = EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId) || EMAIL_TEMPLATES[0];
  const [customSubject, setCustomSubject] = useState(currentTemplate.defaultSubject);
  const [customPreheader, setCustomPreheader] = useState(currentTemplate.defaultPreheader);
  const [customHeadline, setCustomHeadline] = useState(currentTemplate.defaultHeadline);
  const [customBody, setCustomBody] = useState(currentTemplate.defaultBody);
  const [customCtaText, setCustomCtaText] = useState(currentTemplate.defaultCtaText);
  const [customCtaUrl, setCustomCtaUrl] = useState(currentTemplate.defaultCtaUrl);
  const [recipientName, setRecipientName] = useState('Valued Shopper');
  const [voucherCode, setVoucherCode] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const handleSelectTemplate = (id: EmailTemplateId) => {
    setSelectedTemplateId(id);
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === id) || EMAIL_TEMPLATES[0];
    setCustomSubject(tmpl.defaultSubject);
    setCustomPreheader(tmpl.defaultPreheader);
    setCustomHeadline(tmpl.defaultHeadline);
    setCustomBody(tmpl.defaultBody);
    setCustomCtaText(tmpl.defaultCtaText);
    setCustomCtaUrl(tmpl.defaultCtaUrl);
    setVoucherCode('');
  };

  const featuredProducts = useMemo(
    () => products.filter((p) => selectedProductIds.includes(p.id)),
    [products, selectedProductIds]
  );

  const generatedHtml = useMemo(
    () =>
      generateHtmlEmail(selectedTemplateId, {
        recipientName,
        recipientEmail: '',
        headline: customHeadline,
        body: customBody,
        ctaText: customCtaText,
        ctaUrl: customCtaUrl,
        previewText: customPreheader,
        voucherCode: voucherCode || undefined,
        featuredProducts,
      }),
    [
      selectedTemplateId,
      recipientName,
      customHeadline,
      customBody,
      customCtaText,
      customCtaUrl,
      customPreheader,
      voucherCode,
      featuredProducts,
    ]
  );

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generatedHtml);
    setCopiedHtml(true);
    showToast('Responsive email HTML copied to clipboard.', 'success');
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([generatedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashncarry-${selectedTemplateId}-template.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded cashncarry-${selectedTemplateId}-template.html`, 'success');
  };

  const totalSubscribersCount = newsletterSubscribers.length;
  const activeSubscribersCount = newsletterSubscribers.filter((s) => s.status === 'subscribed').length;

  return (
    <div className="cnc-flow-page space-y-4 pb-20">
      <WorkflowBanner title="Email Studio" description="Manage email templates." icon={Send}>
        <button
          onClick={() => onOpenNewsletterModal?.()}
          className="mt-4 min-h-11 rounded-xl bg-orange-200 px-4 text-xs font-black text-orange-950 hover:bg-orange-300"
        >
          Preview Signup Form
        </button>
      </WorkflowBanner>

      <div className="cnc-flow-toolbar flex gap-2 overflow-x-auto rounded-2xl border p-2 text-xs font-bold text-slate-600">
        <button
          aria-pressed={activeTab === 'designer'}
          onClick={() => setActiveTab('designer')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            activeTab === 'designer' ? 'bg-[#0c5c36] text-white shadow-sm' : 'hover:bg-slate-100'
          }`}
        >
          <FileCode size={15} />
          <span>Template Designer</span>
        </button>
        <button
          aria-pressed={activeTab === 'campaigns'}
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            activeTab === 'campaigns' ? 'bg-[#0c5c36] text-white shadow-sm' : 'hover:bg-slate-100'
          }`}
        >
          <Send size={15} />
          <span>Campaigns ({emailCampaigns.length})</span>
        </button>
        <button
          aria-pressed={activeTab === 'subscribers'}
          onClick={() => setActiveTab('subscribers')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            activeTab === 'subscribers' ? 'bg-[#0c5c36] text-white shadow-sm' : 'hover:bg-slate-100'
          }`}
        >
          <Users size={15} />
          <span>Subscribers ({totalSubscribersCount})</span>
        </button>
      </div>

      {activeTab === 'designer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {EMAIL_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-[#0c5c36] bg-emerald-50/60 shadow-md ring-2 ring-[#0c5c36]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      {tmpl.category}
                    </span>
                    {isSelected && <CheckCircle2 size={14} className="text-[#0c5c36]" />}
                  </div>
                  <div className="text-xs font-black text-slate-900 line-clamp-1 mb-1">{tmpl.name}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{tmpl.description}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 cnc-flow-card rounded-3xl border p-4 sm:p-6 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Content Customizer
              </h4>
              <div>
                <label className="text-xs font-bold text-slate-700">Subject Line</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Headline</label>
                <input
                  type="text"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Body Copy</label>
                <textarea
                  rows={4}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Tag Published Products</label>
                {products.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No products available yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50">
                    {products.slice(0, 6).map((prod) => {
                      const isTagged = selectedProductIds.includes(prod.id);
                      return (
                        <button
                          type="button"
                          key={prod.id}
                          onClick={() =>
                            setSelectedProductIds((prev) =>
                              prev.includes(prod.id) ? prev.filter((id) => id !== prod.id) : [...prev, prod.id]
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                            isTagged ? 'bg-[#0c5c36] text-white font-bold' : 'bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate pr-2">{prod.title}</span>
                          <span className="shrink-0">₦{prod.price.toLocaleString('en-NG')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Monitor size={14} /> <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Smartphone size={14} /> <span>Mobile</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyHtml}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy size={13} />
                    <span>{copiedHtml ? 'Copied HTML' : 'Copy HTML'}</span>
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Download size={13} />
                    <span>Download .html</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-center rounded-3xl border border-slate-200 bg-slate-100/90 p-4 sm:p-6 min-h-[560px]">
                <div
                  className={`transition-all duration-300 w-full overflow-hidden shadow-xl rounded-2xl bg-white border border-slate-200 ${
                    previewDevice === 'mobile' ? 'max-w-[375px]' : 'max-w-[620px]'
                  }`}
                >
                  <iframe
                    title="Email Template Live Preview"
                    srcDoc={generatedHtml}
                    className="w-full h-[640px] border-none bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center text-xs text-slate-500">
          {emailCampaigns.length === 0
            ? 'No broadcast campaigns recorded. Use Template Designer to export HTML for your transactional email provider.'
            : `${emailCampaigns.length} campaigns`}
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{activeSubscribersCount} in-session preview entries (not saved)</span>
            <button
              onClick={() => setAddSubscriberModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#0c5c36] px-4 py-2 text-xs font-black text-white"
            >
              <Plus size={14} /> Add Subscriber
            </button>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-xs text-slate-600">
            {newsletterSubscribers.length === 0 ? (
              <div className="py-8 text-center text-slate-400">No newsletter subscribers recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {newsletterSubscribers.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{sub.name || sub.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{sub.email}</div>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {addSubscriberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Add Preview Subscriber</h3>
              <button onClick={() => setAddSubscriberModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                subscribeNewsletter(
                  String(fd.get('email') || ''),
                  String(fd.get('name') || ''),
                  'admin',
                  ['flash-deals']
                );
                setAddSubscriberModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="subscriber@domain.com"
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
              <input
                name="name"
                placeholder="Subscriber Name"
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
              <button type="submit" className="w-full rounded-xl bg-[#0c5c36] py-2.5 font-black text-white">
                Add Subscriber
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
