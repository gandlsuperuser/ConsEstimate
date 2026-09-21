import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getAllUsers,
  createUser,
  ROLE_CONFIG,
  UserRole,
} from '@/lib/auth-service';
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

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Allow admins or users with user_management view/admin access
  if (session.role !== 'admin' && session.permissions?.user_management === 'none') {
    return NextResponse.json({ error: 'Admin clearance required' }, { status: 403 });
  }

  const users = getAllUsers();
  return NextResponse.json({
    users,
    roles: ROLE_CONFIG,
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (session.role !== 'admin' && session.permissions?.user_management !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can add new team members' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, role, department, phone, password, permissions } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const newUser = createUser({
      name,
      email,
      role: (role as UserRole) || 'project_manager',
      department,
      phone,
      password: password || '123123',
      permissions,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: err.message || 'Failed to create user.' }, { status: 400 });
  }
}
