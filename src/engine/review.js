// Turns a Round result into per-element outcomes, and each outcome into the
// line style its mark is drawn with. Pure: no DOM, no React, no measurement.
//
// A finding is a (rule, target) pair, but a mark is drawn on an element, so a
// mark reports that element's overall state rather than any one finding.

export const OUTCOMES = Object.freeze({
  MISSED: 'missed',
  FLAGGED_IN_ERROR: 'flaggedInError',
  CAUGHT: 'caught',
})

// Outcome is carried by line style, never by colour alone.
export const LINE_STYLES = Object.freeze({
  MISSED: 'dashed',
  FLAGGED_IN_ERROR: 'dotted',
  CAUGHT: 'double',
  CAUGHT_SMALL: 'solid',
})

// A double line stops reading as two lines once the element is smaller than
// this. The number coincides with 2.5.8's minimum target size, but the reason
// is legibility, not that criterion.
export const DOUBLE_LINE_MIN_SIZE = 24

/**
 * Element-level precedence: an unresolved violation outranks everything else,
 * and flagged-in-error appears only when the element was otherwise clean.
 * Applied by assigning in ascending order of precedence and letting the
 * stronger outcome overwrite the weaker one.
 *
 * An element flagged under the wrong rule carries both a false positive and a
 * false negative, and therefore reads as missed.
 */
export function deriveOutcomes(result) {
  if (!result) return {}

  const outcomes = {}
  for (const guess of result.falsePositives) outcomes[guess.target] = OUTCOMES.FLAGGED_IN_ERROR
  for (const guess of result.truePositives) outcomes[guess.target] = OUTCOMES.CAUGHT
  for (const violation of result.falseNegatives) outcomes[violation.target] = OUTCOMES.MISSED
  return outcomes
}

/**
 * The double-to-solid fallback is decided from the dimensions the Round
 * snapshot already holds. Nothing is measured at review time — the card the
 * player audited is the card being described, and re-measuring it would
 * describe whatever the review happens to render instead.
 */
export function lineStyleFor(outcome, readout) {
  if (outcome === OUTCOMES.MISSED) return LINE_STYLES.MISSED
  if (outcome === OUTCOMES.FLAGGED_IN_ERROR) return LINE_STYLES.FLAGGED_IN_ERROR

  // No readout is not an occasion to guess large: solid reads correctly at
  // every size, double does not.
  if (!readout) return LINE_STYLES.CAUGHT_SMALL

  const smallerSide = Math.min(readout.width, readout.height)
  return smallerSide < DOUBLE_LINE_MIN_SIZE ? LINE_STYLES.CAUGHT_SMALL : LINE_STYLES.CAUGHT
}

/**
 * `{ [auditTargetId]: { outcome, lineStyle } }`, holding an entry only for
 * elements that carry an outcome. An element with none receives no mark.
 */
export function deriveMarks(result, snapshot) {
  const outcomes = deriveOutcomes(result)
  const marks = {}

  for (const [target, outcome] of Object.entries(outcomes)) {
    const readout = snapshot && snapshot.elements ? snapshot.elements[target] : null
    marks[target] = { outcome, lineStyle: lineStyleFor(outcome, readout) }
  }

  return marks
}
