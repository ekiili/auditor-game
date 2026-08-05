// Turns a Round result into per-element outcomes, and each outcome into the
// line style its mark is drawn with. Pure: no DOM, no React, no measurement.
//
// A finding is a (rule, target) pair, but a mark is drawn on an element, so a
// mark reports that element's overall state rather than any one finding.
//
// This module also decides which reading answers a finding flagged in error.
// It picks the fact; the findings list words it. Everything here reads the
// Round snapshot and nothing else — the card the player audited is the card
// being explained, and a fresh look at the DOM would describe whatever the
// review happens to be rendering instead.

import { RULE_IDS } from '../data/wcagRules.js'
import { isKeyboardFocusable } from './readout.js'

export const OUTCOMES = Object.freeze({
  MISSED: 'missed',
  FLAGGED_IN_ERROR: 'flaggedInError',
  CAUGHT: 'caught',
})

// Outcome is carried by line style, never by colour alone.
export const LINE_STYLES = Object.freeze({
  MISSED: 'dashed',
  FLAGGED_IN_ERROR: 'dotted',
  CAUGHT: 'solid',
})

// Caught is one solid line at double weight, not a two-stroke `double` line.
// Two strokes with a gap between them stop reading as a line at all on a small
// target, so the weight carries the emphasis and the stroke stays single.
export const MARK_WEIGHTS = Object.freeze({
  NORMAL: 'normal',
  HEAVY: 'heavy',
})

// Below this the doubled weight overwhelms the element it surrounds, so the
// caught mark falls back to the normal weight — still solid, so the outcome's
// line style survives the fallback. The number coincides with 2.5.8's minimum
// target size, but the reason is legibility, not that criterion.
export const HEAVY_MARK_MIN_SIZE = 24

/**
 * Whether a round went flawlessly: nothing missed, nothing wrongly flagged, and
 * nothing caught under a criterion other than its primary one.
 *
 * A correct empty submission on a clean round qualifies — all four arrays are
 * empty, and reporting a compliant component as compliant is the right answer.
 *
 * A defensible catch scores what an exact one scores and still bars this. The
 * two facts are not in tension: the player loses nothing on the scoreboard, and
 * what they lose is the claim that every violation was named under its sharpest
 * criterion — which is the distinction the overlap model exists to teach. If
 * this returned true for a defensible round, there would be no reason left to
 * learn it.
 *
 * Deliberately **not** the same question as the review's "Perfect!" heading,
 * which additionally requires something caught because it labels a populated
 * caught panel. This asks whether the round was flawless; that asks whether
 * there is a panel to put a heading over. Sharing one predicate between them
 * would silently answer one of the two questions wrongly.
 */
export function isFlawlessRound(result) {
  if (!result) return false
  return (
    result.falseNegatives.length === 0 &&
    result.falsePositives.length === 0 &&
    result.defensible.length === 0
  )
}

/**
 * Element-level precedence: an unresolved violation outranks everything else,
 * and flagged-in-error appears only when the element was otherwise clean.
 * Applied by assigning in ascending order of precedence and letting the
 * stronger outcome overwrite the weaker one.
 *
 * An element flagged under the wrong rule carries both a false positive and a
 * false negative, and therefore reads as missed.
 *
 * A defensible catch resolves its violation, so the element it sits on is
 * caught in exactly the sense the other catches are. It joins that tier rather
 * than forming one of its own: a mark reports an element's state, and "found"
 * is the whole of that state — which criterion the player named is a property
 * of the finding, and the findings list is where a finding is read.
 */
export function deriveOutcomes(result) {
  if (!result) return {}

  const outcomes = {}
  for (const guess of result.falsePositives) outcomes[guess.target] = OUTCOMES.FLAGGED_IN_ERROR
  for (const guess of result.truePositives) outcomes[guess.target] = OUTCOMES.CAUGHT
  for (const entry of result.defensible) outcomes[entry.guess.target] = OUTCOMES.CAUGHT
  for (const violation of result.falseNegatives) outcomes[violation.target] = OUTCOMES.MISSED
  return outcomes
}

/** Line style depends on the outcome alone; size only ever moves the weight. */
export function lineStyleFor(outcome) {
  if (outcome === OUTCOMES.MISSED) return LINE_STYLES.MISSED
  if (outcome === OUTCOMES.FLAGGED_IN_ERROR) return LINE_STYLES.FLAGGED_IN_ERROR
  return LINE_STYLES.CAUGHT
}

/**
 * The heavy-to-normal fallback is decided from the dimensions the Round
 * snapshot already holds. Nothing is measured at review time — the card the
 * player audited is the card being described, and re-measuring it would
 * describe whatever the review happens to render instead.
 */
export function markWeightFor(outcome, readout) {
  if (outcome !== OUTCOMES.CAUGHT) return MARK_WEIGHTS.NORMAL

  // No readout is not an occasion to guess large: the normal weight reads
  // correctly at every size, the doubled one does not.
  if (!readout) return MARK_WEIGHTS.NORMAL

  const smallerSide = Math.min(readout.width, readout.height)
  return smallerSide < HEAVY_MARK_MIN_SIZE ? MARK_WEIGHTS.NORMAL : MARK_WEIGHTS.HEAVY
}

