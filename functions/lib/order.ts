import { fileById, filesFor, type DownloadFile, type Product } from './catalog';

export interface Env {
  DOWNLOADS: R2Bucket;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Payment Link IDs (plink_...). Optional, but they make product matching immune to price changes. */
  STRIPE_LINK_EBOOK?: string;
  STRIPE_LINK_BUNDLE?: string;
  MAILER?: {
    fetch(input: string, init?: RequestInit): Promise<Response>;
  };
}

interface StripeSession {
  id: string;
  created: number;
  status: string | null;
  payment_status: string;
  amount_subtotal: number | null;
  payment_link: string | null;
  customer_details: { email?: string | null } | null;
  payment_intent: string | { id: string; metadata?: Record<string, string> } | null;
  line_items?: { data?: Array<{ description?: string | null }> };
}

export type Source = 'webhook' | 'page';
export type EmailStatus = 'sent' | 'pending' | 'failed' | 'none';

const SESSION_ID = /^cs_(live|test)_[A-Za-z0-9]+$/;
const SITE = 'https://stacyjo.com';
/** The webhook normally sends the email within seconds. The page only steps in after this long. */
const PAGE_FALLBACK_AFTER_SECONDS = 120;

export function isSessionId(value: string | null): value is string {
  return !!value && SESSION_ID.test(value);
}

/**
 * Which book a payment was for. Checks, in order:
 * 1. the Payment Link ID (most reliable, set STRIPE_LINK_EBOOK / STRIPE_LINK_BUNDLE),
 * 2. the line-item name,
 * 3. the list price before discounts (last resort; breaks if prices change).
 */
export function productOf(session: StripeSession, env: Pick<Env, 'STRIPE_LINK_EBOOK' | 'STRIPE_LINK_BUNDLE'>): Product | null {
  const link = session.payment_link;
  if (link && env.STRIPE_LINK_BUNDLE && link === env.STRIPE_LINK_BUNDLE) return 'bundle';
  if (link && env.STRIPE_LINK_EBOOK && link === env.STRIPE_LINK_EBOOK) return 'ebook';

  const text = (session.line_items?.data ?? []).map((item) => item.description ?? '').join(' ');
  if (/audiobook/i.test(text)) return 'bundle';
  if (/ebook|leash goes both ways/i.test(text)) return 'ebook';

  if (session.amount_subtotal === 2900) return 'bundle';
  if (session.amount_subtotal === 1900) return 'ebook';
  return null;
}

async function stripe(env: Env, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init?.headers ?? {}),
    },
  });
}

export async function getSession(env: Env, sessionId: string): Promise<StripeSession | null> {
  const url = new URL(`/v1/checkout/sessions/${sessionId}`, 'https://api.stripe.com');
  url.searchParams.append('expand[]', 'line_items');
  url.searchParams.append('expand[]', 'payment_intent');
  const response = await stripe(env, `${url.pathname}${url.search}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Stripe session lookup failed (${response.status})`);
  return response.json() as Promise<StripeSession>;
}

export function downloadUrl(sessionId: string, file: DownloadFile): string {
  const url = new URL('/api/download', SITE);
  url.searchParams.set('session_id', sessionId);
  url.searchParams.set('file', file.id);
  return url.toString();
}

/** Files for a product, leaving out optional files that haven't been uploaded to R2 yet. */
export async function availableFiles(env: Env, product: Product): Promise<DownloadFile[]> {
  const files = filesFor(product);
  const present = await Promise.all(
    files.map(async (file) => !file.optional || (await env.DOWNLOADS.head(file.key)) !== null),
  );
  return files.filter((_, i) => present[i]);
}

function isPaid(session: StripeSession): boolean {
  return session.payment_status === 'paid' && session.status === 'complete';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return '&quot;';
  });
}

/*
 * One email per order. A tiny marker object in R2 records that the email went out.
 * This works for every order, including 100%-off orders, which have no PaymentIntent.
 * Markers live under orders/, which no download link can reach.
 */
const markerKey = (sessionId: string) => `orders/${sessionId}/download-email.json`;

async function emailAlreadySent(env: Env, session: StripeSession): Promise<boolean> {
  if ((await env.DOWNLOADS.head(markerKey(session.id))) !== null) return true;
  // Orders emailed before this change were flagged on the PaymentIntent instead.
  const intent = session.payment_intent;
  return typeof intent === 'object' && intent?.metadata?.download_email_sent === '1';
}

