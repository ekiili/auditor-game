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

// Same shape as the rule picker's log button and the Audit Mode toggle:
// aria-disabled rather than the native attribute, so the sentence explaining
// why it is unavailable stays reachable at the moment the player wants it.
const FOCUS_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 aria-disabled:cursor-not-allowed aria-disabled:border-gray-200 aria-disabled:text-gray-700 aria-disabled:hover:bg-white'

// Stated rather than hidden: a missing control teaches nothing, while a stated
// reason teaches that not everything on a page is meant to be focusable.
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
  const reasonId = useId()
  const [readout, setReadout] = useState(null)
  const [focusReadout, setFocusReadout] = useState(null)

  const canTakeFocus = isKeyboardFocusable(readout)

  // The player performing the test, not the game harvesting a reading. The
  // focus that moves is real, so what the panel then reports is honest.
  //
  // `focusVisible: true` is load-bearing and must not be dropped. Verified on
  // Chromium 151, WebKit 26.5 and Firefox 153: a plain focus() call inside a
  // click handler leaves :focus-visible unmatched on every one of them, so a
  // compliant element would render no indicator and be reported as failing.
  // Deferring the call out of the click dispatch does not help either — it was
  // measured and it fails the same way.
  const moveFocusHere = () => {
    if (!canTakeFocus) return

    const element = containerRef.current?.querySelector(`[data-audit-target="${targetId}"]`)
    element?.focus({ focusVisible: true })
  }

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

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={moveFocusHere}
              aria-disabled={canTakeFocus ? undefined : true}
              aria-describedby={canTakeFocus ? undefined : reasonId}
              className={FOCUS_BUTTON_CLASSES}
            >
              Move focus here
            </button>

            {!canTakeFocus && (
              <p id={reasonId} className={`max-w-full ${PROSE_CLASSES}`}>
                {notFocusableReason(readout.tagName)}
              </p>
            )}
          </div>

          {focusReadout === null ? (
            <p className={`mt-2 ${PROSE_CLASSES}`}>
              {canTakeFocus
                ? 'Not focused yet — move focus here, or press Tab to reach this element.'
                : 'Nothing to report: this element cannot hold focus.'}
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
