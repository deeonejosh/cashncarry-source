import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import ProductCard from '../ui/ProductCard';
import { ProductItem } from '../../types';
import { Search, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { categories } from '../../lib/data';

interface ShopPageProps {
  onSelectProduct: (product: ProductItem) => void;
  onQuickBuy?: (product: ProductItem) => void;
  selectedCategory?: string;
  searchTerm?: string;
  onSelectCategory?: (category: string) => void;
  onSearchCommit?: (query: string) => void;
}

export default function ShopPage({
  onSelectProduct,
  onQuickBuy,
  selectedCategory: controlledCategory,
  searchTerm = '',
  onSelectCategory,
  onSearchCommit,
}: ShopPageProps) {
  const { products, catalogState, reloadMarketplace } = useStore();

  const [internalCategory, setInternalCategory] = useState<string>('all');
  const selectedCategory = controlledCategory !== undefined ? controlledCategory : internalCategory;

  const handleCategoryChange = (category: string) => {
    setInternalCategory(category);
    onSelectCategory?.(category);
  };

  const [searchQuery, setSearchQuery] = useState<string>(searchTerm);
  useEffect(() => setSearchQuery(searchTerm), [searchTerm]);
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating' | 'newest'>('featured');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const publishedProducts = useMemo(
    () => products.filter((p) => p.publication === 'published' && !p.archived),
    [products]
  );

  const priceCeiling = useMemo(
    () =>
      Math.max(
        100000,
        Math.ceil(Math.max(0, ...publishedProducts.map((p) => p.price)) / 10000) * 10000
      ),
    [publishedProducts]
  );

  const [maxPrice, setMaxPrice] = useState<number>(Number.MAX_SAFE_INTEGER);
  const visibleMaxPrice = maxPrice === Number.MAX_SAFE_INTEGER ? priceCeiling : Math.min(maxPrice, priceCeiling);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of publishedProducts) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [publishedProducts]);

  const filteredProducts = useMemo(() => {
    return publishedProducts
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          if (!matchTitle && !matchBrand && !matchDesc) return false;
        }
        if (inStockOnly && p.stock <= 0) return false;
        if (p.price > visibleMaxPrice) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
  }, [publishedProducts, selectedCategory, searchQuery, sortBy, inStockOnly, visibleMaxPrice]);

  return (
    <div className="space-y-5 pb-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 text-slate-900">
        <h1 className="text-xl font-bold sm:text-2xl">Shop</h1>

        <div className="mt-4 max-w-2xl">
          <form onSubmit={(e) => { e.preventDefault(); onSearchCommit?.(searchQuery.trim()); }} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, or categories..."
              aria-label="Search marketplace products"
              className="h-12 w-full rounded-2xl bg-white pl-11 pr-4 text-xs font-semibold text-slate-800 outline-none shadow-md focus:ring-4 focus:ring-emerald-400/30"
            />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {publishedProducts.length > 0 && <button type="button" aria-controls="cnc-shop-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 lg:hidden">
          <SlidersHorizontal size={17} /> Filters
        </button>}
        <aside id="cnc-shop-filters" className={`${publishedProducts.length === 0 ? 'hidden' : filtersOpen ? 'block' : 'hidden lg:block'} h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-4`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
              <SlidersHorizontal size={15} className="text-[#0c5c36]" />
              <span>Filters</span>
            </div>
            {(selectedCategory !== 'all' || searchQuery || inStockOnly || maxPrice !== Number.MAX_SAFE_INTEGER) && (
              <button
                type="button"
                onClick={() => {
                  handleCategoryChange('all');
                  setSearchQuery('');
                  onSearchCommit?.('');
                  setInStockOnly(false);
                  setMaxPrice(Number.MAX_SAFE_INTEGER);
                  setSortBy('featured');
                }}
                className="text-[11px] font-bold text-orange-600 hover:underline"
              >
                Reset All
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-slate-800">Category</label>
            <div className="mt-2.5 space-y-1">
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                  selectedCategory === 'all' ? 'bg-[#0c5c36] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>All Categories</span>
                <span>{publishedProducts.length}</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                    selectedCategory === cat.id ? 'bg-[#0c5c36] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                  <span className="text-[11px] opacity-70">{categoryCounts[cat.id] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>Max Price:</span>
              <span className="font-black text-[#0c5c36]">₦{visibleMaxPrice.toLocaleString('en-NG')}</span>
            </div>
            <input
              type="range"
              min={5000}
              max={priceCeiling}
              step={2500}
              value={visibleMaxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="mt-3 w-full accent-[#0c5c36]"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-[#0c5c36]"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        <div className={`space-y-5 ${publishedProducts.length === 0 ? 'lg:col-span-4' : 'lg:col-span-3'}`}>
          {publishedProducts.length > 0 && <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold text-slate-600">
              Showing <b className="text-slate-900">{filteredProducts.length}</b> products
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <label htmlFor="cnc-shop-sort" className="text-xs font-semibold text-slate-500">
                Sort by:
              </label>
              <select
                id="cnc-shop-sort"
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>}

          {catalogState.status === 'error' ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center space-y-3">
              <AlertCircle size={32} className="mx-auto text-rose-600" />
              <h3 className="text-base font-black text-rose-900">Unable to load products</h3>
              <p className="text-xs text-rose-700">{catalogState.error}</p>
              <button
                type="button"
                onClick={() => void reloadMarketplace()}
                className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-5 py-2.5 text-xs font-bold text-white"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : catalogState.status === 'loading' ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center text-sm font-semibold text-slate-500">
              Loading marketplace products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search size={32} />
              </div>
              <h3 className="mt-4 text-base font-black text-slate-800">
                {publishedProducts.length === 0
                  ? 'No products yet'
                  : 'No matching products'}
              </h3>
              {publishedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleCategoryChange('all');
                    setSearchQuery('');
                    setMaxPrice(Number.MAX_SAFE_INTEGER);
                    setInStockOnly(false);
                  }}
                  className="mt-5 rounded-full bg-[#0c5c36] px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={onSelectProduct}
                  onQuickBuy={onQuickBuy}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
