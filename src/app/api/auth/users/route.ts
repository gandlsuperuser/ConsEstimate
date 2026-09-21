import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = getAllUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
    })),
  });
}
