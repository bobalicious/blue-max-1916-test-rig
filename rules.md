# Blue Max 1916

Hex-based WW1 biplane combat card game.

## Overview

Players each control a biplane on a hex grid. Each turn, players secretly plan 3 moves using cards, then all moves are revealed and executed simultaneously. After each move, aircraft in range may fire at enemies. Damage degrades your aircraft's capabilities by removing cards from your decks.

## Setup

Each player takes:
- 1 **Maneuver deck** (shuffled) — draw 7 cards as your starting hand
- 1 **Yaw deck** (7 cards: Left x2, Straight x3, Right x2)
- 1 **Pitch deck** (7 cards: Climb x2, Level x3, Dive x2)

Place your aircraft on the board at the agreed starting position and altitude. Each aircraft has an operational ceiling (default: 5) and starts at altitude 3.

A shared **Damage deck** is shuffled and placed to one side. A **Special cards** deck is also placed separately.

## The Turn

### 1. Draw Cards

Draw maneuver cards until you have 7 in hand (or up to 5 if you have 2 pilot wounds). If your maneuver deck runs out, shuffle your discard pile back in.

All yaw and pitch cards return to full availability each turn.

### 2. Plan Moves

Each player secretly plans 3 moves. Each move is a set of 3 cards:
- **Maneuver** — from your hand
- **Yaw** — from your available yaw cards
- **Pitch** — from your available pitch cards

The yaw and pitch you choose must be allowed by the maneuver card (shown on the card). Place them in order: Move 1, Move 2, Move 3.

Some maneuver cards have restrictions on what can come before or after them (shown on the card).

### 3. Execute Moves

All players reveal their cards. Moves are executed simultaneously, one move at a time:

**For each move (1, 2, 3):**
1. All aircraft move according to their cards
2. Altitude changes are applied (from pitch card and any built-in effects)
3. Combat is resolved (see Combat)

### 4. End of Turn

Played maneuver cards go to your discard pile. Special cards are one-use and removed from the game. Return to step 1.

## Movement

Aircraft face through the flat edges of the hex (6 possible facings). Movement is always relative to your current facing.

### Maneuver Cards

Each maneuver card shows:
- **Movement** — how the aircraft moves (forward hexes, turns, etc.)
- **Allowed Yaw** — which yaw cards can be played with it
- **Allowed Pitch** — which pitch cards can be played with it
- **Restrictions** — constraints on previous/next maneuver

### Baseline Maneuver Deck (13 cards)

**Slow** x3
- Move forward 1 hex, then turn (if yaw is left or right)
- Yaw: left, straight, right
- Pitch: climb, level (cannot dive, except at altitude 1 to land)

**Straight** x5
- Move forward 2 hexes, then turn (if yaw is left or right)
- Yaw: left, straight, right
- Pitch: climb, level, dive

**Dash** x3
- Move forward 3 hexes, no turning
- Yaw: straight only
- Pitch: level, dive (cannot climb)

**Compose** x1 *(utility)*
- Move forward 2 hexes
- Yaw: straight only, Pitch: level only
- Draw 2 special cards

**Tinker** x1 *(utility)*
- Move forward 2 hexes
- Yaw: straight only
- Pitch: climb, level, dive
- Next move must be a straight-category card
- Recover 1 card from your damage taken pile

### Yaw

The yaw card controls turning:
- **Left** — turn 60° left (counter-clockwise)
- **Straight** — no turn
- **Right** — turn 60° right (clockwise)

Turns happen at the end of the maneuver's movement (after all forward hexes).

### Pitch

The pitch card controls altitude change:
- **Climb** — gain 1 altitude
- **Level** — stay at current altitude
- **Dive** — lose 1 altitude

Pitch is applied after movement. Some maneuver cards also have built-in altitude changes.

## Altitude

- Aircraft cannot climb above their operational ceiling.
- Reaching altitude 0 on a **Slow** card = **landing** (safe).
- Reaching altitude 0 on any other card = **crash** (destroyed).
- **Landing exception**: At altitude 1 on a Slow card, dive is permitted even though Slow normally doesn't allow it. This is the only way to land.
- **Taking off**: Play a Slow card with Climb from a landed position.

## Special Cards (17 cards, separate deck)

Special cards are drawn via Compose or mission rewards. They go into your hand and are played like maneuver cards. They are one-use (removed from the game after playing).

