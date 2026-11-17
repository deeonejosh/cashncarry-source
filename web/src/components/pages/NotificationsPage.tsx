import React from 'react';
import { useStore } from '../../context/StoreContext';
import { Bell, CheckCheck, Package, Radio, Coins, Store } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, markNotificationsRead } = useStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="text-emerald-700" size={18} />;
      case 'live':
        return <Radio className="text-rose-600" size={18} />;
      case 'gift':
        return <Coins className="text-amber-600" size={18} />;
      case 'seller':
        return <Store className="text-[#0c5c36]" size={18} />;
      default:
        return <Bell className="text-blue-600" size={18} />;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-xs text-slate-500">
            Account updates on your orders, seller applications, and marketplace activity.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={() => void markNotificationsRead()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center space-y-2">
          <Bell size={28} className="mx-auto text-slate-300" />
          <p className="text-sm font-black text-slate-800">No notifications yet</p>
          <p className="text-xs text-slate-500">Order updates and account notices will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) void markNotificationsRead();
              }}
              className={`flex items-start gap-4 rounded-2xl border p-4 transition cursor-pointer ${
                n.read ? 'border-slate-200 bg-white opacity-80' : 'border-emerald-200 bg-emerald-50/40 shadow-sm'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                  {n.timestamp && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>

              {!n.read && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 mt-1" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
