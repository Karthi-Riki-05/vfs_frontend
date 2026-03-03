import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

// No auth required for forgot password
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await axios.post(`${BACKEND_URL}/api/v1/users/forgot-password`, body);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: 'Internal Server Error' },
      { status: error.response?.status || 500 }
    );
  }
}
