import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getItemById } from '@/lib/db/items'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const item = await getItemById(session.user.id, id)

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Get item error:', error)
    return NextResponse.json(
      { error: 'An error occurred while fetching the item' },
      { status: 500 }
    )
  }
}
