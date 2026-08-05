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

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100
}

// --- Colour --------------------------------------------------------------
//
// `getComputedStyle` hands back whatever colour space the author wrote in.
// Tailwind v4 emits `oklch()`, the browser's own defaults emit `rgb()`, and a
// transparent background comes back as `rgba(0, 0, 0, 0)` — all three appear on
// this card already, and a hand-written parser would have to keep pace with
// every colour function CSS gains. So the browser is asked to do the conversion
// instead: a colour assigned to a canvas context and read back is the sRGB the
// machine would actually paint, in any notation it understands.
//
// The canvas is 1×1, created once, and **never inserted into the document**. It
// is not part of the page and nothing about the page changes because it exists,
// so Guardrail 5 is intact: this reads colours, it does not write anything. It
// is created lazily so that importing this module under plain `node` — which
// every pure module must survive — touches no browser API at all.
const TEXT_NODE = 3

let colourContext

function getColourContext() {
  if (colourContext !== undefined) return colourContext

  if (typeof document === 'undefined') {
    colourContext = null
    return colourContext
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  colourContext = canvas.getContext('2d', { willReadFrequently: true })
  return colourContext
}

/**
 * A CSS colour string as sRGB channels plus alpha, or `null` if the browser
 * does not recognise it.
 *
 * Assigning an invalid colour to `fillStyle` leaves the previous value in
 * place, so the value is assigned twice from two different starting points.
 * A colour the browser understands normalises to the same string both times; a
 * value it rejects returns whichever sentinel preceded it, and the two
 * disagree. Reading the property back is the only way to tell those apart.
 */
function toRgba(value) {
  const context = getColourContext()
  if (!context) return null

  context.fillStyle = '#000000'
  context.fillStyle = value
  const fromBlack = context.fillStyle
  context.fillStyle = '#ffffff'
  context.fillStyle = value
  if (context.fillStyle !== fromBlack) return null

  context.clearRect(0, 0, 1, 1)
  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
  return { r, g, b, a: a / 255 }
}

/**
 * Paints a stack of colour layers and reads back what results, front-most
 * layer last. The compositing is done by the browser rather than by arithmetic
 * here, because source-over blending is exactly what it does to paint the page
 * — reimplementing it would be a second opinion about the machine's own answer.
 *
 * The caller guarantees the backmost layer is opaque, so the result is too.
 */
function compositeLayers(layers) {
  const context = getColourContext()
  if (!context) return null

  context.clearRect(0, 0, 1, 1)
  for (let index = layers.length - 1; index >= 0; index--) {
    context.fillStyle = layers[index]
    context.fillRect(0, 0, 1, 1)
  }

  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
  return { r, g, b, a: a / 255 }
}

// Arrangements this walk cannot account for. Group opacity, a filter and a
// blend mode each change what reaches the screen in a way that reading one
// element's `background-color` does not capture, so meeting any of them ends
// the attempt rather than producing a figure that ignores them.
function breaksCompositing(style) {
  return style.opacity !== '1' || style.filter !== 'none' || style.mixBlendMode !== 'normal'
}

// A gradient or an image paints over the background colour beneath it, so no
// single flat colour describes what is there.
function breaksBackgroundResolution(style) {
  return breaksCompositing(style) || style.backgroundImage !== 'none'
}

/**
 * The opaque paint behind `startNode`, walking outward until one is found and
 * compositing every translucent layer met on the way.
 *
 * Returns `null` rather than a guess whenever the answer cannot be established:
 * a gradient or image anywhere in the chain, group opacity, a filter, a blend
 * mode, a colour the browser will not parse, or reaching the document root
 * without ever meeting an opaque paint. The review will eventually explain a
 * verdict with these numbers, and a wrong one is worse than none.
 */
function resolvePaintedBackground(startNode) {
  const layers = []
  let node = startNode

  while (node) {
    const style = getComputedStyle(node)
    if (breaksBackgroundResolution(style)) return null

    const colour = toRgba(style.backgroundColor)
    if (colour === null) return null

    if (colour.a > 0) {
      layers.push(style.backgroundColor)
      if (colour.a >= 1) return compositeLayers(layers)
    }

    node = node.parentElement
  }

  // Nothing opaque all the way up. The browser paints its canvas colour behind
  // this, which is a default rather than anything the page stated, so it is not
  // something to report as though the page had chosen it.
  return null
}

function formatColour({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`
}

function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const proportion = value / 255
    return proportion <= 0.03928
      ? proportion / 12.92
      : ((proportion + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(one, other) {
  const a = relativeLuminance(one)
  const b = relativeLuminance(other)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return roundToTwoDecimals((lighter + 0.05) / (darker + 0.05))
}

// What a translucent foreground actually looks like once it is on the page.
// Painted over the resolved background, because that is where it lands.
function flattenOnto(colourValue, colour, background) {
  if (colour.a >= 1) return colour
  return compositeLayers([colourValue, formatColour(background)])
}

/**
 * The text the element paints itself, as opposed to text painted by anything
 * inside it. A `<button>` wrapping only an icon renders none of its own, and
 * neither does an `<img>`; borrowing a descendant's or an ancestor's text would
 * report a contrast the element does not have.
 *
 * A text-entry control is the exception that is not really one: it paints its
 * value, and that value is the element's own text even though it is not a child
 * node. `isTextEntry` decides which controls those are, so a checkbox — which
 * has a value and renders no text — is not mistaken for one.
 */
function getOwnRenderedText(element) {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'textarea') return element.value ?? ''
  if (tagName === 'input') return isTextEntry(element) ? (element.value ?? '') : ''

  let text = ''
  for (const node of element.childNodes) {
    if (node.nodeType === TEXT_NODE) text += node.textContent
  }
  return text
}

function getTextContrast(element) {
  if (getOwnRenderedText(element).trim() === '') return null

  const style = getComputedStyle(element)
  const declared = toRgba(style.color)
  if (declared === null) return null
  if (declared.a === 0) return null

  const background = resolvePaintedBackground(element)
  if (background === null) return null

  const foreground = flattenOnto(style.color, declared, background)
  if (foreground === null) return null

  return {
    foreground: formatColour(foreground),
    background: formatColour(background),
    ratio: contrastRatio(foreground, background),
  }
}

const BORDER_SIDES = ['Top', 'Right', 'Bottom', 'Left']

/**
 * The colour of the element's visible border, or `null` if it draws none — and
 * also `null` if its sides disagree, because "the boundary colour" is then not
 * a single fact and picking one side would invent one.
 */
function getBoundaryColour(style) {
  const sides = []

  for (const side of BORDER_SIDES) {
    const width = Number.parseFloat(style[`border${side}Width`])
    const lineStyle = style[`border${side}Style`]
    if (!(width > 0)) continue
    if (lineStyle === 'none' || lineStyle === 'hidden') continue

    const value = style[`border${side}Color`]
    const colour = toRgba(value)
    if (colour === null) return null
    if (colour.a === 0) continue

    sides.push(value)
  }

  if (sides.length === 0) return null
  return sides.every((value) => value === sides[0]) ? sides[0] : null
}

/**
 * The element's boundary against the background it sits on — the paint its
 * outer edge abuts, resolved from the parent outward. The boundary's other
 * side is the element's own fill, which is a different question and not the one
 * this reports.
 */
function getBoundaryContrast(element) {
  const style = getComputedStyle(element)
  if (breaksCompositing(style)) return null

  const boundaryValue = getBoundaryColour(style)
  if (boundaryValue === null) return null

  const declared = toRgba(boundaryValue)
  if (declared === null) return null

  const background = resolvePaintedBackground(element.parentElement)
  if (background === null) return null

  const boundary = flattenOnto(boundaryValue, declared, background)
  if (boundary === null) return null

  return {
    boundary: formatColour(boundary),
    background: formatColour(background),
    ratio: contrastRatio(boundary, background),
  }
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
    textContrast: getTextContrast(element),
    boundaryContrast: getBoundaryContrast(element),
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
