# Notebook — Meridian

Live engagement record **for this project only**. Read at session start. Updated as threads
move, not reconstructed at the end. Protocol: `.claude/working-style.md`.

**Last updated:** 2026-08-28

---

## Active thread

**T2 — Multi-project setup standard**
*Exit criterion:* Ankur can start a new project and have the working style, a fresh
notebook, and the check-in skill in place without reconstructing them by hand. Includes
deciding where the universal working style lives versus what stays per-project.
*Status:* scoping. Recommendation given; awaiting Ankur's direction.

---

## Parking lot

| # | Thread | Raised | Disposition | Note |
|---|---|---|---|---|
| T1 | Establish the working style | 2026-08-28 | Substantially done | Protocol written, wired, committed. Amended twice on 2026-08-28. Still open: Ankur's redline of the calibration guesses. |
| P1 | Session-start hook to force-rehydrate the notebook | 2026-08-28 | Parked — proposal | `CLAUDE.md` import covers this today. Stronger guarantee available if the import proves unreliable. Not built; still awaiting Ankur. |
| P2 | Whether this working style should extend to Cowork | 2026-08-28 | Dropped by Ankur | Scoped to Claude Code. Re-open if relevant. |

---

## Blocked on Ankur

1. **Install the working style at user level on his own machine.** Cannot be done from a
   remote session — this container is wiped when the session ends. Until then the protocol
   applies to Meridian only.
2. **T2 direction** — is a reusable project-starter worth building, or is copying the two
   files into each new project good enough?
3. **P1** — build the session-start hook, or leave rehydration to the `CLAUDE.md` import?
4. **Redline `.claude/working-style.md`** — specifically the check-in trigger thresholds
   and the scope exception. Both are guesses awaiting real use.

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
