# Meridian — Your Dubai Concierge

A mobile-first AI concierge for restaurant discovery in Dubai.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API keys
Create a `.env.local` file in the root:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000 on your phone (same WiFi network) or browser.

---

## Deploy to Vercel (live iPhone URL)

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel
```
Follow the prompts. When asked about environment variables, add both keys.

### Option B — GitHub + Vercel dashboard
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Under Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_PLACES_API_KEY`
4. Deploy — you get a live URL instantly

### Add to iPhone home screen
1. Open the Vercel URL in Safari on your iPhone
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"

Meridian now lives on your home screen as a full-screen app.

---

## Google Places API setup
1. Go to console.cloud.google.com
2. Create a new project
3. Go to APIs & Services → Library
4. Enable "Places API (New)"
5. Go to Credentials → Create API Key
6. (Optional but recommended) Restrict the key to your Vercel domain

---

## What's built

- **Ask tab** — conversational concierge with Claude. Voice + text input. AI-generated chips. Returns ranked restaurant results with concierge blurbs.
- **All tab** — browse all Dubai restaurants with cuisine filters and search.
- **Saved tab** — your personal shortlist, persisted in session.

## Next iterations
- User accounts + persistent memory across sessions
- Feedback loop (post-visit rating → ranking signal)
- Booking confirmation via human/AI agent
- More verticals (experiences, lifestyle, home services)
