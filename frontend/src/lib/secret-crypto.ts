import crypto from 'node:crypto';

function base64url(input: Buffer) {
  return input.toString('base64url');
}

function fromBase64url(input: string) {
  return Buffer.from(input, 'base64url');
}

function keyMaterial() {
  const configured = process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.trim();
  if (configured) {
    const decoded = Buffer.from(configured, 'base64');
    if (decoded.length === 32) return decoded;
    return crypto.createHash('sha256').update(configured).digest();
  }

  const fallback = process.env.AGENT_INTERNAL_TOKEN || process.env.GOOGLE_CLIENT_SECRET;
  if (!fallback) {
    throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY manquant');
  }

  return crypto.createHash('sha256').update(fallback).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${base64url(iv)}:${base64url(tag)}:${base64url(encrypted)}`;
}

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(':');
  if (version !== 'v1' || !iv || !tag || !encrypted) {
    throw new Error('Format de secret chiffré invalide');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial(), fromBase64url(iv));
  decipher.setAuthTag(fromBase64url(tag));
  return Buffer.concat([
    decipher.update(fromBase64url(encrypted)),
    decipher.final(),
  ]).toString('utf8');
}

export function signPayload(payload: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', keyMaterial())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySignedPayload<T extends Record<string, unknown>>(state: string): T {
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) throw new Error('State OAuth invalide');

  const expected = crypto
    .createHmac('sha256', keyMaterial())
    .update(encoded)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Signature OAuth invalide');
  }

  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
}
