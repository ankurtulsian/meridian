// The shape history takes.
//
// One rule decides what earns a table: **anything the domain model reads across
// days is relational; anything only today ever reads rides as jsonb on the day
// row.** Recency, the rotation penalty, the macro baseline, preference decay and
// the edit log all look backwards, so each of them is queryable. The live
// conversation — what was said, what is currently being asked for, whether he has
// agreed yet — is never read by tomorrow, and normalising it would buy nothing.
//
// Applied on boot if absent. Every statement is idempotent, so boot is safe to
// run on every cold start and a new table later is one more statement here — no
// migration framework, which three people and a cook do not earn.
//
// Nutrition deliberately does not appear. It belongs to the dish library, which
// is code, so a past day's macros are recomputed from today's library rather than
// frozen at the time. Correcting an estimate should correct the history it
// distorted, not leave the old number sitting in a row nobody will ever revisit.
export const SCHEMA = [
  `create table if not exists days (
     the_date    date primary key,
     eating      text[] not null,
     stage       text not null default 'open',
     request     jsonb not null default '{"constraints":[],"said":[]}'::jsonb,
     turns       jsonb not null default '[]'::jsonb,
     created_at  timestamptz not null default now(),
     updated_at  timestamptz not null default now()
   )`,

  // What was on the plan for a given day. The table every backward-looking
  // question is asked of, which is why the dish index is on (dish_id, date).
  `create table if not exists plan_items (
     the_date  date not null references days(the_date) on delete cascade,
     slot      text not null,
     dish_id   text not null,
     ordinal   int not null default 0,
     source    text not null default 'planned',
     pinned    boolean not null default false,
     outcome   text not null default 'proposed',
     primary key (the_date, slot, dish_id)
   )`,
  `create index if not exists plan_items_dish_idx on plan_items (dish_id, the_date desc)`,

  // How it actually went down, as opposed to what was planned. Nothing writes
  // this yet — no screen asks — and preference scoring reads it, so it is here
  // rather than waiting for the screen that fills it.
  `create table if not exists plate_outcomes (
     id          text primary key,
     dish_id     text not null,
     diner       text not null,
     result      text not null,
     happened_at timestamptz not null
   )`,
  `create index if not exists plate_outcomes_recent_idx on plate_outcomes (happened_at desc)`,

  // A belief about the fridge, with the date it was last said out loud. Confidence
  // is recomputed on read from that date rather than stored, so an item cannot sit
  // here looking certain because nothing has run to age it.
  `create table if not exists pantry_items (
     item               text primary key,
     quantity_signal    text not null,
     raw                text not null,
     first_mentioned_at timestamptz not null,
     last_confirmed_at  timestamptz not null
   )`,

  // The learning channel. Every tweak, with the full context it happened in,
  // because a single edit is unclassifiable and only repetition across varying
  // contexts separates a mood from a rule. Nothing reads this yet; it accumulates
  // from today so that there is something to fit against when it does.
  `create table if not exists edit_events (
     id           text primary key,
     the_date     date not null,
     kind         text not null,
     from_dish_id text,
     to_dish_id   text,
     raw          text not null,
     context      jsonb not null,
     author       text not null,
     happened_at  timestamptz not null
   )`,
  `create index if not exists edit_events_at_idx on edit_events (happened_at desc)`,

  // One row per setting, and there are very few. This exists for the handful of
  // facts the *code* has to act on rather than merely tell the model about — the
  // timezone being the whole reason it exists. A standing note saying "we are in
  // Dubai" is something the model reads; it cannot make `isoDate` bucket the day
  // correctly. That needs a value, not a sentence.
  `create table if not exists settings (
     key        text primary key,
     value      text not null,
     updated_at timestamptz not null default now()
   )`,

  // Things said once that have to hold afterwards — where they are, what not to
  // assume, how to talk to them.
  //
  // Deliberately not a jsonb blob on the day row: a standing note is the one kind
  // of memory whose whole job is to outlive the day it was said on, and the day
  // row is scoped to a date. It is also the table most likely to be read by a
  // person wondering why the app believes something, which is a reason to keep it
  // as rows rather than inside a document.
  `create table if not exists standing_notes (
     id               text primary key,
     kind             text not null,
     -- Named note rather than text: a column called text, of type text, is legal
     -- and reads badly everywhere it appears in a query.
     note             text not null,
     raw              text not null,
     created_at       timestamptz not null default now(),
     last_affirmed_at timestamptz not null default now(),
     affirmed_count   int not null default 1,
     retired_at       timestamptz
   )`,
  // Retired notes stay as rows so that "you used to say X" is answerable, but
  // every read filters them out.
  `create index if not exists standing_notes_live_idx on standing_notes (retired_at) where retired_at is null`,

  // What the household turns out to believe about food itself, as distinct from
  // the general assumptions the library ships with. Seeded from the library on
  // first boot and topped up on later boots, so a new assumption in code arrives
  // without overwriting one they have since corrected.
  `create table if not exists associations (
     id             text primary key,
     kind           text not null,
     subject        text not null,
     objects        text[] not null,
     source         text not null,
     confidence     double precision not null,
     observed_count int not null default 0,
     updated_at     timestamptz not null
   )`,
]
