# Notebook — Meridian

Live engagement record **for this project only**. Read at session start. Updated as threads
move, not reconstructed at the end. Protocol: `.claude/working-style.md`.

**Last updated:** 2026-08-28

---

## Active thread

**T3 — Content review of the working style**
*Exit criterion:* every rule Ankur has not explicitly said is either confirmed by him,
reworded, or removed — so nothing in the document is Claude's unreviewed interpretation.
*Status:* Pile A (six places Claude had granted itself permission) rewritten and approved.
Pile B (five principles Claude added) awaiting review.

---

## Closed this session

**T2 — Multi-project setup standard**
*Exit criterion:* Ankur can start a new project and have the working style, a fresh
notebook, and the check-in skill in place without reconstructing them by hand.
*Status:* closed. Ankur works in the browser only, so there is no one-time install — each
project gets its own copy of the working style, notebook, and check-in skill, and Claude
does the copying unprompted on the first session in any project lacking a notebook.

---

## Parking lot

| # | Thread | Raised | Disposition | Note |
|---|---|---|---|---|
| T1 | Establish the working style | 2026-08-28 | Substantially done | Protocol written, wired, committed. Amended twice on 2026-08-28. Still open: Ankur's redline of the calibration guesses. |
| P1 | Session-start hook to force-rehydrate the notebook | 2026-08-28 | Parked — proposal | `CLAUDE.md` import covers this today. Stronger guarantee available if the import proves unreliable. Not built; still awaiting Ankur. |
| P2 | Whether this working style should extend to Cowork | 2026-08-28 | Dropped by Ankur | Scoped to Claude Code. Re-open if relevant. |

---

## Blocked on Ankur

1. **Redline `.claude/working-style.md`** — the check-in trigger thresholds and the scope
   exception are guesses awaiting real use. Not urgent.
2. **P1** — session-start hook. Low priority; the current mechanism works.

*Nothing here is urgent and nothing blocks progress.*

## Blocked on others

*(none)*

---

## Decisions log

Closed items. Recorded so they are not relitigated.

| # | Decision | Date | Rationale |
|---|---|---|---|
| D1 | Objectives govern; rules are implementations of them | 2026-08-28 | Ankur's explicit concern: Claude acting on literal wording rather than intent |
| D2 | Serial with Ankur, parallel underneath | 2026-08-28 | Resolves one-topic focus vs. agent fan-out — different layers |
| D3 | Standing authorization for Claude to use agents on project work | 2026-08-28 | Maker/checker model requires it |
| D4 | Applies to all work, not just multi-workstream projects | 2026-08-28 | "Governing one workstream is still governing" |
| D5 | Notebook lives in the repo, not in conversation context | 2026-08-28 | Sessions and containers are reclaimed |
| D6 | Claude may take quiet time, with stated scope and return | 2026-08-28 | Trades against visibility; the announcement is the price |
| D7 | One notebook per project; working style is universal | 2026-08-28 | Parallel projects must not bleed together, but the protocol should not be re-established per project |
| D8 | Default to executive-summary register, not technical phrasing | 2026-08-28 | Ankur is a business professional with no PM translating |
| D9 | `/check-in` skill approved as written | 2026-08-28 | Ankur confirmed |
| D10 | No project-starter tooling until 3-4 projects exist | 2026-08-28 | Shape is unknown; a new project needs only a notebook, which is seconds of work |
| D11 | Questions must be free of Claude-coined jargon and must not re-ask settled intent | 2026-08-28 | Claude asked Ankur to choose between two invented labels; one was already decided |
| D12 | Ankur uses Claude in the browser/app only | 2026-08-28 | Confirmed directly; invalidates any setup step requiring a local machine |
| D13 | Claude copies the setup into each new project unprompted; D10 superseded | 2026-08-28 | No shared machine exists to install to, and asking Ankur to request it would make his memory the bottleneck |
| D14 | Claude acts alone on small reversible things; asks on anything changing direction | 2026-08-28 | Ankur's call. Switching threads and going quiet now need his say-so; notebook setup and check-ins do not |
| D15 | Global reach is via an instruction set saved to Ankur's account, not a global CLAUDE.md | 2026-08-28 | Verified: no global CLAUDE.md reaches browser sessions; account-saved skills do. Blocked on content being settled first |
| D16 | Nothing about how we work is committed on Claude's interpretation — wording is shown, then approved, then written | 2026-08-28 | Six amendments had been committed without Ankur confirming a single one captured his intent |
