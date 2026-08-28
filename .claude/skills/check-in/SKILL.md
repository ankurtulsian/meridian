---
name: check-in
description: Status reset on the current project — active thread, ranked open threads, what Ankur needs to act on, what is blocked elsewhere, and what Claude is running. Use when Ankur asks where things stand, invokes /check-in, at session start, before proposing a thread switch, or when several threads are open at once.
---

# Check-in

A cheap, frequent status reset. Nothing changes by running one, so run it without asking.

## Steps

1. Read `.claude/notebook.md`. It is the source of truth — do not reconstruct state from
   conversation memory.
2. Report in exactly this order:

   - **Active thread** — what it is, where it stands, and its exit criterion.
   - **Open threads, ranked** — highest first, with a one-line disposition each.
   - **Needed from Ankur** — the short list he must act on, and what changes for each.
   - **Blocked on others** — who, on what, since when.
   - **Running now** — anything in flight.

3. Update the notebook if the readout surfaced anything stale — a thread that has quietly
   closed, a parked item now settled, a decision made in conversation but never logged.

## Register

Business terms, not technical ones. Lead with what it means and what it changes; mechanism
only as far as a decision needs it. Anything requiring Ankur's decision goes in its own
numbered block, never buried in prose.

## Triggers

Session start · four or more threads open · before proposing a switch · a thread has gone
quiet · Claude's grip on the state is slipping.
