/**
 * Single source of truth for brand copy and navigation.
 * Nothing in the component tree hard-codes the brand name.
 */

export const SITE = {
  name: 'NutriFuel',
  wordmark: 'NUTRIFUEL',
  tagline: 'Fuel a better you.',
  description:
    'Premium ready-to-drink protein shakes. 25g of complete protein, 3g of sugar and zero artificial flavours, in Chocolate, Vanilla and Strawberry.',
  url: 'https://nutrifuel.example',
  email: 'hello@nutrifuel.example',
} as const;

/** Section anchors, in scroll order. Lenis handles the smooth travel. */
export const NAV_LINKS = [
  { label: 'Flavours', href: '#flavours' },
  { label: 'Collection', href: '#showcase' },
  { label: 'Results', href: '#results' },
] as const;

/** Where every in-page "Shop now" lands: the closing order section. */
export const SHOP_HREF = '#order';

/** The storefront. The order section's buttons are the integration point. */
export const STORE_URL = 'https://nutrifuel.example/shop';

export const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' },
  { label: 'YouTube', href: 'https://youtube.com', icon: 'youtube' },
  { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
] as const;
