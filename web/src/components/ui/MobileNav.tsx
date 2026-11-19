import React from 'react';
import { useStore } from '../../context/StoreContext';
import { PlaySquare, ShoppingBag, Plus, MessageSquare, User } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCreate?: () => void;
}

export default function MobileNav({ currentTab, setCurrentTab, onOpenCreate }: MobileNavProps) {
  const { unreadMessagesCount } = useStore();

  return (
    <nav aria-label="Primary mobile navigation" className="cnc-depth-nav cnc-depth-nav-mobile fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-xl pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1 px-2 text-[10px] font-bold text-slate-500">
        
        {/* TAB 1: For You (Video Shopping Feed) */}
        <button
          onClick={() => {
            setCurrentTab('for-you');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center gap-1 min-h-12 py-1 transition ${
            currentTab === 'for-you' ? 'text-[#0c5c36]' : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="For You Video Feed"
        >
          <div className="relative">
            <PlaySquare
              size={22}
              className={currentTab === 'for-you' ? 'stroke-[2.4px] text-[#0c5c36]' : 'stroke-[1.8px]'}
            />
          </div>
          <span className={currentTab === 'for-you' ? 'font-black text-[#0c5c36]' : 'font-medium'}>
            For You
          </span>
          {currentTab === 'for-you' && (
            <span className="absolute bottom-0 h-1 w-5 rounded-full bg-[#0c5c36]" />
          )}
        </button>

        {/* TAB 2: Shop (Main Marketplace) */}
        <button
          onClick={() => {
            setCurrentTab('shop');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center gap-1 min-h-12 py-1 transition ${
            currentTab === 'shop' || currentTab === 'home' ? 'text-[#0c5c36]' : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Shop Marketplace"
        >
          <div className="relative">
            <ShoppingBag
              size={22}
              className={
                currentTab === 'shop' || currentTab === 'home'
                  ? 'stroke-[2.4px] text-[#0c5c36]'
                  : 'stroke-[1.8px]'
              }
            />
          </div>
          <span
            className={
              currentTab === 'shop' || currentTab === 'home'
                ? 'font-black text-[#0c5c36]'
                : 'font-medium'
            }
          >
            Shop
          </span>
          {(currentTab === 'shop' || currentTab === 'home') && (
            <span className="absolute bottom-0 h-1 w-5 rounded-full bg-[#0c5c36]" />
          )}
        </button>

        {/* TAB 3: Plus (+) Elevated Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => onOpenCreate?.()}
            className="flex h-11 w-11 -translate-y-1 items-center justify-center rounded-full bg-gradient-to-tr from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/35 border-[3.5px] border-white transition active:scale-95 hover:scale-105"
            aria-label="Create Video or Go Live"
            title="Create Video or Go Live"
          >
            <Plus size={26} strokeWidth={3} />
          </button>
        </div>

        {/* TAB 4: Messages (Inbox) */}
        <button
          onClick={() => {
            setCurrentTab('messages');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center gap-1 min-h-12 py-1 transition ${
            currentTab === 'messages' ? 'text-[#0c5c36]' : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Messages"
        >
          <div className="relative">
            <MessageSquare
              size={22}
              className={currentTab === 'messages' ? 'stroke-[2.4px] text-[#0c5c36]' : 'stroke-[1.8px]'}
            />
            {unreadMessagesCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-black text-white shadow-sm">
                {unreadMessagesCount}
              </span>
            )}
          </div>
          <span className={currentTab === 'messages' ? 'font-black text-[#0c5c36]' : 'font-medium'}>
            Messages
          </span>
          {currentTab === 'messages' && (
            <span className="absolute bottom-0 h-1 w-5 rounded-full bg-[#0c5c36]" />
          )}
        </button>

        {/* TAB 5: Profile */}
        <button
          onClick={() => {
            setCurrentTab('profile');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center gap-1 min-h-12 py-1 transition ${
            currentTab === 'profile' ? 'text-[#0c5c36]' : 'text-slate-600 hover:text-slate-900'
          }`}
          aria-label="Profile & Account"
        >
          <div className="relative">
            <User
              size={22}
              className={currentTab === 'profile' ? 'stroke-[2.4px] text-[#0c5c36]' : 'stroke-[1.8px]'}
            />
          </div>
          <span className={currentTab === 'profile' ? 'font-black text-[#0c5c36]' : 'font-medium'}>
            Profile
          </span>
          {currentTab === 'profile' && (
            <span className="absolute bottom-0 h-1 w-5 rounded-full bg-[#0c5c36]" />
          )}
        </button>

      </div>
    </nav>
  );
}
