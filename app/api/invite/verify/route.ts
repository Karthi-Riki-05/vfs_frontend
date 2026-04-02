import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

// PUBLIC — no auth required for verifying invite tokens
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    const response = await axios.get(`${BACKEND_URL}/api/v1/invite/verify`, {
      params: { token },
    });

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { success: false, error: { message: 'Failed to verify invitation' } },
      { status: error.response?.status || 500 }
    );
  }
}
