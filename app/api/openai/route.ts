import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // உங்கள் authOptions பாத்
import jwt from 'jsonwebtoken';
import axios from 'axios';

export async function POST(req: NextRequest) {
    // 1. பயனர் லாகின் செய்துள்ளாரா எனச் சரிபார்க்கவும்
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 2. Backend-க்கு அனுப்ப ஒரு தற்காலிக JWT Token உருவாக்கவும்
        const token = jwt.sign(
            { id: (session as any).user.id },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: '1h' }
        );

        // 3. Frontend-லிருந்து வரும் Body-ஐப் பெறவும்
        const body = await req.json();

        // 4. உங்கள் Backend-க்கு (Docker Service Name அல்லது URL) டேட்டாவை அனுப்பவும்
        // உங்கள் BACKEND_URL "http://vc-backend:5000" என இருக்க வேண்டும்
        const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

        const response = await axios.post(`${BACKEND_URL}/api/openai`, body, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 5. Backend தரும் பதிலை அப்படியே Frontend-க்கு அனுப்பவும்
        return NextResponse.json(response.data, { status: 200 });

    } catch (error: any) {
        console.error('OpenAI Proxy Error:', error.message);

        // Backend தரும் பிழையை அல்லது பொதுவான பிழையை அனுப்பவும்
        return NextResponse.json(
            error.response?.data || { error: 'Internal Server Error' },
            { status: error.response?.status || 500 }
        );
    }
}