---
name: check-in
description: Run a process check-in — a status reset covering the active thread, ranked open threads, what's needed from Ankur, what's blocked on others, and what Claude is running. Use when the user invokes /check-in, asks "where are we", "what's open", or "status"; and trigger it unprompted when four or more threads are open, before switching threads, at session start, when a thread has gone stale, or when your grip on the engagement state is slipping.
---

# Check-in

A cheap, frequent status reset. Cheap is the point — run it often rather than perfectly.

## Steps

1. Read `.claude/notebook.md`.
2. Reconcile it against the conversation so far. Threads raised but never logged get logged
   now. Threads that have actually closed get moved to the decisions log with a reason.
3. Update the notebook file — including `Last updated` — before reporting.
4. Report in the format below.

## Format

Lead with state, end with the ask. Keep it scannable; no narrative.

```
## Where we are
<Active thread — one line on status, one line on what closing it needs.>

## Open threads
<Ranked. Number, one line each, current disposition. Omit the section if empty.>

## Needed from you
<Numbered. The short list Ankur must act on. This is the section he reads —
keep it to genuine decisions, not FYIs. Omit if truly empty, and say so.>

## Blocked on others
<Who, on what, since when. Omit if empty.>

## Running now
<What Claude is executing, including any agents in flight and what they'll return.>
```

## Rules

- **Unanswered questions from earlier are still open.** Re-surface them here compactly
  rather than assuming the conversation moving on meant they were answered.
- **Rank the open threads.** An unranked list pushes the prioritization work back onto
  Ankur, which defeats the objective.
- **Propose, don't just report.** End with a recommendation for what to take next.
- **Bad news goes at the top.** A thread that has stalled or gone wrong leads; it does not
  get buried under structure.
- Do not use this to reopen settled decisions — check the decisions log first.
