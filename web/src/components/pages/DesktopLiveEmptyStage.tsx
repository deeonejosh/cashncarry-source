import './live-studio.css';
import React from 'react';
import {ArrowLeft, ArrowRight, Radio, VideoOff, ShieldCheck} from 'lucide-react';

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
      <div className="cnc-desktop-empty-content">
        <div className="cnc-live-studio-icon" aria-hidden="true">
          {hasEndedRoom ? <VideoOff size={28}/> : <Radio size={28}/>}
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
