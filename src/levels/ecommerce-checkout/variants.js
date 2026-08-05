export const DEFAULT_IMAGE_ALT = 'Wireless over-ear headphones in indigo blue'

export const FOCUS_STYLES = Object.freeze({
  VISIBLE: 'visible',
  NONE: 'none',
})

export const REMOVE_BUTTON_SIZES = Object.freeze({
  DEFAULT: 'default',
  COMPACT: 'compact',
})

export const LABEL_MODES = Object.freeze({
  PROGRAMMATIC: 'programmatic',
  VISUAL_ONLY: 'visual-only',
})

// Whether the remove control carries a name of its own. Independent of
// REMOVE_BUTTON_SIZES, which describes the same element's dimensions: the two
// answer different questions about it and neither is derived from the other.
export const REMOVE_BUTTON_LABELS = Object.freeze({
  DESCRIBED: 'described',
  ICON_ONLY: 'icon-only',
})

// Which element the product title is rendered as. Both variants are styled by
// one shared class string, so the two renderings cannot drift apart visually —
// see TITLE_CLASSES in CheckoutCard.
export const TITLE_MARKUP = Object.freeze({
  HEADING: 'heading',
  STYLED_TEXT: 'styled-text',
})
