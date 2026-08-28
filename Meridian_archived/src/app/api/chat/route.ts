import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, parseSearchIntent, buildRankingPrompt } from '@/lib/agent'
import { searchRestaurants } from '@/lib/places'
import { Restaurant } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    // First call: get concierge response
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const rawContent = response.content[0].type === 'text' ? response.content[0].text : ''

    // Check if agent wants to search
    const searchIntent = parseSearchIntent(rawContent)
    let restaurants: Restaurant[] = []

    if (searchIntent) {
      try {
        const raw = await searchRestaurants({
          query: searchIntent.searchQuery,
          maxResults: 15,
        })

        if (raw.length > 0) {
          // Second call: rank and write blurbs
          const rankingResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: buildRankingPrompt(raw, searchIntent.profile),
            }],
          })

          const rankingText = rankingResponse.content[0].type === 'text'
            ? rankingResponse.content[0].text
            : '[]'

          const ranked: Array<{ id: string; matchScore: number; conciergeBlurb: string; reviewSnippet: string }> =
            JSON.parse(rankingText)

          // Merge ranking data with restaurant data
          restaurants = ranked
            .map(r => {
              const found = raw.find(p => p.id === r.id)
              if (!found) return null
              return {
                ...found,
                matchScore: r.matchScore,
                conciergeBlurb: r.conciergeBlurb,
                reviewSnippet: r.reviewSnippet || found.reviewSnippet,
              }
            })
            .filter(Boolean) as Restaurant[]
        }
      } catch (e) {
        console.error('Search/ranking error:', e)
      }
    }

    return NextResponse.json({
      content: rawContent,
      restaurants: restaurants.length > 0 ? restaurants : undefined,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
