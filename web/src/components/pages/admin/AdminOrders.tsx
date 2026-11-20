import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function AdminOrders() {
  const [id, setId] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.getAdminOrders>>>();
  useEffect(() => {
    let current = true;
    setResult(undefined);
    void api.getAdminOrders(search).then(response => { if (current) setResult(response); });
    return () => { current = false; };
  }, [search]);
  return (
    <section className="space-y-4 p-4" aria-label="Marketplace orders">
      <h2 className="text-xl font-bold">Marketplace orders</h2>
      <form onSubmit={event => { event.preventDefault(); setSearch(id.trim()); }} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">Order ID<input value={id} onChange={event => setId(event.target.value)} maxLength={100} className="rounded border px-3 py-2"/></label>
        <button type="submit" className="cnc-admin-button">Search</button>
      </form>
      {!result && <p role="status">Loading orders…</p>}
      {result && !result.ok && <p role="alert">{result.error || 'Could not load orders.'}</p>}
      {result?.data?.orders.length === 0 && <p>No orders found.</p>}
      <ul className="space-y-2">
        {result?.data?.orders.map(order => <li key={order.id} className="break-all rounded-lg border p-3">
          <strong>{order.id}</strong>
          <p>{order.status.replaceAll('_', ' ')} · {order.payment_state} · {order.seller_count} seller(s)</p>
          <p>{new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN'}).format(order.total_minor / 100)}</p>
        </li>)}
      </ul>
    </section>
  );
}
