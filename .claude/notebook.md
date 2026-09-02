# Notebook — Rasoi (menu planning)

Live engagement record **for this project only**. Read at session start. Updated as threads
move, not reconstructed at the end.

**Last updated:** 2026-08-29

## Active thread

**Deploy — done and green. Two decisions outstanding before it is genuinely usable.**

*Exit criterion:* a live URL Ankur opens on his phone, serving Rasoi from `rasoi/`, with the
Anthropic key and the Neon string held in Vercel rather than in the repository. **Met, with
one unverified step noted below.**

**Live at https://rasoi-phi.vercel.app** (project `rasoi`, team `ankur-tulsian-s-projects`).
Two production builds green: one on the deploy prep, one on the restaurant-app deletion.

**What was actually wrong.** Not the environment, not the keys, not the code. The Vercel
project had no root directory set, so it built the repository root, read the wrong
`package.json` and failed with `Couldn't find any pages or app directory`. Two earlier
deployments had already died that way. Setting `rootDirectory` to `rasoi` fixed it first try.

**What the handoff got wrong, recorded so the next session does not repeat the search.**
- Vercel was assumed unreachable. It is reachable — the 403 from `api.vercel.com` is Vercel's
  own "missing authentication token", not the egress policy.
- The keys were assumed missing. `ANTHROPIC_API_KEY` and `DATABASE_URL` were already on the
  project, both sensitive, both scoped to production. Ankur was asked for them unnecessarily.
- npm **is** blocked — a flat 403 on the registry — so the `vercel` CLI cannot be installed
  and nothing here can be built or type-checked. The REST API over curl replaces it, and
  Vercel's own builders install the dependencies.

**Not verified, and it should be said plainly.** `*.vercel.app` is blocked by this
container's egress policy, so the deployed page has never been opened from here. The build
compiled and deployed; nobody has yet seen Rasoi render. Ankur is the first.

**Blocking real use — Vercel Authentication is on** (`ssoProtection: all_except_custom_domains`).
The URL sits behind a Vercel login, so Shruti cannot open it and neither can the cook.
Turning it off makes the link itself the only access, since Rasoi has no login of its own.
Ankur's call; asked 29 Aug, not yet answered.

**Learned the hard way, 31 Aug:** a push to this branch builds but does not go live. Vercel
only moves the production alias when something explicitly promotes it, and for a while
`rasoi-phi.vercel.app` was serving a commit from before the memory work while three green
builds sat unused. Until the branch is on `main`, every deploy needs an explicit production
push — which is itself the best argument for merging.

**Open, and Ankur's call:** the placeholder register. Sixteen invented numbers, none marked
as provisional, including the three flexibility scores that decide how much Shruti and
Krishna get accommodated when tastes collide. His framing, and it is sharper than the one
first written here: the failure is not inventing a value, it is using a placeholder and
forgetting it was one. Proposed fix is to make them declare themselves in code so adding one
costs a sentence about what would settle it. Not started.

**Still to do:** fold this branch into `main`. Ankur approved it; the deploy was run from the
branch first so a broken build could not land on the main line. Now that two builds are
green there is no reason to wait.

---

**Restaurant app deleted — done, and the build survived it.**

Delegated to an agent, which is how it should have been done from the start. The agent
deleted the app and rewrote `README.md`, `CLAUDE.md` and `.gitignore` cleanly, then hit a
usage limit before committing. Its work was checked rather than taken on trust: three stale
references it never reached were fixed by hand, `rasoi/` was confirmed untouched and
self-contained, and a fresh production build was run afterwards specifically to prove the
deletion broke nothing. It is green.

The notebook's decisions log and process notes were deliberately left intact. Decision 39
records the deletion and supersedes 19 rather than rewriting it.

## About Ankur

Facts that every session needs and that were never written down. The absence of this
section is why "Delhi" survived a week: it was invented in a WIP commit, hardcoded in the
prompt and the timezone constant, and never recorded as a decision — so there was nothing
for a later session to check it against.

