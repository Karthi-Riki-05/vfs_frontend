import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Proxy the request to the backend Express server
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const response = await axios.post(`${backendUrl}/api/auth/register`, body);

        return NextResponse.json(response.data, { status: 201 });
    } catch (error: any) {
        console.error('Registration API error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: error.response?.data?.error || 'Failed to register user' },
            { status: error.response?.status || 500 }
        );
    }
}
