import './live-studio.css';
import React from 'react';
import { ArrowLeft, ArrowRight, Radio } from 'lucide-react';

interface Props {
  isApprovedSeller: boolean;
  liveStreamingConfigured: boolean;
  onOpenCreate?: () => void;
  onExit?: () => void;
}

export default function MobileLiveEmptyStage({
  isApprovedSeller, liveStreamingConfigured, onOpenCreate, onExit,
}: Props) {
  return (
    <section className="cnc-mobile-live-empty-room md:hidden" aria-label="Livestream studio">
      <header className="cnc-live-empty-header">
        <button type="button" className="cnc-live-empty-back" aria-label="Leave livestream studio" onClick={() => onExit?.()}>
          <ArrowLeft size={21}/>
        </button>
        <span className="cnc-live-empty-brand">Cash<span>N</span>Carry</span>
        <span className="cnc-live-empty-status"><Radio size={14}/> LIVE STUDIO</span>
      </header>
      <div className="cnc-live-empty-panel">
        <div className="cnc-live-studio-icon" aria-hidden="true"><Radio size={28}/></div>
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
