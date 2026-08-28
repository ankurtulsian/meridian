# Notebook — Meridian

Live engagement record **for this project only**. Read at session start. Updated as threads
move, not reconstructed at the end. Protocol: `.claude/working-style.md`.

**Last updated:** 2026-08-28

---

## Active thread

**T2 — Multi-project setup standard**
*Exit criterion:* Ankur can start a new project and have the working style, a fresh
notebook, and the check-in skill in place without reconstructing them by hand.
*Status:* solved for now. One-time script written and tested. New projects need only a
notebook, generated on request. No reusable starter until 3-4 projects exist — building
one now would be guessing at the shape.

---

## Parking lot

| # | Thread | Raised | Disposition | Note |
|---|---|---|---|---|
| T1 | Establish the working style | 2026-08-28 | Substantially done | Protocol written, wired, committed. Amended twice on 2026-08-28. Still open: Ankur's redline of the calibration guesses. |
| P1 | Session-start hook to force-rehydrate the notebook | 2026-08-28 | Parked — proposal | `CLAUDE.md` import covers this today. Stronger guarantee available if the import proves unreliable. Not built; still awaiting Ankur. |
| P2 | Whether this working style should extend to Cowork | 2026-08-28 | Dropped by Ankur | Scoped to Claude Code. Re-open if relevant. |

---

## Blocked on Ankur

1. **Run `bash .claude/apply-everywhere.sh` once, on his own computer.** Makes the working
   style and `/check-in` apply to every project rather than Meridian alone. Cannot be done
   from a remote session — this container is wiped when the session ends. Safe to re-run.
2. **Redline `.claude/working-style.md`** — the check-in trigger thresholds and the scope
   exception are guesses awaiting real use. Not urgent.
3. **P1** — session-start hook. Low priority; the current mechanism works.

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
