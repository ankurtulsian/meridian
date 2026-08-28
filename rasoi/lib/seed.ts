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
