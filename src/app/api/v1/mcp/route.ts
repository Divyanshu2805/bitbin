import { NextResponse } from 'next/server'
import { apiError, authenticateApiRequest } from '@/lib/api-auth'
import { handleMcpPayload, MCP_PARSE_ERROR } from '@/lib/mcp'

/**
 * BitBin's Model Context Protocol endpoint: an assistant such as Claude connects here with an
 * API token and gets tools to search the bin, read an item and save one (lib/mcp.ts).
 *
 * The token is checked with no scope of its own: each tool asks for the permission it needs, so
 * a token sees only the tools it may use. Every message counts against the `api` rate limit.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await authenticateApiRequest(request)
    if (response) return response

    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(MCP_PARSE_ERROR, { status: 400 })
    }

    const reply = await handleMcpPayload(user, payload)
    // Notifications are acknowledged with no body
    if (reply === null) return new NextResponse(null, { status: 202 })

    return NextResponse.json(reply)
  } catch (error) {
    console.error('API MCP error:', error)
    return apiError('An error occurred while handling the request', 500)
  }
}

/**
 * A client may ask for a server-sent stream of the server's own messages. This server never
 * starts a conversation, so there is none to offer.
 */
export function GET() {
  return apiError('This MCP endpoint answers POST requests only', 405, { Allow: 'POST' })
}
