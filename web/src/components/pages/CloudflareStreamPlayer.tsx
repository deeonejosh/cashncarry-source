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

  useEffect(() => {onStatusChange?.(status);},[status,onStatusChange]);

  useEffect(() => {
    if(!validWhep(url)){setStatus('idle');return;}
    let cancelled=false;
    let session:CloudflareSession|null=null;
    setStatus('connecting');
    void watchCloudflareStream(url!,stream=>{
      if(cancelled)return;
      const video=videoRef.current;
      if(video){
        video.srcObject=stream;
        video.muted=true;
        void video.play().catch(()=>{});
      }
    }).then(value=>{
      session=value;
      if(cancelled){void stopCloudflareViewer(session);return;}
      // RTCPeerConnection may negotiate before the broadcaster is actually sending media.
      const ready=()=>{
        if(cancelled)return;
        if(value.pc.connectionState==='connected')setStatus('playing');
        if(value.pc.connectionState==='failed'||value.pc.connectionState==='closed')setStatus('error');
      };
      value.pc.addEventListener('connectionstatechange',ready);
      ready();
    }).catch(()=>{
      if(!cancelled)setStatus('error');
    });
    return ()=>{
      cancelled=true;
      if(videoRef.current)videoRef.current.srcObject=null;
      void stopCloudflareViewer(session);
    };
  },[url,attempt]);

  if(!validWhep(url))return null;
  return <div className="cnc-cloudflare-stream-player">
    <video ref={videoRef} className={className||'h-full w-full object-cover'} playsInline autoPlay muted={muted}
      aria-label="Cloudflare Stream live broadcast" />
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
