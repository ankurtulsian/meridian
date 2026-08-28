# Screens

The `.dc.html` files are the source — one per screen — and `canvas.json` places them on the
canvas. Everything else here is generated and git-ignored.

| File | |
|---|---|
| `Main.dc.html` | Opening screen: the day so far, and the microphone that changes it |
| `Proposed.dc.html` | The day it comes back with, and how that day reads |
| `Sparring.dc.html` | Pushing back — a new instruction that displaces an earlier one |
| `Handover.dc.html` | The Hindi card for the kitchen |
| `Inspire.dc.html` | Browsing: neglected, untried, and new from who you follow |

Screens are static mockups. Colours and type follow the service schema, not the archived
restaurant app.

## Rebuilding

The editable canvas is assembled by the `design` skill's helper from these files:

```
node "<skill>/seed-canvas.mjs" --template "<skill>/payload.template.html" \
  --out rasoi-screens.html --title "Rasoi Screens" \
  --artboard Main.dc.html --artboard Proposed.dc.html --artboard Sparring.dc.html \
  --artboard Handover.dc.html --artboard Inspire.dc.html \
  --canvas canvas.json
```

It bakes in a ~2.4 MB editor, which is why the result is not committed. Publishing that file
to the same artifact URL updates the canvas in place.
