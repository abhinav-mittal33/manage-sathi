import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'ms_session';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set. Generate one with: openssl rand -hex 32');
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export interface AuthUser {
  userId: string;
  firmId: string;
  role: 'owner' | 'architect' | 'site_supervisor';
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.userId,
    firmId: user.firmId,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.firmId || !payload.role) return null;
    return {
      userId: payload.sub,
      firmId: payload.firmId as string,
      role: payload.role as AuthUser['role'],
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return user;
}

export function setSessionCookie(_token: string): void {
  // Used in login route — call cookies().set() there directly
  // This function is a no-op placeholder; cookie setting happens in route handler
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
