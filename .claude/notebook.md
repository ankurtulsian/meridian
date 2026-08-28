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
| 2 | A screen for the cook | 28 Aug | Blocked on Ankur | Undecided. Kept cheap: the Hindi card is generated from the plan, so a kitchen page, a WhatsApp send, or nothing are all swaps at the end. |
| 3 | WhatsApp automation | 28 Aug | Parked | Needs a spare SIM and Meta verification. Copy-and-forward does the same job today. |
| 4 | Inspire section | 28 Aug | Designed, not built | Ankur said "maybe". It's a view over data already stored, so it stays cheap either way. |
| 5 | Recipe ingestion (YouTube, NYT, Instagram) | 28 Aug | Next after screens | Deliberately after, so a recipe record's shape is settled before building the thing that fills it. |
| 6 | Database | 28 Aug | Next | Postgres from day one. History is the asset — losing it resets everything the system has learned. |

## Blocked on Ankur

| # | Needed | Why it matters |
|---|---|---|
| 1 | Which channels, creators and publications to follow | This list *is* the taste filter. Nothing sensible gets suggested without it. |
| 2 | What Krishna genuinely won't eat, and any allergies | The only hard rules in the system. Everything else is a preference that bends. |
| 3 | Whether the cook gets his own screen | Changes nothing upstream; only decides where the Hindi card is delivered. |

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
