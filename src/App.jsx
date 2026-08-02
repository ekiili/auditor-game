import { useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import AuditModeToggle from './components/AuditModeToggle.jsx'
import FindingsList from './components/FindingsList.jsx'
import GuessLog from './components/GuessLog.jsx'
import ReadoutPanel from './components/ReadoutPanel.jsx'
import ReviewMarks, { MARK_SCOPE_ATTRIBUTE } from './components/ReviewMarks.jsx'
import RulePicker from './components/RulePicker.jsx'
import SelectionOverlay from './components/SelectionOverlay.jsx'
import SessionReport from './components/SessionReport.jsx'
import TargetList from './components/TargetList.jsx'
import { inspectElement, inspectFocus, isTextEntry } from './engine/readout.js'
import { deriveMarks } from './engine/review.js'
import { selectViolations } from './engine/saboteurEngine.js'
import { levels } from './levels/index.js'
import {
  addGuess,
  gameReducer,
  INITIAL_STATE,
  nextRound,
  removeGuess,
  restartSession,
  selectRule,
  selectTarget,
  startRound,
  submitAudit,
  toggleAuditMode,
} from './state/gameState.js'

const [currentLevel] = levels

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
  // Focus readings are accumulated as the player moves around, not read at
  // submission: the confirmation may itself take focus, so nothing about the
  // card's focus state survives to that point. A ref, not state — recording a
  // reading must not re-render the card mid-round.
  const focusReadoutsRef = useRef({})
  const nextRoundRef = useRef(null)
  const submitRef = useRef(null)
  const cancelConfirmRef = useRef(null)
  const restartRef = useRef(null)
  const auditModeRef = useRef(null)
  // Restarting unmounts the report and the Start a new session control with
  // it, so focus would fall to the body exactly as it does on a confirmed
  // submission. It is moved deliberately instead, for the same reason.
  const focusAuditModeRef = useRef(false)
  // Submitting unmounts the Submit control, and the confirmation with it. The
  // element focus would otherwise return to is gone by then, so focus falls to
  // the body and a keyboard player has to tab from the top of the page to
  // reach the one control left to them.
  const focusNextRoundRef = useRef(false)
  const confirmTitleId = useId()
  const confirmDescriptionId = useId()
  const LevelComponent = currentLevel.Component

  // Transient UI state, deliberately not in the reducer: the confirmation is a
  // property of this screen, not of the round.
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Guarding the render rather than resetting the flag from four places. The
  // question is "submit with nothing logged?", so it stops applying the moment
  // anything is logged — the panel cannot outlive its own premise.
  const showConfirmPanel = confirmOpen && state.guesses.length === 0

  useEffect(() => {
    dispatch(
      startRound({
        levelId: currentLevel.id,
        violations: selectViolations(currentLevel),
      }),
    )
  }, [])

  // Selecting an element performs the keyboard test on it: focus really moves,
  // so what the Inspector then reports is what a player pressing Tab would see.
  //
  // `focusVisible: true` is load-bearing and must not be dropped. Without it
  // the browser withholds the state it uses to decide whether to draw an
  // indicator, and a compliant element reports as failing. Called inside the
  // event dispatch, never deferred out of it — deferring was measured and
  // fails the same way the plain call does.
  //
  // An element that cannot take focus swallows this harmlessly: focus stays
  // where it was, and the Inspector says the criterion has nothing to report.
  const focusTarget = (targetId) => {
    const element = canvasRef.current?.querySelector(`[data-audit-target="${targetId}"]`)
    element?.focus({ focusVisible: true })
  }

  // The browser focuses a control on mousedown, before any click handler runs,
  // and marks that focus as pointer-driven so no focus-visible state applies.
  // Suppressing the default leaves the click handler free to move focus itself
  // with `focusVisible: true`, so a clicked element reads exactly as a
  // tabbed-to one. Focus is not removed from anything — it is applied a moment
  // later, deliberately, which is the opposite of taking it away.
  //
  // Controls that accept typed text are exempt. The browser's default mousedown
  // handling places the text caret as well as moving focus, so suppressing it
  // pins the caret to the end of the value wherever the player clicked. There
  // is nothing to buy back: an element that takes keyboard input matches
  // `:focus-visible` however focus arrives, so its reading is the same either
  // way. The exemption is a property of the element, not a target id — a level
  // with a second field must not need this line edited.
  const handleCanvasMouseDownCapture = (event) => {
    if (!state.auditMode) return
    if (isTextEntry(event.target)) return

    event.preventDefault()
  }

  // Capture phase, so the selection is recorded before the card's own onClick
  // runs. The click is not suppressed: a click both operates the control and
  // selects it, because operating a control is part of how a real audit is
  // conducted and nothing consequential happens when this card is operated.
  const handleCanvasClickCapture = (event) => {
    if (!state.auditMode) return

    const element = event.target.closest('[data-audit-target]')

    if (element) {
      // Focus first: the focusin it raises records the reading while the
      // element actually holds focus, which is the only moment its focus
      // styles are evidence of anything. The dispatch below then covers the
      // elements that cannot take focus and raise nothing.
      focusTarget(element.dataset.auditTarget)
      dispatch(selectTarget(element.dataset.auditTarget))
    }
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

  // The counterpart for a restart. Audit Mode is where a new round begins —
  // it is the only control the fresh screen offers and the first in the page —
  // so focus lands on the thing the player's next act is, not on a container
  // given a tabIndex to catch it.
  useLayoutEffect(() => {
    if (state.status !== 'auditing') return
    if (!focusAuditModeRef.current) return

    focusAuditModeRef.current = false
    auditModeRef.current?.focus()
  }, [state.status])

  // The panel is not a dialog, so the browser supplies none of what a dialog
  // did. Moving focus in, dismissing on Escape, and returning focus to the
  // Submit control are each built here on purpose.
  useLayoutEffect(() => {
    if (!showConfirmPanel) return
    cancelConfirmRef.current?.focus()
  }, [showConfirmPanel])

  const closeConfirm = () => {
    setConfirmOpen(false)
    submitRef.current?.focus()
  }

  // Document-level, not panel-level: the panel blocks nothing, so the player
  // may well be somewhere else on the page when they reach for Escape.
  useEffect(() => {
    if (!showConfirmPanel) return undefined

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeConfirm()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showConfirmPanel])

  const handleSubmit = () => {
    if (state.guesses.length === 0) {
      setConfirmOpen(true)
      return
    }

    submit()
  }

  // flushSync so the panel is out of the document before the snapshot is read,
  // not merely scheduled for removal. The contract is that nothing is
  // overlaying or obstructing the page at the moment of the reading, and it is
  // about the page being unobstructed rather than about any one mechanism —
  // so the ordering is made real here rather than argued about.
  const handleConfirmSubmit = () => {
    flushSync(() => setConfirmOpen(false))
    submit()
  }

  const handleNextRound = () => {
    focusReadoutsRef.current = {}
    setConfirmOpen(false)
    dispatch(nextRound({ violations: selectViolations(currentLevel) }))
  }

  // A restart rolls its own round, exactly as startRound and nextRound do: the
  // reducer is handed the violations and never generates them.
  const handleRestart = () => {
    focusReadoutsRef.current = {}
    setConfirmOpen(false)
    focusAuditModeRef.current = true
    dispatch(restartSession({ violations: selectViolations(currentLevel) }))
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
        ref={auditModeRef}
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
            onMouseDownCapture={handleCanvasMouseDownCapture}
            onClickCapture={handleCanvasClickCapture}
            onFocus={handleCanvasFocus}
          >
            <LevelComponent
              {...currentLevel.applySabotage(state.truth)}
              interactive={!isReviewing}
            />
          </div>

          {isReviewing && <ReviewMarks marks={marks} selectedTarget={state.selectedTarget} />}
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
                {/* Both selection routes move focus, so the reading the panel
                    shows never depends on how the player got there. */}
                <TargetList
                  auditTargets={currentLevel.auditTargets}
                  selectedTarget={state.selectedTarget}
                  onSelect={(targetId) => {
                    focusTarget(targetId)
                    dispatch(selectTarget(targetId))
                  }}
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
                  <button
                    type="button"
                    ref={submitRef}
                    onClick={handleSubmit}
                    className={BUTTON_CLASSES}
                  >
                    Submit audit
                  </button>
                </div>

                {/* Inline, in the chrome column, directly under the control it
                    belongs to. It takes layout space where the modal did not,
                    so it is placed in the column that already has a fixed
                    height and its own scroll — the card is in the other column
                    and cannot be moved by anything that happens here. */}
                {showConfirmPanel && (
                  <section
                    aria-labelledby={confirmTitleId}
                    className="rounded-lg border-2 border-indigo-700 bg-white p-4"
                  >
                    <h2 id={confirmTitleId} className="text-base font-semibold text-gray-900">
                      Confirm submission
                    </h2>

                    <p id={confirmDescriptionId} className="mt-2 text-sm text-gray-900">
                      Submit with no violations logged? You&apos;re declaring this component
                      compliant.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        ref={cancelConfirmRef}
                        onClick={closeConfirm}
                        aria-describedby={confirmDescriptionId}
                        className={BUTTON_CLASSES}
                      >
                        Cancel
                      </button>

                      {/* Not "Submit audit" a second time: two buttons with one
                          accessible name is a puzzle for anyone listing them. */}
                      <button
                        type="button"
                        onClick={handleConfirmSubmit}
                        aria-describedby={confirmDescriptionId}
                        className={BUTTON_CLASSES}
                      >
                        Submit with nothing logged
                      </button>
                    </div>
                  </section>
                )}
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
              <SessionReport
                history={state.history}
                auditTargets={currentLevel.auditTargets}
                score={state.score}
                onRestart={handleRestart}
                restartRef={restartRef}
              />
            )}
          </div>
        )}
      </div>

      {/* Auditing only. During review the element already carries a mark
          stating its outcome, and a second ring at a different offset and
          colour would read as an accident rather than as emphasis — so
          selecting a finding thickens that mark instead. */}
      {state.auditMode && isAuditing && (
        <SelectionOverlay targetId={state.selectedTarget} containerRef={canvasRef} />
      )}

    </main>
  )
}

export default App
