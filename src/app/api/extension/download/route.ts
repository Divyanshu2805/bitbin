import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { buildExtensionZip, getExtensionVersion } from '@/lib/extension-package'

/**
 * Download the browser extension as a ZIP (Settings → Browser extension).
 * Pro only, like the token API it talks to. Local builds keep the localhost
 * option; production downloads don't.
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(session.user.isPro ?? false)) {
      return NextResponse.json(
        { error: 'The browser extension requires a Pro subscription' },
        { status: 403 }
      )
    }

    const includeLocalhost = process.env.NODE_ENV !== 'production'
    const [zip, version] = await Promise.all([
      buildExtensionZip({ includeLocalhost }),
      getExtensionVersion(),
    ])

    return new Response(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="bitbin-extension-${version}.zip"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Extension download error:', error)
    return NextResponse.json(
      { error: 'An error occurred while preparing the extension' },
      { status: 500 }
    )
  }
}
