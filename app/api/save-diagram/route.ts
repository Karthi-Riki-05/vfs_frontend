import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { flowId, xml, thumbnail, name } = await req.json();

        if (!flowId || !xml) {
            return NextResponse.json({ error: 'Missing flowId or xml' }, { status: 400 });
        }

        const token = jwt.sign({ id: (session as any).user.id }, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' });

        // Use PUT to update the flow diagram data
        // Assuming backend accepts diagramData: { xml: ... } or just xml directly?
        // Let's assume standard update structure. Backend usually expects JSON body.
        await axios.put(`${BACKEND_URL}/api/flows/${flowId}`, {
            diagramData: xml,
            thumbnail: thumbnail, // Assuming you want to send the thumbnail as well, replace with actual thumbnail variable if available
            name: name
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return NextResponse.json({ message: 'Diagram saved successfully' });
    } catch (error: any) {
        console.error("Autosave failed in frontend route:", error);
        return NextResponse.json(error.response?.data || { error: 'Internal Server Error' }, { status: error.response?.status || 500 });
    }
}
