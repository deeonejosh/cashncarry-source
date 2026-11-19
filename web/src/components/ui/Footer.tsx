import React from 'react';
import { ChevronDown, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo';
import NewsletterSignup from './NewsletterSignup';
import { useStore } from '../../context/StoreContext';

type FooterLink = { label: string; tab: string; section?: 'terms'|'privacy'|'returns'|'escrow'|'seller-code' };
type FooterSection = { title: string; links: FooterLink[] };

const sections: FooterSection[] = [
  {title:'Shop',links:[
    {label:'Browse products',tab:'shop'}, {label:'For You',tab:'for-you'},
    {label:'Live shopping',tab:'live'}, {label:'My orders',tab:'orders'}
  ]},
  {title:'Sell with us',links:[
    {label:'Become a seller',tab:'seller-kyc'}, {label:'Seller Centre',tab:'seller-dashboard'},
    {label:'Seller guidelines',tab:'policies',section:'seller-code'}
  ]},
  {title:'Support',links:[
    {label:'Help & policies',tab:'policies',section:'terms'},
    {label:'Returns & refunds',tab:'policies',section:'returns'},
    {label:'My messages',tab:'messages'}
  ]},
  {title:'Legal & policies',links:[
    {label:'Terms of service',tab:'policies',section:'terms'},
    {label:'Privacy & NDPA',tab:'policies',section:'privacy'},
    {label:'Returns policy',tab:'policies',section:'returns'},
    {label:'Escrow & payments',tab:'policies',section:'escrow'},
    {label:'Seller code',tab:'policies',section:'seller-code'}
  ]}
];

export default function Footer({setCurrentTab,onSelectPolicy}:{setCurrentTab:(tab:string)=>void;onSelectPolicy:(section:'terms'|'privacy'|'returns'|'escrow'|'seller-code')=>void}) {
  const {isApprovedSeller,isAdmin} = useStore();
  const go=(tab:string,section?:FooterLink['section'])=>{
    if(tab==='policies') onSelectPolicy(section || 'terms');
    else setCurrentTab(tab);
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const renderGroup=(group:FooterSection)=> (
    <section className="space-y-2" key={group.title}>
      <h3 className="px-3 text-xs font-black uppercase tracking-wider text-emerald-900">{group.title}</h3>
      <div className="flex flex-col items-start gap-0.5">
        {group.links.filter(link=>link.tab!=='seller-dashboard'||isApprovedSeller).map(link=><button key={`${link.tab}-${link.section||link.label}`} type="button" onClick={()=>go(link.tab,link.section)}
          className="cnc-footer-link block w-full text-left rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-900 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 transition-colors">{link.label}</button>)}
      </div>
    </section>
  );
  const quickPolicies = [
    { label: 'Terms', section: 'terms', icon: FileText },
    { label: 'Privacy', section: 'privacy', icon: ShieldCheck },
    { label: 'Returns', section: 'returns', icon: RotateCcw },
  ] as const;
  return <footer className="cnc-site-footer border-t border-slate-200 pb-24 pt-6 text-emerald-50 lg:pb-10 lg:pt-10">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-stretch">
        {!isAdmin && !isApprovedSeller && <NewsletterSignup onPrivacy={() => go('policies', 'privacy')} />}
        <nav aria-label="Footer links and policies" className="cnc-footer-policy min-w-0 rounded-2xl border p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="cnc-footer-logo"><BrandLogo className="h-7 w-auto" /></div>
            <p className="text-sm text-emerald-50">Shop and sell across Nigeria.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickPolicies.map(({ label, section, icon: Icon }) => (
              <button key={section} type="button" onClick={() => go('policies', section)}
                className="cnc-footer-policy-link inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold">
                <Icon size={15} aria-hidden="true" />{label}
              </button>
            ))}
          </div>
          <details className="cnc-footer-directory mt-3 rounded-xl border">
            <summary className="cnc-footer-summary flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-bold">
              Browse all links &amp; policies <ChevronDown size={18} className="shrink-0" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-2 gap-x-2 gap-y-4 border-t px-2 py-4">{sections.map(renderGroup)}</div>
          </details>
        </nav>
      </div>
      <div className="cnc-footer-legal mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs sm:justify-between">
        <span>© 2026 Cash N Carry Nigeria. All rights reserved.</span><span className="font-semibold text-emerald-50">🇳🇬 Nigeria · NGN (₦)</span>
      </div>
    </div>
  </footer>;
}
