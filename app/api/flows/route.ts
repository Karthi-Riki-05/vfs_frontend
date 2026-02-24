import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });
        const { searchParams } = new URL(req.url);
        const response = await axios.get(`${BACKEND_URL}/api/flows`, {
            params: Object.fromEntries(searchParams),
            headers: { Authorization: `Bearer ${token}` }
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
        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });
        const body = await req.json();
        const response = await axios.post(`${BACKEND_URL}/api/flows`, body, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return NextResponse.json(response.data, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}
