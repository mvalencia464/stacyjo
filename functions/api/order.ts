import { fulfill, isSessionId, type Env } from '../lib/order';

interface PagesContext {
  request: Request;
  env: Env;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const sessionId = new URL(context.request.url).searchParams.get('session_id');
  if (!isSessionId(sessionId)) {
    return Response.json({ ok: false, error: 'Missing payment.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const result = await fulfill(context.env, sessionId, 'page');
    if (result.status !== 200) {
      return Response.json({ ok: false, error: result.error }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json(result.body, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Order lookup failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ ok: false, error: 'We could not confirm this payment. Email hello@stacyjo.com.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
