import React from 'react';
import { ChevronDown } from 'lucide-react';
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
  const quick=(title:string,section:FooterLink['section'])=><button key={title} type="button" onClick={()=>go('policies',section)}
      className="inline-flex min-h-10 items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100">{title}</button>;
  return <footer className="cnc-site-footer border-t border-slate-200 pb-24 pt-6 text-emerald-50 lg:pb-10 lg:pt-10">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {!isAdmin && !isApprovedSeller && <div className="mb-5 lg:mb-8"><NewsletterSignup onPrivacy={() => go('policies','privacy')} /></div>}
      <div className="cnc-footer-identity flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex flex-wrap items-center gap-3"><div className="cnc-footer-logo"><BrandLogo className="h-7 w-auto" /></div><p className="text-sm text-emerald-50">Shop and sell across Nigeria.</p></div>
      </div>
      <div className="cnc-footer-mobile mt-2 space-y-3 lg:hidden">
        <div className="flex flex-wrap gap-2">{quick('Terms','terms')}{quick('Privacy','privacy')}{quick('Returns','returns')}</div>
        <details className="rounded-2xl border border-slate-200 bg-white shadow-sm"><summary className="cnc-footer-summary flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold">Browse all links & policies <ChevronDown size={18} aria-hidden="true" /></summary><div className="grid grid-cols-2 gap-x-3 gap-y-6 border-t border-slate-100 px-3 py-5">{sections.map(renderGroup)}</div></details>
      </div>
      <div className="cnc-footer-desktop mt-8 hidden lg:grid grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-8">{sections.map(renderGroup)}</div>
      <div className="cnc-footer-legal mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs sm:justify-between">
        <span>© 2026 Cash N Carry Nigeria. All rights reserved.</span><span className="font-semibold text-emerald-50">🇳🇬 Nigeria · NGN (₦)</span>
      </div>
    </div>
  </footer>;
}
