import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://vc-backend:5000';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { pathname } = new URL(req.url);
        const endpoint = pathname.split('/').pop(); // current, plans, etc.
        const response = await axios.get(`${BACKEND_URL}/api/subscription/${endpoint}`, {
            headers: { Authorization: `Bearer ${(session as any).user.id}` }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { pathname } = new URL(req.url);
        const endpoint = pathname.split('/').pop(); // subscribe, cancel, etc.
        const body = await req.json();
        const response = await axios.post(`${BACKEND_URL}/api/subscription/${endpoint}`, body, {
            headers: { Authorization: `Bearer ${(session as any).user.id}` }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}
