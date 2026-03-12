import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const token = jwt.sign(
            { id: (session as any).user.id, sub: (session as any).user.id, role: (session as any).user.role },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: '1h' }
        );

        const formData = await req.formData();

        const response = await fetch(`${BACKEND_URL}/api/v1/ai-assistant/generate-diagram-from-document`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
