// Core domain model for menu planning.
//
// Two ideas run through everything here. First, almost nothing is a hard
// constraint: ingredients can be bought, so a menu that needs a store run is
// expensive rather than invalid. Second, the system never claims to know more
// than it does — what was planned is not what was cooked, and what was cooked is
// not what was eaten.

export type DinerId = string

export interface Diner {
  id: DinerId
  name: string
  // The only true blocks in the system. Keep both lists short — everything that
  // can be expressed as a preference belongs in scoring, not here.
  allergies: string[]
  willNotEat: string[]
  // Who bends when preferences collide. 0 = accommodate first, 1 = happy with
  // most things. A flexible diner is not an ignored one: this decides ties, so
  // the planner can't quietly optimise for the easiest palate in the house.
  flexibility: number
}

// Rebuilt periodically from the edit log and plate outcomes rather than edited by
// hand — a profile someone maintains is a profile that goes stale.
export interface TasteProfile {
  diner: DinerId
  // Plain language, because this gets read back into the planner's prompt and
  // has to be something the household can read and correct.
  summary: string
  likes: string[]
  dislikes: string[]
  // Leanings inferred from behaviour, not declared up front.
  facetAffinity: Record<Facet, number>
  sourceEditIds: string[]
  updatedAt: number
}

// Canonical, assigned once when a dish enters the library. Fixed on purpose:
// rotation and balance math break silently if the model spells 'light' as
// 'lite', 'halka' and 'easy on stomach' across four dishes. Derived by ingesting
// a few dozen dishes with a free vocabulary, then clustered and frozen.
export type Facet = string

export interface FacetVocabulary {
  facets: Facet[]
  // New facets wait for approval. Vocabulary changes are rare and worth a tap;
  // per-dish tagging is neither.
  proposed: { facet: Facet; sourceDishId: string; proposedAt: number }[]
}

export interface RecipeSource {
  kind: 'youtube' | 'instagram' | 'article' | 'manual'
  url: string
  channel?: string
  // On Indian food reels the recipe usually lives in the caption; the transcript
  // is the more expensive fallback.
  extractedFrom?: 'caption' | 'transcript' | 'body'
  fetchedAt: number
}

export interface Nutrition {
  // Per serving, estimated once at ingest and editable by hand. Good to roughly
  // ±20% on home cooking — gravies, ghee and portion drift put real precision out
  // of reach. Enough to notice a low-protein week; not enough for anything
  // clinical, and it should never be presented as though it were.
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fibreG?: number
  estimatedFrom: 'llm' | 'manual'
}

export interface DishIngredient {
  item: string
  // Quantities in the cook's units — katori, mutthi, kilo — not grams.
  quantity?: string
  optional?: boolean
}

// How to carve a portion that works for one diner out of a dish made for
// everyone, so the kitchen cooks one meal instead of two.
export interface ForkInstruction {
  forDiner: DinerId
  instructionEn: string
  instructionHi: string
  atStep?: number
}

export interface Dish {
  id: string
  nameEn: string
  nameHi: string
  // Every dish carries its source. The cook works from the video, so a dish
  // without one is a dish that can't be handed over.
  source?: RecipeSource
  ingredients: DishIngredient[]
  facets: Facet[]
  nutrition: Nutrition
  // 1 = weeknight, 5 = needs a free afternoon. A dial, not a filter.
  effort: 1 | 2 | 3 | 4 | 5
  // On the table most days, and nobody would remark on seeing it again tomorrow —
  // roti, plain rice, chai, curd, papad. It is a fact about the dish's place in
  // the rotation, not about its ingredients and not about its character, which is
  // why it is neither a staple nor a facet: the staples list is keyed on what is
  // in the cupboard (khichdi is made entirely of staples and is still worth
  // rotating), and a facet would make it something the ranker matches intent
  // against, which it is not.
  //
  // It licenses exactly one thing: not being told about. Saying "roti was made
  // yesterday" is true every day of the year, and a warning that is always true
  // teaches you to stop reading warnings — after which the ones that matter go
  // unread too. Ranking is untouched; a dish can be unremarkable and still be the
  // wrong thing to cook tonight.
  everyday?: boolean
  servesWell: DinerId[]
  fork?: ForkInstruction
  // How it is actually made, in Hindi, in the cook's own units. The kitchen
  // narrative is assembled from these lines rather than written fresh each time:
  // a quantity that reaches the person holding the pan has to be one somebody
  // wrote down, not one that was improvised on the way out of the door.
  methodHi?: string[]
  // Newly ingested dishes ship with fuller instructions for their first outings.
  status: 'candidate' | 'active' | 'retired'
  addedAt: number
}

