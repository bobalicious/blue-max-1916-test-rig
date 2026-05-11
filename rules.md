# Blue Max aka 1916:

Hex based WW1 biplane game.

## The Movement Turn

Each player has a deck of Maneuver cards for the aircraft they're flying that represents their aircraft's capability.

Maneuver cards move the aircraft forward and may optionally allow a turn at the end of the move. Turning is controlled by the yaw card played alongside the maneuver.

They then have 2 further decks of cards:

- Yaw - left x2, straight x3, right x2
- Pitch - climb x2, level x3, dive x2

At the start of each turn, each player draws their hand up to 7 maneuver cards.

They then place 3 sets of 3 cards - each a combination of:

- Maneuver
- Yaw
- Pitch

Once everyone's placed all their cards, the movements happen, each move happening simultaneously.

### Maneuver Cards:

Each maneuver card defines its movement as a sequence of steps:

- `M1,0,0` — move 1 hex forward (relative to facing)
- `TY` — turn 60° in the direction of the yaw card (left or right; no effect if yaw is straight)
- `TL` / `TR` — turn 60° left or right (explicit, independent of yaw card)
- `PU` / `PD` — pitch up or down (built-in altitude change, independent of pitch card)

The M command uses comma-separated signed integers: `M<forward>,<left>,<right>` relative to current facing. Negative values move in the opposite direction.

Each card shows:

- Allowed yaw directions (left, straight, right)
- Allowed pitch directions (climb, level, dive)
- You can only play a yaw and pitch combination that is available on the maneuver card.

Cards may have restrictions:

- Previous card restrictions (what the previous maneuver must conform to)
- Next card restrictions (what the next maneuver must conform to)
- Cannot fire guns

Place them in order, secretly, the players turn them over and each move happens at the same time.

At the start of the next turn, all players will draw back up to their full hand. When all cards in a player's deck have been drawn they are combined, shuffled and any outstanding draws are completed.

### Altitude:

Each aircraft has an operational ceiling defined in its aircraft definition (e.g. ceiling of 5).

- Climbing above the ceiling is not possible.
- Reaching altitude 0 on a Slow card results in a **landing**.
- Reaching altitude 0 on any other card results in a **crash**.
- **Landing exception**: When at altitude 1 on a Slow card, dive is allowed even though the card normally does not permit it. This is the only way to land.

#### Deck:

# Baseline Maneuver Deck (13 cards)

### Straight Movement (11 cards)

- **Slow (1 forward + turn)** x3
  - Steps: `M1,0,0`, `TY`
  - Yaw: left, straight, right
  - Pitch: climb, level (cannot dive, except at altitude 1 to land)

- **Straight (2 forward + turn)** x5
  - Steps: `M1,0,0`, `M1,0,0`, `TY`
  - Yaw: left, straight, right
  - Pitch: climb, level, dive

- **Dash (3 forward)** x3
  - Steps: `M1,0,0`, `M1,0,0`, `M1,0,0`
  - Yaw: straight only
  - Pitch: level, dive (cannot climb)

## Utility (2 cards, in main deck)

- **Compose (2 forward)** x1
  - Steps: `M1,0,0`, `M1,0,0`
  - Yaw: straight only
  - Pitch: level only
  - Draw 2 special cards

- **Tinker (2 forward)** x1
  - Steps: `M1,0,0`, `M1,0,0`
  - Yaw: straight only
  - Pitch: climb, level, dive
  - Next move must be straight
  - Recover 1 discarded card

### Yaw Cards (7 cards)

- Left x2
- Straight x3
- Right x2

### Pitch Cards (7 cards)

- Climb x2
- Level x3
- Dive x2

## Special Cards Deck (17 cards, separate draw pile)

Special cards are drawn via the Compose card effect ("Draw 2 special cards") or mission completion. They go into the player's hand and are played like maneuver cards.

- **Immelman** x2
  - Steps: `PU`, `TL`, `TL`, `TL`
  - Gain 1 altitude + 180° turn, stay in place
  - Yaw: straight only, Pitch: level only
  - Must follow a straight card

- **Split S** x2
  - Steps: `PD`, `TL`, `TL`, `TL`
  - Lose 1 altitude + 180° turn, stay in place
  - Yaw: straight only, Pitch: level only
  - Must follow a straight card

- **Stall** x2
  - Steps: `PD`, `PD`, `TY`
  - Lose 2 altitude, stay in place, can turn
  - Yaw: left, straight, right. Pitch: level only
  - Cannot be followed by Slow

- **Slip** x4
  - Steps: `MY`
  - Shift 1 hex forward-left or forward-right (yaw determines direction), no rotation
  - Yaw: left, right. Pitch: level only

- **Zoom Climb** x2
  - Steps: `PU`, `PU`, `M1,0,0`
  - Climb 2 altitude, forward 1
  - Yaw: straight only. Pitch: level only
  - Must be followed by Slow

