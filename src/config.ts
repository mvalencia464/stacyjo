/**
 * Everything editable lives here. Values still in {{BRACES}} are treated as
 * "not set yet" and the site hides or falls back gracefully until you fill them.
 */
export const isSet = (v?: string) => !!v && !v.includes('{{');

export const site = {
  url: 'https://stacyjo.com',
  name: 'Stacy Jo',
  tagline: 'Calm-first dog training for both ends of the leash',
  email: 'hello@stacyjo.com',
  businessEmail: 'stacyjo@agentmail.to',
};

export const media = {
  // Primary images on Cloudflare R2 (AVIF), with local JPG fallbacks in /public/images
  cover: { avif: 'https://media.stokeleads.com/stacyjo/stacyjo_cover.avif', jpg: '/images/book-cover.jpg', width: 1434, height: 1920 },
  headshot: { avif: 'https://media.stokeleads.com/stacyjo/stacyjo.avif', jpg: '/images/stacy-jo-headshot.jpg', width: 1920, height: 1920 },
  og: '/images/og-image.jpg',
};

export const book = {
  title: 'The Leash Goes Both Ways',
  subtitle: 'How You and Your Dog Shape Each Other’s Calm',
  pages: 128,
  chapters: 17,
  drills: 25,
};

export const products = {
  ebook: {
    name: 'Ebook',
    price: 19,
    checkoutUrl: 'https://buy.stripe.com/5kQ8wQ3LG0zRcLi3AH2VG00',
  },
  bundle: {
    name: 'Ebook + Audiobook',
    price: 29,
    checkoutUrl: 'https://buy.stripe.com/3cI3cwgysdmD3aI0ov2VG01',
  },
};

export const launch = {
  active: false, // flip to true for launch week
  code: 'BOTHWAYS',
  amountOff: 5,
  endsLabel: '{{LAUNCH_END_DATE}}', // e.g. "Sunday, November 9"
  prefillCode: true, // adds the code to the checkout link automatically
};

export const socials = [
  { name: 'YouTube', url: 'https://www.youtube.com/@StacyJoDogs' },
  { name: 'Instagram', url: 'https://www.instagram.com/stacyjodogs' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@stacyjodogs' },
  { name: 'Facebook', url: 'https://www.facebook.com/stacyjodogs' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/stacyjodogs' },
];
export const youtube = socials[0].url;

export const kit = {
  // Paste Kit's embed code for the "Free Chapter" form here (HTML or <script> snippet).
  embedHtml: '',
};

export const referral = {
  sparkloopUrl: '{{SPARKLOOP_REFERRAL_PAGE_URL}}',
};

export const dogs = {
  golden: '{{GOLDEN_RETRIEVER_NAME}}',
  frenchie: '{{FRENCH_BULLDOG_NAME}}',
};

export const legal = {
  updated: 'October 13, 2026',
  hosting: 'Cloudflare',
  analytics: '', // e.g. 'Cloudflare Web Analytics' — leave empty if none
  governingLaw: '{{STATE_OR_COUNTRY}}',
};

/** Stripe Payment Link. Falls back to #pricing until a real URL is set. */
export function checkoutHref(key: keyof typeof products) {
  const url = products[key].checkoutUrl;
  if (!isSet(url)) return { href: '/#pricing', live: false };
  if (!(launch.active && launch.prefillCode)) return { href: url, live: true };
  // Pre-fills the launch code at checkout. The code must exist as a Stripe promotion code,
  // and the Payment Link must have "Allow promotion codes" turned on.
  const u = new URL(url);
  u.searchParams.set('prefilled_promo_code', launch.code);
  return { href: u.toString(), live: true };
}
export const price = (key: keyof typeof products) =>
  launch.active ? products[key].price - launch.amountOff : products[key].price;
