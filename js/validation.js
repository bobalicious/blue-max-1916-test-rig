// Card legality rules for the 3×3 play board.

export function getValidManeuvers(hand, playBoard, moveIndex) {
  return hand.filter(card => isManeuverValidForSlot(card, playBoard, moveIndex));
}

function isManeuverValidForSlot(card, playBoard, moveIndex) {
  if (moveIndex > 0) {
    const prev = playBoard[moveIndex - 1].maneuver;
    if (prev) {
      if (prev.nextMustBe && !prev.nextMustBe.includes(card.category)) return false;
      if (prev.nextMustBeName && !prev.nextMustBeName.includes(card.name)) return false;
      if (prev.nextCannotBeName && prev.nextCannotBeName.includes(card.name)) return false;
      if (card.previousMustBe && !card.previousMustBe.includes(prev.category)) return false;
      if (card.previousMustBeName && !card.previousMustBeName.includes(prev.name)) return false;
      if (card.previousCannotBe && card.previousCannotBe.includes(prev.category)) return false;
    }
  }

  if (moveIndex < 2) {
    const next = playBoard[moveIndex + 1]?.maneuver;
    if (next) {
      if (card.nextMustBe && !card.nextMustBe.includes(next.category)) return false;
      if (card.nextMustBeName && !card.nextMustBeName.includes(next.name)) return false;
      if (card.nextCannotBeName && card.nextCannotBeName.includes(next.name)) return false;
      if (next.previousMustBe && !next.previousMustBe.includes(card.category)) return false;
      if (next.previousMustBeName && !next.previousMustBeName.includes(card.name)) return false;
      if (next.previousCannotBe && next.previousCannotBe.includes(card.category)) return false;
    }
  }

  return true;
}

export function getValidYaws(yawAvailable, playBoard, moveIndex) {
  const maneuver = playBoard[moveIndex].maneuver;
  if (!maneuver) return [];

  const allowed = maneuver.yaw;
  const forbidden = getOppositeYawRestriction(playBoard, moveIndex);

  return yawAvailable.filter(card => {
    if (!allowed.includes(card.direction)) return false;
    if (forbidden && card.direction === forbidden) return false;
    return true;
  });
}

export function getValidPitches(pitchAvailable, playBoard, moveIndex, aircraft) {
  const maneuver = playBoard[moveIndex].maneuver;
  if (!maneuver) return [];

  return pitchAvailable.filter(card => {
    if (maneuver.pitch.includes(card.direction)) return true;
    if (card.direction === 'dive' && maneuver.name === 'Slow' && aircraft && aircraft.altitude === 1) return true;
    return false;
  });
}

function getOppositeYawRestriction(playBoard, moveIndex) {
  const card = playBoard[moveIndex].maneuver;
  if (!card || card.restriction !== 'Cannot follow opposite turn') return null;
  if (moveIndex === 0) return null;

  const prevMove = playBoard[moveIndex - 1];
  if (!prevMove.maneuver || prevMove.maneuver.category !== 'turn') return null;
  if (!prevMove.yaw) return null;

  if (prevMove.yaw.direction === 'left') return 'right';
  if (prevMove.yaw.direction === 'right') return 'left';
  return null;
}

export function isPlayBoardComplete(playBoard) {
  return playBoard.every(move => move.maneuver && move.yaw && move.pitch);
}

export function cascadeClear(playBoard, fromIndex) {
  for (let i = fromIndex; i < 3; i++) {
    const move = playBoard[i];
    if (i > fromIndex) {
      if (move.maneuver && !isManeuverValidForSlot(move.maneuver, playBoard, i)) {
        move.maneuver = null;
        move.yaw = null;
        move.pitch = null;
      }
    }
    if (move.maneuver) {
      if (move.yaw && !move.maneuver.yaw.includes(move.yaw.direction)) {
        move.yaw = null;
      }
      if (move.pitch && !move.maneuver.pitch.includes(move.pitch.direction)) {
        move.pitch = null;
      }
    } else {
      move.yaw = null;
      move.pitch = null;
    }
  }
}
