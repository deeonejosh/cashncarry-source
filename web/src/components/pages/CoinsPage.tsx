import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { Coins, Gift, History, ArrowUpRight, ArrowDownLeft, Lock } from 'lucide-react';

export default function CoinsPage() {
  const {
    currentUser,
    platformConfig,
    storefronts,
    coinActivity,
    sendCoinGift,
    showToast,
  } = useStore();
  const coinsEnabled = platformConfig.paymentsEnabled && platformConfig.coinsPurchasesEnabled;
  const coinBalance = currentUser.coins ?? 0;

  const [recipient, setRecipient] = useState<string>(storefronts[0]?.ownerId || storefronts[0]?.id || '');
  const [selectedGift, setSelectedGift] = useState<'rose' | 'star' | 'lion'>('star');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!recipient && storefronts.length > 0) {
      setRecipient(storefronts[0].ownerId || storefronts[0].id);
    }
  }, [storefronts, recipient]);

  const handleSendCustomGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient) {
      showToast('No verified seller selected.', 'error');
      return;
    }
    setSending(true);
    await sendCoinGift(recipient, selectedGift);
    setSending(false);
  };

  return (
    <div className="space-y-8 pb-16">
      {!coinsEnabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <div className="font-black">Coin purchases are currently unavailable</div>
          <p className="mt-0.5 text-amber-800">
            Wallet top-ups and paid coin purchases require verified payment processing and are disabled until payment integration is activated.
          </p>
        </div>
      )}

      {/* Wallet Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase text-amber-100">
              CREATOR GIFTING WALLET
            </span>
            <div className="text-xs text-amber-100">Available Coin Balance:</div>
            <div className="flex items-center gap-3">
              <Coins size={36} className="text-amber-200" />
              <span className="text-4xl font-black">{coinBalance.toLocaleString()}</span>
              <span className="text-xs text-amber-200 font-bold">Coins</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!coinsEnabled}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-amber-900 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Lock size={15} />
              <span>{coinsEnabled ? 'Purchase Coins' : 'Coin Purchases Disabled'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Send Gift Box */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Gift size={18} className="text-amber-600" />
            <span>Send Seller Gift</span>
          </div>

          <p className="text-xs text-slate-500">
            Use coins to support sellers during live streams.
          </p>

          {storefronts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
              No sellers available yet.
            </div>
          ) : (
            <form onSubmit={handleSendCustomGift} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Select Approved Seller</label>
                <select
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none bg-white"
                >
                  {storefronts.map((s) => (
                    <option key={s.id} value={s.ownerId || s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Choose Gift</label>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedGift('rose')}
                    className={`rounded-2xl border p-2.5 transition ${
                      selectedGift === 'rose' ? 'border-rose-500 bg-rose-50' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">🌹</span>
                    <div className="text-[11px] font-bold">Rose</div>
                    <div className="text-[10px] text-rose-600 font-black">10 coins</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGift('star')}
                    className={`rounded-2xl border p-2.5 transition ${
                      selectedGift === 'star' ? 'border-amber-500 bg-amber-50' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">⭐</span>
                    <div className="text-[11px] font-bold">Star</div>
                    <div className="text-[10px] text-amber-600 font-black">100 coins</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGift('lion')}
                    className={`rounded-2xl border p-2.5 transition ${
                      selectedGift === 'lion' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'
                    }`}
                  >
                    <span className="text-2xl">🦁</span>
                    <div className="text-[11px] font-bold">Lion</div>
                    <div className="text-[10px] text-orange-600 font-black">1,000 coins</div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending || !recipient}
                className="w-full rounded-2xl bg-amber-600 py-3 text-xs font-black text-white hover:bg-amber-700 transition disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Gift Now'}
              </button>
            </form>
          )}
        </div>

        {/* Ledger Activity History */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
            <History size={18} className="text-amber-600" />
            <span>Coin Ledger & Audit Trail</span>
          </div>

          {coinActivity.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No coin activity recorded on this account yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {coinActivity.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                        item.delta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.delta > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{item.reason}</div>
                      {item.createdAt && (
                        <div className="text-[10px] text-slate-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm font-black ${item.delta > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {item.delta > 0 ? `+${item.delta}` : item.delta} coins
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
