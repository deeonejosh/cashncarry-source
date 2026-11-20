import React, { useCallback, useEffect, useState } from 'react';
import { api, type ModerationContent } from '../../../lib/api';

export default function AdminLiveContent() {
  const [content, setContent] = useState<{ rooms: ModerationContent[]; videos: ModerationContent[] }>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const refresh = useCallback(async () => {
    const result = await api.getAdminLiveContent();
    if (result.ok && result.data) setContent(result.data);
    else setError(result.error || 'Could not load live content.');
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const moderate = async (action: 'end-room' | 'delete-video', item: ModerationContent) => {
    if (pending || !window.confirm(action === 'end-room' ? 'End this live room?' : 'Delete this posted video?')) return;
    setPending(true);
    setError('');
    const result = await api.moderateLiveContent(action, item.id);
    if (!result.ok) setError(result.error || 'Moderation action failed.');
    await refresh();
    setPending(false);
  };

  return (
    <section className="space-y-5 p-4" aria-label="Live and video moderation">
      <h2 className="text-xl font-bold">Live and video moderation</h2>
      <button type="button" onClick={() => void refresh()} className="rounded-lg border px-3 py-2">Refresh</button>
      {error && <p role="alert">{error}</p>}
      {!content && !error && <p role="status">Loading content…</p>}
      {content && ([
        ['Active livestreams', content.rooms, 'end-room', 'End stream'],
        ['Posted videos', content.videos, 'delete-video', 'Delete video'],
      ] as const).map(([title, rows, action, label]) => (
        <section key={title} className="space-y-2">
          <h3 className="font-bold">{title}</h3>
          {!rows.length && <p>No entries.</p>}
          <ul className="space-y-2">
            {rows.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <span>{item.title} · {item.seller_name}</span>
              <button type="button" disabled={pending} className="rounded-lg bg-rose-800 px-3 py-2 text-white" onClick={() => void moderate(action, item)}>{label}</button>
            </li>)}
          </ul>
        </section>
      ))}
    </section>
  );
}