| Fact | Source | Confidence |
|---|---|---|
| Lives in **Dubai** | Said it directly, 31 Aug, correcting Rasoi | Stated by Ankur |
| The **kitchen** is in Dubai too — cook, Shruti, Krishna | Said it directly, 31 Aug | Stated by Ankur |
| Household is Ankur, Shruti and their son Krishna | Throughout | Stated by Ankur |
| Cook reads and speaks Hindi | Throughout | Stated by Ankur |
| Works in the browser only; no local machine | Decision D12 | Stated by Ankur |

Nothing here is inferred. Anything that cannot be sourced to Ankur saying it does not belong
in this table — that is the entire lesson of the Delhi episode.

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
| 6 | Database | 28 Aug | Deferred past the slice | Still Postgres, still because history is the asset. Held behind a one-file interface until there is history worth keeping. |
| 11 | Meridian's Google Maps key reaches the browser | 29 Aug | **Still open — files gone, key not revoked** | `Meridian_archived/src/lib/places.ts` builds photo URLs with `key=<the API key>` and sends them to the client, so anyone opening that app could read it and spend Ankur's Google credit. Not urgent: the app is archived and is not being deployed. The key is live in his Google account regardless, and is in the repository's history. Raised with Ankur 29 Aug, who had no preference while it was the app going live; the question is now whether to fix or leave. **Updated 29 Aug:** the restaurant app was deleted from the working tree, so nothing in the repository now hands the key to a browser. That is not a fix. The key is still live in Ankur's Google Cloud account, and it is still readable in this repository's git history — deleting a file does not remove it from the commits that contain it. Revoking or restricting the key remains an action only Ankur can take. |
| 10 | Screens — Ankur and Shruti's reaction | 28 Aug | Open | Four artboards reviewed and rendered. No reaction yet from either of them; the slice is being built against them meanwhile. |
| 7 | Integrations and services mapped | 28 Aug | Answered inline | Under $25/mo all-in, nearly all of it Claude. Offered to fold into the schema page; Ankur has not said either way. |
| 8 | Should a menu follow a structure — a carb, something wet, something green | 28 Aug | Parked by Ankur | His words: figure out later. Nothing built for it; the generator stays unstructured until he says otherwise. |
| 9 | What Krishna actually eats at dinner | 28 Aug | Closed — not a question | His food varies like anyone's. Learned through use and decaying signals, never configured. Mockup placeholders stand until there is an app to fill them. |
| 7 | Integrations and services mapped | 28 Aug | Answered inline | Under $25/mo all-in, nearly all of it Claude. Offered to fold into the schema page; Ankur has not said either way. |

## Blocked on Ankur

**Confirmed working, 31 Aug.** Ankur has had several conversations with Rasoi. That is the
first evidence the app runs end to end — every earlier report was "the build compiled",
which is a far weaker claim and was repeatedly treated as a stronger one. The replaced
Anthropic key works.

**New thread — auditing the conversations.** Ankur's framing: the whole value is in the
conversation and the intelligence of the voice, so he wants Claude able to read the sessions
and help improve them.
*Exit criterion:* Claude can read past conversations and give specific, evidenced feedback on
the voice — not impressions.
*What is already true:* nothing needs building. `days.turns` stores both sides of every
conversation as jsonb, per day, and `days.request` keeps the constraints and what was said.
Both `addTurn('user', …)` and `addTurn('assistant', …)` are written on every turn.
*The blocker is access, not data.* `DATABASE_URL` is sensitive on Vercel and its value cannot
be read back, so it has to come from Ankur. `psql` is installed here and `neon.tech` is
reachable, so the string is sufficient.
*Raised with him and not yet settled:* pasting it means a live database password in the chat,
and it does not survive into the next session — he would re-paste every time, which is the
exact failure the working style exists to prevent. The durable fix is adding Neon as a
connector on his Claude account, done once, giving every future session query access. That
cannot be set up from this container.
*Claude got this wrong first:* asserted there was probably nothing to audit because no
successful conversation was known of. That was an assumption stated as fact; he corrected it.

**29 Aug — the first real request failed, and it should not have been Ankur who found out.**
Nothing in this project had ever run. The build compiling was reported accurately, but it was
treated as though it meant more than it did: npm is blocked so nothing could be type-checked
or run, `*.vercel.app` is blocked so the page could never be opened, and every earlier test
ran against PGlite and a stubbed model. The first genuine call to Anthropic happened when
Ankur tapped the app, and it returned a raw 400 to his screen.

