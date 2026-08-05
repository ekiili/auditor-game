import { useId, useLayoutEffect, useState } from 'react'
import { inspectElement, inspectFocus, isKeyboardFocusable } from '../engine/readout.js'

// Every value renders with the same classes. An absent value differs from a
// present one only in the word it prints — no colour, weight, icon, border or
// background may distinguish them, because noticing the absence is the skill
// the game is teaching.
const VALUE_CLASSES = 'mt-0.5 font-mono text-sm break-words text-gray-900'
const LABEL_CLASSES = 'text-sm text-gray-600'
const PROSE_CLASSES = 'text-sm text-gray-600'
const HEADING_CLASSES = 'text-sm font-semibold text-gray-900'

const NONE = '(none)'

// Stated rather than left blank: an empty section teaches nothing, while a
// stated reason teaches that not everything on a page is meant to be focusable.
const notFocusableReason = (tagName) => {
  const article = 'aeiou'.includes(tagName[0]) ? 'An' : 'A'
  return `${article} <${tagName}> never takes keyboard focus, so there is no focus indicator to show. Not everything on a page is meant to be focusable.`
}

function formatValue(value) {
  return value === null ? NONE : String(value)
}

function formatSize(width, height) {
  return `${width} × ${height}`
}

function formatAttributes(attributes) {
  const entries = Object.entries(attributes)
  if (entries.length === 0) return NONE
  return entries.map(([name, value]) => `${name}="${value}"`).join('  ')
}

// The ratio and the two colours it was taken between, in one string, styled
// exactly as every other value here.
//
// No threshold is printed, nothing is compared to 4.5:1 or 3:1, and a low
// figure is rendered in the same colour and weight as a high one. Where the
// thresholds lie is the skill this game teaches, and a panel that marked them
// would answer the question instead of posing it. `toFixed` is for a steady
// column width in the monospace value, not for precision the ratio does not
// already carry — it arrives rounded to two decimals.
function formatContrast(contrast, colourKey) {
  if (contrast === null) return NONE
  return `${contrast.ratio.toFixed(2)}:1  ${contrast[colourKey]} on ${contrast.background}`
}

function Row({ label, value }) {
  return (
    <div>
      <dt className={LABEL_CLASSES}>{label}</dt>
      <dd className={VALUE_CLASSES}>{value}</dd>
    </div>
  )
}

// Focus is moved by the act of selecting an element, in App, where both
// selection routes meet. The panel reads; it never moves anything.
function ReadoutPanel({ targetId, containerRef }) {
  const titleId = useId()
  const [readout, setReadout] = useState(null)
  const [focusReadout, setFocusReadout] = useState(null)

  const canTakeFocus = isKeyboardFocusable(readout)

  useLayoutEffect(() => {
    if (!targetId) {
      setReadout(null)
      setFocusReadout(null)
      return undefined
    }

    const element = containerRef.current?.querySelector(`[data-audit-target="${targetId}"]`)

    setReadout(element ? inspectElement(element) : null)

    // Focus styles are only evidence while the element actually holds focus.
    // An unfocused element's resting outline says nothing, so a new current
    // element starts with no focus reading at all.
    setFocusReadout(element && document.activeElement === element ? inspectFocus(element) : null)

    if (!element) return undefined

    const captureFocus = (event) => {
      if (event.target === element) setFocusReadout(inspectFocus(element))
    }

    document.addEventListener('focusin', captureFocus)
    return () => document.removeEventListener('focusin', captureFocus)
  }, [targetId, containerRef])

  return (
    <section
      aria-labelledby={titleId}
      className="w-full rounded-lg border border-gray-300 bg-white p-4"
    >
      <h2 id={titleId} className="text-base font-semibold text-gray-900">
        Inspector
      </h2>

      {readout === null ? (
        <p className={`mt-2 ${PROSE_CLASSES}`}>Select an element to inspect it.</p>
      ) : (
        <>
          <dl className="mt-3 flex flex-col gap-2">
            <Row label="Tag name" value={formatValue(readout.tagName)} />
            <Row label="Role" value={formatValue(readout.role)} />
            <Row label="Accessible name" value={formatValue(readout.accessibleName)} />
            <Row
              label="Accessible description"
              value={formatValue(readout.accessibleDescription)}
            />
            <Row label="Size" value={formatSize(readout.width, readout.height)} />
            <Row label="Attributes" value={formatAttributes(readout.attributes)} />
            <Row
              label="Text contrast"
              value={formatContrast(readout.textContrast, 'foreground')}
            />
            <Row
              label="Boundary contrast"
              value={formatContrast(readout.boundaryContrast, 'boundary')}
            />
          </dl>

          <h3 className={`mt-4 ${HEADING_CLASSES}`}>Focus</h3>

          {/* Selecting an element focuses it, so anything that can hold focus
              arrives here with a reading already taken. What is left is the
              elements that never could, and they are told why. */}
          {focusReadout === null ? (
            <>
              {!canTakeFocus && (
                <p className={`mt-2 max-w-full ${PROSE_CLASSES}`}>
                  {notFocusableReason(readout.tagName)}
                </p>
              )}

              <p className={`mt-2 ${PROSE_CLASSES}`}>
                Nothing to report: this element cannot hold focus.
              </p>
            </>
          ) : (
            <dl className="mt-2 flex flex-col gap-2">
              <Row label="Outline style" value={formatValue(focusReadout.outlineStyle)} />
              <Row label="Outline width" value={formatValue(focusReadout.outlineWidth)} />
              <Row label="Outline colour" value={formatValue(focusReadout.outlineColor)} />
              <Row label="Box-shadow" value={formatValue(focusReadout.boxShadow)} />
              <Row
                label="Visible indicator"
                value={focusReadout.hasVisibleIndicator ? 'Yes' : 'No'}
              />
            </dl>
          )}
        </>
      )}
    </section>
  )
}

export default ReadoutPanel
