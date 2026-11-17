export type Category = {
  id: string;
  name: string;
  slug: string;
  subtitle: string;
  accent: string;
  bgHex: string;
  icon: string;
};

export const categories: Category[] = [
  { id: 'fashion', name: 'Fashion', slug: 'fashion', subtitle: 'Clothing & accessories', accent: 'bg-rose-500', bgHex: '#EF4444', icon: '👗' },
  { id: 'beauty', name: 'Beauty', slug: 'beauty', subtitle: 'Skincare & makeup', accent: 'bg-pink-500', bgHex: '#EC4899', icon: '💄' },
  { id: 'phones', name: 'Phones', slug: 'phones', subtitle: 'Mobiles & accessories', accent: 'bg-amber-500', bgHex: '#F59E0B', icon: '📱' },
  { id: 'tech', name: 'Electronics', slug: 'electronics', subtitle: 'Gadgets & devices', accent: 'bg-blue-500', bgHex: '#3B82F6', icon: '💻' },
  { id: 'home', name: 'Home & Living', slug: 'home', subtitle: 'Furniture, decor & more', accent: 'bg-amber-800', bgHex: '#854D0E', icon: '🛋️' },
  { id: 'baby', name: 'Baby & Kids', slug: 'baby', subtitle: 'Essentials & toys', accent: 'bg-purple-500', bgHex: '#8B5CF6', icon: '🧸' },
  { id: 'health', name: 'Health', slug: 'health', subtitle: 'Wellness & fitness', accent: 'bg-emerald-600', bgHex: '#10B981', icon: '🌿' },
  { id: 'services', name: 'Services', slug: 'services', subtitle: 'Digital & everyday services', accent: 'bg-indigo-600', bgHex: '#4F46E5', icon: '⚡' },
];

export const marketplaceTabs = ['For You', 'Shop', 'Fashion', 'Beauty', 'Phones', 'Electronics', 'Home & Living', 'Live shopping', 'Sell with us'];

export const currency = (value: number) => `₦${value.toLocaleString('en-NG')}`;
