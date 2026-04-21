import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? 'ms_session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Clear the session cookie by setting maxAge to 0
    cookieStore.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('[auth/logout] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
      },
      { status: 500 }
    );
  }
}
