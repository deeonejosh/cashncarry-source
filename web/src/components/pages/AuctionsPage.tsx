import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { AuctionItem } from '../../types';
import LiveAuctionCard from '../ui/LiveAuctionCard';
import { Gavel, Plus, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';

interface AuctionsPageProps {
  onCheckoutAuctionOrder: () => void;
  onOpenStorefront?: (sellerId: string) => void;
}

export default function AuctionsPage({ onCheckoutAuctionOrder, onOpenStorefront }: AuctionsPageProps) {
  const {
    auctions,
    auctionsState,
    reloadMarketplace,
    placeBid,
    currentUser,
    isApprovedSeller,
    sellerProducts,
    createSellerAuction,
    platformConfig,
    showToast,
  } = useStore();

  const paymentsEnabled = platformConfig.paymentsEnabled;
  const publishedSellerProducts = sellerProducts.filter((p) => p.publication === 'published');

  const [biddingAuction, setBiddingAuction] = useState<AuctionItem | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [startingBidNaira, setStartingBidNaira] = useState<number>(5000);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!selectedProductId && publishedSellerProducts.length > 0) {
      setSelectedProductId(publishedSellerProducts[0].id);
    }
  }, [publishedSellerProducts, selectedProductId]);

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biddingAuction) return;
    const ok = await placeBid(biddingAuction.id, bidAmount);
    if (ok) {
      setBiddingAuction(null);
    }
  };

  const handleWinCheckout = () => {
    if (!paymentsEnabled) {
      showToast('Online payments are currently disabled on this server.', 'info');
      return;
    }
    onCheckoutAuctionOrder();
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showToast('Publish a product in Seller Centre before launching an auction.', 'error');
      return;
    }
    setCreating(true);
    const res = await createSellerAuction({
      productId: selectedProductId,
      startingBidNaira,
      durationHours,
    });
    setCreating(false);
    if (res.ok) {
      setShowCreateModal(false);
    } else {
      showToast(res.error || 'Could not create auction.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {!paymentsEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertCircle size={18} className="shrink-0 text-amber-700 mt-0.5" />
          <div>
            <div className="font-black">Online payments temporarily unavailable</div>
            <p className="text-amber-800 mt-0.5">
              Auction winner settlement requires online payments. Bids remain validated server-side and no auction will be marked paid without processor confirmation.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-amber-950 via-[#451a03] to-[#78350f] p-8 text-white shadow-lg">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-300 border border-amber-400/30">
            <Gavel size={14} />
            <span>VERIFIED MARKETPLACE AUCTIONS</span>
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">Auctions</h1>
          <p className="max-w-xl text-xs text-amber-100 sm:text-sm">
            Bid on products from approved sellers.
          </p>
        </div>

        {isApprovedSeller && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs font-black text-white hover:bg-amber-600 transition shadow-md shrink-0"
          >
            <Plus size={16} />
            <span>Create Auction</span>
          </button>
        )}
      </div>

      {auctionsState.status === 'error' ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
          <AlertCircle size={28} className="mx-auto text-rose-600" />
          <p className="text-xs font-bold text-rose-900">{auctionsState.error || 'Could not load auctions.'}</p>
          <button
            type="button"
            onClick={() => void reloadMarketplace()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : auctionsState.status === 'loading' ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading marketplace auctions...</div>
      ) : auctions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center space-y-2">
          <Gavel size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-black text-slate-800">No active auctions yet.</p>
          <p className="text-xs text-slate-500">
            {isApprovedSeller
              ? 'Launch an auction using one of your published products above.'
              : 'Approved sellers can list verified items for live bidding here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {auctions.map((auction) => (
            <LiveAuctionCard
              key={auction.id}
              auction={auction}
              currentUserId={currentUser.id}
              paymentsEnabled={paymentsEnabled}
              onPlaceBid={(auctionId, amount) => {
                const target = auctions.find((a) => a.id === auctionId);
                if (target) {
                  setBiddingAuction(target);
                  setBidAmount(amount);
                }
              }}
              onClaimWin={() => handleWinCheckout()}
              onInspectSeller={(sellerId) => onOpenStorefront?.(sellerId)}
            />
          ))}
        </div>
      )}

      {/* Place Bid Modal */}
      {biddingAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="text-amber-600" size={18} />
                <h3 className="text-sm font-black text-slate-900">Enter Your Bid</h3>
              </div>
              <button onClick={() => setBiddingAuction(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">{biddingAuction.title}</p>

            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Bid Amount in Naira (₦)</label>
                <input
                  type="number"
                  min={biddingAuction.currentBid ? biddingAuction.currentBid + 500 : biddingAuction.startingBid}
                  step={500}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  required
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 font-mono text-base font-black text-slate-900 outline-none focus:border-amber-600"
                />
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <ShieldCheck size={14} className="text-amber-700" />
                  <span>Verified Bidding Rules</span>
                </div>
                <p>Bids are validated server-side and recorded against your authenticated buyer account.</p>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-amber-600 py-3.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-lg"
              >
                Confirm Bid of ₦{bidAmount.toLocaleString('en-NG')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Approved Seller Create Auction Modal */}
      {showCreateModal && isApprovedSeller && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Create Seller Auction</h3>
              <button onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            {publishedSellerProducts.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-center text-xs text-slate-600">
                You need at least one approved and published product in Seller Centre before starting an auction.
              </div>
            ) : (
              <form onSubmit={handleCreateAuction} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700">Select Your Published Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-amber-600 bg-white"
                  >
                    {publishedSellerProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Starting Bid (₦)</label>
                    <input
                      type="number"
                      min={100}
                      value={startingBidNaira}
                      onChange={(e) => setStartingBidNaira(Number(e.target.value))}
                      required
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Duration (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      required
                      className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-2xl bg-amber-600 py-3.5 text-xs font-black text-white hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {creating ? 'Launching...' : 'Launch Auction'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
