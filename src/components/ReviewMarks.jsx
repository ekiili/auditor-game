import { MARK_WEIGHTS, OUTCOMES } from '../engine/review.js'

// The mark has to land on an element inside the level component, and the level
// component must stay unaware the game exists — the same reason canvas clicks
// are handled by one delegated listener rather than by props on the card. So
// the marks are emitted as CSS rules matching `data-audit-target`, scoped to
// the wrapper, instead of as classes the component would have to carry.
//
// `outline` is the property because it is drawn outside the box without
// participating in layout: the card in review measures identically to the card
// the player audited. `border` and `background` would both change what the
// element measures, and both are audited properties in their own right.
export const MARK_SCOPE_ATTRIBUTE = 'data-review-marks'

const MARK_COLORS = {
  [OUTCOMES.MISSED]: 'var(--mark-missed)',
  [OUTCOMES.FLAGGED_IN_ERROR]: 'var(--mark-flagged-in-error)',
  [OUTCOMES.CAUGHT]: 'var(--mark-caught)',
}

// Caught is a single solid stroke at double the normal weight — never CSS
// `double`, which draws two strokes with a gap and reads as an accident on
// anything small. Every other outcome keeps the normal weight, so weight says
// "caught" and nothing else.
const MARK_WIDTHS = {
  [MARK_WEIGHTS.NORMAL]: '3px',
  [MARK_WEIGHTS.HEAVY]: '6px',
}

// Selecting a finding thickens the ring the element already carries rather
// than drawing a second one beside it. Weight is the only thing that changes:
// the colour still states the outcome, the line style still distinguishes
// missed from flagged in error from caught, and a player who cannot separate
// the three colours still sees which element is selected. Both weights are
// stepped by the same ratio, so the caught mark — already heavy — still gains
// as much on selection as any other.
const SELECTED_MARK_WIDTHS = {
  [MARK_WEIGHTS.NORMAL]: '5px',
  [MARK_WEIGHTS.HEAVY]: '10px',
}

const MARK_OFFSET = '2px'

function ReviewMarks({ marks, selectedTarget }) {
  const rules = Object.entries(marks).map(([target, { outcome, lineStyle, weight }]) => {
    const widths = target === selectedTarget ? SELECTED_MARK_WIDTHS : MARK_WIDTHS

    return (
      `[${MARK_SCOPE_ATTRIBUTE}] [data-audit-target="${target}"]{` +
      `outline:${widths[weight]} ${lineStyle} ${MARK_COLORS[outcome]};` +
      `outline-offset:${MARK_OFFSET}}`
    )
  })

  if (rules.length === 0) return null

  return <style>{rules.join('')}</style>
}

export default ReviewMarks
