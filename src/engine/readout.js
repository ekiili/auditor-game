import { computeAccessibleDescription, computeAccessibleName } from 'dom-accessibility-api'

const RELEVANT_ATTRIBUTES = [
  'alt',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'title',
  'type',
  'id',
]

function getImplicitRole(element) {
  const tagName = element.tagName.toLowerCase()

  switch (tagName) {
    case 'img':
      return 'img'
    case 'button':
      return 'button'
    case 'a':
      return element.hasAttribute('href') ? 'link' : null
    case 'input':
      if (element.type === 'number') return 'spinbutton'
      if (element.type === 'text') return 'textbox'
      return null
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'heading'
    default:
      return null
  }
}

function getRole(element) {
  const explicitRole = element.getAttribute('role')
  return explicitRole || getImplicitRole(element)
}

function getRelevantAttributes(element) {
  const attributes = {}
  for (const name of RELEVANT_ATTRIBUTES) {
    if (element.hasAttribute(name)) {
      attributes[name] = element.getAttribute(name)
    }
  }
  return attributes
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10
}

export function inspectElement(element) {
  const rect = element.getBoundingClientRect()
  const accessibleName = computeAccessibleName(element)
  const accessibleDescription = computeAccessibleDescription(element)

  return {
    tagName: element.tagName.toLowerCase(),
    role: getRole(element),
    accessibleName: accessibleName === '' ? null : accessibleName,
    accessibleDescription: accessibleDescription === '' ? null : accessibleDescription,
    width: roundToOneDecimal(rect.width),
    height: roundToOneDecimal(rect.height),
    attributes: getRelevantAttributes(element),
  }
}

// Elements that take keyboard focus with no author intervention. `a` earns it
// only with an href, which the readout reports as an implicit role of `link`.
const NATIVELY_FOCUSABLE_TAGS = ['button', 'input', 'select', 'textarea']

/**
 * Answered from a Readout object, never from a focus reading. A focus reading
 * of `null` is identical whether the element was never focused or could never
 * be focused at all, so it cannot tell those apart — and treating an image as
 * something the player neglected to test would teach them something false.
 *
 * This reads a shape; it touches no DOM and moves no focus.
 */
export function isKeyboardFocusable(readout) {
  if (!readout) return false
  if (readout.tagName === 'a') return readout.role === 'link'
  return NATIVELY_FOCUSABLE_TAGS.includes(readout.tagName)
}

// Input types that render a control rather than a text field. Stated as the
// exceptions rather than as a list of the text types on purpose: `type` is
// normalised by the DOM, so an input with no type or an unrecognised one
// reports `text`, and the next type HTML gains will almost certainly be a text
// one. A list of text types would silently misclassify it; this list does not.
//
// `number` is deliberately absent. It renders a text field with a caret in it,
// which is the only property this predicate is about.
const NON_TEXT_INPUT_TYPES = [
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]

/**
 * Whether the element accepts typed text — that is, whether it puts a caret on
 * screen that the pointer is expected to position.
 *
 * A property of the element, never of any particular level's target ids: a
 * rule written around one field would be wrong the first time a level carries
 * a second one.
 *
 * This reads a live element rather than a Readout object, because its one
 * caller runs during a `mousedown` and no readout exists at that moment. It
 * touches nothing and moves nothing.
 */
export function isTextEntry(element) {
  if (!element) return false
  if (element.isContentEditable) return true

  const tagName = element.tagName.toLowerCase()
  if (tagName === 'textarea') return true
  if (tagName !== 'input') return false

  return !NON_TEXT_INPUT_TYPES.includes(element.type)
}

export function inspectFocus(element) {
  const style = getComputedStyle(element)
  const outlineStyle = style.outlineStyle
  const outlineWidth = style.outlineWidth
  const outlineColor = style.outlineColor
  const boxShadow = style.boxShadow

  const hasOutline = outlineStyle !== 'none' && Number.parseFloat(outlineWidth) > 0
  const hasBoxShadow = boxShadow !== 'none'

  return {
    outlineStyle,
    outlineWidth,
    outlineColor,
    boxShadow,
    hasVisibleIndicator: hasOutline || hasBoxShadow,
  }
}
