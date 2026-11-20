import React, { useEffect, useRef, useState } from 'react';
import {
  type CloudflareSession,
  stopCloudflareViewer, validWhep, watchCloudflareStream,
} from '../../lib/cloudflare-stream-webrtc';

interface Props {
  url?: string;
  className?: string;
  onStatusChange?: (status: 'idle' | 'connecting' | 'playing' | 'error') => void;
}

export default function CloudflareStreamPlayer({url,className,onStatusChange}:Props) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const [status,setStatus]=useState<'idle' | 'connecting' | 'playing' | 'error'>('idle');
  const [muted,setMuted]=useState(true);
  const [attempt,setAttempt]=useState(0);

  useEffect(() => {
    if (status !== 'connecting') return;
    const timeout = window.setTimeout(() => setStatus('error'), 20_000);
    return () => window.clearTimeout(timeout);
  }, [status, url, attempt]);

  useEffect(() => {onStatusChange?.(status);},[status,onStatusChange]);

  useEffect(() => {
    if(!validWhep(url)){setStatus('idle');return;}
    let cancelled=false;
    let session:CloudflareSession|null=null;
    const video = videoRef.current;
    setStatus('connecting');
    void watchCloudflareStream(url!,stream=>{
      if(cancelled)return;
      if(video){
        video.srcObject=stream;
        void video.play().catch(()=>{});
      }
    }).then(value=>{
      session=value;
      if(cancelled){void stopCloudflareViewer(session);return;}
      // RTCPeerConnection may negotiate before the broadcaster is actually sending media.
      const ready=()=>{
        if(cancelled)return;
        if(value.pc.connectionState==='disconnected')setStatus('connecting');
        if(value.pc.connectionState==='failed'||value.pc.connectionState==='closed')setStatus('error');
      };
      value.pc.addEventListener('connectionstatechange',ready);
      ready();
    }).catch(()=>{
      if(!cancelled)setStatus('error');
    });
    return ()=>{
      cancelled=true;
      if(video)video.srcObject=null;
      void stopCloudflareViewer(session);
    };
  },[url,attempt]);

  if(!validWhep(url))return null;
  return <div className="cnc-cloudflare-stream-player">
    <video ref={videoRef} className={className||'h-full w-full object-cover'} playsInline autoPlay muted={muted}
      aria-label="Cloudflare Stream live broadcast" onPlaying={() => setStatus('playing')}
      onWaiting={() => setStatus(current => current === 'error' ? current : 'connecting')} />
    {status!=='playing'&&<div className="cnc-stream-connection-status" role="status">
      {status==='error'?'Video connection lost': 'Connecting live video...'}
    </div>}
    <div className="cnc-stream-playback-controls">
      <button type="button" onClick={()=>{
        const next=!muted;
        const video=videoRef.current;
        if(video){video.muted=next;void video.play().catch(()=>{});}
        setMuted(next);
      }}>{muted?'Unmute':'Mute'}</button>
      {status==='error'&&<button type="button" onClick={()=>setAttempt(n=>n+1)}>Reconnect</button>}
    </div>
  </div>;
}
