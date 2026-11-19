import React from 'react';
import {ArrowLeft, ArrowRight, Radio, ShoppingBag, VideoOff, ShieldCheck} from 'lucide-react';
import './desktop-live-glass.css';

interface Props {
  isApprovedSeller: boolean;
  liveStreamingConfigured: boolean;
  hasEndedRoom: boolean;
  onOpenCreate?: () => void;
  onExit?: () => void;
  onSellerCentre?: () => void;
}

/** An honest offline/ended state: decoration never claims video is actually live. */
export default function DesktopLiveEmptyStage({
  isApprovedSeller, liveStreamingConfigured, hasEndedRoom, onOpenCreate, onExit, onSellerCentre,
}: Props) {
  const title = hasEndedRoom ? 'Livestream Ended' : 'The live stage is ready';
  return (
    <section className="cnc-desktop-live-empty hidden md:flex" aria-label="Desktop livestream studio">
      <div className="cnc-desktop-empty-glow cnc-desktop-empty-glow--blue" aria-hidden="true"/>
      <div className="cnc-desktop-empty-glow cnc-desktop-empty-glow--pink" aria-hidden="true"/>
      <div className="cnc-desktop-empty-orbit cnc-desktop-empty-orbit--left" aria-hidden="true"><ShoppingBag size={48}/></div>
      <div className="cnc-desktop-empty-orbit cnc-desktop-empty-orbit--right" aria-hidden="true"><ShoppingBag size={47}/></div>
      <div className="cnc-desktop-empty-content">
        <div className="cnc-desktop-live-eyebrow"><Radio size={16}/> CASH N CARRY LIVE STUDIO</div>
        <div className="cnc-desktop-empty-hologram" aria-hidden="true">
          <div className="cnc-desktop-empty-sphere">{hasEndedRoom ? <VideoOff size={64}/> : <Radio size={68}/>}</div>
          <div className="cnc-desktop-empty-platform"/>
          <div className="cnc-desktop-empty-ring"/>
        </div>
        <div className="cnc-desktop-empty-panel">
          <h1>{title}</h1>
          <p>{hasEndedRoom
            ? 'Your live shopping session has ended. Set up another broadcast to connect with buyers and showcase products.'
            : 'No shopping rooms are active right now. Start a session to broadcast, answer questions and pin products for buyers.'}</p>
          <div className="cnc-desktop-empty-actions">
            {isApprovedSeller && onOpenCreate && (
              <button type="button" className="cnc-desktop-neon-primary" onClick={onOpenCreate}>
                <Radio size={19}/> {hasEndedRoom ? 'Go Live Again' : 'Set Up Live Room'} <ArrowRight size={18}/>
              </button>
            )}
            <button type="button" className="cnc-desktop-neon-secondary" onClick={isApprovedSeller && onSellerCentre ? onSellerCentre : onExit}>
              <ArrowLeft size={17}/> {isApprovedSeller ? 'Return to Seller Centre' : 'Return to Shop'}
            </button>
          </div>
        </div>
        <div className="cnc-desktop-empty-status" role="status">
          {liveStreamingConfigured ? <ShieldCheck size={18}/> : <VideoOff size={18}/>}
          {liveStreamingConfigured
            ? 'Cloudflare Stream is configured. Camera broadcast begins when you start a room.'
            : 'Streaming is not configured for this account yet.'}
        </div>
      </div>
    </section>
  );
}
