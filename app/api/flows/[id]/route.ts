import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://vc-backend:5000';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });
        const response = await axios.get(`${BACKEND_URL}/api/flows/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });
        const body = await req.json();
        const response = await axios.put(`${BACKEND_URL}/api/flows/${params.id}`, body, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });
        const response = await axios.delete(`${BACKEND_URL}/api/flows/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return NextResponse.json(response.data);
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}
