import { useId, useLayoutEffect, useState } from 'react'
import { inspectElement, inspectFocus } from '../engine/readout.js'

// Every value renders with the same classes. An absent value differs from a
// present one only in the word it prints — no colour, weight, icon, border or
// background may distinguish them, because noticing the absence is the skill
// the game is teaching.
const VALUE_CLASSES = 'mt-0.5 font-mono text-sm break-words text-gray-900'
const LABEL_CLASSES = 'text-sm text-gray-600'
const PROSE_CLASSES = 'text-sm text-gray-600'
const HEADING_CLASSES = 'text-sm font-semibold text-gray-900'

const NONE = '(none)'

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

function Row({ label, value }) {
  return (
    <div>
      <dt className={LABEL_CLASSES}>{label}</dt>
      <dd className={VALUE_CLASSES}>{value}</dd>
    </div>
  )
}

function ReadoutPanel({ targetId, containerRef }) {
  const titleId = useId()
  const [readout, setReadout] = useState(null)
  const [focusReadout, setFocusReadout] = useState(null)

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
          </dl>

          <h3 className={`mt-4 ${HEADING_CLASSES}`}>Focus</h3>

          {focusReadout === null ? (
            <p className={`mt-2 ${PROSE_CLASSES}`}>
              Not focused yet — press Tab to reach this element.
            </p>
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
