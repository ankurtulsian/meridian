#!/usr/bin/env bash
# Deploy Rasoi to Vercel through the REST API.
#
# Why the API and not the `vercel` CLI: the container this runs in cannot reach
# the npm registry, so the CLI cannot be installed. curl can reach
# api.vercel.com, which is enough — every step below is one documented call.
#
# Nothing secret is written to disk or echoed. All three values arrive as
# environment variables and stay in the process:
#
#   VERCEL_TOKEN         required — vercel.com/account/tokens
#   ANTHROPIC_API_KEY    optional — set it later in the dashboard if preferred
#   DATABASE_URL         optional — the Neon connection string
#   DATABASE_URL_UNPOOLED optional — Neon's direct endpoint, used for schema
#                        creation only; falls back to DATABASE_URL when absent
#
#   ./rasoi/scripts/deploy.sh

set -euo pipefail

API=https://api.vercel.com
PROJECT=rasoi
REPO=ankurtulsian/meridian
ROOT_DIR=rasoi
BRANCH="${DEPLOY_BRANCH:-main}"

: "${VERCEL_TOKEN:?set VERCEL_TOKEN (vercel.com/account/tokens)}"

api() {
  local method=$1 path=$2 body=${3:-}
  if [ -n "$body" ]; then
    curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "$API$path" -H "Authorization: Bearer $VERCEL_TOKEN"
  fi
}

# jq is not guaranteed to be present; python3 is.
field() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1','') or '')" 2>/dev/null || true; }
err()   { python3 -c "import sys,json;d=json.load(sys.stdin);e=d.get('error');print(e.get('message','') if e else '')" 2>/dev/null || true; }

echo "==> Checking the token"
who=$(api GET /v2/user)
user=$(printf '%s' "$who" | python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('username','?'))" 2>/dev/null || echo '?')
if [ "$user" = "?" ]; then
  echo "    token rejected: $(printf '%s' "$who" | err)" >&2
  exit 1
fi
echo "    authenticated as $user"

# Scope: a token may belong to a team, in which case every call needs teamId.
TEAM_QS=""
if [ -n "${VERCEL_TEAM_ID:-}" ]; then TEAM_QS="?teamId=$VERCEL_TEAM_ID"; fi

echo "==> Creating the project (or reusing it)"
create=$(api POST "/v11/projects$TEAM_QS" "$(python3 - <<PY
import json
print(json.dumps({
  "name": "$PROJECT",
  "framework": "nextjs",
  "rootDirectory": "$ROOT_DIR",
  "gitRepository": {"type": "github", "repo": "$REPO"},
}))
PY
)")
pid=$(printf '%s' "$create" | field id)
if [ -z "$pid" ]; then
  msg=$(printf '%s' "$create" | err)
  case "$msg" in
    *already\ exists*|*conflict*)
      echo "    project exists; reusing it"
      pid=$(api GET "/v9/projects/$PROJECT$TEAM_QS" | field id)
      ;;
    *)
      echo "    could not create the project: $msg" >&2
      echo "    full response: $create" >&2
      exit 1
      ;;
  esac
fi
echo "    project id $pid"

echo "==> Setting environment variables"
put_env() {
  local key=$1 value=$2
  [ -z "$value" ] && { echo "    $key not supplied — skipping"; return; }
  local out
  out=$(api POST "/v10/projects/$pid/env$TEAM_QS" "$(python3 - <<PY
import json,os
print(json.dumps({
  "key": os.environ["K"],
  "value": os.environ["V"],
  "type": "encrypted",
  "target": ["production", "preview", "development"],
}))
PY
)")
  if printf '%s' "$out" | grep -q '"error"'; then
    local m; m=$(printf '%s' "$out" | err)
    case "$m" in
      *already\ exists*) echo "    $key already set — left as it is" ;;
      *) echo "    $key failed: $m" >&2 ;;
    esac
  else
    echo "    $key set"
  fi
}
K=ANTHROPIC_API_KEY     V="${ANTHROPIC_API_KEY:-}"     put_env ANTHROPIC_API_KEY "${ANTHROPIC_API_KEY:-}"
K=DATABASE_URL          V="${DATABASE_URL:-}"          put_env DATABASE_URL "${DATABASE_URL:-}"
K=DATABASE_URL_UNPOOLED V="${DATABASE_URL_UNPOOLED:-}" put_env DATABASE_URL_UNPOOLED "${DATABASE_URL_UNPOOLED:-}"

echo "==> Deploying $REPO ($BRANCH), root directory $ROOT_DIR"
dep=$(api POST "/v13/deployments$TEAM_QS" "$(python3 - <<PY
import json
org, repo = "$REPO".split("/")
print(json.dumps({
  "name": "$PROJECT",
  "project": "$PROJECT",
  "target": "production",
  "gitSource": {"type": "github", "org": org, "repo": repo, "ref": "$BRANCH"},
}))
PY
)")
url=$(printf '%s' "$dep" | field url)
if [ -z "$url" ]; then
  echo "    deployment not started: $(printf '%s' "$dep" | err)" >&2
  echo "    full response: $dep" >&2
  echo
  echo "    If this says the repository is not connected, the Vercel GitHub app"
  echo "    has not been installed on $REPO. Install it once at"
  echo "    https://vercel.com/account/git and re-run."
  exit 1
fi
echo "    building: https://$url"

echo "==> Waiting for the build"
did=$(printf '%s' "$dep" | field id)
for _ in $(seq 1 90); do
  sleep 10
  state=$(api GET "/v13/deployments/$did$TEAM_QS" | field readyState)
  echo "    $state"
  case "$state" in
    READY)  break ;;
    ERROR|CANCELED)
      echo "    build failed — logs: https://vercel.com/$user/$PROJECT/$did" >&2
      exit 1 ;;
  esac
done

echo
echo "Live: https://$url"
echo "Aliases (the stable address) are listed at https://vercel.com/$user/$PROJECT"
