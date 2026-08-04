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
import TopStrip from './components/TopStrip.jsx'
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
//
// `gameOver` has no entry because the toggle is not rendered there at all — a
// reason that can never be shown would be a claim about the interface that is
// no longer true.
const TOGGLE_UNAVAILABLE_REASONS = {
  reviewing: 'Not available while you review this round.',
}

// Purple is the interface's interactive and selected colour, and the two tiers
// are how strongly a control claims it. A primary control carries the fill; a
// secondary one carries the colour as text on white and keeps the neutral
// border. Every state sets its foreground and its background together, so no
// combination can arrive half applied.
const PRIMARY_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

const SECONDARY_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

// From lg up the tools are two columns side by side, so the player never has
// to scroll between choosing an element and reading what it measures. Below lg
// they are one column, exactly as they have always been: the sub-columns are
// `display: contents` there, so they generate no boxes at all and the six
// panels remain direct children of the wrapper's own flex column.
//
// The widths are fixed rather than fluid, and that is the whole point. The
// card's column is sized from what these leave, so it can only change width if
// one of them does — and neither responds to its contents. An Inspector that
// grows scrolls inside 24rem; it never widens, and the card never moves.
//
//   14rem   target list — the longest label at text-sm plus its padding
//   24rem   Inspector column — the width the single tools column always had
//   39.5rem wrapper — 14 + 1.5 (the gap) + 24
//
// The wrapper is pinned to that sum in every status. The review fills it as
// one column instead of two; had it shrink-wrapped its own content instead,
// the card would have jumped sideways between the audit and the review of the
// same round — the one moment the player is asked to compare them.
const TOOLS_WRAPPER_CLASSES =
  'relative flex w-full min-h-0 max-w-sm flex-1 flex-col gap-6 overflow-y-auto lg:w-158 lg:max-w-none lg:flex-none lg:flex-row lg:overflow-visible'

// The end-of-run report has no card beside it. It used to answer that by
// taking the whole row, which made a 2560px screen a 2512px surface with one
// narrow column of round rows down the left of it — the rows read as fragments
// strung across a plain rather than as a list.
//
// So it takes the width the tools region holds in every other status, 39.5rem,
// and the row's justify-center puts it in the middle. That number is not
// borrowed for the sake of matching: the findings list is where a result has
// been read all run, and the report is the last of those readings, so it lands
// in the same column the player has been reading results in. It also happens to
// suit the content — the longest line the report can print is a finding's
// element-and-rule pair, which sits well inside it.
const REPORT_WRAPPER_CLASSES =
  'relative flex w-full min-h-0 max-w-sm flex-1 flex-col gap-6 overflow-y-auto lg:w-158 lg:max-w-none lg:flex-none'

// `relative` on each sub-column for the reason the outer columns carry it: the
// visually hidden radios in the target list and the rule picker are
// position:absolute, and an unpositioned ancestor chain would let them resolve
// against the initial containing block and grow the document.
const TARGETS_COLUMN_CLASSES =
  'contents lg:relative lg:flex lg:w-56 lg:min-h-0 lg:shrink-0 lg:flex-col lg:gap-6 lg:overflow-y-auto'

const FLUID_COLUMN_CLASSES =
  'contents lg:relative lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-6 lg:overflow-y-auto'

