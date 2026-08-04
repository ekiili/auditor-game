import { useId } from 'react'

// aria-disabled rather than the native attribute, for the reason the rule
// picker's log button already records: a natively disabled button leaves the
// tab order, and the text explaining why it is unavailable then becomes
// unreachable at exactly the moment the player wants it.
//
// The control keeps its place in the layout whether or not it is available.
// Unmounting it would let the row above the card change height, and the card
// would jump at the moment the review opens — the one moment the player is
// being asked to compare it against what they just audited. At game over the
// card is not rendered, so that reasoning does not reach there and App does
// not render this component at all.

const TOGGLE_BASE =
  'inline-flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

// Three appearances, each a complete statement of its own foreground and
// background including its hover. Built as whole strings rather than as
// stacked CSS variants because pressed, unavailable and hover would otherwise
// be three equal-specificity rules racing for one background, and whichever
// combination lost would leave one state's text on another state's fill.
//
// Pressed carries the interface's purple, because that is what purple means
// everywhere else here — this is chosen, this is on. The control used to look
// identical in both states, and the only evidence Audit Mode was on was the
// tools appearing somewhere else on the screen.
const TOGGLE_APPEARANCE = {
  unavailable:
    'cursor-not-allowed border-gray-200 bg-white text-gray-700 hover:border-gray-200 hover:bg-white hover:text-gray-700',
  pressed:
    'border-indigo-700 bg-indigo-700 text-white hover:border-indigo-800 hover:bg-indigo-800 hover:text-white',
  rest: 'border-gray-300 bg-white text-indigo-700 hover:border-indigo-700 hover:bg-indigo-50 hover:text-indigo-800',
}

function appearanceFor(auditMode, isUnavailable) {
  if (isUnavailable) return TOGGLE_APPEARANCE.unavailable
  return auditMode ? TOGGLE_APPEARANCE.pressed : TOGGLE_APPEARANCE.rest
}

// `ref` lands on the button, not the wrapper: a restart moves focus here, and
// focus belongs on the control rather than on a container given a tabIndex to
// receive it. React 19 passes `ref` as an ordinary prop, so no forwardRef.
//
// `clearanceClasses` is the right-hand padding that takes the tools region out
// of this row's content box. Only the layout knows whether that region is
// rendered, so the value comes from App rather than being inferred here.
function AuditModeToggle({
  auditMode,
  onToggle,
  unavailableReason = null,
  clearanceClasses = '',
  ref = null,
}) {
  const reasonId = useId()
  const isUnavailable = unavailableReason !== null

  return (
    // From lg up the row spans the full width and gives up its right-hand side
    // to the tools, so what is left is exactly the card's column and centring
    // inside it puts the button on the card's own centre line. The card is the
    // one element guaranteed not to move, which is what makes it the right
    // thing to centre against.
    //
    // `gap-0` is load-bearing, not tidying. Anything separating the button's
    // slot from the paragraph comes out of the slot, so the button would sit
    // half that distance off the card's centre — and only in the status where
    // the paragraph exists, so it would creep sideways as the review opened.
    // Measured at 6px before the gap was removed. The separation is drawn with
    // `indent-3` on the paragraph instead, which moves the text without giving
    // the box any width.
    //
    // Below lg the row shrink-wraps around the button alone and the parent
    // centres it, which lands on the card's centre because the card is centred
    // in the same box there.
    <div
      className={`flex flex-wrap items-center gap-0 lg:w-full lg:flex-nowrap ${clearanceClasses}`}
    >
      <div className="lg:flex lg:min-w-0 lg:flex-1 lg:justify-center">
        <button
          ref={ref}
          type="button"
          aria-pressed={auditMode}
          aria-disabled={isUnavailable ? true : undefined}
          aria-describedby={isUnavailable ? reasonId : undefined}
          onClick={() => {
            if (isUnavailable) return
            onToggle()
          }}
          className={`${TOGGLE_BASE} ${appearanceFor(auditMode, isUnavailable)}`}
        >
          Audit Mode
        </button>
      </div>

      {/* Zero width, so it takes nothing from the space the button is centred
          in, and renders into the empty band beside it. That band sits above
          every column and overlaps nothing. `indent-3` is what separates it
          from the button: padding and margin would both consume flex space and
          push the button off the card again, while a text indent does not
          touch the box. `whitespace-nowrap` keeps it on one line, so the row's
          height — which the card's position is measured through — is the same
          whether this paragraph is present or not. */}
      {isUnavailable && (
        <p id={reasonId} className="w-0 indent-3 text-sm whitespace-nowrap text-gray-700">
          {unavailableReason}
        </p>
      )}
    </div>
  )
}

export default AuditModeToggle
