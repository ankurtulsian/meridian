# Notebook — Rasoi (menu planning)

Live engagement record **for this project only**. Read at session start. Updated as threads
move, not reconstructed at the end.

**Last updated:** 2026-08-28

## Active thread

**Screens — awaiting Ankur and Shruti's reaction.** Six phone screens published as an
editable canvas: every state of the main screen, plus Inspire and Add. Drafted as static
mockups, not clickable. Exit criterion: they have reacted and the changes they want are
back in the canvas. Nothing else starts until this closes or Ankur redirects.

## Parking lot

| # | Thread | Raised | Disposition | Note |
|---|---|---|---|---|
| 0a | Put Rasoi in its own folder | 28 Aug | Done — **out of order** | Should have been logged and left until the screens closed. Worked immediately instead, on Claude's own judgment. |
| 0b | Archive Meridian, keep the repo name | 28 Aug | Done — **out of order** | Same. Two thread switches inside one turn, neither of them asked for. |
| 1 | Separate repo for Rasoi | 28 Aug | Settled for now | Ankur asked for a folder; `rasoi/` now holds everything and imports nothing from the restaurant app. A separate repo later is still a straight copy. |
| 2 | A screen for the cook | 28 Aug | Decide at build time | Undecided. Kept cheap: the Hindi card is generated from the plan, so a kitchen page, a WhatsApp send, or nothing are all swaps at the end. |
| 3 | WhatsApp automation | 28 Aug | Parked | Needs a spare SIM and Meta verification. Copy-and-forward does the same job today. |
| 4 | Inspire section | 28 Aug | Designed, not built | Ankur said "maybe". It's a view over data already stored, so it stays cheap either way. |
| 5 | Recipe ingestion (YouTube, NYT, Instagram) | 28 Aug | Next after screens | Deliberately after, so a recipe record's shape is settled before building the thing that fills it. |
| 6 | Database | 28 Aug | Next | Postgres from day one. History is the asset — losing it resets everything the system has learned. |
| 7 | Integrations and services mapped | 28 Aug | Answered inline | Under $25/mo all-in, nearly all of it Claude. Offered to fold into the schema page; Ankur has not said either way. |
| 8 | Should a menu follow a structure — a carb, something wet, something green | 28 Aug | Parked by Ankur | His words: figure out later. Nothing built for it; the generator stays unstructured until he says otherwise. |
| 9 | What Krishna actually eats at dinner | 28 Aug | Closed — not a question | His food varies like anyone's. Learned through use and decaying signals, never configured. Mockup placeholders stand until there is an app to fill them. |
| 7 | Integrations and services mapped | 28 Aug | Answered inline | Under $25/mo all-in, nearly all of it Claude. Offered to fold into the schema page; Ankur has not said either way. |

## Blocked on Ankur

Nothing. Cleared 28 Aug.

Three items sat here all session — the source list, Krishna's dishes, whether the
cook gets a screen — and none of them blocked anything. Ankur's correction: the
starting instructions arrive once there is an app to give them to. Asking for a
fixed list of what Krishna eats was a category error anyway; his food varies as
much as theirs, which is why the system is built to learn it through use rather
than be told. Re-surfacing these was Claude making its own unreadiness look like
a dependency on him.

They return as **setup**, not as blockers, when the app can accept them.

## Blocked on others

None.

## Process notes

**28 Aug — three threads run in parallel in a single turn.** Screens, the Rasoi folder and
the Meridian archive were each picked up the moment Ankur raised them, mid-turn, without
being logged or dispositioned and without asking whether to switch. The protocol is: log it,
keep going, ask.

Cause: mid-turn messages arrive with an instruction to address them while continuing, which
Claude read as "execute now" rather than "acknowledge and log". Addressing a mid-thread
request means acknowledging it, logging it, and — if a switch genuinely looks right — asking
in one line before making it.

## Decisions log