// Which reading answers a finding. The findings list turns these into
// sentences; nothing here is player-facing text.
export const EVIDENCE = Object.freeze({
  ACCESSIBLE_NAME: 'accessibleName',
  ROLE: 'role',
  SIZE: 'size',
  FOCUS_STYLING: 'focusStyling',
  FOCUS_NOT_APPLICABLE: 'focusNotApplicable',
  NONE: 'none',
})

/**
 * The reading that answers one finding flagged in error, as
 * `{ kind, ...facts }`. A size failure is answered by dimensions, a naming
 * failure — whether alleged of an image, a field or a control — by the
 * accessible name, a structural failure by the role the element announced, and
 * a focus failure by whichever of the two focus cases applies.
 *
 * Every fact here comes out of the Round snapshot the caller passes in. Nothing
 * is measured, and no element is touched: this module imports no DOM at all, so
 * a reading taken at review time is not merely discouraged here, it is
 * unreachable.
 *
 * There is no case for a focusable element with no focus reading. Logging a
 * finding requires selecting its element, and selecting an element focuses it,
 * so the reading always exists by the time a finding can name that element.
 */
export function deriveEvidence(ruleId, readout, focusReadout) {
  if (!readout) return { kind: EVIDENCE.NONE }

  if (ruleId === RULE_IDS.TARGET_SIZE_MIN) {
    return { kind: EVIDENCE.SIZE, width: readout.width, height: readout.height }
  }

  // A name alleged of a control, and the same reading answers it. The one
  // difference from the two criteria below is what happens when there is no
  // name to report.
  //
  // Every reachable 4.1.2 false alarm on an element that genuinely carries no
  // name lands on `product-image`, and only in a round where 1.1.1 was injected
  // there. On a control it cannot arise: the unnamed remove button is a true
  // positive, and the unlabelled quantity field is a defensible catch. So the
  // absent-name branch here would only ever fire on the one element 4.1.2 does
  // not apply to, and would state that the element has no accessible name
  // directly underneath a heading saying the player was wrong to flag it. That
  // is the open exemption question, not a reading — and no reading answers it,
  // because the exemption is nowhere in the DOM. No sentence, the same
  // treatment a missing focus reading gets below.
  if (ruleId === RULE_IDS.NAME_ROLE_VALUE) {
    if (readout.accessibleName === null) return { kind: EVIDENCE.NONE }
    return { kind: EVIDENCE.ACCESSIBLE_NAME, accessibleName: readout.accessibleName }
  }

  if (ruleId === RULE_IDS.NON_TEXT_CONTENT || ruleId === RULE_IDS.LABELS_OR_INSTRUCTIONS) {
    return { kind: EVIDENCE.ACCESSIBLE_NAME, accessibleName: readout.accessibleName }
  }

  // What the element announced itself as. The reading is the role, not the tag
  // it came from: 1.3.1 is about structure reaching the accessibility tree, and
  // the tag is only how it got there. Both are carried, because a heading that
  // arrived as an `<h2>` is the evidence, not the word "heading" alone.
  //
  // A null role is no reading rather than an invented one, the same treatment a
  // missing focus reading gets below. The readout reports null wherever it
  // cannot name a role without guessing, and "it announced no role" would read
  // as a failure underneath a heading that says the element was fine.
  if (ruleId === RULE_IDS.INFO_AND_RELATIONSHIPS) {
    if (readout.role === null) return { kind: EVIDENCE.NONE }
    return { kind: EVIDENCE.ROLE, role: readout.role, tagName: readout.tagName }
  }

  if (ruleId === RULE_IDS.FOCUS_VISIBLE) {
    if (!isKeyboardFocusable(readout)) {
      return { kind: EVIDENCE.FOCUS_NOT_APPLICABLE, tagName: readout.tagName }
    }
    // Same treatment a missing element readout gets above: no reading, no
    // sentence. The finding still carries its rule's explanation.
    if (!focusReadout) return { kind: EVIDENCE.NONE }
    return {
      kind: EVIDENCE.FOCUS_STYLING,
      outlineStyle: focusReadout.outlineStyle,
      outlineWidth: focusReadout.outlineWidth,
      boxShadow: focusReadout.boxShadow,
      hasVisibleIndicator: focusReadout.hasVisibleIndicator,
    }
  }

  return { kind: EVIDENCE.NONE }
}

/**
 * `{ [auditTargetId]: { outcome, lineStyle, weight } }`, holding an entry only
 * for elements that carry an outcome. An element with none receives no mark.
 */
export function deriveMarks(result, snapshot) {
  const outcomes = deriveOutcomes(result)
  const marks = {}

  for (const [target, outcome] of Object.entries(outcomes)) {
    const readout = snapshot && snapshot.elements ? snapshot.elements[target] : null
    marks[target] = {
      outcome,
      lineStyle: lineStyleFor(outcome),
      weight: markWeightFor(outcome, readout),
    }
  }

  return marks
}
