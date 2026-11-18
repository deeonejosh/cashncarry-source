import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { ProductItem } from '../../types';
import SupportTicketsPanel from './SupportTicketsPanel';
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  Paperclip,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface MessagesPageProps {
  onSelectProduct?: (product: ProductItem) => void;
  onNavigateOrder?: (orderId: string) => void;
}

interface ConversationSummary {
  partnerId: string;
  name: string;
  subtitle: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  orderId?: string;
}

export default function MessagesPage({ onNavigateOrder }: MessagesPageProps) {
  const { messages, storefronts, sendMessage, markMessageRead, currentUser, products } = useStore();

  const conversations = useMemo<ConversationSummary[]>(() => {
    const byPartner = new Map<string, ConversationSummary>();

    for (const msg of messages) {
      const isMine = msg.senderId === currentUser.id;
      const partnerId = isMine ? msg.receiverId : msg.senderId;
      if (!partnerId || partnerId === currentUser.id) continue;
      const store = storefronts.find((s) => s.ownerId === partnerId || s.id === partnerId);
      const existing = byPartner.get(partnerId);
      const isUnread = !isMine && !msg.read;
      if (!existing) {
        byPartner.set(partnerId, {
          partnerId,
          name: store?.name || (!isMine ? msg.senderName : partnerId),
          subtitle: store?.location || 'Marketplace Conversation',
          lastMessage: msg.content,
          timestamp: msg.timestamp,
          unreadCount: isUnread ? 1 : 0,
          orderId: msg.orderId,
        });
      } else {
        existing.unreadCount += isUnread ? 1 : 0;
        if (new Date(msg.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
          existing.lastMessage = msg.content;
          existing.timestamp = msg.timestamp;
          if (msg.orderId) existing.orderId = msg.orderId;
        }
      }
    }

    for (const store of storefronts) {
      const targetId = store.ownerId || store.id;
      if (!targetId || targetId === currentUser.id || byPartner.has(targetId)) continue;
      byPartner.set(targetId, {
        partnerId: targetId,
        name: store.name,
        subtitle: `${store.category} · ${store.location}`,
        lastMessage: 'Start a conversation with this seller',
        timestamp: '',
        unreadCount: 0,
      });
    }

    return Array.from(byPartner.values());
  }, [messages, storefronts, currentUser.id]);

  const [activePartnerId, setActivePartnerId] = useState<string>('');
  const [mobileThreadOpen, setMobileThreadOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [supportPanelOpen, setSupportPanelOpen] = useState(false);

  useEffect(() => {
    if (!activePartnerId && conversations.length > 0) {
      setActivePartnerId(conversations[0].partnerId);
    }
  }, [conversations, activePartnerId]);

  const currentConv = conversations.find((c) => c.partnerId === activePartnerId) || conversations[0] || null;

  const threadMessages = currentConv
    ? messages.filter(
        (m) =>
          (m.senderId === currentConv.partnerId && m.receiverId === currentUser.id) ||
          (m.senderId === currentUser.id && m.receiverId === currentConv.partnerId)
      )
    : [];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConv || !inputText.trim()) return;
    const ok = await sendMessage(currentConv.partnerId, inputText.trim(), currentConv.orderId);
    if (ok) setInputText('');
  };

  const handleSendProduct = async (product: ProductItem) => {
    if (!currentConv) return;
    const ok = await sendMessage(
      currentConv.partnerId,
      `Inquiry about ${product.title} (₦${product.price.toLocaleString('en-NG')})`,
      currentConv.orderId,
      product
    );
    if (ok) setShowProductPicker(false);
  };

  const quickReplies = [
    'Is this item currently in stock?',
    'When will my order dispatch?',
    'Can you confirm delivery timeline?',
  ];

  return (
    <div className="space-y-4 pb-20">
      <div role="tablist" aria-label="Messages and support" className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <button type="button" role="tab" aria-selected={!supportPanelOpen}
          onClick={() => setSupportPanelOpen(false)}
          className={'rounded-lg px-4 py-2 text-xs font-bold ' +
            (!supportPanelOpen ? 'bg-[#0c5c36] text-white' : 'text-slate-600 hover:bg-slate-100')}>
          Seller Messages
        </button>
        <button type="button" role="tab" aria-selected={supportPanelOpen}
          onClick={() => setSupportPanelOpen(true)}
          className={'rounded-lg px-4 py-2 text-xs font-bold ' +
            (supportPanelOpen ? 'bg-[#0c5c36] text-white' : 'text-slate-600 hover:bg-slate-100')}>
          Customer Support
        </button>
      </div>
      {!supportPanelOpen ? (<>
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Messages</h1>
        <p className="text-xs text-slate-500">
          Messages with sellers.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center space-y-2">
          <MessageSquare size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-black text-slate-800">No conversations yet</p>
          <p className="text-xs text-slate-500">
            Your inquiries with approved sellers will appear here once sellers publish storefronts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[640px]">
          {/* Left Pane */}
          <div
            className={`${
              mobileThreadOpen ? 'hidden md:flex' : 'flex'
            } flex-col border-r border-slate-100 bg-slate-50/40 h-full`}
          >
            <div className="p-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-[#0c5c36]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations
                .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((conv) => {
                  const isActive = currentConv?.partnerId === conv.partnerId;
                  return (
                    <button
                      key={conv.partnerId}
                      onClick={() => {
                        setActivePartnerId(conv.partnerId);
                        setMobileThreadOpen(true);
                        markMessageRead(conv.partnerId);
                      }}
                      className={`flex w-full items-start gap-3 p-3.5 text-left transition ${
                        isActive ? 'bg-emerald-50/70 border-l-4 border-[#0c5c36]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0c5c36] text-xs font-black text-white">
                        {conv.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 truncate">{conv.name}</span>
                          {conv.timestamp && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(conv.timestamp).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{conv.lastMessage}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Pane */}
          <div
            className={`${
              !mobileThreadOpen ? 'hidden md:flex' : 'flex'
            } flex-col md:col-span-2 h-full bg-slate-50/20`}
          >
            {currentConv && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMobileThreadOpen(false)}
                      className="md:hidden rounded-full p-1.5 text-slate-600 hover:bg-slate-100"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c5c36] text-xs font-black text-white">
                      {currentConv.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{currentConv.name}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                          <ShieldCheck size={10} /> Verified
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">{currentConv.subtitle}</div>
                    </div>
                  </div>
                </div>

                {currentConv.orderId && (
                  <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-4 py-2 text-xs">
                    <span className="font-bold text-emerald-900">Linked Order: {currentConv.orderId}</span>
                    {onNavigateOrder && (
                      <button
                        onClick={() => onNavigateOrder(currentConv.orderId!)}
                        className="text-[11px] font-black text-[#0c5c36] hover:underline"
                      >
                        View Shipment →
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {threadMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Send a message below to start this conversation.
                    </div>
                  ) : (
                    threadMessages.map((msg) => {
                      const isMine = msg.senderId === currentUser.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                              isMine
                                ? 'bg-[#0c5c36] text-white rounded-tr-none'
                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                            }`}
                          >
                            <p>{msg.content}</p>
                            {msg.timestamp && (
                              <div className={`mt-1 text-[9px] text-right ${isMine ? 'text-emerald-200' : 'text-slate-400'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 text-[11px]">
                  {quickReplies.map((qr) => (
                    <button
                      key={qr}
                      type="button"
                      onClick={() => setInputText(qr)}
                      className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 hover:bg-emerald-50 hover:text-[#0c5c36] transition"
                    >
                      {qr}
                    </button>
                  ))}
                </div>

                {showProductPicker && products.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3 space-y-2 max-h-44 overflow-y-auto">
                    <div className="text-[11px] font-black text-slate-600 uppercase">Attach Product</div>
                    <div className="grid grid-cols-2 gap-2">
                      {products.slice(0, 4).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => void handleSendProduct(p)}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left hover:border-emerald-600"
                        >
                          <div className="min-w-0 flex-1 text-[11px]">
                            <div className="font-bold truncate">{p.title}</div>
                            <div className="font-black text-orange-600">₦{p.price.toLocaleString('en-NG')}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
                  {products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowProductPicker(!showProductPicker)}
                      className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0c5c36]"
                      title="Attach Product"
                    >
                      <Paperclip size={18} />
                    </button>
                  )}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${currentConv.name}...`}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-[#0c5c36] focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0c5c36] text-white transition hover:bg-emerald-900 disabled:opacity-40"
                    aria-label="Send Message"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      </>) : <SupportTicketsPanel />}
    </div>
  );
}
