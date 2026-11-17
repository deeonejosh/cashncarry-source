import React, { useEffect, useState } from 'react';
import { Gavel, Timer, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuctionItem } from '../../types';
import { formatCountdown, formatNaira } from '../../lib/design-tokens';

interface LiveAuctionCardProps {
  auction: AuctionItem;
  currentUserId: string;
  paymentsEnabled: boolean;
  onPlaceBid: (auctionId: string, amount: number) => void;
  onInspectSeller?: (sellerId: string) => void;
}

export default function LiveAuctionCard({
  auction,
  currentUserId,
  paymentsEnabled,
  onPlaceBid,
  onInspectSeller,
}: LiveAuctionCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const endMs = new Date(auction.endsAt).getTime();
  const remainingMs = Math.max(0, endMs - nowMs);
  const isClosed = Boolean(auction.closedAt) || remainingMs <= 0;
  const isUrgent = !isClosed && remainingMs <= 120_000;
  const activeBid = Math.max(auction.startingBid, auction.currentBid ?? 0);
  const isWinning = auction.winnerId === currentUserId;
  const isOwn = auction.sellerId === currentUserId;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition hover:border-emerald-300 hover:shadow-lg">
      {/* Top Hero Image & Real-time Timer Pill */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        <img
          src={auction.image}
          alt={auction.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/25" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white ${
              isClosed ? 'bg-slate-800' : isUrgent ? 'bg-rose-600 animate-pulse' : 'bg-[#0E6B38]'
            }`}
          >
            <Gavel size={11} />
            {isClosed ? 'Ended' : 'Live Auction'}
          </span>
          {isWinning && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-slate-950">
              <Trophy size={11} />
              Highest Bidder
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-md border border-white/15">
          <Timer size={12} className={isUrgent ? 'text-rose-400' : 'text-emerald-300'} />
          <span>{isClosed ? '00:00:00' : formatCountdown(remainingMs)}</span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 text-white">
          <button
            type="button"
            onClick={() => onInspectSeller?.(auction.sellerId)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-200 hover:text-white"
          >
            <CheckCircle2 size={11} />
            <span>{auction.storefrontName}</span>
          </button>
          <h3 className="line-clamp-1 text-sm font-black leading-snug">{auction.title}</h3>
        </div>
      </div>

      {/* Pricing & Bid Controls */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div className="flex items-end justify-between rounded-2xl bg-[#EAF7EF] px-3.5 py-2.5 border border-emerald-200/70">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#084B26]">
              Current Highest Bid
            </div>
            <div className="text-xl font-black text-[#0E6B38]">{formatNaira(activeBid)}</div>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <div className="font-bold">{auction.bidsCount} bids</div>
            <div>Start: {formatNaira(auction.startingBid)}</div>
          </div>
        </div>

        {!isClosed ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isOwn}
              onClick={() => onPlaceBid(auction.id, activeBid + 500)}
              className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[#0E6B38] px-3 text-xs font-black text-white transition hover:bg-[#084B26] disabled:opacity-45"
            >
              <Gavel size={13} />
              <span>Bid +₦500</span>
            </button>
            <button
              type="button"
              disabled={isOwn}
              onClick={() => onPlaceBid(auction.id, activeBid + 1000)}
              className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[#FF6B00] px-3 text-xs font-black text-white transition hover:bg-orange-600 disabled:opacity-45"
            >
              <span>Bid +₦1,000</span>
            </button>
          </div>
        ) : isWinning ? (
          <div role="status" className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 border border-amber-200">
            <AlertCircle size={14} />
            <span>Highest bid — winner checkout not yet available</span>
          </div>
        ) : (
              <>
                <AlertCircle size={14} />
                <span>Won — Online Payments Disabled</span>
              </>
            )}
          </button>
        ) : (
          <div className="rounded-xl bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-600">
            Auction Closed
          </div>
        )}
      </div>
    </article>
  );
}
