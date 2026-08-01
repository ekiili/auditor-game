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
