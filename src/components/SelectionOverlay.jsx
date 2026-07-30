import { useEffect, useLayoutEffect, useState } from 'react'

// The overlay box is sized to exactly the target's bounding rectangle. The
// visible ring is drawn with `outline` and pushed outward with
// `outline-offset`, because an outline sits outside the box without
// participating in layout — so the highlight reads as surrounding the element
// while the overlay's own rectangle still matches it exactly.
const OVERLAY_CLASSES =
  'pointer-events-none fixed outline outline-2 outline-offset-2 outline-indigo-700'

function SelectionOverlay({ targetId, containerRef }) {
  const [rect, setRect] = useState(null)
  const [focusVisible, setFocusVisible] = useState(false)

  useLayoutEffect(() => {
    if (!targetId) {
      setRect(null)
      return undefined
    }

    const measure = () => {
      const element = containerRef.current?.querySelector(`[data-audit-target="${targetId}"]`)
      setRect(element ? element.getBoundingClientRect() : null)
    }

    measure()

    // Capture phase, so scrolling inside any nested scroller repositions too.
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)

    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [targetId, containerRef])

  // While the current element holds keyboard focus the highlight steps aside,
  // so the player reads that element's own focus styling — or its absence.
  // `:focus-visible` is the browser's own keyboard-versus-pointer heuristic;
  // hand-rolling it would diverge from what the player actually sees.
  useEffect(() => {
    const element = containerRef.current?.querySelector(`[data-audit-target="${targetId}"]`)

    if (!element) {
      setFocusVisible(false)
      return undefined
    }

    let frame = 0
    const sync = () => setFocusVisible(element.matches(':focus-visible'))
    // focusout fires before the next element takes focus, so let it settle.
    const syncAfterFocusSettles = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(sync)
    }

    sync()
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', syncAfterFocusSettles)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', syncAfterFocusSettles)
    }
  }, [targetId, containerRef])

  // Hidden means not rendered. Transparent, zero-opacity or zero-size would
  // still occupy the same measured geometry.
  if (!rect || focusVisible) return null

  return (
    <div
      aria-hidden="true"
      className={OVERLAY_CLASSES}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    />
  )
}

export default SelectionOverlay
