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

// Which reading answers a finding. The findings list turns these into
// sentences; nothing here is player-facing text.
export const EVIDENCE = Object.freeze({
  ACCESSIBLE_NAME: 'accessibleName',
  SIZE: 'size',
  FOCUS_STYLING: 'focusStyling',
  FOCUS_NEVER_REACHED: 'focusNeverReached',
  FOCUS_NOT_APPLICABLE: 'focusNotApplicable',
  NONE: 'none',
})

// Elements that take keyboard focus with no author intervention. `a` earns it
// only with an href, which the readout reports as an implicit role of `link`.
const NATIVELY_FOCUSABLE_TAGS = Object.freeze(['button', 'input', 'select', 'textarea'])

/**
 * Answered from the snapshot's element readout, never from its focus entry.
 * A focus entry of `null` is identical whether the element was never focused
 * or could never be focused at all, so it cannot tell these apart — and
 * telling a player they neglected to keyboard-test an image would teach them
 * something false.
 */
export function isKeyboardFocusable(readout) {
  if (!readout) return false
  if (readout.tagName === 'a') return readout.role === 'link'
  return NATIVELY_FOCUSABLE_TAGS.includes(readout.tagName)
}

/**
 * The reading that answers one finding flagged in error, as
 * `{ kind, ...facts }`. A size failure is answered by dimensions, a missing
 * text alternative by the accessible name, and a focus failure by whichever of
 * the three focus cases applies.
 */
export function deriveEvidence(ruleId, readout, focusReadout) {
  if (!readout) return { kind: EVIDENCE.NONE }

  if (ruleId === RULE_IDS.TARGET_SIZE_MIN) {
    return { kind: EVIDENCE.SIZE, width: readout.width, height: readout.height }
  }

  if (ruleId === RULE_IDS.NON_TEXT_CONTENT || ruleId === RULE_IDS.LABELS_OR_INSTRUCTIONS) {
    return { kind: EVIDENCE.ACCESSIBLE_NAME, accessibleName: readout.accessibleName }
  }

  if (ruleId === RULE_IDS.FOCUS_VISIBLE) {
    if (!isKeyboardFocusable(readout)) {
      return { kind: EVIDENCE.FOCUS_NOT_APPLICABLE, tagName: readout.tagName }
    }
    if (!focusReadout) return { kind: EVIDENCE.FOCUS_NEVER_REACHED }
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
