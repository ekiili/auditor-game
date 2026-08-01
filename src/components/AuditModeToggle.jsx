import { useId } from 'react'

// aria-disabled rather than the native attribute, for the reason the rule
// picker's log button already records: a natively disabled button leaves the
// tab order, and the text explaining why it is unavailable then becomes
// unreachable at exactly the moment the player wants it.
//
// The control keeps its place in the layout whether or not it is available.
// Unmounting it would let the row above the card change height, and the card
// would jump at the moment the review opens — the one moment the player is
// being asked to compare it against what they just audited.
const TOGGLE_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 aria-disabled:cursor-not-allowed aria-disabled:border-gray-200 aria-disabled:text-gray-700 aria-disabled:hover:bg-white'

function AuditModeToggle({ auditMode, onToggle, unavailableReason = null }) {
  const reasonId = useId()
  const isUnavailable = unavailableReason !== null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={auditMode}
        aria-disabled={isUnavailable ? true : undefined}
        aria-describedby={isUnavailable ? reasonId : undefined}
        onClick={() => {
          if (isUnavailable) return
          onToggle()
        }}
        className={TOGGLE_CLASSES}
      >
        Audit Mode
      </button>

      {isUnavailable && (
        <p id={reasonId} className="text-sm text-gray-700">
          {unavailableReason}
        </p>
      )}
    </div>
  )
}

export default AuditModeToggle
