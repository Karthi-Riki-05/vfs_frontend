import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const u = session.user as any;
    const token = jwt.sign(
      { id: u.id, role: u.role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '1h' }
    );

    const res = await fetch(`${BACKEND_URL}/api/v1/chat/files/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = res.headers.get('content-disposition');
    const body = await res.arrayBuffer();

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    };
    if (contentDisposition) {
      headers['Content-Disposition'] = contentDisposition;
    }

    return new NextResponse(body, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}
