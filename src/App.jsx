import { useEffect, useId, useReducer, useRef } from 'react'
import AuditModeToggle from './components/AuditModeToggle.jsx'
import GuessLog from './components/GuessLog.jsx'
import ReadoutPanel from './components/ReadoutPanel.jsx'
import RulePicker from './components/RulePicker.jsx'
import SelectionOverlay from './components/SelectionOverlay.jsx'
import TargetList from './components/TargetList.jsx'
import { inspectElement, inspectFocus } from './engine/readout.js'
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

  const submit = () => dispatch(submitAudit({ snapshot: buildSnapshot() }))

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

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-gray-50 p-6">
      <h1 className="sr-only">Audit Game</h1>

      <AuditModeToggle auditMode={state.auditMode} onToggle={() => dispatch(toggleAuditMode())} />

      {/* items-start keeps the canvas column's position independent of how
          tall the chrome column grows, so inspecting an element never moves it. */}
      <div className="flex w-full flex-col items-start justify-center gap-6 lg:flex-row">
        <div
          ref={canvasRef}
          className="w-full max-w-sm"
          onClickCapture={handleCanvasClickCapture}
          onKeyDownCapture={handleCanvasKeyDownCapture}
          onFocus={handleCanvasFocus}
        >
          <LevelComponent {...currentLevel.applySabotage(state.truth)} />
        </div>

        {state.auditMode && (
          <div className="flex w-full max-w-sm flex-col gap-6">
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

            {state.status === 'auditing' && (
              <div>
                <button type="button" onClick={handleSubmit} className={BUTTON_CLASSES}>
                  Submit audit
                </button>
              </div>
            )}

            {/* Deliberately minimal — counts and a button. 5e replaces it. */}
            {state.status === 'reviewing' && result !== null && (
              <div className="rounded-lg border border-gray-300 bg-white p-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Round {state.round} of {state.totalRounds}
                </h2>
                <p className="mt-2 text-sm text-gray-900">Round score: {result.score}</p>
                <p className="text-sm text-gray-900">
                  True positives: {result.truePositives.length}
                </p>
                <p className="text-sm text-gray-900">
                  False positives: {result.falsePositives.length}
                </p>
                <p className="text-sm text-gray-900">
                  False negatives: {result.falseNegatives.length}
                </p>
                <p className="mt-2 text-sm text-gray-900">Total score: {state.score}</p>

                <button
                  type="button"
                  onClick={handleNextRound}
                  className={`mt-3 ${BUTTON_CLASSES}`}
                >
                  Next round
                </button>
              </div>
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