**Immelman** x2 — Gain 1 altitude + 180° turn, stay in place. Yaw: straight, Pitch: level. Must follow a straight card.

**Split S** x2 — Lose 1 altitude + 180° turn, stay in place. Yaw: straight, Pitch: level. Must follow a straight card.

**Stall** x2 — Lose 2 altitude, stay in place, can turn. Yaw: any, Pitch: level. Cannot be followed by Slow.

**Slip** x4 — Shift 1 hex diagonally (forward-left or forward-right, yaw determines which). No rotation, no altitude change. Yaw: left or right, Pitch: level.

**Zoom Climb** x2 — Climb 2 altitude, forward 1 hex. Yaw: straight, Pitch: level. Must be followed by Slow.

**Barrel Roll** x3 — Forward 2 hexes, evasive. Yaw: straight. Pitch: any. Harder to hit this and next move.

**Scissors** x2 — Forward 1 hex, can turn, evasive. Yaw: any. Pitch: any. Harder to hit this and next move.

## Combat

At the end of each move, all aircraft that can shoot nominate a target and fire simultaneously.

### Firing Arc

You can fire at an enemy aircraft if:
- It is within **5 hexes** directly in front of you, OR
- It is within **4 hexes** and up to 1 hex to either side of your forward line

### Target Selection

Each aircraft nominates one target within their firing arc.

### Attack Score

Calculate the attack score:

| Modifier | Condition |
|----------|-----------|
| +1 | Base (always) |
| +2 | Target is directly in front (on the centre line) |
| +1 | Target is in the firing arc but off-centre |
| +1 | Target is at the same altitude |
| -1 | Altitude difference is greater than 2 |
| -1 | Your pitch direction opposes the direction to the target |
| +1 | Target flew straight last move (no turn, no special), or is landed |
| +1 | Attacker flew straight last move |
| +1 | Attacker and target are flying in the same or opposite direction (in line), or target is landed |
| -1 | Per wound on the attacker |

If the score is 0 or less, you cannot hit. Otherwise, draw that many damage cards.

### Damage Cards

The damage deck is shared. Approximately 3 in 4 cards are **Near Miss** (no effect).

Damage types:
- **Aircraft damage** — permanently remove a card from one of your decks (yaw, pitch, or maneuver). The specific card to remove is stated on the damage card. If the stated card isn't available, some damage cards specify a fallback.
- **Pilot Wound** — cumulative:
  - 1 wound: Can no longer use special cards
  - 2 wounds: Maximum hand size reduced to 5
  - 3 wounds: Pilot killed — aircraft is destroyed

An aircraft is **destroyed** when it accumulates 15 damage cards OR the pilot takes 3 wounds. Destroyed aircraft are removed from the game. Since combat is simultaneous, a destroyed aircraft can still fire in the move it is destroyed.

### Repair

- Every move an aircraft is **landed**, recover 1 card from your damage taken pile.
- Every **Tinker** move, recover 1 card from your damage taken pile.

### Healing

- Every move an aircraft is **landed**, remove 1 pilot wound.

## Advanced Rules

### Tailing

- At the end of a turn, an aircraft my declare that they are 'tailing' another.  In order to do so, the aircraft tailing must have the aircraft being tailed within the forward sight triangle of them, and the tailing must be within the rear sight triangle of the tailed.

... can see and then change the turn or height of a move on a move by move basis after having seen the tailed pilot's cards.

## Aircraft

Different aircraft have different maneuver decks reflecting their capabilities. For example, the Sopwith Camel's rotary engine makes it turn more easily to the left than the right.

Each aircraft definition includes its operational ceiling, starting altitude, and the composition of its card decks.

## Missions (work in progress)

2 teams. The board features:
- Trenches (randomly placed)
- Observation Balloons
- Troop concentrations (dummy and real)
- Supplies (dummy and real)

Each player is dealt mission cards with objectives and point values:
- Destroy balloons (fly alongside at same altitude for 2 turns)
- Strafe trenches (fly at altitude 1 over trench hexes)
- Bomb supplies/troops (fly at altitude 1 over the target — revealed if real)

Completing missions may award special cards.

## Winning

Best total points at the end wins. Points come from completed missions. If a player's aircraft is destroyed, their points still count. The game ends after an agreed number of turns or when one side has no aircraft remaining.
