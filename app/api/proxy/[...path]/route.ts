import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '')

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const endpoint = path.join('/')
  const url = new URL(req.url)
  const backendUrl = `http://${BACKEND}/${endpoint}${url.search}`
  
  console.log(`[Proxy] ${req.method} ${backendUrl}`)
  
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const body = req.method !== 'GET' ? await req.text() : undefined
    
    const res = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
    })
    
    const text = await res.text()
    console.log(`[Proxy] Response ${res.status}: ${text.substring(0, 200)}`)
    
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('[Proxy] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
