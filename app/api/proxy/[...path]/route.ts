import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const backendHost = process.env.BACKEND_URL || "localhost:8080";
    const baseUrl = backendHost.startsWith("http") ? backendHost : `http://${backendHost}`;
    const targetUrl = `${baseUrl}/${params.path.join('/')}`;
    
    const body = await req.text();
    
    console.log(`[Proxy POST] Target URL: ${targetUrl}`);
    console.log(`[Proxy POST] Body payload: ${body}`);
    
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: body || undefined,
    });
    
    const responseText = await res.text();
    
    console.log(`[Proxy POST] Target Status: ${res.status}`);
    
    if (!res.ok) {
      console.error(`[Proxy POST Error] Elastic Beanstalk returned non-OK status: ${res.status}`);
      console.error(`[Proxy POST Error] Error Payload: ${responseText}`);
    }
    
    return new Response(responseText, { 
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("[Proxy POST Critical Error] Exception during proxying:", error);
    return NextResponse.json({ 
      error: "Proxy Connection Error", 
      message: error.message || "Failed to reach backend",
      details: error.stack || ""
    }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const backendHost = process.env.BACKEND_URL || "localhost:8080";
    const baseUrl = backendHost.startsWith("http") ? backendHost : `http://${backendHost}`;
    const url = new URL(req.url);
    const targetUrl = `${baseUrl}/${params.path.join('/')}${url.search}`;
    
    console.log(`[Proxy GET] Target URL: ${targetUrl}`);
    
    const res = await fetch(targetUrl);
    const responseText = await res.text();
    
    console.log(`[Proxy GET] Target Status: ${res.status}`);
    
    if (!res.ok) {
      console.error(`[Proxy GET Error] Elastic Beanstalk returned non-OK status: ${res.status}`);
      console.error(`[Proxy GET Error] Error Payload: ${responseText}`);
    }
    
    return new Response(responseText, { 
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("[Proxy GET Critical Error] Exception during proxying:", error);
    return NextResponse.json({ 
      error: "Proxy Connection Error", 
      message: error.message || "Failed to reach backend",
      details: error.stack || ""
    }, { status: 500 });
  }
}
