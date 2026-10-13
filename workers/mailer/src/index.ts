interface Env {
  EMAIL: {
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

interface MailRequest {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
}

const FROM = 'hello@stacyjo.com';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const body = (await request.json()) as MailRequest;
    if (!body.to || !body.subject || !body.text || !body.html) {
      return Response.json({ error: 'Missing email fields' }, { status: 400 });
    }
    const result = await env.EMAIL.send({
      to: body.to,
      from: { email: FROM, name: 'Stacy Jo' },
      replyTo: { email: FROM, name: 'Stacy Jo' },
      subject: body.subject,
      text: body.text,
      html: body.html,
    });
    return Response.json({ messageId: result.messageId });
  },
};
