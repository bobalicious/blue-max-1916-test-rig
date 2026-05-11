# Blue Max 1916

A hex-based WW1 biplane combat card game — prototyping and playtesting tool.

## Setup

Requires Python 3 (for the local HTTP server). No other dependencies.

```bash
cd blue-max-1916
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in a browser.

## Pages

- **Card Viewer** — [http://localhost:8080](http://localhost:8080) — renders all card decks at print size (1.75" x 2.5")
- **Playtest Rig** — [http://localhost:8080/playtest.html](http://localhost:8080/playtest.html) — interactive hex board with bot opponents, card selection, movement, and combat

## Rules

See [rules.md](rules.md) for the game rules — written for humans playing with physical cards. Covers movement, altitude, combat, damage, repair, special cards, and missions.

See [technical-notes.md](technical-notes.md) for implementation details — step command format, card data structures, hex grid math, bot AI, and aircraft definitions.

## Project Structure

```
index.html              Card viewer (print layout)
playtest.html           Playtest rig (interactive game)
rules.md                Game rules

aircraft/default/       Default biplane definition
  aircraft.json         Name, ceiling, start altitude, deck references
  maneuver.json         Maneuver card deck (13 cards)
  yaw.json              Yaw card deck (7 cards)
  pitch.json            Pitch card deck (7 cards)
  special.json          Special card deck (17 cards)
  damage.json           Damage card deck

templates/              Card HTML templates
  maneuver.html
  yaw.html
  pitch.html
  damage.html

js/                     Playtest rig modules
  hex.js                Hex grid math, step execution engine
  deck.js               Deck management (shuffle, draw, discard)
  validation.js         Card legality rules
  combat.js             Combat targeting, scoring, damage
  bot-ai.js             Bot decision-making and card selection
  board-renderer.js     SVG hex board and aircraft rendering
  card-renderer.js      Card template rendering (shared)
  playtest-ui.js        Game UI (play board, hand, card picker)
  playtest.js           Main game loop and state machine

app.js                  Card viewer renderer
style.css               Card viewer styles
playtest.css            Playtest rig styles
```
