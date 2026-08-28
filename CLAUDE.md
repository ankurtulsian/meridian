# Meridian

This repository currently holds two unrelated things. They share a Next.js app and nothing
else.

## Rasoi — daily menu planning (active work)

A household menu planner for Ankur, Shruti and Krishna, with instructions handed to a cook
who reads and speaks Hindi. The design is recorded in a service schema published as an
artifact; the notebook tracks what is decided and what is open.

`src/lib/menu/` holds the domain model and is deliberately **pure** — it imports nothing,
calls nothing, and knows about neither React nor any model API. Keep it that way: it is what
lets the screen or the model change without disturbing the rules, and it is testable without
mocking anything.

| File | Holds |
|---|---|
| `types.ts` | Domain model — dishes, diners, day plans, edits, rules, sources |
| `scoring.ts` | Ranking. Gates are rare; nearly everything is a weighted preference |
| `validate.ts` | Deterministic checks across a whole day, separate from generation |
| `request.ts` | The live request as explicit state, so contradictions surface |
| `rules.ts` | How a repeated tweak becomes a habit, and how habits are challenged |
| `flavour.ts` | Macros as lighter/ordinary/heavier against the household's own average |
| `seed.ts` | The three diners and the assumed-stocked staples |

Two principles run through it: the system never claims to know more than it does, and it
proposes rather than silently applying.

## Meridian — Dubai restaurant concierge (dormant)

`src/app`, `src/components` and the rest of `src/lib` are an earlier, unrelated project.
Not under active development.

## How we work

@.claude/working-style.md

@.claude/notebook.md
