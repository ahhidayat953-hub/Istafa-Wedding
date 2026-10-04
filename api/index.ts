import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

const AUTH_SCRYPT_SALT = 'istafa-wedding-auth-salt-v3-2026';
const DEFAULT_USER_SCRYPT_HEX =
  'e064bcfd6007cc64ae2e844b5db3ca49f632d7de60068ece219b6b79a14eb2c9';
const DEFAULT_PASS_SCRYPT_HEX =
  'afcbba2ab440e025e1a738cea03e87abf97a522562d53da0bcf568f095924527';

const SESSION_HMAC_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  'istafa-wedding-production-hmac-secret-key-2026-v3';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const revokedTokenHashes = new Set<string>();

function computeSha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function safeTimingEqualHex(hexA: string, hexB: string): boolean {
  try {
    const bufA = Buffer.from(hexA, 'hex');
    const bufB = Buffer.from(hexB, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function verifyAdminCredentialsServer(
  usernameInput: string,
  passwordInput: string
): boolean {
  const cleanUser = (usernameInput || '').trim();
  const cleanPass = passwordInput || '';
  if (!cleanUser || !cleanPass) return false;

  const envUser = (process.env.ADMIN_USERNAME || '').trim();
  const envPass = process.env.ADMIN_PASSWORD || '';

  if (envUser && envPass) {
    const userMatch = safeTimingEqualHex(
      computeSha256Hex(cleanUser.toLowerCase()),
      computeSha256Hex(envUser.toLowerCase())
    );
    const passMatch = safeTimingEqualHex(
      computeSha256Hex(cleanPass),
      computeSha256Hex(envPass)
    );
    if (userMatch && passMatch) return true;
  }

  const derivedUserHex = crypto
    .scryptSync(cleanUser, AUTH_SCRYPT_SALT, 32)
    .toString('hex');
  const derivedPassHex = crypto
    .scryptSync(cleanPass, AUTH_SCRYPT_SALT, 32)
    .toString('hex');

  return (
    safeTimingEqualHex(derivedUserHex, DEFAULT_USER_SCRYPT_HEX) &&
    safeTimingEqualHex(derivedPassHex, DEFAULT_PASS_SCRYPT_HEX)
  );
}

function createSignedAdminToken(username: string): {
  token: string;
  tokenHash: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payloadObj = {
    u: username,
    iat: Date.now(),
    exp: expiresAt,
    n: crypto.randomBytes(12).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');
  const token = `${payloadB64}.${sigB64}`;
  const tokenHash = computeSha256Hex(token);
  return { token, tokenHash, expiresAt };
}

function verifySignedAdminToken(token: string | undefined): {
  valid: boolean;
  username?: string;
  tokenHash?: string;
  expiresAt?: number;
} {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false };
  }
  const tokenHash = computeSha256Hex(token);
  if (revokedTokenHashes.has(tokenHash)) {
    return { valid: false };
  }
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sigB64] = parts;
  const expectedSigB64 = crypto
    .createHmac('sha256', SESSION_HMAC_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (
    !safeTimingEqualHex(
      computeSha256Hex(sigB64),
      computeSha256Hex(expectedSigB64)
    )
  ) {
    return { valid: false };
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    ) as { u?: string; exp?: number };
    if (!parsed || !parsed.u || !parsed.exp || Date.now() > parsed.exp) {
      return { valid: false };
    }
    return {
      valid: true,
      username: parsed.u,
      tokenHash,
      expiresAt: parsed.exp,
    };
  } catch {
    return { valid: false };
  }
}

interface VercelRequest extends IncomingMessage {
  body?: Record<string, unknown> | string;
  query?: Record<string, string | string[]>;
}

interface VercelResponse extends ServerResponse {
  status?: (code: number) => VercelResponse;
  json?: (payload: unknown) => void;
}

function sendJson(res: VercelResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(data));
}

async function parseRequestBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawUrl = req.url || '/api/health';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const method = (req.method || 'GET').toUpperCase();

  if (pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      storage: 'firebase-firestore-cloud',
      timestamp: new Date().toISOString(),
    });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseRequestBody(req);
    const cleanUsername = String(body.username || '').trim();
    const cleanPassword = String(body.password || '');

    if (verifyAdminCredentialsServer(cleanUsername, cleanPassword)) {
      const { token, tokenHash, expiresAt } = createSignedAdminToken(cleanUsername);
      return sendJson(res, 200, {
        ok: true,
        token,
        tokenHash,
        username: cleanUsername,
        expiresAt,
      });
    }
    return sendJson(res, 401, {
      ok: false,
      error: 'Username atau password salah. Silakan coba lagi.',
    });
  }

  if (pathname === '/api/auth/verify' && method === 'GET') {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : parsedUrl.searchParams.get('token') || undefined;
    const result = verifySignedAdminToken(token);
    if (result.valid) {
      return sendJson(res, 200, {
        valid: true,
        username: result.username,
        tokenHash: result.tokenHash,
        expiresAt: result.expiresAt,
      });
    }
    return sendJson(res, 401, { valid: false });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const body = await parseRequestBody(req);
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : typeof body.token === 'string'
        ? body.token
        : undefined;
    if (token) {
      revokedTokenHashes.add(computeSha256Hex(token));
    }
    return sendJson(res, 200, { ok: true });
  }

  // Note: On Vercel Production, all persistent data & images are served directly
  // from Cloud Firestore (`products`, `product_images`, etc.) and Firebase Cloud Storage.
  if (pathname.startsWith('/api/db/')) {
    return sendJson(res, 200, {
      ok: true,
      mode: 'cloud-firestore-primary',
    });
  }

  return sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
}
