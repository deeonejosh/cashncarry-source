import { EmailTemplate, EmailTemplateId, EmailCampaign, NewsletterSubscriber, ProductItem } from '../types';

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome & Onboarding Guide',
    category: 'onboarding',
    description: 'Sent when a shopper subscribes to updates or registers on Cash N Carry Nigeria.',
    defaultSubject: 'Welcome to Cash N Carry Nigeria',
    defaultPreheader: 'Discover verified Nigerian sellers, live shopping streams, and nationwide delivery.',
    defaultHeadline: 'Watch Live. Discover. Shop.',
    defaultBody: 'Welcome to Cash N Carry Nigeria. Explore verified Nigerian sellers, join live shopping streams, and browse real marketplace products with nationwide delivery.',
    defaultCtaText: 'Start Shopping',
    defaultCtaUrl: 'https://www.cashncarryng.com/?tab=shop',
    thumbnail: '',
  },
  {
    id: 'flash_sale',
    name: 'Weekly Live Shopping & Deals Digest',
    category: 'promotional',
    description: 'Weekly digest showcasing active live streams and verified marketplace markdowns.',
    defaultSubject: 'Live Shopping & Verified Deals on Cash N Carry Nigeria',
    defaultPreheader: 'Browse verified deals and active seller livestreams.',
    defaultHeadline: 'Explore Verified Marketplace Deals',
    defaultBody: 'Discover verified sellers broadcasting live product demonstrations and limited-stock offers across Nigeria.',
    defaultCtaText: 'Enter Live Shopping Arena',
    defaultCtaUrl: 'https://www.cashncarryng.com/?tab=live',
    thumbnail: '',
  },
  {
    id: 'order_confirmation',
    name: 'Order Confirmation & Dispatch Update',
    category: 'transactional',
    description: 'Transactional receipt sent when an order is created or fulfilled.',
    defaultSubject: 'Your Cash N Carry Nigeria Order Update',
    defaultPreheader: 'Track your order status and fulfilment details in your account.',
    defaultHeadline: 'Order Recorded & Preparing for Fulfilment',
    defaultBody: 'Thank you for your order on Cash N Carry Nigeria. You can monitor seller fulfilment and carrier updates directly from your Orders page.',
    defaultCtaText: 'View Your Orders',
    defaultCtaUrl: 'https://www.cashncarryng.com/?tab=orders',
    thumbnail: '',
  },
  {
    id: 'abandoned_cart',
    name: 'Cart Reminder',
    category: 're-engagement',
    description: 'Triggered when a signed-in shopper leaves items in their cart.',
    defaultSubject: 'Items are waiting in your Cash N Carry cart',
    defaultPreheader: 'Review availability before items sell out.',
    defaultHeadline: 'Complete Your Order',
    defaultBody: 'You left items in your Cash N Carry Nigeria cart. Sign in to review current seller stock and complete checkout.',
    defaultCtaText: 'Return to Cart',
    defaultCtaUrl: 'https://www.cashncarryng.com/?tab=checkout',
    thumbnail: '',
  },
  {
    id: 'seller_weekly',
    name: 'Seller Operations Summary',
    category: 'seller',
    description: 'Operational update sent to approved merchants covering orders and storefront status.',
    defaultSubject: 'Cash N Carry Nigeria Seller Operations Update',
    defaultPreheader: 'Review your active products, order fulfilment queue, and storefront performance.',
    defaultHeadline: 'Your Seller Operations Summary',
    defaultBody: 'Review your published products, pending buyer orders, and livestream activity inside the Seller Centre.',
    defaultCtaText: 'Open Seller Centre',
    defaultCtaUrl: 'https://www.cashncarryng.com/?tab=seller-dashboard',
    thumbnail: '',
  },
];

export const INITIAL_SUBSCRIBERS: NewsletterSubscriber[] = [];

export const INITIAL_CAMPAIGNS: EmailCampaign[] = [];

