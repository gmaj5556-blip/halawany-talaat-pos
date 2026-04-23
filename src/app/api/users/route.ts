import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, name, username, pin, role, active, created_at FROM users ORDER BY id').all();
    return NextResponse.json(users);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, username, pin, role } = await request.json();
    const db = getDb();
    const result = db.prepare('INSERT INTO users (name, username, pin, role) VALUES (?, ?, ?, ?)').run(name, username, pin, role || 'cashier');
    return NextResponse.json(db.prepare('SELECT id, name, username, pin, role, active FROM users WHERE id = ?').get(result.lastInsertRowid));
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'اسم المستخدم أو رمز الدخول (PIN) مستخدم بالفعل' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, username, pin, role, active } = await request.json();
    const db = getDb();
    db.prepare('UPDATE users SET name=?, username=?, pin=?, role=?, active=? WHERE id=?').run(name, username, pin, role, active ? 1 : 0, id);
    return NextResponse.json(db.prepare('SELECT id, name, username, pin, role, active FROM users WHERE id = ?').get(id));
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'اسم المستخدم أو رمز الدخول (PIN) مستخدم بالفعل' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
