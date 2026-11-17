import React, { useEffect, useMemo } from 'react';
import { ProductItem } from '../../types';

export interface SEOHeadProps {
  currentTab: string;
  selectedProduct?: ProductItem | null;
  selectedCategory?: string;
  products?: ProductItem[];
  baseUrl?: string;
}

export interface SEOMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'product';
  image: string;
  jsonLd: Record<string, unknown>;
}

export const CATEGORY_SEO_MAP: Record<string, { label: string; desc: string }> = {
  tech: {
    label: 'Electronics & Tech',
    desc: 'Shop electronics, audio gear, and accessories from verified sellers on Cash N Carry Nigeria.',
  },
  fashion: {
    label: 'Fashion & Apparel',
    desc: 'Discover Nigerian fashion and ready-to-wear apparel from verified sellers.',
  },
  beauty: {
    label: 'Beauty & Skincare',
    desc: 'Shop skincare, cosmetics, and beauty essentials from verified sellers on Cash N Carry Nigeria.',
  },
  phones: {
    label: 'Phones & Accessories',
    desc: 'Browse mobile phones and accessories from verified Nigerian merchants.',
  },
  home: {
    label: 'Home & Living',
    desc: 'Shop home essentials, furniture, and appliances across Nigeria.',
  },
};

export function getSEOMetadata({
  currentTab,
  selectedProduct,
  selectedCategory = 'all',
  baseUrl,
}: SEOHeadProps): SEOMetadata {
  const origin = (
    baseUrl ||
    (typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://www.cashncarryng.com')
  ).replace(/\/+$/, '');

  const defaultImage = `${origin}/brand/icon.png`;

  if (currentTab === 'product-detail' && selectedProduct) {
    const formattedPrice = `₦${selectedProduct.price.toLocaleString('en-NG')}`;
    const title = `${selectedProduct.title} - ${formattedPrice} | Cash N Carry Nigeria`;
    const description = `${selectedProduct.title} by ${selectedProduct.sellerName}.`;
    const canonicalUrl = `${origin}/?tab=product-detail&id=${encodeURIComponent(selectedProduct.id)}`;

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'product',
      image: selectedProduct.image || defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: selectedProduct.title,
        image: selectedProduct.image ? [selectedProduct.image] : [defaultImage],
        description: selectedProduct.description,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'NGN',
          price: selectedProduct.price,
          availability:
            selectedProduct.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
        },
      },
    };
  }

  if (currentTab === 'shop' && selectedCategory && selectedCategory !== 'all' && CATEGORY_SEO_MAP[selectedCategory]) {
    const cat = CATEGORY_SEO_MAP[selectedCategory];
    return {
      title: `${cat.label} | Cash N Carry Nigeria`,
      description: cat.desc,
      canonicalUrl: `${origin}/?tab=shop&category=${encodeURIComponent(selectedCategory)}`,
      ogType: 'website',
      image: defaultImage,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: cat.label,
        description: cat.desc,
      },
    };
  }

  return {
    title: 'Cash N Carry Nigeria | Live Video Shopping & Marketplace',
    description:
      'Discover verified Nigerian sellers, live shopping streams, short product videos, and nationwide delivery.',
    canonicalUrl: `${origin}/`,
    ogType: 'website',
    image: defaultImage,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Cash N Carry Nigeria',
      url: `${origin}/`,
    },
  };
}

export default function SEOHead(props: SEOHeadProps) {
  const seo = useMemo(
    () => getSEOMetadata(props),
    [props.currentTab, props.selectedProduct?.id, props.selectedProduct?.price, props.selectedCategory, props.baseUrl]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (typeof window !== 'undefined' && /staging/i.test(window.location.hostname)) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'robots';
        document.head.appendChild(meta);
      }
      meta.content = 'noindex, nofollow, noarchive';
    }
    document.title = seo.title;
  }, [seo.title]);

  return null;
}
