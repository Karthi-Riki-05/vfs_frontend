import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Proxy the request to the backend Express server
        const backendUrl = process.env.BACKEND_URL || 'http://vc-backend:5000';
        const response = await axios.post(`${backendUrl}/api/auth/register`, body, {
            headers: {
                // Signup provenance: forward the BROWSER's User-Agent so the
                // backend can record whether this account was created on the
                // website or inside the Pro/Team shell.
                //
                // It must be a custom header, not `User-Agent`: on this hop the
                // real User-Agent belongs to axios running in the Next.js
                // container, which is why every account historically recorded
                // as "web". See backend/src/lib/signupProvenance.js.
                'X-Client-User-Agent': request.headers.get('user-agent') || '',
            },
        });

        return NextResponse.json(response.data, { status: 201 });
    } catch (error: any) {
        console.error('Registration API error:', error.response?.data || error.message);
        return NextResponse.json(
            error.response?.data || { success: false, error: { code: 'UNKNOWN', message: 'Failed to register user' } },
            { status: error.response?.status || 500 }
        );
    }
}