export interface PantryItem {
  id: string
  item: string
  // No units and no expiry dates. 'bhindi rakha hai bahut saara' is the whole
  // input, and the raw phrase is kept because the parse can be wrong.
  quantitySignal: 'a little' | 'some' | 'a lot'
  raw: string
  // Stock is a belief, not a ledger. Planned use is only a guess at real use, so
  // confidence decays and unmentioned items age out instead of accumulating into
  // a list nobody trusts by week three.
  confidence: number
  firstMentionedAt: number
  lastConfirmedAt: number
}

// Snacks included, because a day is planned as a day. Which of these you
// actually want is part of the ask — planning half a day is normal.
export type MealSlot = 'breakfast' | 'lunch' | 'snacks' | 'dinner'

export interface MenuItem {
  dishId: string
  // Pinned items survive regeneration. Change one dish and the others stay put,
  // or you lose your place and stop tweaking.
  pinned: boolean
  fork?: ForkInstruction
  // Confirmed passively at the next planning session — the screen is already
  // open — rather than as a ritual of its own that decays by week three.
  outcome: 'proposed' | 'sent' | 'cooked' | 'skipped' | 'unknown'
}

export interface PlannedSlot {
  slot: MealSlot
  items: MenuItem[]
  // A slot can arrive already decided — eaten out, leftovers, or simply settled
  // without us. It still constrains the rest of the day, which is the whole
  // reason the day is the unit and the meal is not.
  source: 'planned' | 'given'
}

export interface DayPlan {
  id: string
  date: string
  version: number
  // Versions are cheap so that reverting is cheap, and people only tweak freely
  // when they know they can go back.
  supersedes?: string
  // Only the slots that were asked for.
  slots: PlannedSlot[]
  eating: DinerId[]
  // Validated across the day rather than per meal: a heavy lunch is only a
  // problem in combination with a heavy dinner, and daily macro targets are
  // meaningless against a single sitting.
  validation: ValidationResult
  createdAt: number
}

// What the system remembers about how this household eats, as distinct from the
// library of what it can cook. Standing rules and taste profiles are the same
// kind of thing — learned, approved, applied to every proposal — so they live
// together rather than pretending to be separate systems.
export interface Memory {
  standingRules: Rule[]
  profiles: TasteProfile[]
  // Household facts that are neither per-person nor learned: no beef, Tuesdays
  // vegetarian, that sort of thing. Stated once, always on.
  globals: string[]
}

export interface PlateOutcome {
  dishId: string
  diner: DinerId
  result: 'ate' | 'ate-around-it' | 'refused'
  at: number
}

// Tweaks are the primary learning channel: captured for free during work that is
// happening anyway, and richer than a rating because a substitution says both
// what was rejected and what was wanted instead.
export type EditKind =
  | 'substitution'     // strongest signal, and directional
  | 'rejection'        // weak negative, often just mood
  | 'constraint'       // re-ranks the whole menu rather than one slot
  | 'fact-correction'  // writes to the pantry, never to preferences
  | 'reroll'           // 'don't like it, can't say why'

export interface EditContext {
  date: string
  slot: MealSlot
  eating: DinerId[]
  otherDishIds: string[]
  requestPhrase?: string
}

