import { Dish, DinerId, MealSlot } from './types'

// The card that leaves the conversation.
//
// Assembled, not written. Every Hindi line here traces back to something a person
// typed into the dish library — the name, the method, the fork. The only thing
// generated is the sentence that stitches them together, and it is generated from
// a template with no free choices in it.
//
// That is a deliberate limit on the model's reach. Everything upstream of this is
// a proposal someone can argue with; this is the one artefact that reaches a
// person who will act on it without arguing, so a quantity in it has to be a
// quantity somebody wrote down.

const WEEKDAY_HI = [
  'रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार',
]

const SLOT_HI: Record<MealSlot, string> = {
  breakfast: 'नाश्ता',
  lunch: 'दोपहर का खाना',
  snacks: 'शाम का नाश्ता',
  dinner: 'रात का खाना',
}

// The phrase that reads naturally in a sentence, as opposed to the label.
const SLOT_IN_HI: Record<MealSlot, string> = {
  breakfast: 'आज नाश्ते में',
  lunch: 'आज दोपहर के खाने में',
  snacks: 'आज शाम के नाश्ते में',
  dinner: 'आज रात के खाने में',
}

const DINER_HI: Record<string, string> = {
  ankur: 'अंकुर',
  shruti: 'श्रुति',
  krishna: 'कृष्णा',
}

const COUNT_HI = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ']


// The cook reads Hindi. An English ingredient name inside a Devanagari sentence
// is not a small blemish — it is the one line on the card he cannot read.
//
// Anything missing from here is left out of the sentence rather than passed
// through in English: a shorter line is recoverable, a line in the wrong script
// is not. `lib/__tests__` fails if a dish uses a word this does not cover.
export const INGREDIENT_HI: Record<string, string> = {
  'rice': 'चावल', 'moong dal': 'मूंग दाल', 'toor dal': 'तूर दाल', 'chana dal': 'चना दाल',
  'chana': 'छोले', 'rajma': 'राजमा', 'atta': 'आटा', 'onion': 'प्याज़', 'tomato': 'टमाटर',
  'potato': 'आलू', 'garlic': 'लहसुन', 'ginger': 'अदरक', 'green chilli': 'हरी मिर्च',
  'oil': 'तेल', 'ghee': 'घी', 'salt': 'नमक', 'sugar': 'चीनी', 'haldi': 'हल्दी',
  'jeera': 'जीरा', 'dhania': 'धनिया', 'garam masala': 'गरम मसाला',
  'mustard seeds': 'राई', 'hing': 'हींग', 'curd': 'दही', 'milk': 'दूध',
  'poha': 'पोहा', 'bhindi': 'भिंडी', 'paneer': 'पनीर', 'palak': 'पालक',
  'baingan': 'बैंगन', 'lauki': 'लौकी', 'besan': 'बेसन', 'sooji': 'सूजी',
  'urad dal': 'उड़द दाल', 'kadhi patta': 'करी पत्ता', 'papad': 'पापड़',
  'cucumber': 'खीरा', 'lemon': 'नींबू', 'peas': 'मटर', 'cauliflower': 'फूलगोभी',
  'capsicum': 'शिमला मिर्च', 'butter': 'मक्खन', 'cream': 'क्रीम', 'pav': 'पाव',
  'dosa batter': 'डोसे का घोल', 'idli batter': 'इडली का घोल',
  'sambar powder': 'सांभर मसाला', 'kasuri methi': 'कसूरी मेथी',
  'amchur': 'अमचूर', 'chaat masala': 'चाट मसाला', 'mustard oil': 'सरसों का तेल',
}

// The units are already the cook's own words; they are only written in the wrong
// alphabet.
const UNIT_HI: [RegExp, string][] = [
  [/\bchhota chammach\b/g, 'छोटा चम्मच'],
  [/\bchammach\b/g, 'चम्मच'],
  [/\bkatori\b/g, 'कटोरी'],
  [/\bmutthi\b/g, 'मुट्ठी'],
  [/\bkilo\b/g, 'किलो'],
  [/\bgram\b/g, 'ग्राम'],
  [/\bkali\b/g, 'कली'],
  [/\bchutki bhar\b/g, 'चुटकी भर'],
  [/\bthoda sa\b/g, 'थोड़ा सा'],
  [/\bek tukda\b/g, 'एक टुकड़ा'],
  [/\baadha\b/g, 'आधा'],
  [/\bek\b/g, 'एक'],
  [/\bbada\b/g, 'बड़ा'],
]

export function quantityHi(quantity: string): string {
  return UNIT_HI.reduce((text, [pattern, hindi]) => text.replace(pattern, hindi), quantity)
}

export interface CardRow {
  nameHi: string
  // The one-pot note, in the cook's language.
  noteHi?: string
  shared: boolean
  toConfirm: boolean
}

export interface KitchenCard {
  headerHi: string
  columnsHi: [string, string]
  rows: CardRow[]
  methodTitleHi: string
  method: string[]
  // Stays in English: it is a note to the household about what is still missing,
  // not an instruction to the kitchen.
  footnote?: string
}

function joinHi(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} और ${items[items.length - 1]}`
}

// The two or three quantities that decide whether the pot is the right size.
// Taken verbatim from the library — never restated, never converted.
function leadQuantities(dish: Dish): string {
  const measured = dish.ingredients
    .filter(i => i.quantity && !i.optional && INGREDIENT_HI[i.item.toLowerCase()])
    .slice(0, 2)
  return measured
    .map(i => `${quantityHi(i.quantity!)} ${INGREDIENT_HI[i.item.toLowerCase()]}`)
    .join(' और ')
}

export function buildCard(
  date: string,
  slot: MealSlot,
  dishes: Dish[],
  eating: DinerId[],
  // Diners whose own menu is still unknown. They get a column and an honest gap
  // rather than being quietly served the same food.
  unknownFor: DinerId[]
): KitchenCard {
  const weekday = WEEKDAY_HI[new Date(`${date}T12:00:00Z`).getUTCDay()]
  const others = eating.filter(d => !unknownFor.includes(d))

  const rows: CardRow[] = dishes.map(dish => ({
    nameHi: dish.nameHi,
    noteHi: dish.fork?.instructionHi,
    shared: Boolean(dish.fork),
    // A forked dish already covers everyone. Anything else leaves the second
    // column open.
    toConfirm: !dish.fork && unknownFor.length > 0,
  }))

  const lead = dishes[0]
  const opening = lead
    ? `${SLOT_IN_HI[slot]} ${joinHi(dishes.map(d => d.nameHi))}${
        leadQuantities(lead) ? ` — ${leadQuantities(lead)}` : ''
      }, ${COUNT_HI[eating.length] ?? eating.length} लोगों के लिए।`
    : ''

  const method = [
    ...(opening ? [opening] : []),
    ...dishes.flatMap(d => d.methodHi ?? []),
  ]

  return {
    headerHi: `आज · ${weekday} · ${SLOT_HI[slot]}`,
    columnsHi: [
      others.map(d => DINER_HI[d] ?? d).join(' और ') || '—',
      unknownFor.map(d => DINER_HI[d] ?? d).join(' और ') || '—',
    ],
    rows,
    methodTitleHi: 'बनाने का तरीका',
    method,
    footnote: unknownFor.length
      ? `TO CONFIRM · ${unknownFor.map(d => (DINER_HI[d] ? d.toUpperCase() : d)).join(', ')}'S OWN DISHES`
      : undefined,
  }
}
