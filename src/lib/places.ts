import { Restaurant } from './types'

const PLACES_BASE = 'https://places.googleapis.com/v1/places'

interface PlacesSearchParams {
  query: string
  location?: { lat: number; lng: number }
  radius?: number
  maxResults?: number
}

export async function searchRestaurants(params: PlacesSearchParams): Promise<Restaurant[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) throw new Error('Google Places API key not configured')

  // Dubai coordinates as default
  const lat = params.location?.lat ?? 25.2048
  const lng = params.location?.lng ?? 55.2708

  const body = {
    textQuery: params.query || 'best restaurants Dubai',
    includedType: 'restaurant',
    maxResultCount: params.maxResults || 10,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: params.radius || 15000,
      },
    },
    languageCode: 'en',
  }

  const res = await fetch(`${PLACES_BASE}:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.photos',
        'places.googleMapsUri',
        'places.nationalPhoneNumber',
        'places.regularOpeningHours',
        'places.reviews',
        'places.types',
        'places.shortFormattedAddress',
      ].join(','),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Places API error:', err)
    return []
  }

  const data = await res.json()
  const places = data.places || []

  return places.map((p: any): Restaurant => {
    const photoName = p.photos?.[0]?.name
    const photoUrl = photoName
      ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=600&key=${apiKey}`
      : undefined

    const addressParts = (p.shortFormattedAddress || p.formattedAddress || '').split(',')
    const area = addressParts[0]?.trim() || 'Dubai'

    // Pick a relevant review snippet
    const reviews: any[] = p.reviews || []
    const snippet = reviews.length > 0
      ? reviews[0]?.text?.text?.slice(0, 160) || ''
      : ''

    const priceMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    }

    return {
      id: p.id || p.name,
      name: p.displayName?.text || 'Unknown',
      cuisine: inferCuisine(p.types || []),
      priceLevel: priceMap[p.priceLevel] ?? 3,
      rating: p.rating || 0,
      reviewCount: p.userRatingCount || 0,
      address: p.formattedAddress || '',
      area,
      photo: photoUrl,
      googleMapsUrl: p.googleMapsUri || '',
      phoneNumber: p.nationalPhoneNumber || '',
      reviewSnippet: snippet,
      openNow: p.regularOpeningHours?.openNow,
    }
  })
}

function inferCuisine(types: string[]): string {
  const map: Record<string, string> = {
    japanese_restaurant: 'Japanese',
    italian_restaurant: 'Italian',
    indian_restaurant: 'Indian',
    chinese_restaurant: 'Chinese',
    french_restaurant: 'French',
    mediterranean_restaurant: 'Mediterranean',
    lebanese_restaurant: 'Lebanese',
    thai_restaurant: 'Thai',
    american_restaurant: 'American',
    seafood_restaurant: 'Seafood',
    steak_house: 'Steakhouse',
    middle_eastern_restaurant: 'Middle Eastern',
    turkish_restaurant: 'Turkish',
    spanish_restaurant: 'Spanish',
    mexican_restaurant: 'Mexican',
    brazilian_restaurant: 'Brazilian',
    korean_restaurant: 'Korean',
    greek_restaurant: 'Greek',
  }
  for (const t of types) {
    if (map[t]) return map[t]
  }
  return 'International'
}

export function formatPrice(level: number): string {
  const labels = ['Free', 'AED 50–150', 'AED 150–350', 'AED 350–600', 'AED 600+']
  return labels[level] ?? 'AED 350+'
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}