export interface EditEvent {
  id: string
  planId: string
  kind: EditKind
  fromDishId?: string
  toDishId?: string
  // The exact words. 'We don't have paneer' is an inventory correction wearing
  // the clothes of a taste signal, and filing it as the latter teaches the system
  // to avoid a dish the household actually likes.
  raw: string
  // A single edit is unclassifiable — situational, conditional and global all
  // look identical in isolation. Only repetition across varying contexts
  // separates them, so the full context travels with every edit.
  context: EditContext
  by: string
  at: number
}

// Rules are not frozen once accepted. Every plan is a quiet test of every active
// rule: going against one costs it confidence, and a rule you keep overriding
// comes back to be narrowed or dropped rather than silently continuing to apply.
export type RuleStatus =
  | 'proposed'    // waiting on you
  | 'accepted'    // applied to every proposal
  | 'challenged'  // recent edits contradict it — needs a decision, not silence
  | 'narrowed'    // superseded by a tighter version of itself
  | 'retired'
  | 'declined'

export interface Rule {
  id: string
  // Stated in the household's own words. A rule you cannot read is a rule you
  // cannot judge, and this one needs judging before it takes effect.
  statement: string
  // Dimensions that held constant across the supporting edits. None of them is a
  // global claim about every meal; several of them is a micro rule about one slot
  // with one set of people at the table. Specificity is what sets how much
  // evidence the rule needs, so this field is not decoration.
  conditions: Partial<EditContext>
  supportingEditIds: string[]
  // Edits that went against it since it was accepted. This is the field that lets
  // a rule evolve instead of calcifying.
  contradictingEditIds: string[]
  confidence: number
  status: RuleStatus
  // Set when a broader rule is replaced by a tighter one rather than dropped.
  supersedes?: string
  proposedAt: number
  decidedAt?: number
}

export interface ValidationFinding {
  code: string
  message: string
  // Findings are surfaced, never silently fixed. Where there is an obvious
  // remedy it is offered as one tap rather than applied behind your back.
  suggestion?: string
  dishId?: string
}

export interface ValidationResult {
  blocks: ValidationFinding[]
  warnings: ValidationFinding[]
  shoppingList: string[]
}

// Dimensions a request can speak to. One active value each, so a new statement
// visibly replaces the old one instead of silently stacking with it.
export type ConstraintDimension =
  | 'diners'
  | 'slot'
  | 'mood'
  | 'nutrition'
  | 'ingredient'
  | 'effort'
  | 'variety'
  | 'occasion'

// A source we watch, rather than wait to be shown. New items land in the inbox
// beside the things you shared by hand.
//
// This is a better filter than searching the open web: taste is encoded in the
// source list itself, so what arrives is already from people you trust. The three
// kinds are not equally cheap, and the difference is worth knowing before
// promising any of them —
//
//   youtube-channel      free and reliable; every channel publishes RSS keyed by
//                        channel id, no API key and no scraping
//   publication          usually paywalled, so it needs the household's own
//                        login and in practice only exposes hand-saved recipes
//   instagram-creator    no feed of any kind; needs a paid third-party scraper
//                        polled per creator, and breaks when Instagram changes
export interface Source {
  id: string
  kind: 'youtube-channel' | 'publication' | 'instagram-creator'
  name: string
  feedUrl?: string
  lastPolledAt?: number
  active: boolean
}

export interface InboxItem {
  id: string
  // Two lanes: things you pushed in, and things a watched source published.
  origin: 'shared' | 'source'
  sourceId?: string
  url?: string
  // A note or voice transcript, when there's no link — 'Krishna's been off dairy'.
  raw?: string
  // Where triage thinks it belongs. Nothing here takes effect on its own; the
  // same propose-don't-apply rule that governs rules governs this.
  proposedDestination?: 'library' | 'pantry' | 'memory'
  // Expired, not deleted: an inbox that only grows becomes a guilt pile with a
  // badge you learn to ignore.
  status: 'new' | 'triaged' | 'accepted' | 'dismissed' | 'expired'
  addedAt: number
}
