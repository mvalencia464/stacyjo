import { authorizedFile, isSessionId, type Env } from '../lib/order';

interface PagesContext {
  request: Request;
  env: Env;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const sessionId = url.searchParams.get('session_id');
  const fileId = url.searchParams.get('file');
  if (!isSessionId(sessionId) || !fileId) return new Response('Missing payment.', { status: 400 });

  try {
    const file = await authorizedFile(context.env, sessionId, fileId);
    if (!file) return new Response('That download is not available for this payment.', { status: 403 });
    const object = await context.env.DOWNLOADS.get(file.key);
    if (!object) return new Response('File not found.', { status: 404 });
    const filename = encodeURIComponent(file.name);
    return new Response(object.body, {
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="${file.name.replace(/"/g, '')}"; filename*=UTF-8''${filename}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Download failed', error instanceof Error ? error.message : 'unknown');
    return new Response('Download failed.', { status: 502 });
  }
}
