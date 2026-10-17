import { eventAlreadyHandled, fulfill, rememberEvent, sendDownloadEmailWithRetry, type Env } from '../lib/order';

interface PagesContext {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function signedByStripe(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',');
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((signature) => timingSafeEqual(signature, hex));
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const secret = context.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook secret is not set.', { status: 503 });
  const payload = await context.request.text();
  const header = context.request.headers.get('stripe-signature') ?? '';
  if (!(await signedByStripe(payload, header, secret))) return new Response('Invalid signature.', { status: 400 });

  let event: { id?: string; type?: string; data?: { object?: { id?: string } } };
  try {
    event = JSON.parse(payload) as { id?: string; type?: string; data?: { object?: { id?: string } } };
  } catch {
    return new Response('Invalid payload.', { status: 400 });
  }
  const sessionId = event.data?.object?.id;
  if (event.type === 'checkout.session.completed' && sessionId) {
    if (event.id && (await eventAlreadyHandled(context.env, event.id))) {
      return Response.json({ received: true });
    }
    try {
      const result = await fulfill(context.env, sessionId, 'webhook');
      if (result.status !== 200) {
        console.error('Webhook fulfill skipped', sessionId, result.status);
        return Response.json({ received: true });
      }
      if (event.id) await rememberEvent(context.env, event.id, sessionId);
      if (result.body.emailStatus === 'pending') {
        const retry = sendDownloadEmailWithRetry(context.env, sessionId);
        if (context.waitUntil) context.waitUntil(retry);
        else console.error('Download email retry not scheduled', sessionId, 'waitUntil missing');
      }
    } catch (error) {
      console.error('Webhook fulfill failed', error instanceof Error ? error.message : 'unknown');
      return new Response('Fulfillment failed.', { status: 500 });
    }
  }
  return Response.json({ received: true });
}
