import crypto from 'crypto';

export function hashRequestBody(body: unknown): string {
  const jsonStr = typeof body === 'string' ? body : JSON.stringify(body || {});
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}
