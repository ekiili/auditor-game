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
  SIZE: 'size',
  FOCUS_STYLING: 'focusStyling',
  FOCUS_NEVER_REACHED: 'focusNeverReached',
  FOCUS_NOT_APPLICABLE: 'focusNotApplicable',
  NONE: 'none',
})

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