- **Barrel Roll** x3
  - Steps: `M1,0,0`, `M1,0,0`
  - Forward 2, evasive
  - Yaw: straight only. Pitch: climb, level, dive
  - Harder to hit this and next move (combat effect TBD)

- **Scissors** x2
  - Steps: `M1,0,0`, `TY`
  - Forward 1, can turn, evasive
  - Yaw: left, straight, right. Pitch: climb, level, dive
  - Harder to hit this and next move (combat effect TBD)

### Step Command Reference

| Command       | Meaning |
|---------------|---------|
| `M<f>,<l>,<r>` | Move: f hexes forward, l forward-left, r forward-right (signed integers) |
| `MY`           | Move 1 hex in the yaw direction (fwd-left, forward, or fwd-right) |
| `TY`           | Turn 60° in yaw direction (no effect if yaw is straight) |
| `TL` / `TR`    | Turn 60° left or right (explicit) |
| `PU` / `PD`    | Pitch up or down 1 altitude (built into card, independent of pitch card) |

### Restriction Types

**Category-based** (field: `previousMustBe`, `nextMustBe`, `previousCannotBe`):
- Restricts by card category: straight, special, utility

**Name-based** (field: `previousMustBeName`, `nextMustBeName`, `nextCannotBeName`):
- Restricts by specific card name: e.g. "must be followed by Slow"

#### Aircraft Definition:

Each aircraft is defined by a folder containing:

- `aircraft.json` — name, operational ceiling, starting altitude, deck file references
- `maneuver.json` — the maneuver card deck
- `yaw.json` — the yaw card deck
- `pitch.json` — the pitch card deck
- `special.json` — the special card deck (separate draw pile)

Different aircraft have different decks (e.g. the Sopwith Camel has a very sharp turn that only allows left and the sharp turn does not allow right, due to the aircraft's rotary engine).

#### Deck notes:

At the start of each turn, the player draws 3 maneuver cards (or up to 7 on the first turn). All yaw and pitch cards are returned to full availability each turn.

### Combat:

- At the end of each move, everyone who can shoot, nominates a target.
- Must be within 5 hexes, and in the forward triangle.
- Count up the 'attack score'
	- Base is 1
	- Direction
		- Add 2 if the target is directly in front
	- Height
		- Add 1 if the target is at the same height
		- Subtract 1 if the target is more than 2 different in height
		- Subtract 1 if the target is in the opposite direction to the pitch of the previous move
	- Stability
		- Add 1 if the target flew straight last turn (no turn, no special), or is landed.
		- Add 1 if the attacker flew straight last turn (no turn, no special)
		- Add 1 if the attacker and target are travelling in the same, or opposite direction (in line) - or is landed.
		- Subtract 1 for each wound the attacker has
		- (result is +2 for landed)
	- If the result is negative or zero - then the attacker can't hit
	- Should be in the range of:
		- 1 to 7
	- Count up the hits - Draw that many damage cards.

#### Damage cards:

1 in 4 damage cards is a 'miss' that does nothing

- Different types of damage cards:
	- Damage to the aircraft
	- Wounds to the pilot

	- Damage to the aircraft = Remove a card of a given type
		- E.g.
			- Remove a yaw left card
			- Remove a climb card, if none available, remove a level flight card
			- Remove a random pitch card
			- If you don't have enough cards of a given type, then you lose a movement - middle first, then first.

	- Wounds to the pilot
		1 - Can no longer use special cards
		2 - Reduce the number of cards in your hand to 5
		3 - Dead...

#### Repair:

- Every move that an aircraft is landed, recover one card from the 'damage taken' deck.
- Every 'Tinker' move, recover one card from the 'damage taken' deck.

#### Heal:

- Every move than an aircraft is landed, you can remove one wound.

#### Taking off:

- Perform a slow with a climb.

# Mission thoughts:

2 teams.

Start by randomly placing trenches

Teams then take turns to place:

- Observation Balloons
- Troop concentrations (dummy and real)
- Supplies (dummy and real)

Mission cards dealt - maybe 2 each player - each has a mission and a number of points

- Destroy x number of balloons (line up directly, for 2 turns, at the same height as a balloon, within x number of hexes)
- Strafe x hexes of trench (fly at level 1, on or adjacent to a hex, continuously)
- Bomb supplies / troops (fly at level 1, over a supply / troop - gets revealed if it's real)

Bonuses?

- Every time you complete a mission you get to draw a new special card?
- Could have 'ace pilot' cards that allow for advanced maneuvers.
- Or, 'tinker' maneuver cards that allow you to 'fix' bits of your aircraft - and so take back cards from your damage deck.

## Game styles:

Best total points at the end wins. If a player is killed, points still count. End defined as number of turns, number of remaining aircraft.

Can resurrect, lose x points. First to y points wins. Finish all missions, draw more missions
