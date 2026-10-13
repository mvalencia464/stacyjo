import { fileById, filesFor, type DownloadFile, type Product } from './catalog';

export interface Env {
  DOWNLOADS: R2Bucket;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET?: string;
  EMAIL?: {
    send(message: {
      to: string;
      from: { email: string; name?: string };
      replyTo?: { email: string; name?: string };
      subject: string;
      text: string;
      html: string;
    }): Promise<{ messageId: string }>;
  };
}

interface StripeSession {
  id: string;
  status: string | null;
  payment_status: string;
  amount_subtotal: number | null;
  customer_details: { email?: string | null } | null;
  payment_intent: string | { id: string; metadata?: Record<string, string> } | null;
  line_items?: { data?: Array<{ description?: string | null }> };
}

const SESSION_ID = /^cs_(live|test)_[A-Za-z0-9]+$/;
const SITE = 'https://stacyjo.com';

export function isSessionId(value: string | null): value is string {
  return !!value && SESSION_ID.test(value);
}

export function productOf(session: StripeSession): Product | null {
  const text = (session.line_items?.data ?? [])
    .map((item) => item.description ?? '')
    .join(' ');
  if (/audiobook/i.test(text)) return 'bundle';
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

function paymentIntent(session: StripeSession): { id: string; metadata?: Record<string, string> } | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  if (typeof intent === 'string') return { id: intent };
  return intent;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return '&quot;';
  });
}

async function sendDownloadEmail(env: Env, session: StripeSession, product: Product): Promise<boolean> {
  const email = session.customer_details?.email;
  const intent = paymentIntent(session);
  if (!email || !env.EMAIL) return false;
  if (intent?.metadata?.download_email_sent === '1') return true;

  const page = `${SITE}/thank-you?session_id=${encodeURIComponent(session.id)}`;
  const links = filesFor(product).map((file) => ({
    name: file.name,
    url: downloadUrl(session.id, file),
  }));
  const text = [
    'Your copy of The Leash Goes Both Ways is ready.',
    '',
    `Download page: ${page}`,
    '',
    ...links.map((link) => `${link.name}\n${link.url}`),
    '',
    'Save that page. The links on it are yours.',
    'If anything is missing, email hello@stacyjo.com.',
  ].join('\n');
  const html = `<p>Your copy of <em>The Leash Goes Both Ways</em> is ready.</p>
<p><a href="${escapeHtml(page)}">Open your download page</a></p>
<ul>${links.map((link) => `<li><a href="${escapeHtml(link.url)}">${escapeHtml(link.name)}</a></li>`).join('')}</ul>
<p>Save that page. The links on it are yours. If anything is missing, email <a href="mailto:hello@stacyjo.com">hello@stacyjo.com</a>.</p>`;

  try {
    await env.EMAIL.send({
      to: email,
      from: { email: 'hello@stacyjo.com', name: 'Stacy Jo' },
      replyTo: { email: 'hello@stacyjo.com', name: 'Stacy Jo' },
      subject: 'Your download: The Leash Goes Both Ways',
      text,
      html,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email send failed';
    console.error('Download email failed', message);
    return false;
  }

  if (intent?.id) {
    const body = new URLSearchParams();
    body.set('metadata[download_email_sent]', '1');
    const updated = await stripe(env, `/v1/payment_intents/${intent.id}`, { method: 'POST', body });
    if (!updated.ok) console.error('Could not mark download email sent', updated.status);
  }
  return true;
}

export async function fulfill(env: Env, sessionId: string) {
  const session = await getSession(env, sessionId);
  if (!session) return { status: 404 as const, error: 'We could not find that payment.' };
  if (session.payment_status !== 'paid' || session.status !== 'complete') {
    return { status: 402 as const, error: 'This payment is not complete yet.' };
  }
  const product = productOf(session);
  if (!product) return { status: 409 as const, error: 'We could not match this payment to a book. Email hello@stacyjo.com.' };

  const emailSent = await sendDownloadEmail(env, session, product);
  return {
    status: 200 as const,
    body: {
      ok: true,
      product,
      email: session.customer_details?.email ?? null,
      emailSent,
      files: filesFor(product).map((file) => ({
        id: file.id,
        name: file.name,
        url: downloadUrl(session.id, file),
      })),
    },
  };
}

export async function authorizedFile(env: Env, sessionId: string, fileId: string) {
  const file = fileById(fileId);
  if (!file) return null;
  const session = await getSession(env, sessionId);
  if (!session || session.payment_status !== 'paid' || session.status !== 'complete') return null;
  const product = productOf(session);
  if (!product || !file.products.includes(product)) return null;
  return file;
}
