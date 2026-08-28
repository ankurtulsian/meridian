# Notebook

Live engagement record. Read at session start. Updated as threads move, not reconstructed
at the end. Protocol: `.claude/working-style.md`.

**Last updated:** 2026-08-28

---

## Active thread

**T1 — Establish the working style**
*Exit criterion:* protocol written to `.claude/working-style.md`, wired so it loads every
session, notebook seeded, all committed and pushed. Ankur has reviewed and redlined.
*Status:* drafted and wired; awaiting Ankur's redline.

---

## Parking lot

| # | Thread | Raised | Disposition | Note |
|---|---|---|---|---|
| P1 | Session-start hook to force-rehydrate the notebook | 2026-08-28 | Parked — proposal | `CLAUDE.md` import covers this today. A `SessionStart` hook is the stronger guarantee if the import proves unreliable. Not built; awaiting Ankur. |
| P2 | Whether this working style should extend to Cowork | 2026-08-28 | Dropped by Ankur | Scoped to Claude Code during the session. Re-open if it becomes relevant. |

---

## Blocked on Ankur

1. **Redline `.claude/working-style.md`** — particularly the check-in trigger thresholds
   (four open items, stale threads) and the "ridiculous to apply" scope exception. Both are
   guesses that need real use to calibrate.
2. **P1** — build the `SessionStart` hook, or leave rehydration to the `CLAUDE.md` import?

## Blocked on others

*(none)*

---

## Decisions log

Closed items. Recorded so they are not relitigated.

| # | Decision | Date | Rationale |
|---|---|---|---|
| D1 | Objectives govern; rules are implementations of them | 2026-08-28 | Ankur's explicit concern: Claude acting on literal wording rather than intent |
| D2 | Serial with Ankur, parallel underneath | 2026-08-28 | Resolves the tension between one-topic focus and agent fan-out — different layers |
| D3 | Standing authorization for Claude to use agents on project work | 2026-08-28 | Ankur asked for maker/checker; that is the authorization |
| D4 | Applies to all work, not just multi-workstream projects | 2026-08-28 | "Governing one workstream is still governing" — exception only where ceremony exceeds value |
| D5 | Notebook lives in the repo, not in conversation context | 2026-08-28 | Sessions end and containers are reclaimed; context-only state kills the long-project use case |
| D6 | Claude may take quiet time, with a stated scope and return | 2026-08-28 | Trades against visibility, so the announcement is the price |
