import { useLayoutEffect, useState } from 'react'

// The overlay box is sized to exactly the target's bounding rectangle. The
// visible ring is drawn with `outline` and pushed outward with
// `outline-offset`, because an outline sits outside the box without
// participating in layout — so the highlight reads as surrounding the element
// while the overlay's own rectangle still matches it exactly.
const OVERLAY_CLASSES =
  'pointer-events-none fixed outline outline-2 outline-offset-2 outline-indigo-700'

function SelectionOverlay({ targetId, containerRef }) {
  const [rect, setRect] = useState(null)

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

  if (!rect) return null

  return (
    <div
      aria-hidden="true"
      className={OVERLAY_CLASSES}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    />
  )
}

export default SelectionOverlay
