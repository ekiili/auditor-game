import { useEffect, useId, useLayoutEffect, useReducer, useRef } from 'react'
import AuditModeToggle from './components/AuditModeToggle.jsx'
import FindingsList from './components/FindingsList.jsx'
import GuessLog from './components/GuessLog.jsx'
import ReadoutPanel from './components/ReadoutPanel.jsx'
import ReviewMarks, { MARK_SCOPE_ATTRIBUTE } from './components/ReviewMarks.jsx'
import RulePicker from './components/RulePicker.jsx'
import SelectionOverlay from './components/SelectionOverlay.jsx'
import TargetList from './components/TargetList.jsx'
import { inspectElement, inspectFocus } from './engine/readout.js'
import { deriveMarks } from './engine/review.js'
import { selectViolations } from './engine/saboteurEngine.js'
import { levels } from './levels/index.js'
import {
  addGuess,
  gameReducer,
  INITIAL_STATE,
  nextRound,
  removeGuess,
  selectRule,
  selectTarget,
  startRound,
  submitAudit,
  toggleAuditMode,
} from './state/gameState.js'

const [currentLevel] = levels

const ACTIVATION_KEYS = ['Enter', ' ']

// Keyed by `status`; an absent key means the control is available.
const TOGGLE_UNAVAILABLE_REASONS = {
  reviewing: 'Not available while you review this round.',
  gameOver: 'Not available once the session is over.',
}

const BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)
  const canvasRef = useRef(null)
  const dialogRef = useRef(null)
  // Focus readings are accumulated as the player moves around, not read at
  // submission: the confirmation dialog takes focus, so nothing about the
  // card's focus state survives to that point. A ref, not state — recording a
  // reading must not re-render the card mid-round.
  const focusReadoutsRef = useRef({})
  const nextRoundRef = useRef(null)
  // Submitting unmounts the Submit control, and on the empty-log path the
  // dialog with it. The element native restoration would return focus to is
  // gone by then, so focus falls to the body and a keyboard player has to tab
  // from the top of the page to reach the one control left to them.
  const focusNextRoundRef = useRef(false)
  const confirmTitleId = useId()
  const LevelComponent = currentLevel.Component

  useEffect(() => {
    dispatch(
      startRound({
        levelId: currentLevel.id,
        violations: selectViolations(currentLevel),
      }),
    )
  }, [])

  // Capture phase: a bubble-phase handler would run after the card's own
  // onClick, letting the stepper change its value on a click meant to select.
  const handleCanvasClickCapture = (event) => {
    if (!state.auditMode) return

    const element = event.target.closest('[data-audit-target]')

    event.preventDefault()
    event.stopPropagation()

    if (element) dispatch(selectTarget(element.dataset.auditTarget))
  }

  // Activation is suppressed; focus is not. Tab still moves through the card,
  // which is how the player checks for a focus indicator.
  const handleCanvasKeyDownCapture = (event) => {
    if (!state.auditMode) return
    if (!ACTIVATION_KEYS.includes(event.key)) return

    event.preventDefault()
    event.stopPropagation()
  }

  // React's onFocus is delegated as native `focusin`, which bubbles — plain
  // `focus` does not, and would never reach this wrapper. Focus landing on
  // anything that is not an audit target leaves the current element alone, so
  // moving to the panel or the toggle does not clear it.
  const handleCanvasFocus = (event) => {
    if (!state.auditMode) return

    const element = event.target.closest('[data-audit-target]')

    if (!element) return

    // The element holds focus right now, which is the only moment its focus
    // styles are evidence of anything.
    focusReadoutsRef.current[element.dataset.auditTarget] = inspectFocus(element)
    dispatch(selectTarget(element.dataset.auditTarget))
  }

  // Every audit target gets an entry in both maps. A miss needs explaining as
  // much as a false alarm, and a null focus entry records that the player
  // never keyboard-tested that element — which is itself worth telling them.
  const buildSnapshot = () => {
    const elements = {}
    const focus = {}

    for (const target of currentLevel.auditTargets) {
      const element = canvasRef.current.querySelector(`[data-audit-target="${target.id}"]`)
      elements[target.id] = inspectElement(element)
      focus[target.id] = focusReadoutsRef.current[target.id] ?? null
    }

    return { elements, focus }
  }

  const submit = () => {
    focusNextRoundRef.current = true
    dispatch(submitAudit({ snapshot: buildSnapshot() }))
  }

  // Runs in the same commit that mounts Next round, so focus never touches the
  // body in between. Set on both submit paths, so where focus lands does not
  // depend on how the round was closed. Cancel and Escape never set the flag —
  // the Submit control survives those, and native restoration handles it.
  useLayoutEffect(() => {
    if (state.status !== 'reviewing') return
    if (!focusNextRoundRef.current) return

    focusNextRoundRef.current = false
    nextRoundRef.current?.focus()
  }, [state.status])

  const handleSubmit = () => {
    if (state.guesses.length === 0) {
      dialogRef.current.showModal()
      return
    }

    submit()
  }

  const handleConfirmSubmit = () => {
    dialogRef.current.close()
    submit()
  }

  const handleNextRound = () => {
    focusReadoutsRef.current = {}
    dispatch(nextRound({ violations: selectViolations(currentLevel) }))
  }

  const result = state.lastResult
  const isAuditing = state.status === 'auditing'
  const isReviewing = state.status === 'reviewing'

  // Audit Mode belongs to the act of auditing. Once the round is scored there
  // is nothing left to switch off, and switching it off used to unmount the
  // column holding the only route forward. The control stays present and says
  // why it is unavailable rather than disappearing or quietly ignoring clicks.
  const toggleUnavailableReason = TOGGLE_UNAVAILABLE_REASONS[state.status] ?? null

  // Only the auditing tools are Audit Mode's to hide. The review and the
  // end-of-session panel answer to `status` alone, so no state of this toggle
  // can strand the player even if it later gains a way to change during them.
  const showChromeColumn = isAuditing ? state.auditMode : true

  // Derived from the Round result and the dimensions the snapshot already
  // holds. Nothing is measured at review time.
  const marks = isReviewing ? deriveMarks(result, state.lastSnapshot) : null

  // The card stops being usable once the round is scored, but stays fully in
  // the accessibility tree: a screen reader user must still be able to work
  // through it and meet the violations directly. `pointer-events` closes the
  // pointer route; `interactive={false}` puts the controls out of the tab
  // order without disabling or hiding them. `inert` would do both at once and
  // take the component out of the accessibility tree with it.
  const cardWrapperClasses = isReviewing ? 'w-full pointer-events-none' : 'w-full'
  const markScope = isReviewing ? { [MARK_SCOPE_ATTRIBUTE]: '' } : {}

  // h-screen + overflow-hidden, not min-h-screen: the document must never grow
  // a scrollbar. Everything that can overflow scrolls inside its own column
  // instead, so the audited card never leaves the viewport.
  return (
    <main className="flex h-screen flex-col items-center gap-6 overflow-hidden bg-gray-50 p-6">
      <h1 className="sr-only">Audit Game</h1>

      <AuditModeToggle
        auditMode={state.auditMode}
        onToggle={() => dispatch(toggleAuditMode())}
        unavailableReason={toggleUnavailableReason}
      />

      {/* min-h-0 lets the columns shrink below their content height, which is
          what makes their own overflow-y-auto engage instead of pushing the
          row taller. lg:items-stretch gives both columns the full row height,
          so the card's position no longer depends on how tall the chrome
          column grows — inspecting an element never moves it. */}
      <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
        {/* Scrolling lives on this column, never on the sizing-only wrapper
            below: a safety valve for viewports too short for the card, which
            scrolls rather than clipping it. lg:flex-initial restores the
            content-width sizing the row layout expects.

            `relative` is load-bearing, not decoration. The sr-only live region
            inside the stepper is position:absolute; without a positioned
            ancestor it resolves against the initial containing block, escapes
            this column's overflow entirely, and grows the document instead.
            It does not affect the overlay, which is position:fixed — only
            transform/filter/contain would capture that, and none is used. */}
        <div className="relative w-full min-h-0 max-w-sm flex-1 overflow-y-auto lg:flex-initial">
          <div
            ref={canvasRef}
            className={cardWrapperClasses}
            {...markScope}
            onClickCapture={handleCanvasClickCapture}
            onKeyDownCapture={handleCanvasKeyDownCapture}
            onFocus={handleCanvasFocus}
          >
            <LevelComponent
              {...currentLevel.applySabotage(state.truth)}
              interactive={!isReviewing}
            />
          </div>

          {isReviewing && <ReviewMarks marks={marks} />}
        </div>

        {/* `relative` for the same reason as the card column: the visually
            hidden radios and separators in the target list and rule picker are
            position:absolute. */}
        {showChromeColumn && (
          <div className="relative flex w-full min-h-0 max-w-sm flex-1 flex-col gap-6 overflow-y-auto lg:flex-initial">
            {/* The auditing tools belong to the round, not to the result. Once
                the round is scored the findings list is the single place a
                result is read, and the column is its to fill. */}
            {state.status === 'auditing' && (
              <>
                <TargetList
                  auditTargets={currentLevel.auditTargets}
                  selectedTarget={state.selectedTarget}
                  onSelect={(targetId) => dispatch(selectTarget(targetId))}
                />

                <ReadoutPanel targetId={state.selectedTarget} containerRef={canvasRef} />

                <RulePicker
                  selectedTarget={state.selectedTarget}
                  selectedRule={state.selectedRule}
                  guesses={state.guesses}
                  onSelectRule={(ruleId) => dispatch(selectRule(ruleId))}
                  onLog={() =>
                    dispatch(addGuess({ ruleId: state.selectedRule, target: state.selectedTarget }))
                  }
                />

                <GuessLog
                  guesses={state.guesses}
                  auditTargets={currentLevel.auditTargets}
                  onRemove={(guess) => dispatch(removeGuess(guess))}
                />

                <div>
                  <button type="button" onClick={handleSubmit} className={BUTTON_CLASSES}>
                    Submit audit
                  </button>
                </div>
              </>
            )}

            {isReviewing && result !== null && (
              <>
                <div className="rounded-lg border border-gray-300 bg-white p-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    Round {state.round} of {state.totalRounds}
                  </h2>
                  <p className="mt-2 text-sm text-gray-900">Round score: {result.score}</p>
                  <p className="text-sm text-gray-900">Total score: {state.score}</p>
                </div>

                <FindingsList
                  result={result}
                  auditTargets={currentLevel.auditTargets}
                  snapshot={state.lastSnapshot}
                  selectedTarget={state.selectedTarget}
                  onSelect={(targetId) => dispatch(selectTarget(targetId))}
                />

                <div>
                  <button
                    type="button"
                    ref={nextRoundRef}
                    onClick={handleNextRound}
                    className={BUTTON_CLASSES}
                  >
                    Next round
                  </button>
                </div>
              </>
            )}

            {state.status === 'gameOver' && (
              <div className="rounded-lg border border-gray-300 bg-white p-4">
                <h2 className="text-base font-semibold text-gray-900">Game over</h2>
                <p className="mt-2 text-sm text-gray-900">Final score: {state.score}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {state.auditMode && (
        <SelectionOverlay targetId={state.selectedTarget} containerRef={canvasRef} />
      )}

      {/* Mounted under the same condition as the Submit control it belongs to.
          A closed dialog is display:none, but leaving it mounted would still
          put a second "Submit audit" button in the DOM with the game closed.

          Native dialog + showModal(): focus trapping, Escape, and an inert
          background come from the platform. Hand-rolled modals get exactly
          those three things wrong. */}
      {state.auditMode && state.status === 'auditing' && (
      <dialog
        ref={dialogRef}
        aria-labelledby={confirmTitleId}
        className="rounded-lg border border-gray-300 bg-white p-6 text-gray-900 backdrop:bg-gray-900/50"
      >
        <h2 id={confirmTitleId} className="text-base font-semibold">
          Confirm submission
        </h2>

        <p className="mt-2 max-w-sm text-sm">
          Submit with no violations logged? You&apos;re declaring this component compliant.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current.close()}
            className={BUTTON_CLASSES}
          >
            Cancel
          </button>

          <button type="button" onClick={handleConfirmSubmit} className={BUTTON_CLASSES}>
            Submit audit
          </button>
        </div>
      </dialog>
      )}
    </main>
  )
}

export default App
