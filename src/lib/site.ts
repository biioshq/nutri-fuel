/**
 * Single source of truth for brand copy and navigation.
 * Nothing in the component tree hard-codes the brand name.
 */

export const SITE = {
  name: 'Ajay Protein',
  wordmark: 'AJAY PROTEIN',
  tagline: 'Fuel a better you.',
  description:
    'Premium ready-to-drink protein shakes. 25g of complete protein, 3g of sugar and zero artificial flavours — in Chocolate, Vanilla and Strawberry.',
  url: 'https://ajayprotein.example',
  email: 'hello@ajayprotein.example',
} as const;

/** Section anchors, in scroll order. Lenis handles the smooth travel. */
export const NAV_LINKS = [
  { label: 'Flavours', href: '#flavours' },
  { label: 'Why Ajay', href: '#why' },
  { label: 'Nutrition', href: '#nutrition' },
  { label: 'Results', href: '#results' },
  { label: 'FAQ', href: '#faq' },
] as const;

/** Where every in-page "Shop now" lands: the closing order section. */
export const SHOP_HREF = '#order';

/** The storefront. The order section's buttons are the integration point. */
export const STORE_URL = 'https://ajayprotein.example/shop';

export const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' },
  { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
  { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
] as const;
