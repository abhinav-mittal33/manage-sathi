import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createSessionToken } from '@/lib/auth';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'ms_session';
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;

const loginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.errors[0]?.message ?? 'Invalid input',
          },
        },
        { status: 400 }
      );
    }

    const { phone, pin } = parsed.data;

    // Fetch only the columns we need; filter soft-deleted users at query level.
    const [user] = await db
      .select({
        id: users.id,
        firmId: users.firmId,
        name: users.name,
        role: users.role,
        pinHash: users.pinHash,
      })
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1);

    // Always run bcrypt.compare regardless of whether the user was found.
    // This prevents timing-based enumeration of valid phone numbers.
    const dummyHash =
      '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const hashToCompare = user?.pinHash ?? dummyHash;
    const pinValid = await bcrypt.compare(pin, hashToCompare);

    if (!user || !pinValid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
        },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      firmId: user.firmId,
      role: user.role as 'owner' | 'architect' | 'site_supervisor',
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      // Only mark secure in production — dev server runs on http
      secure: process.env.NODE_ENV === 'production',
      // lax (NOT strict) so WhatsApp redirect links carry the session cookie
      sameSite: 'lax',
      path: '/',
      maxAge: SEVEN_DAYS_SECONDS,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          firmId: user.firmId,
        },
      },
    });
  } catch (error) {
    console.error('[auth/login] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
      },
      { status: 500 }
    );
  }
}
