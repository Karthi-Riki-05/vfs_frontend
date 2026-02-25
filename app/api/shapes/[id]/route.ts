import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://vc-backend:5000';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });
        await axios.delete(`${BACKEND_URL}/api/shapes/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return NextResponse.json({ message: 'Shape deleted successfully' });
    } catch (error: any) {
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}
