/**
 * Cloudflare Stream WebRTC WHIP/WHEP integration.
 * The WHIP publish URL is secret: it comes from an authenticated seller-only
 * endpoint and must never be included in HTML, React props or analytics.
 * WHEP viewer URLs are public and contain a live input ID, not a stream key.
 */
export interface CloudflareSession {
  pc: RTCPeerConnection;
  sessionUrl: string | null;
}

export interface CloudflarePublisher extends CloudflareSession {
  media: MediaStream;
}

let publisher: CloudflarePublisher | null = null;

function assertCloudflareEndpoint(value: string, operation: 'publish' | 'play'): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash ||
      !url.hostname.endsWith('.cloudflarestream.com') ||
      !url.pathname.endsWith('/webRTC/' + operation)) {
    throw new Error('Invalid Cloudflare Stream ' + operation + ' endpoint.');
  }
  return url.href;
}

export function validWhep(value: string | undefined): boolean {
  if (!value) return false;
  try { assertCloudflareEndpoint(value, 'play'); return true; }
  catch { return false; }
}

async function negotiate(pc: RTCPeerConnection, endpoint: string): Promise<string | null> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  const response = await fetch(endpoint, {
    method: 'POST', headers: {'Content-Type': 'application/sdp'},
    body: offer.sdp,
  });
  if (!response.ok) throw new Error('Cloudflare Stream could not connect (' + response.status + ').');
  const answer = await response.text();
  await pc.setRemoteDescription({type:'answer',sdp:answer});
  const location = response.headers.get('Location');
  if (!location) return null;
  const sessionUrl = new URL(location, endpoint);
  if (sessionUrl.protocol !== 'https:' || sessionUrl.origin !== new URL(endpoint).origin)
    throw new Error('Unexpected stream session destination.');
  return sessionUrl.href;
}

function waitConnected(pc: RTCPeerConnection, timeout = 20000): Promise<void> {
  if (pc.connectionState === 'connected') return Promise.resolve();
  return new Promise((resolve,reject) => {
    let done = false;
    const cleanup=() => {pc.removeEventListener('connectionstatechange',onChange);clearTimeout(timer);};
    const finish=(error?:Error) => {if(done)return;done=true;cleanup();if(error)reject(error);else resolve();};
    const onChange=() => {
      if (pc.connectionState==='connected')finish();
      else if (pc.connectionState==='failed' || pc.connectionState==='closed')
        finish(new Error('Live connection failed. Check your network and try again.'));
    };
    const timer=window.setTimeout(()=>finish(new Error('Cloudflare Stream connection timed out.')),timeout);
    pc.addEventListener('connectionstatechange',onChange);
    onChange();
  });
}

export async function publishCloudflareStream(media: MediaStream): Promise<void> {
  if (publisher) throw new Error('A broadcast is already active in this browser.');
  if (!media.active || !media.getVideoTracks().some(t=>t.readyState==='live'))
    throw new Error('Enable the camera before starting the live stream.');
  const res=await fetch('/api/live/cloudflare/publish',{
    method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:'{}',
    cache:'no-store',
  });
  if(!res.ok)throw new Error(res.status===403?'This seller is not authorised to broadcast.':'Cloudflare broadcast access unavailable ('+res.status+').');
  const data=await res.json() as {whipUrl?: string};
  const endpoint=assertCloudflareEndpoint(data.whipUrl || '', 'publish');
  const pc=new RTCPeerConnection();
  let sessionUrl:string|null=null;
  try {
    for (const track of media.getTracks()) pc.addTransceiver(track,{direction:'sendonly'});
    sessionUrl=await negotiate(pc,endpoint);
    await waitConnected(pc);
    publisher={pc,sessionUrl,media};
  } catch(error) {
    pc.close();
    if(sessionUrl) void fetch(sessionUrl,{method:'DELETE'}).catch(()=>{});
    throw error;
  }
}

export function isPublishingCloudflareStream():boolean {
  return Boolean(publisher && publisher.pc.connectionState === 'connected');
}

export function getLivePublisherPreview():MediaStream|null {
  return publisher?.media ?? null;
}

export async function stopCloudflareStream():Promise<void> {
  const old=publisher;
  publisher=null;
  if(!old)return;
  old.pc.close();
  old.media.getTracks().forEach(track=>track.stop());
  if(old.sessionUrl) {
    try {await fetch(old.sessionUrl,{method:'DELETE',keepalive:true});}catch{ /* connection may already have closed */ }
  }
}

export async function watchCloudflareStream(url:string, onTrack:(stream:MediaStream)=>void):Promise<CloudflareSession> {
  const endpoint=assertCloudflareEndpoint(url,'play');
  const pc=new RTCPeerConnection();
  const stream=new MediaStream();
  pc.ontrack=event => {
    stream.addTrack(event.track);
    onTrack(stream);
  };
  let sessionUrl:string|null=null;
  try {
    pc.addTransceiver('video',{direction:'recvonly'});
    pc.addTransceiver('audio',{direction:'recvonly'});
    sessionUrl=await negotiate(pc,endpoint);
    return {pc,sessionUrl};
  }catch(error){
    pc.close();
    throw error;
  }
}

export async function stopCloudflareViewer(session: CloudflareSession | null):Promise<void>{
  if(!session)return;
  session.pc.close();
  if(session.sessionUrl) {
    try {await fetch(session.sessionUrl,{method:'DELETE',keepalive:true});}catch{ /* already closed */ }
  }
}