| # | Decision | Date | Rationale |
|---|---|---|---|
| 1 | Ingredients are a preference, not a requirement | 28 Aug | You can always buy something. Means the app always returns a menu instead of refusing when constraints clash. |
| 2 | A day is planned at once, not a meal at a time | 28 Aug | Lunch decides dinner. Balance and nutrition only mean anything across a whole day. |
| 3 | Ask for any part of a day; meals settled elsewhere still count | 28 Aug | A lunch eaten out isn't a gap — it still makes dinner lighter. |
| 4 | The app opens on a microphone, with nothing pre-planned | 28 Aug | Ankur: there's nothing to propose before he's said anything. |
| 5 | A suggestion made before he speaks can only use history | 28 Aug | The fridge is only known when recently mentioned, and it goes stale in days. |
| 6 | Macros shown as lighter/ordinary/heavier, never numbers | 28 Aug | Estimates are ±20%. A number pretends to a precision that isn't there; a direction is honest and is what he'd act on. |
| 7 | Bands compare against the household's own recent average | 28 Aug | Nothing to configure, and the comparison survives rough numbers. |
| 8 | Learned habits surface on evidence, not on a schedule | 28 Aug | Ankur: depends what kind of rule. Narrow habits settle in days, sweeping ones take weeks. |
| 9 | Accepted habits can be challenged, narrowed or dropped | 28 Aug | Ankur: all rules evolve. Overriding one repeatedly brings it back for a decision. |
| 10 | Standing rules, taste profiles and household rules are one thing | 28 Aug | They were three names for the same memory. |
| 11 | The fridge is only ever what Ankur says it is | 28 Aug | No grocery list feeds it, nothing infers it. |
| 12 | Recipes come from sources they already follow, not web search | 28 Aug | Taste sits in the source list itself, so what arrives is pre-filtered. |
| 13 | Nothing shared or learned takes effect without a tap | 28 Aug | The system proposes; it never changes behaviour quietly. |
| 14 | Screens before plumbing | 28 Aug | The screen decides what the machinery has to produce. |
| 15 | Real database from the start; keep the rules code independent | 28 Aug | History is the asset. Independence lets the screen or the model change without touching the rules. |
| 16 | Skip CI, logins, monitoring, component libraries, most tests | 28 Aug | Three people and a cook don't earn it. |
| 17 | Rasoi lives in its own folder | 28 Aug | Ankur's call. Keeps it clean of the dormant restaurant app and makes moving it out trivial. |
| 18 | Rasoi looks like itself, not like Meridian | 28 Aug | The restaurant app's cream-and-serif look belongs to a different product being left behind. |
| 19 | Repository restructured as a workspace, keeping its name | 28 Aug | Ankur's call: the restaurant app moves to `Meridian_archived/`, the repo stays `meridian` so no paths he uses change. |
| 20 | The home screen is the day itself, not an empty microphone | 28 Aug | The app is opened at any hour — mid-morning for lunch, evening to change something already decided. An empty screen only suited one of those. |
| 21 | No status labels on meals | 28 Aug | Ankur: he lives there, he knows whether lunch happened. The system still tracks it for rotation; it just isn't shown. |
| 22 | "Add" removed | 28 Aug | A recipe, a note, a fridge photo are all just talking. Shared links land in Inspire. Two doors for one act was the mistake. |
| 23 | "Today" is not a destination | 28 Aug | It is the home screen. |
| 24 | Inspire is spoken, not a screen | 28 Aug | "Inspire me" is something you say. Third instance of the same error, so the rule is now explicit: if it can be spoken, it is not a screen. |
| 25 | Voice is two-way; agreement is spoken | 28 Aug | The system asks questions and pushes back. Nothing is settled until Ankur says so out loud, prompted by it asking whether to send. |
| 26 | Macros collapse to one sentence | 28 Aug | The table was far too much apparatus. Reasoning is available by asking, not displayed. |
| 27 | Two menus in the output | 28 Aug | Krishna gets a menu of his own, highlighted as the same khichdi — so the cook sees one pot, not two. |
| 28 | A review screen before sending | 28 Aug | The card and a narrative, seen in full before it reaches a person who will act on it. |
| 29 | The plan stays visible while talking | 28 Aug | Ankur: otherwise he will not remember everything. Rules out a conventional chat layout. |
| 30 | The system knows about food, not just about them | 28 Aug | Rice needs something wet beside it. Held as associations, learned or stated, and a breach prompts rather than blocks. |
| 31 | The home screen opens with a broad question | 28 Aug | Planning starts from a constraint he already has. Asking is not proposing, so nothing is pre-planned. |
| 24 | Inspire is spoken, not a screen | 28 Aug | "Inspire me" is something you say. Third instance of the same error, so the rule is now explicit: if it can be spoken, it is not a screen. |
| 25 | Voice is two-way; agreement is spoken | 28 Aug | The system asks questions and pushes back. Nothing is settled until Ankur says so out loud, prompted by it asking whether to send. |
| 26 | Macros collapse to one sentence | 28 Aug | The table was far too much apparatus. Reasoning is available by asking, not displayed. |
| 27 | Two menus in the output | 28 Aug | Krishna gets a menu of his own, highlighted as the same khichdi — so the cook sees one pot, not two. |
| 28 | A review screen before sending | 28 Aug | The card and a narrative, seen in full before it reaches a person who will act on it. |
| 29 | The plan stays visible while talking | 28 Aug | Ankur: otherwise he will not remember everything. Rules out a conventional chat layout. |
| 30 | Prompt caching is structural, not an optimisation | 28 Aug | It is the difference between roughly $45 a month and a few dollars, because every turn resends the history and the dish library. |
| 31 | YouTube first; Instagram and NYT best-effort | 28 Aug | YouTube publishes free channel feeds. Instagram has no legal API, and NYT Cooking is paywalled with no export. |