// What the Audit Mode toggle has to clear to sit over the card rather than
// over the middle of the screen: the tools region plus the gap before it,
// 39.5rem + 1.5rem. Derived from the two numbers above and kept beside them so
// there is one place to change if either moves.
//
// The toggle's row is full width, so padding this much off its right edge
// leaves a content box whose centre is exactly the centre of the card's
// column — including between 1024px and 1152px, where that column is still
// fluid and no fixed width would track it. With the tools absent there is
// nothing to clear and the card is centred on the row already.
const TOGGLE_CLEARS_TOOLS = 'lg:pr-164'

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
  // reducer is handed the violations and never generates them. Both restart
  // routes share this; only what happens to focus afterwards differs.
  const restart = () => {
    focusReadoutsRef.current = {}
    setConfirmOpen(false)
    dispatch(restartSession({ violations: selectViolations(currentLevel) }))
  }

  // The report's control unmounts with the report, so focus would fall to the
  // body. It is moved deliberately instead, exactly as on a confirmed
  // submission. The strip's control needs none of this: it is present in every
  // status, so focus can simply stay where the player left it.
  const handleReportRestart = () => {
    focusAuditModeRef.current = true
    restart()
  }

  const result = state.lastResult
  const isAuditing = state.status === 'auditing'
  const isReviewing = state.status === 'reviewing'
  const isGameOver = state.status === 'gameOver'

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
  //
  // Still sizing-only — no padding, margin, border or transform. `max-w-sm`
  // is what the card is centred at inside its wider column, and `shrink-0`
  // keeps the column's own overflow the safety valve on a short viewport
  // rather than letting the flex column squash the card instead.
  const cardWrapperClasses = isReviewing
    ? 'w-full max-w-sm shrink-0 pointer-events-none'
    : 'w-full max-w-sm shrink-0'
  const markScope = isReviewing ? { [MARK_SCOPE_ATTRIBUTE]: '' } : {}

  // h-screen + overflow-hidden, not min-h-screen: the document must never grow
  // a scrollbar. Everything that can overflow scrolls inside its own column
  // instead, so the audited card never leaves the viewport. The strip is a
  // fixed-height band taken off the top of that budget; `min-h-0` on the
  // region below it is what makes the columns absorb the loss by scrolling
  // internally rather than by pushing the document taller.
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-200">
      <TopStrip
        levelName={currentLevel.name}
        round={state.round}
        totalRounds={state.totalRounds}
        score={state.score}
        onRestart={restart}
      />

      <main className="flex w-full min-h-0 flex-1 flex-col items-center gap-6 p-6">
        {/* Absent at game over, not disabled and not hidden. The decision that
            keeps it present-but-unavailable exists so the row above the card
            cannot change height and shift the card; at game over the card is
            not rendered, so there is nothing for it to protect and a dead
            control on the debrief is just something else to tab past. */}
        {!isGameOver && (
          <AuditModeToggle
            ref={auditModeRef}
            auditMode={state.auditMode}
            onToggle={() => dispatch(toggleAuditMode())}
            unavailableReason={toggleUnavailableReason}
            clearanceClasses={showChromeColumn ? TOGGLE_CLEARS_TOOLS : ''}
          />
        )}

        {/* min-h-0 lets the columns shrink below their content height, which is
            what makes their own overflow-y-auto engage instead of pushing the
            row taller. lg:items-stretch gives every column the full row height,
            so the card's position no longer depends on how tall anything beside
            it grows — inspecting an element never moves it. */}
        <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-6 lg:flex-row lg:items-stretch lg:justify-center">
          {/* Scrolling lives on this column, never on the sizing-only wrapper
              below: a safety valve for viewports too short for the card, which
              scrolls rather than clipping it. The card is centred in the column
              — the card's own max-width, not the column's, is what decides how
              wide it renders.

              From lg up the column is capped at 28rem rather than taking every
              pixel the tools columns leave. Uncapped, it swallowed all the slack
              on a wide screen and the three regions stopped being a group: the
              tools sat against the right edge and the card floated in the middle
              of everything left over, so a 2560px window put 736px of nothing to
              the left of the card and another 760px between it and the targets
              list. Capping the column lets the row's justify-center do its job —
              the leftover splits evenly outside the group instead of pooling
              inside it.

              It is a max-width, not a width, and that is deliberate: at the
              bottom of the lg range the group is wider than the viewport, and a
              fixed width would overflow it into a horizontal scrollbar. Capped,
              the column simply shrinks as it always did, so nothing between
              1024px and 1088px changes.

              The card's own left edge is unmoved by any of this. Centring the
              card inside a centred group cancels the cap out — the card sits at
              (viewport − tools − card)/2 whatever this number is, so the cap
              chooses one thing only: how much air separates the card from the
              targets list, which is (28rem − 24rem)/2 plus the 1.5rem row gap,
              or 56px.

              28rem rather than something roomier because of what happens at the
              narrow end of this layout. The space inside a group has to stay
              smaller than the space around it, or the group stops reading as
              one. At 1280px this cap leaves 88px outside the group against 56px
              within it. At 32rem the two swap places — 56px outside, 88px within
              — and the card starts to look detached from the tools rather than
              grouped with them. Wider screens are indifferent; 1280px decides
              it.

              `relative` is load-bearing, not decoration. The sr-only live region
              inside the stepper is position:absolute; without a positioned
              ancestor it resolves against the initial containing block, escapes
              this column's overflow entirely, and grows the document instead.
              It does not affect the overlay, which is position:fixed — only
              transform/filter/contain would capture that, and none is used. */}
          {!isGameOver && (
            <div className="relative w-full min-h-0 max-w-sm flex-1 overflow-y-auto lg:flex lg:max-w-md lg:flex-col lg:items-center">
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
          )}

          {showChromeColumn && (
            <div className={isGameOver ? REPORT_WRAPPER_CLASSES : TOOLS_WRAPPER_CLASSES}>
              {/* The auditing tools belong to the round, not to the result. Once
                  the round is scored the findings list is the single place a
                  result is read, and the wrapper is its to fill. */}
              {isAuditing && (
                <>
                  <div className={TARGETS_COLUMN_CLASSES}>
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
                  </div>

                  <div className={FLUID_COLUMN_CLASSES}>
                    <ReadoutPanel targetId={state.selectedTarget} containerRef={canvasRef} />

                    <RulePicker
                      selectedTarget={state.selectedTarget}
                      selectedRule={state.selectedRule}
                      guesses={state.guesses}
                      onSelectRule={(ruleId) => dispatch(selectRule(ruleId))}
                      onLog={() =>
                        dispatch(
                          addGuess({ ruleId: state.selectedRule, target: state.selectedTarget }),
                        )
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
                        className={PRIMARY_BUTTON_CLASSES}
                      >
                        Submit audit
                      </button>
                    </div>

                    {/* Inline, in the tools region, directly under the control it
                        belongs to. It takes layout space where the modal did not,
                        so it is placed in a column that already has a fixed
                        height and its own scroll — the card is in another column
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
                            className={SECONDARY_BUTTON_CLASSES}
                          >
                            Cancel
                          </button>

                          {/* Not "Submit audit" a second time: two buttons with one
                              accessible name is a puzzle for anyone listing them. */}
                          <button
                            type="button"
                            onClick={handleConfirmSubmit}
                            aria-describedby={confirmDescriptionId}
                            className={PRIMARY_BUTTON_CLASSES}
                          >
                            Submit with nothing logged
                          </button>
                        </div>
                      </section>
                    )}
                  </div>
                </>
              )}

              {isReviewing && result !== null && (
                <div className={FLUID_COLUMN_CLASSES}>
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
                      className={PRIMARY_BUTTON_CLASSES}
                    >
                      Next round
                    </button>
                  </div>
                </div>
              )}

              {/* No sub-column: the report is the whole row, so there is nothing
                  to divide and no empty column left where the card was. */}
              {isGameOver && (
                <SessionReport
                  history={state.history}
                  auditTargets={currentLevel.auditTargets}
                  score={state.score}
                  onRestart={handleReportRestart}
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
    </div>
  )
}

export default App