Two separate faults, worth keeping apart:
- *The key.* It was identity-linked — tied to him rather than to a workspace — and that kind
  refuses to act until told which workspace it is acting in. Replaced 31 Aug and redeployed.
- *The handling.* Anthropic's 400 reached the screen as JSON. Now translated into a sentence
  naming the variable and where to change it, in the same register as `MissingDatabaseUrl`.

Also learned, and the cause of one wasted round trip: **a Vercel environment variable does
nothing until the project is redeployed** — the value is bound at build time. And setting a
key in Anthropic's console is not setting it in Vercel; the first time, it never left the
console.

**29 Aug — four decisions were put to him at once and he said he was lost.** That is a
process failure, not his. Everything below was raised as a live question when none of it was
urgent; the objective is that his working memory is never the bottleneck, and queuing four
open decisions did the opposite. All four are now parked with a call made, so they return
only when they matter.

*Optional, whenever he likes:*

1. **Revoke the deploy token** at vercel.com/account/settings/tokens. It passed through the
   chat and is no longer needed. The only item with any real reason to happen soon.

*Parked with a decision made, to be re-raised when the trigger arrives:*

2. ~~**Vercel Authentication**~~ — **closed 29 Aug. Turned off, at Ankur's request, to bring
   Shruti in.** Verified off by reading the setting back fresh. The team is on Vercel's Hobby
   plan, which cannot add members at all, so inviting her would have meant upgrading to Pro at
   roughly $20/month — the alternative was not free, and was not worth it for one person.
   The consequence, stated to him: the URL is now the only access, so anyone holding it can
   use Rasoi and spend his Anthropic credit. Mitigation suggested — a spend cap on the
   Anthropic key, which converts that exposure from an open-ended bill into a stopped app.
   Not verified from here: `*.vercel.app` is blocked by this container's egress policy, so
   the public page has never been fetched. Shruti opening it is the real test.
3. **Fold the branch into `main` — held.** He approved it and both builds are green, so it is
   ready whenever. Nothing breaks by waiting.
4. **The Google Maps key.** Still live in his Google Cloud account and still in this
   repository's history. The app it belonged to is deleted and running nowhere, so the
   exposure is dormant. Only he can revoke it.
5. **The old `meridian` Vercel project** still exists. Cosmetic.

*Cleared: the Neon string and the Anthropic key were never actually needed — both were
already on the Vercel project.*

---

*Earlier, now closed:*

1. ~~**A Vercel token**~~ — vercel.com → avatar → Settings → Tokens. Nothing deploys without it.
2. **The Neon connection string** (`DATABASE_URL`). Not in the repository and the old
   container is gone, so it has to come from him. Without it the app loads and then reports
   the missing variable on every request.
3. **The Anthropic key.** Without it the app runs on stub replies rather than real
   conversation — usable, but not the real thing.

*All three are one message. Nothing else is waiting on him.*

---

*Earlier: cleared 28 Aug.*

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

**29 Aug — a finding was logged, then destroyed by a rebase.** The Meridian API-key exposure
was written into Meridian's notebook on a branch based on `main`, committed and pushed. That
branch was then reset onto this one and force-pushed, taking the only record with it. Nothing
re-checked that the finding survived; it was recovered only because Ankur asked whether the
working style had been read.

Cause: the notebook was treated as a file like any other, so ordinary git tidying was allowed
to discard it. A note that exists only in a commit that may be rewritten is not durable.
Anything logged before a rebase gets re-checked after it.

**31 Aug — "Delhi" was invented and survived a week because nothing recorded it.**
Ankur asked where Delhi came from. It came from Claude: it entered in `6427662 WIP: thin
vertical slice, mid-review`, was hardcoded in the first line of the system prompt and in
`ZONE`, and carried a confident comment explaining why it mattered. No decision in any
version of this notebook mentions a location. Ankur was never asked.

It then produced the failure he actually saw — Rasoi telling him lunch had gone at four,
Indian time, while he was in Dubai at 2:30.

Cause, and it is the same one as the invented thresholds: a plausible specific was written
down as though it had been settled. The guard is the About Ankur table above — a fact about
him is either sourced to him saying it, or it is not recorded as a fact.

