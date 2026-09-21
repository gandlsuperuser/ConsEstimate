export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions?: Record<string, any>;
  exp: number; // Unix timestamp in seconds
}

export const SESSION_COOKIE_NAME = 'consestimate_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET = process.env.AUTH_SECRET || 'consestimate-jwt-session-secret-salt-2026-secure-key';

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates an HMAC-signed session token: base64(payload).signature
 * Edge Runtime and Node.js compatible.
 */
export async function createSessionToken(user: { id: string; email: string; name: string; role: string; permissions?: any }): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const sessionData: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    exp,
  };

  const encoder = new TextEncoder();
  const payloadStr = JSON.stringify(sessionData);
  const payloadB64 = base64UrlEncode(encoder.encode(payloadStr));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuffer));

  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifies and decodes an HMAC-signed session token.
 * Edge Runtime and Node.js compatible.
 */
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlDecode(sigB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as BufferSource,
      encoder.encode(payloadB64)
    );

    if (!isValid) return null;

    const payloadBytes = base64UrlDecode(payloadB64);
    const decoder = new TextDecoder();
    const payloadJson = decoder.decode(payloadBytes);
    const session = JSON.parse(payloadJson) as UserSession;

    const now = Math.floor(Date.now() / 1000);
    if (session.exp && session.exp < now) {
      return null; // Expired
    }

    return session;
  } catch (err) {
    return null;
  }
}
