import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = jwt.sign(
        { id: (session as any).user.id, sub: (session as any).user.id, role: (session as any).user.role },
        process.env.NEXTAUTH_SECRET!,
        { expiresIn: '24h' }
    );

    return NextResponse.json({ success: true, data: { token } });
}
