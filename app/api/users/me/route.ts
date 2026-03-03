import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

function getToken(session: any) {
  return jwt.sign(
    { id: session.user.id, role: session.user.role },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: '1h' }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = getToken(session);
    const response = await axios.get(`${BACKEND_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: 'Internal Server Error' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const token = getToken(session);
    const body = await req.json();
    const userId = (session.user as any).id;
    // Backend has no PUT /me — profile updates go to PUT /users/:id
    const response = await axios.put(`${BACKEND_URL}/api/v1/users/${userId}`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: 'Internal Server Error' },
      { status: error.response?.status || 500 }
    );
  }
}
