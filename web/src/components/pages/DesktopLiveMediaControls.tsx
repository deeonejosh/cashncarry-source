import React,{useState} from 'react';
import {Mic,MicOff,Camera,CameraOff} from 'lucide-react';
import {getLivePublisherPreview} from '../../lib/cloudflare-stream-webrtc';

export default function DesktopLiveMediaControls(){
  const [muted,setMuted]=useState(false);
  const [cameraOff,setCameraOff]=useState(false);
  const media=getLivePublisherPreview();
  if(!media)return null;
  return <>
    <button type="button" aria-label={muted?'Unmute microphone':'Mute microphone'} onClick={()=>{
      const tracks=media.getAudioTracks();
      if(!tracks.length)return;
      const next=!muted;tracks.forEach(track=>track.enabled=!next);setMuted(next);
    }}>{muted?<MicOff size={19}/>:<Mic size={19}/>} {muted?'Unmute':'Mute'}</button>
    <button type="button" aria-label={cameraOff?'Turn camera on':'Turn camera off'} onClick={()=>{
      const tracks=media.getVideoTracks();
      if(!tracks.length)return;
      const next=!cameraOff;tracks.forEach(track=>track.enabled=!next);setCameraOff(next);
    }}>{cameraOff?<CameraOff size={19}/>:<Camera size={19}/>} {cameraOff?'Camera on':'Camera off'}</button>
  </>;
}