export interface EmailRenderOptions {
  recipientName?: string;
  recipientEmail?: string;
  headline?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  voucherCode?: string;
  featuredProducts?: ProductItem[];
  orderId?: string;
  orderTotal?: number;
  trackingNumber?: string;
  previewText?: string;
}

export function generateHtmlEmail(templateId: EmailTemplateId, options: EmailRenderOptions = {}): string {
  const template = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
  const name = options.recipientName || 'Shopper';
  const headline = options.headline || template.defaultHeadline;
  const body = options.body || template.defaultBody;
  const ctaText = options.ctaText || template.defaultCtaText;
  const ctaUrl = options.ctaUrl || template.defaultCtaUrl;
  const preview = options.previewText || template.defaultPreheader;
  const voucherCode = options.voucherCode;
  const products = options.featuredProducts || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.defaultSubject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; max-width: 100%; display: block; }
    a { color: #0c5c36; text-decoration: none; }
    .btn-primary { background-color: #0c5c36; color: #ffffff !important; font-weight: 800; padding: 14px 28px; border-radius: 9999px; display: inline-block; text-align: center; font-size: 14px; }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f4f6f8;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preview}
  </div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 18px 32px; text-align: left; border-bottom: 3px solid #0c5c36;">
              <a href="https://www.cashncarryng.com/" target="_blank" style="text-decoration: none;">
                <img src="https://cdn.jsdelivr.net/gh/deeonejosh/cashncarry-source@7191c33393d67cd344cbb2b48cf6743a82352a38/web/public/brand/logo.png" alt="Cash N Carry Nigeria" width="180" height="60" border="0" style="display: block; width: 180px; height: 60px; border: 0; outline: none;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="background: linear-gradient(135deg, #0c5c36 0%, #06311c 100%); padding: 36px 32px; color: #ffffff; text-align: left;">
              <h1 style="font-size: 28px; font-weight: 900; margin: 0 0 8px 0; line-height: 1.2; color: #ffffff;">
                ${headline}
              </h1>
              <p style="font-size: 14px; line-height: 1.5; color: #d1fae5; margin: 0;">
                Hello ${name}, ${body}
              </p>
            </td>
          </tr>
          ${voucherCode ? `
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <div style="background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 16px; padding: 20px; text-align: center;">
                <span style="font-size: 11px; font-weight: 900; color: #c2410c; text-transform: uppercase;">Promotional Code</span>
                <div style="font-size: 26px; font-weight: 900; color: #ea580c; margin: 6px 0; font-family: monospace;">${voucherCode}</div>
              </div>
            </td>
          </tr>` : ''}
          <tr>
            <td align="center" style="padding: 24px 32px;">
              <a href="${ctaUrl}" class="btn-primary" target="_blank">${ctaText} &rarr;</a>
            </td>
          </tr>
          ${products.length > 0 ? `
          <tr>
            <td style="padding: 12px 32px 24px 32px;">
              <h3 style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 0 0 12px 0;">Marketplace Highlights</h3>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  ${products.slice(0, 2).map((prod) => `
                  <td width="48%" valign="top" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                    ${prod.image ? `<img src="${prod.image}" alt="${prod.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px; margin-bottom: 10px;" />` : ''}
                    <h4 style="font-size: 13px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0;">${prod.title}</h4>
                    <div style="font-size: 15px; font-weight: 900; color: #0f172a;">₦${prod.price.toLocaleString('en-NG')}</div>
                  </td>
                  <td width="4%">&nbsp;</td>
                  `).join('')}
                </tr>
              </table>
            </td>
          </tr>` : ''}
          <tr>
            <td style="background-color: #0f172a; color: #94a3b8; padding: 24px 32px; text-align: center; font-size: 11px; line-height: 1.6;">
              <strong style="color: #ffffff;">Cash N Carry Nigeria Marketplace</strong><br>
              Official Support: <a href="mailto:support@cashncarryng.com" style="color: #86efac;">support@cashncarryng.com</a><br>
              © 2026 Cash N Carry Nigeria. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
