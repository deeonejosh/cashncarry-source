import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function SellerVideosPanel() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.getSellerVideos>>>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    void api.getSellerVideos().then(response => { if (current) setResult(response); });
    return () => { current = false; };
  }, []);

  const remove = async (id: string) => {
    if (pending || !window.confirm('Delete this video from your store and the marketplace feed?')) return;
    setPending(true);
    setError('');
    const response = await api.deleteVideo(id);
    if (response.ok) setResult(await api.getSellerVideos());
    else setError(response.error || 'Could not delete your video.');
    setPending(false);
  };

  return (
    <section className="cnc-workspace-panel space-y-3 rounded-3xl border p-4" aria-label="My posted videos">
      <h2 className="font-bold">My posted videos</h2>
      {!result && <p role="status">Loading videos…</p>}
      {(error || (result && !result.ok)) && <p role="alert">{error || result?.error || 'Could not load videos.'}</p>}
      {result?.data?.videos.length === 0 && <p>You have no posted videos.</p>}
      <ul className="space-y-2">
        {result?.data?.videos.map(video => <li key={video.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div><strong>{video.title}</strong><p>{video.likes_count} likes · {video.comments_count} comments</p></div>
          <button type="button" disabled={pending} onClick={() => void remove(video.id)} className="rounded bg-rose-800 px-3 py-2 text-white">Delete video</button>
        </li>)}
      </ul>
    </section>
  );
}
