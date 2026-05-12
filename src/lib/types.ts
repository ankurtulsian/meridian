export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  chips?: string[]
  results?: Restaurant[]
  timestamp: number
}

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  priceLevel: number
  rating: number
  reviewCount: number
  address: string
  area: string
  distance?: string
  photo?: string
  googleMapsUrl?: string
  phoneNumber?: string
  matchScore?: number
  conciergeBlurb?: string
  reviewSnippet?: string
  openNow?: boolean
}

export interface PreferenceProfile {
  occasion?: string
  cuisines?: string[]
  avoidCuisines?: string[]
  atmosphere?: string
  budget?: string
  location?: string
  partySize?: number
  date?: string
  novelty?: string
  dietaryNeeds?: string[]
  rawSignals: string[]
}

export interface ConversationState {
  messages: Message[]
  profile: PreferenceProfile
  phase: 'greeting' | 'eliciting' | 'results' | 'narrowing'
}
