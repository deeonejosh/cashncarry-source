import React, {useEffect,useRef} from 'react';
import {getLivePublisherPreview} from '../../lib/cloudflare-stream-webrtc';

export default function DesktopHostPreview(){
  const video=useRef<HTMLVideoElement>(null);
  const media=getLivePublisherPreview();
  useEffect(()=>{
    const element=video.current;
    if(!element||!media)return;
    element.srcObject=media;
    element.muted=true;
    void element.play().catch(()=>{});
    return ()=>{element.srcObject=null;};
  },[media]);
  if(!media)return null;
  return <div className="cnc-desktop-host-monitor">
    <video autoPlay playsInline muted ref={video} aria-label="Your live seller camera preview"/>
    <span>Your live camera</span>
  </div>;
}
