import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost } from './stripe-webhook';

const SESSION = 'cs_live_zero';
const EVENT = 'evt_1UQFg4LjNdRnkND6B2rjxvDH';

class MemoryBucket {
  objects = new Map<string, string>();

  async head(key: string) {
    return this.objects.has(key) ? { key } : null;
  }

  async get(key: string) {
    const value = this.objects.get(key);
    if (value === undefined) return null;
    return { text: async () => value };
  }

  async put(key: string, value: string, options?: { onlyIf?: { etagDoesNotMatch?: string } }) {
    if (options?.onlyIf?.etagDoesNotMatch === '*' && this.objects.has(key)) return null;
    this.objects.set(key, value);
    return { key };
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION,
    created: Math.floor(Date.now() / 1000),
    status: 'complete',
    payment_status: 'paid',
    amount_subtotal: 1900,
    amount_total: 0,
    payment_link: 'plink_ebook',
    customer_details: { email: 'buyer@example.com' },
    payment_intent: null,
    line_items: { data: [{ description: 'The Leash Goes Both Ways' }] },
    ...overrides,
  };
}

async function sign(payload: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

function harness(mailStatus = 500) {
  const bucket = new MemoryBucket();
  const calls: string[] = [];
  const env = {
    DOWNLOADS: bucket,
    STRIPE_SECRET_KEY: 'sk_test_x',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    STRIPE_LINK_EBOOK: 'plink_ebook',
    STRIPE_LINK_BUNDLE: 'plink_bundle',
    MAILER: {
      fetch: async (_url: string, init?: RequestInit) => {
        calls.push(String(init?.body));
        return new Response('nope', { status: mailStatus });
      },
    },
  };
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json(session());
  return {
    env,
    bucket,
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

async function post(env: ReturnType<typeof harness>['env'], payload: string, waitUntil?: (promise: Promise<unknown>) => void) {
  const request = new Request('https://stacyjo.com/api/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': await sign(payload, 'whsec_test') },
    body: payload,
  });
  return onRequestPost({ request, env: env as never, waitUntil });
}

test('records a $0 checkout and returns 200 while email failures retry in the background', async () => {
  const { env, bucket, calls, restore } = harness(500);
  const payload = JSON.stringify({
    id: EVENT,
    type: 'checkout.session.completed',
    data: { object: { id: SESSION } },
  });
  let background: Promise<unknown> = Promise.resolve();
  try {
    const response = await post(env, payload, (promise) => {
      background = promise;
    });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 0);
    const order = bucket.objects.get(`orders/${SESSION}/order.json`);
    assert.ok(order);
    assert.equal(JSON.parse(order).amountTotal, 0);
    assert.equal(JSON.parse(order).email, 'buyer@example.com');
    assert.ok(bucket.objects.has(`orders/events/${EVENT}.json`));

    await background;
    assert.equal(calls.length, 3);
    assert.equal(bucket.objects.has(`orders/${SESSION}/download-email.json`), false);

    const again = await post(env, payload, () => {
      throw new Error('duplicate event should not schedule work');
    });
    assert.equal(again.status, 200);
    assert.equal(calls.length, 3);
  } finally {
    restore();
  }
});

test('a paid session with no customer email is recorded and does not email', async () => {
  const { env, bucket, calls, restore } = harness(500);
  globalThis.fetch = async () => Response.json(session({ customer_details: null }));
  const payload = JSON.stringify({
    id: 'evt_no_email',
    type: 'checkout.session.completed',
    data: { object: { id: SESSION } },
  });
  try {
    const response = await post(env, payload, () => {
      throw new Error('nothing to send');
    });
    assert.equal(response.status, 200);
    assert.equal(calls.length, 0);
    const order = JSON.parse(bucket.objects.get(`orders/${SESSION}/order.json`) ?? '{}');
    assert.equal(order.email, null);
  } finally {
    restore();
  }
});

test('a successful background send is idempotent for a second session delivery', async () => {
  const { env, bucket, calls, restore } = harness(200);
  try {
    const first = JSON.stringify({ id: 'evt_one', type: 'checkout.session.completed', data: { object: { id: SESSION } } });
    let background: Promise<unknown> = Promise.resolve();
    const response = await post(env, first, (promise) => {
      background = promise;
    });
    assert.equal(response.status, 200);
    await background;
    assert.equal(calls.length, 1);
    assert.ok(bucket.objects.get(`orders/${SESSION}/download-email.json`)?.includes('sentAt'));

    const second = JSON.stringify({ id: 'evt_two', type: 'checkout.session.completed', data: { object: { id: SESSION } } });
    let extra: Promise<unknown> = Promise.resolve();
    const again = await post(env, second, (promise) => {
      extra = promise;
    });
    assert.equal(again.status, 200);
    await extra;
    assert.equal(calls.length, 1);
  } finally {
    restore();
  }
});