**29 Aug — the protocol was held in context but not invoked.** The skill was never run, no
session-start check-in was run, and the copy loaded from `main` turned out to be older than
this branch's. Having the text in context was treated as equivalent to following it.

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
| 32 | Code ranks and checks; the model converses and writes | 28 Aug | Handing the library to the model and asking for a menu makes it do rotation arithmetic badly and drift. This split is why the rules code is pure. |
| 33 | Prompt caching is structural, not an optimisation | 28 Aug | It is the difference between roughly $45 a month and a few dollars, because every turn resends the history and the dish library. |
| 34 | Associations are checked per meal, not per day | 28 Aug | Rice at lunch was silently answering a dal at dinner. What sits beside a dish is a fact about that meal. |
| 35 | Findings never contradict the plan they sit under | 28 Aug | It advised adding a dal while a dal was planned. The observation survives; only the advice is withdrawn. |
| 36 | Staples are exempt from repeat warnings, not from ranking | 28 Aug | Roti is made daily; warning about it trains you to ignore findings. It still sinks in the ranking. |
| 37 | A dish's place in the rotation is its own property | 28 Aug | Not its ingredients — khichdi is made entirely of staples and is still worth rotating. |
| 38 | Ranking orders the field; it never shortens it | 28 Aug | Ankur's worry about invented weights. A wrong weight should cost sort order, not silently remove half the library from consideration. |
| 42 | The working style's conversational half lives in Rasoi's prompt | 31 Aug | Ankur's request. Nine rules about how he wants to be talked to, imported into the cached prefix; the engagement machinery — triage, delegation, the notebook — deliberately left out, because Rasoi plans dinner rather than running a workstream. Placed in the prompt rather than seeded as standing notes so they cannot be dropped by accident, but anything he says outranks them: the notes are read after this section. |
| 41 | The kitchen is in Dubai; Asia/Dubai is the default, not the truth | 31 Aug | Ankur's answer, asked because Delhi had been invented and nobody could check it. The default in `seed.ts` moves to Asia/Dubai, but the live value lives in the settings table and is changed by telling Rasoi — so the next time it is wrong, it is fixed in the app rather than in a constant nobody thinks to look at. |
| 40 | The link is the access; no login of Rasoi's own | 29 Aug | Ankur's call, to bring Shruti in. Vercel's login was the only gate and it cannot admit anyone outside a paid team. Rasoi has no accounts of its own and does not need them for a household of three — the unguessable URL is the credential. Cost control moves to a spend cap on the Anthropic key rather than to access control. |
| 39 | The restaurant app deleted outright, superseding 19 | 29 Aug | Ankur's call. Archiving still left a dead Next.js app, its dependencies and its config sitting at the repository root, where a build tool or a reader meets it first. The repository keeps the name `meridian`, so nothing Ankur has cloned or bookmarked changes. |
| 24 | Inspire is spoken, not a screen | 28 Aug | "Inspire me" is something you say. Third instance of the same error, so the rule is now explicit: if it can be spoken, it is not a screen. |
| 25 | Voice is two-way; agreement is spoken | 28 Aug | The system asks questions and pushes back. Nothing is settled until Ankur says so out loud, prompted by it asking whether to send. |
| 26 | Macros collapse to one sentence | 28 Aug | The table was far too much apparatus. Reasoning is available by asking, not displayed. |
| 27 | Two menus in the output | 28 Aug | Krishna gets a menu of his own, highlighted as the same khichdi — so the cook sees one pot, not two. |
| 28 | A review screen before sending | 28 Aug | The card and a narrative, seen in full before it reaches a person who will act on it. |
| 29 | The plan stays visible while talking | 28 Aug | Ankur: otherwise he will not remember everything. Rules out a conventional chat layout. |
| 30 | Prompt caching is structural, not an optimisation | 28 Aug | It is the difference between roughly $45 a month and a few dollars, because every turn resends the history and the dish library. |
| 31 | YouTube first; Instagram and NYT best-effort | 28 Aug | YouTube publishes free channel feeds. Instagram has no legal API, and NYT Cooking is paywalled with no export. |
