import React from 'react';
import { MessageSquare, Play, Plus, User } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import shopLogo from '../../assets/mobile-shop-logo.webp';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCreate?: () => void;
}

const tabs = [
  { id: 'for-you', label: 'For You', accessibleLabel: 'For You Video Feed', icon: Play },
  { id: 'shop', label: 'Shop', accessibleLabel: 'Shop Marketplace' },
  { id: 'create' },
  { id: 'messages', label: 'Messages', accessibleLabel: 'Messages', icon: MessageSquare },
  { id: 'profile', label: 'Profile', accessibleLabel: 'Profile & Account', icon: User },
] as const;

export default function MobileNav({ currentTab, setCurrentTab, onOpenCreate }: MobileNavProps) {
  const { unreadMessagesCount } = useStore();

  return (
    <nav aria-label="Primary mobile navigation" className="cnc-mobile-dock fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="cnc-mobile-dock-inner mx-auto grid max-w-md grid-cols-5 items-center">
        {tabs.map((tab) => {
          if (tab.id === 'create') {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={onOpenCreate}
                className="cnc-dock-create"
                aria-label="Create Video or Go Live"
                title="Create Video or Go Live"
              >
                <Plus size={26} strokeWidth={3} aria-hidden="true" />
              </button>
            );
          }
          const active = currentTab === tab.id || (tab.id === 'shop' && currentTab === 'home');
          const Icon = 'icon' in tab ? tab.icon : null;
          return (
            <button
              key={tab.id}
              type="button"
              className={`cnc-dock-tab cnc-dock-tab--${tab.id}`}
              aria-label={tab.id === 'messages' && unreadMessagesCount > 0
                ? `Messages, ${unreadMessagesCount} unread`
                : tab.accessibleLabel}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                setCurrentTab(tab.id);
                window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
              }}
            >
              <span className="cnc-dock-icon" aria-hidden="true">
                {Icon ? <Icon size={18} strokeWidth={2.4} fill={tab.id === 'for-you' ? 'currentColor' : 'none'} /> : <img src={shopLogo} alt="" />}
                {tab.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="cnc-dock-unread">{unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</span>
                )}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
