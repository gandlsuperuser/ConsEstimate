import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateUser, deleteUser } from '@/lib/auth-service';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session-token';

export const dynamic = 'force-dynamic';

async function getAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) return null;

  const session = await verifySessionToken(sessionCookie.value);
  if (!session) return null;

  return session;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (session.role !== 'admin' && session.permissions?.user_management !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can update team member permissions' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const updated = updateUser(id, body);

    return NextResponse.json({
      success: true,
      user: updated,
    });
  } catch (err: any) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: err.message || 'Failed to update user.' }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can delete team accounts' }, { status: 403 });
  }

  const { id } = await params;

  if (session.userId === id) {
    return NextResponse.json({ error: 'You cannot delete your own active account.' }, { status: 400 });
  }

  const ok = deleteUser(id);
  if (!ok) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
