# Technical Notes — Blue Max 1916

Implementation details for the digital playtest rig. See [rules.md](rules.md) for the game rules.

## Step-Based Movement System

Each maneuver card defines its movement as a `steps` array of micro-commands in the JSON data. This makes cards fully self-describing and extensible.

### Step Commands

| Command        | Meaning |
|----------------|---------|
| `M<f>,<l>,<r>` | Move: f hexes forward, l forward-left, r forward-right (signed integers, relative to current facing) |
| `MY`           | Move 1 hex in the yaw direction (forward-left if yaw=left, forward-right if yaw=right, forward if straight) |
| `TY`           | Turn 60° in yaw card direction (no effect if yaw is straight) |
| `TL` / `TR`    | Turn 60° left or right (explicit, independent of yaw card) |
| `PU` / `PD`    | Pitch up or down 1 altitude (built into card, applied before the pitch card's effect) |

### Example Step Sequences

```
Slow:        ["M1,0,0", "TY"]           — forward 1, optional turn
Straight:    ["M1,0,0", "M1,0,0", "TY"] — forward 2, optional turn
Dash:        ["M1,0,0", "M1,0,0", "M1,0,0"] — forward 3, no turn
Immelman:    ["PU", "TL", "TL", "TL"]   — climb 1, 180° turn
Split S:     ["PD", "TL", "TL", "TL"]   — dive 1, 180° turn
Stall:       ["PD", "PD", "TY"]         — dive 2, optional turn
Slip:        ["MY"]                      — shift diagonally
Zoom Climb:  ["PU", "PU", "M1,0,0"]     — climb 2, forward 1
```

## Hex Grid

Flat-top hexes, axial coordinates (q, r). Aircraft faces through hex edges (not vertices).

### 6 Directions (clockwise from North)

```
0: N   (dq: 0, dr:-1)  →   0° (straight up, through top flat edge)
1: NE  (dq:+1, dr:-1)  →  60°
2: SE  (dq:+1, dr: 0)  → 120°
3: S   (dq: 0, dr:+1)  → 180°
4: SW  (dq:-1, dr:+1)  → 240°
5: NW  (dq:-1, dr: 0)  → 300°
```

### Relative Directions (for M command)

Given current facing `f`:
- Forward: direction `f`
- Forward-left: direction `(f + 5) % 6`
- Forward-right: direction `(f + 1) % 6`

Negative values in M commands move in the opposite direction (e.g. `M-1,0,0` moves backward).

## Card Data Structure

### Maneuver Cards (`maneuver.json`)

```json
{
  "type": "maneuver",
  "name": "Straight",
  "subtitle": "2 forward + turn",
  "category": "straight",
  "count": 5,
  "yaw": ["left", "straight", "right"],
  "pitch": ["climb", "level", "dive"],
  "steps": ["M1,0,0", "M1,0,0", "TY"]
}
```

Optional fields:
- `restriction` — free-text restriction description
- `effect` — special effect (e.g. "Draw 2 special cards")
- `previousMustBe` / `previousCannotBe` — category-based restrictions (values: "straight", "special", "utility")
- `nextMustBe` / `nextCannotBe` — category-based restrictions
- `previousMustBeName` / `nextMustBeName` / `nextCannotBeName` — name-based restrictions (e.g. "Slow")

### Yaw/Pitch Cards

```json
{ "type": "yaw", "direction": "left", "count": 2 }
{ "type": "pitch", "direction": "climb", "count": 2 }
```

### Damage Cards (`damage.json`)

```json
{
  "type": "damage",
  "name": "Engine Damaged",
  "description": "Engine losing power. Discard 1 climb pitch card. If none, discard 1 level pitch card",
  "effect": "discard",
  "target": { "deck": "pitch", "direction": "climb", "fallback": "level" },
  "count": 3
}
```

Effect types:
- `"none"` — near miss, no effect
- `"wound"` — pilot wound (cumulative)
- `"discard"` — remove a card from a deck
- `"discardMultiple"` — remove cards from multiple decks (uses `"targets"` array)

Target specification:
- `"deck"`: `"yaw"`, `"pitch"`, or `"maneuver"`
- `"direction"`: specific direction (`"left"`, `"climb"`, etc.)
- `"name"`: specific card name (for maneuver deck)
- `"random": true`: pick randomly from the deck
- `"fallback"` / `"fallbackName"`: fallback if primary target not available

## Aircraft Definition

Each aircraft is a folder containing:

```
aircraft/default/
  aircraft.json     — metadata and deck references
  maneuver.json     — maneuver card deck
  yaw.json          — yaw card deck
  pitch.json        — pitch card deck
  special.json      — special card deck (separate draw pile)
  damage.json       — damage card deck (shared)
```

### aircraft.json

```json
{
  "name": "Default Biplane",
  "ceiling": 5,
  "startAltitude": 3,
  "decks": {
    "maneuver": "maneuver.json",
    "yaw": "yaw.json",
    "pitch": "pitch.json",
    "special": "special.json",
    "damage": "damage.json"
  }
}
```

## Restriction System

### Category-based

Card fields: `previousMustBe`, `nextMustBe`, `previousCannotBe`

Values are arrays of category names: `"straight"`, `"special"`, `"utility"`

Example: Tinker has `"nextMustBe": ["straight"]` — the next maneuver must be a straight-category card.

### Name-based

Card fields: `previousMustBeName`, `nextMustBeName`, `nextCannotBeName`

Values are arrays of specific card names.

Example: Zoom Climb has `"nextMustBeName": ["Slow"]` — the next maneuver must specifically be a Slow card.

## Firing Arc Calculation

The firing arc is computed by walking the hex grid:

1. From the attacker's hex, step forward along the facing direction, 1 to 5 hexes
2. At each step (1 to 4), also include the hex one step to the left and one step to the right
3. At step 5 (maximum range), only the centre hex counts

This creates a corridor that narrows at long range. Targets on the centre line get a +2 bonus; targets on the side get +1.

## Bot AI

Bots use a greedy per-move selection algorithm:

1. Decide behaviour: **evade** (if being tailed, 75% chance) or **attack** (target nearest enemy)
2. For each of the 3 moves, try all valid (maneuver, yaw, pitch) combinations
3. Score each resulting position based on behaviour
4. Pick the highest-scoring combination

### Scoring Heuristics

**Evading**: maximise direction change (+10 per facing step), distance moved (+3 per hex), altitude change (+2 per level)

**Attacking**: minimise distance to target's rear hex (-5 per hex), stay within 3 hexes, align facing with target (-4 per facing step difference), match altitude (-3 per level)

### Threat Detection

"Being tailed" = an enemy within 4 hexes, in the bot's rear arc (facing+2 to facing+4), and facing toward the bot.
