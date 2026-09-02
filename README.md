# Rasoi

Daily menu planning for the house — what gets cooked, settled by talking rather than by
filling in a form, with the instructions handed to a cook who reads and speaks Hindi.

The repository is named `meridian` for historical reasons: it began as a different app, and
the name was kept so existing clones, paths and bookmarks keep working. That app has been
deleted — only the name remains.

| Path | What it is |
|---|---|
| `rasoi/` | The app. Self-contained: its own `package.json`, its own build. |
| `rasoi/DEPLOY.md` | How it is deployed, and the environment variables it needs. |
| `rasoi/design/` | The phone screens as editable artboards. |

Because the app sits in `rasoi/` rather than at the root, anything building this repository
has to be pointed at that folder. `rasoi/DEPLOY.md` covers it.

See `CLAUDE.md` for how the work is run and `.claude/notebook.md` for what is open.
