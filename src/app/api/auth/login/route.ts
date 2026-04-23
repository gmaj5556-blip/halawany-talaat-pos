import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE pin = ? AND active = 1').get(pin) as any;
    if (!user) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }
    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
