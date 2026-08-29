# Deploying Rasoi

Rasoi lives in `rasoi/` inside a repository named `meridian` — a historical name, kept so
existing paths keep working. That one fact drives most of the settings below: Vercel has to
be told to build from the subfolder. Pointed at the repository root it finds no application
at all and the build fails with `Couldn't find any \`pages\` or \`app\` directory`. This is
not hypothetical — it is exactly how the first two deployments failed.

## Settings

| Setting | Value | Why |
|---|---|---|
| Project name | `rasoi` | A separate `meridian` project already exists in the same Vercel account |
| Framework | Next.js | Auto-detected; no `vercel.json` is needed |
| Root directory | `rasoi` | The app is not at the repository root |
| Production branch | `main` | Rasoi is the repository's main line |

## Environment variables

| Variable | Required | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | For real conversation | The app runs on its built-in stub replies instead of crashing |
| `DATABASE_URL` | Yes | Every request returns a sentence naming the missing variable, not a stack trace |
| `DATABASE_URL_UNPOOLED` | No | Schema creation runs through the pooler instead of the direct endpoint. Idempotent and single-transaction, so expected to be fine — Neon's own Vercel integration sets it for you |

The build itself needs none of them: it succeeds with the variables absent, so a missing key
is a clear message at runtime rather than a failed deploy.

## Two ways to do it

**Through the dashboard.** vercel.com → Add New → Project → import `ankurtulsian/meridian`
→ set Root Directory to `rasoi` → add the variables above → Deploy.

**Through the API**, which is what `scripts/deploy.sh` does. It exists because a container
without npm access cannot install the `vercel` CLI, but can still reach `api.vercel.com`:

```bash
VERCEL_TOKEN=…  ANTHROPIC_API_KEY=…  DATABASE_URL=…  ./rasoi/scripts/deploy.sh
```

It creates the project (or reuses it), sets whichever variables are supplied, starts a
production deployment from `main`, waits for the build and prints the URL. Values are read
from the environment and never written to disk.

## Day one

An empty database means four dashes, "Nothing decided yet today", and no findings. After the
first dinner it says there is not enough history to compare against. That is honest rather
than broken — it starts being useful around day four.
