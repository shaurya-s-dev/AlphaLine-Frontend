import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker } = body;
    
    const backendUrl = process.env.BACKEND_URL || '127.0.0.1:8000';
    
    // This takes 30-60 seconds, set a long timeout
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(), 
      90000  // 90 second timeout
    );
    
    // Build the request URL robustly
    const url = backendUrl.startsWith('http')
      ? `${backendUrl}/analyze/${ticker}`
      : `http://${backendUrl}/analyze/${ticker}`;

    console.log(`Routing AI Analysis proxy call to: ${url}`);

    const res = await fetch(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeout);
    const data = await res.json();
    return NextResponse.json(data);
    
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'Analysis timed out. Please try again.'
      }, { status: 408 });
    }
    return NextResponse.json({
      success: false,
      error: String(err)
    }, { status: 500 });
  }
}
