import React from 'react';
import { ArrowLeft, ArrowRight, Radio } from 'lucide-react';
import './mobile-live-glass.css';

interface Props {
  isApprovedSeller: boolean;
  liveStreamingConfigured: boolean;
  onOpenCreate?: () => void;
  onExit?: () => void;
}

/**
 * Empty/ended mobile seller view. The glass, animated 3D platform and
 * holographic radio orb are decorative. No video is simulated here.
 */
export default function MobileLiveEmptyStage({
  isApprovedSeller, liveStreamingConfigured, onOpenCreate, onExit,
}: Props) {
  return (
    <section className="cnc-mobile-live-empty-room md:hidden" aria-label="Livestream studio">
      <div className="cnc-live-empty-sky" aria-hidden="true">
        <span className="cnc-live-empty-sky-orb cnc-live-empty-sky-orb--cyan"/>
        <span className="cnc-live-empty-sky-orb cnc-live-empty-sky-orb--violet"/>
        <span className="cnc-live-empty-grid"/>
      </div>
      <header className="cnc-live-empty-header">
        <button type="button" className="cnc-live-empty-back" aria-label="Leave livestream studio" onClick={() => onExit?.()}>
          <ArrowLeft size={21}/>
        </button>
        <span className="cnc-live-empty-brand">Cash<span>N</span>Carry</span>
        <span className="cnc-live-empty-status"><Radio size={14}/> LIVE STUDIO</span>
      </header>
      <div className="cnc-live-empty-stage" aria-hidden="true">
        <div className="cnc-live-empty-aura"/>
        <div className="cnc-live-empty-hologram"><Radio size={82} strokeWidth={1.8}/></div>
        <div className="cnc-live-empty-platform cnc-live-empty-platform--base"/>
        <div className="cnc-live-empty-platform cnc-live-empty-platform--top"/>
      </div>
      <div className="cnc-live-empty-panel">
        <div className="cnc-live-empty-eyebrow"><span/> CASH N CARRY LIVE SHOPPING</div>
        <h1>The live stage is ready</h1>
        <p>{isApprovedSeller
          ? 'Your next live shopping session starts here. Go live, pin products and chat with customers in real time.'
          : 'There are no active shopping livestreams right now. Come back when a verified seller starts broadcasting.'}</p>
        {isApprovedSeller && onOpenCreate && (
          <button className="cnc-live-empty-primary" type="button" onClick={onOpenCreate}>
            <Radio size={22}/> Set up live room <ArrowRight size={22}/>
          </button>
        )}
        <button type="button" className="cnc-live-empty-secondary" onClick={() => onExit?.()}>
          {isApprovedSeller ? 'Return to Seller Centre' : 'Return to shop'}
        </button>
      </div>
      <div className="cnc-live-empty-message" role="status">
        <span className="cnc-live-empty-message-dot"/>
        {liveStreamingConfigured
          ? 'Cloudflare Stream is available for authorised sellers.'
          : 'Live video broadcasting is not configured yet.'}
      </div>
    </section>
  );
}
