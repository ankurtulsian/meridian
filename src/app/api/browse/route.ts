import { NextRequest, NextResponse } from 'next/server'
import { searchRestaurants } from '@/lib/places'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || 'best restaurants Dubai dining'
    const restaurants = await searchRestaurants({ query, maxResults: 20 })
    return NextResponse.json({ restaurants })
  } catch (error: any) {
    console.error('Browse API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