async function sendDownloadEmail(env: Env, session: StripeSession, product: Product, files: DownloadFile[]): Promise<boolean> {
  const email = session.customer_details?.email;
  if (!email || !env.MAILER) return false;

  // Keep the email short: the PDF, the audiobook ZIP, and the download page.
  // If the ZIP isn't uploaded yet, include every track so nothing is missing.
  const hasZip = files.some((file) => file.id === 'audiobook-zip');
  const emailed = files.filter((file) => !file.key.startsWith('audio/') || file.id === 'audiobook-zip' || !hasZip);

  const page = `${SITE}/thank-you?session_id=${encodeURIComponent(session.id)}`;
  const links = emailed.map((file) => ({ name: file.name, url: downloadUrl(session.id, file) }));
  const tracksNote = product === 'bundle' && hasZip
    ? 'Prefer single tracks? They are all on your download page.'
    : '';
  const text = [
    'Your copy of The Leash Goes Both Ways is ready.',
    '',
    `Download page: ${page}`,
    '',
    ...links.map((link) => `${link.name}\n${link.url}`),
    '',
    ...(tracksNote ? [tracksNote, ''] : []),
    'Save that page. The links on it are yours.',
    'If anything is missing, email hello@stacyjo.com.',
  ].join('\n');
  const html = `<p>Your copy of <em>The Leash Goes Both Ways</em> is ready.</p>
<p><a href="${escapeHtml(page)}">Open your download page</a></p>
<ul>${links.map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.name)}</a></li>`).join('')}</ul>
${tracksNote ? `<p>${escapeHtml(tracksNote)}</p>` : ''}
<p>Save that page. The links on it are yours. If anything is missing, email <a href="mailto:hello@stacyjo.com">hello@stacyjo.com</a>.</p>`;

  try {
    const sent = await env.MAILER.fetch('https://stacyjo-mailer/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: email, subject: 'Your download: The Leash Goes Both Ways', text, html }),
    });
    if (!sent.ok) {
      console.error('Download email failed', sent.status);
      return false;
    }
  } catch (error) {
    console.error('Download email failed', error instanceof Error ? error.message : 'unknown');
    return false;
  }

  await env.DOWNLOADS.put(markerKey(session.id), JSON.stringify({ sentAt: new Date().toISOString() }), {
    httpMetadata: { contentType: 'application/json' },
  });
  return true;
}

/**
 * Confirms a payment and returns its downloads.
 * - The Stripe webhook is the one that sends the email.
 * - The thank-you page sends it only as a fallback, if no email has gone out
 *   PAGE_FALLBACK_AFTER_SECONDS after checkout (for example, if the webhook failed).
 */
export async function fulfill(env: Env, sessionId: string, source: Source) {
  const session = await getSession(env, sessionId);
  if (!session) return { status: 404 as const, error: 'We could not find that payment.' };
  if (!isPaid(session)) return { status: 402 as const, error: 'This payment is not complete yet.' };
  const product = productOf(session, env);
  if (!product) return { status: 409 as const, error: 'We could not match this payment to a book. Email hello@stacyjo.com.' };

  const files = await availableFiles(env, product);

  let emailStatus: EmailStatus;
  if (await emailAlreadySent(env, session)) {
    emailStatus = 'sent';
  } else if (!session.customer_details?.email || !env.MAILER) {
    emailStatus = 'none';
  } else {
    const ageSeconds = Date.now() / 1000 - session.created;
    const shouldSend = source === 'webhook' || ageSeconds > PAGE_FALLBACK_AFTER_SECONDS;
    if (shouldSend) emailStatus = (await sendDownloadEmail(env, session, product, files)) ? 'sent' : 'failed';
    else emailStatus = 'pending';
  }

  return {
    status: 200 as const,
    body: {
      ok: true,
      product,
      email: session.customer_details?.email ?? null,
      emailSent: emailStatus === 'sent',
      emailStatus,
      files: files.map((file) => ({ id: file.id, name: file.name, url: downloadUrl(session.id, file) })),
    },
  };
}

export async function authorizedFile(env: Env, sessionId: string, fileId: string) {
  const file = fileById(fileId);
  if (!file) return null;
  const session = await getSession(env, sessionId);
  if (!session || !isPaid(session)) return null;
  const product = productOf(session, env);
  if (!product || !file.products.includes(product)) return null;
  return file;
}
