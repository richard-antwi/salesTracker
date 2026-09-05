import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { CONFIG } from './config';
import { prisma } from './db';

const SECRET_KEY = new TextEncoder().encode(CONFIG.JWT_SECRET);
const AUTH_COOKIE_NAME = 'work_and_pay_session';

export interface UserSession {
  userId: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'RIDER' | 'GUARANTOR';
  mustChangePassword?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function setAuthCookie(session: UserSession) {
  const token = await createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, phone: true, role: true, mustChangePassword: true },
    });

    if (!dbUser) return null;

    return {
      userId: dbUser.id,
      name: dbUser.name,
      phone: dbUser.phone,
      role: dbUser.role as 'ADMIN' | 'RIDER' | 'GUARANTOR',
      mustChangePassword: dbUser.mustChangePassword,
    };
  } catch {
    return null;
  }
}
