import { Diner } from './types'

// Flexibility decides who bends when preferences collide — it is not a ranking of
// whose taste counts. Ankur being easy to please is a reason to accommodate the
// others first in a tie, not a reason to stop cooking what Ankur likes.
export const DINERS: Diner[] = [
  {
    id: 'ankur',
    name: 'Ankur',
    allergies: [],
    willNotEat: [],
    flexibility: 0.85,
  },
  {
    id: 'shruti',
    name: 'Shruti',
    allergies: [],
    willNotEat: [],
    flexibility: 0.45,
  },
  {
    id: 'krishna',
    name: 'Krishna',
    allergies: [],
    willNotEat: [],
    flexibility: 0.15,
  },
]

// Assumed present unless someone says otherwise. The pantry only tracks what needs
// using up, so without this list every dish looks like it needs a shopping trip.
export const STAPLES = new Set([
  'atta', 'rice', 'toor dal', 'moong dal', 'chana dal', 'rajma', 'chana',
  'onion', 'tomato', 'potato', 'garlic', 'ginger', 'green chilli',
  'oil', 'ghee', 'salt', 'sugar', 'haldi', 'jeera', 'dhania', 'garam masala',
  'mustard seeds', 'hing', 'curd', 'milk',
])

// The kitchen is in Dubai, and a day is a day there.
//
// Ankur said so on 31 Aug, after this file spent a week asserting Delhi — which
// nobody had ever said, and which no decision anywhere recorded. That is why this
// is only the *default*: the live value lives in the settings table and is changed
// by saying so out loud, so the next time it is wrong it can be fixed in the app
// rather than in a constant nobody thinks to check.
//
// This matters more now that days are the unit history is bucketed into. Deriving
// the date from UTC means that between midnight and half past five in the
// morning, local time, the app is still filing everything under yesterday — so a
// late dinner lands on the wrong day, the rotation clock reads a day short, and
// the Hindi card is headed with the wrong weekday.
export const ZONE = 'Asia/Dubai'
