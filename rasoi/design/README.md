# Screens

The `.dc.html` files are the source and `canvas.json` places them on the canvas. Everything
else here is generated and git-ignored.

The inventory is **one screen and one sheet**. Anything you would simply say is not a
destination — that rule has already retired "Add", "Today" and "Inspire". The only thing that
earns a screen of its own is the thing that leaves the conversation entirely: the card that
goes to the cook, in Hindi.

| File | |
|---|---|
| `Main.dc.html` | The day, moment 1 — opened at 4pm, breakfast and lunch behind him, dinner open |
| `Conversation.dc.html` | The day, moment 2 — the pinned plan forming while they talk |
| `Agreeing.dc.html` | The day, moment 3 — converged, and it asks whether to send |
| `Review.dc.html` | The kitchen card — a sheet off the day: menu, narrative, send |

The first three are the same screen at three moments, not three screens. The day card never
scrolls; the conversation scrolls beneath it.

Screens are static mockups. Colours and type follow the service schema, not the archived
restaurant app.

## Rebuilding

The editable canvas is assembled by the `design` skill's helper from these files:

```
node "<skill>/seed-canvas.mjs" --template "<skill>/payload.template.html" \
  --out rasoi-screens.html --title "Rasoi Screens" \
  --artboard Main.dc.html --artboard Conversation.dc.html \
  --artboard Agreeing.dc.html --artboard Review.dc.html \
  --canvas canvas.json
```

It bakes in a ~2.4 MB editor, which is why the result is not committed. Publishing that file
to the same artifact URL updates the canvas in place.
