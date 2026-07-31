import { OUTCOMES } from '../engine/review.js'

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

// 3px, not 2: a double line needs three pixels before it renders as two lines
// at all. One width for every outcome keeps weight from becoming a fourth,
// unannounced signal.
const MARK_WIDTH = '3px'
const MARK_OFFSET = '2px'

function ReviewMarks({ marks }) {
  const rules = Object.entries(marks).map(
    ([target, { outcome, lineStyle }]) =>
      `[${MARK_SCOPE_ATTRIBUTE}] [data-audit-target="${target}"]{` +
      `outline:${MARK_WIDTH} ${lineStyle} ${MARK_COLORS[outcome]};` +
      `outline-offset:${MARK_OFFSET}}`,
  )

  if (rules.length === 0) return null

  return <style>{rules.join('')}</style>
}

export default ReviewMarks
