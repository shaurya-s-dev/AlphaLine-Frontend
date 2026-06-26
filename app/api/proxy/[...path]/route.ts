import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const backendHost = process.env.BACKEND_URL || "localhost:8080";
    // Avoid double prefix if BACKEND_URL already includes http/https
    const baseUrl = backendHost.startsWith("http") ? backendHost : `http://${backendHost}`;
    const targetUrl = `${baseUrl}/${params.path.join('/')}`;
    
    const body = await req.text();
    
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || undefined,
    });
    
    const responseText = await res.text();
    return new Response(responseText, { 
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("Proxy POST Error:", error);
    return NextResponse.json({ error: error.message || "Proxy Error" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const backendHost = process.env.BACKEND_URL || "localhost:8080";
    const baseUrl = backendHost.startsWith("http") ? backendHost : `http://${backendHost}`;
    const url = new URL(req.url);
    const targetUrl = `${baseUrl}/${params.path.join('/')}${url.search}`;
    
    const res = await fetch(targetUrl);
    const responseText = await res.text();
    
    return new Response(responseText, { 
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("Proxy GET Error:", error);
    return NextResponse.json({ error: error.message || "Proxy Error" }, { status: 500 });
  }
}
