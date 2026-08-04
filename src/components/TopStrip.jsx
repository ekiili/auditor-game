import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

// The strip across the top of every screen: what the game is, what is being
// audited, where the player is in the run, and the two controls that belong to
// the session rather than to a round.
//
// Both panels are `position: absolute`, anchored to the strip. That is the
// whole mechanism behind the constraint they exist under: an out-of-flow box
// takes no layout space, so opening one cannot change the strip's height and
// nothing below it moves. The card's geometry is the evidence the review
// explains false alarms with, and it is captured from a card that has not been
// pushed anywhere. Neither panel tints the page or blocks anything: they draw
// where they draw, and the rest of the screen stays live.
//
// The strip's height is fixed rather than content-derived, so no score, no
// round number and no level name can deepen it. The session figures sit in a
// fixed-width slot with tabular figures for the same reason, one level down:
// `+9` becoming `-10` must not shuffle the controls beside it.
//
// The level name is taken out of the flow and centred on the strip's whole
// width, so it sits at the midpoint of the screen rather than at the midpoint
// of whatever the wordmark and the controls happen to leave between them — a
// gap that moves every time either of them changes size.
//
// That costs room, and the arithmetic is tight enough to record. At the
// narrowest supported width, 900px, the strip has 852px between its padding.
// The controls take 202 and the session figures 104, with a 16px gap: 322,
// ending at x=876, so nothing centred may reach past x=554. The centre is
// x=450, which leaves 208px for a name that stays clear of them — and that is
// why the session figures are stacked on two lines instead of running along
// one. On one line they measure 164px rather than 104px, the controls then
// begin at x=490, and a centred name would have had 80px to live in: less than
// half of what this level's name needs. Two lines cost nothing, because the
// strip's height is fixed and had the room already.

const STRIP_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 aria-expanded:border-indigo-700 aria-expanded:bg-indigo-700 aria-expanded:text-white aria-expanded:hover:border-indigo-800 aria-expanded:hover:bg-indigo-800 aria-expanded:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

// The expanded fill and the hover fill carry equal specificity, so source
// order alone would decide which one an expanded-and-hovered control got —
// and white text on the pale hover tint is unreadable. The combination is
// named directly above rather than out-specified, and it now names its
// foreground as well as its background: with the resting text purple, the
// expanded-and-hovered state has two rules to lose rather than one.

const PANEL_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

// The restart confirmation's confirming control is the action on that
// panel, so it carries the fill.
const PANEL_PRIMARY_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

const PANEL_CLASSES =
  'absolute top-full right-6 z-10 mt-2 max-h-[70vh] w-96 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border-2 border-indigo-700 bg-white p-4 shadow-lg'

const HOW_TO_PLAY = 'howToPlay'
const RESTART = 'restart'

// Signed, so a run that has lost ground says so without needing a colour to
// carry it. Zero is written plain: `+0` reads as a gain that was not one.
// The end-of-session report formats its figures the same way; the two are
// separate presentational modules and neither is the other's home.
function formatScore(score) {
  return score > 0 ? `+${score}` : String(score)
}

function TopStrip({ levelName, round, totalRounds, score, onRestart }) {
  // One slot, not two flags: the panels are anchored to the same corner, so
  // opening either has to retire the other.
  const [openPanel, setOpenPanel] = useState(null)

  const howToPlayRef = useRef(null)
  const restartRef = useRef(null)
  const cancelRestartRef = useRef(null)

  const howToPlayPanelId = useId()
  const howToPlayTitleId = useId()
  const restartPanelId = useId()
  const restartTitleId = useId()
  const restartDescriptionId = useId()

  // Dismissing either panel puts focus back on the control that opened it.
  // The panel is named rather than read off a derived value, so this closes
  // over nothing but state setters and refs and can be used from inside an
  // effect without resubscribing on every render.
  const dismiss = (panel) => {
    setOpenPanel(null)
    const opener = panel === RESTART ? restartRef : howToPlayRef
    opener.current?.focus()
  }

  // Neither panel is a dialog, so the browser supplies none of what a dialog
  // would. The restart confirmation asks the player to give something up, so
  // it gets the same hand-built obligations the submit confirmation has:
  // focus moves in when it opens, Escape dismisses it, and cancel puts focus
  // back on the control that opened it.
  useLayoutEffect(() => {
    if (openPanel !== RESTART) return
    cancelRestartRef.current?.focus()
  }, [openPanel])

  // Document-level, not panel-level: neither panel blocks anything, so the
  // player may well be somewhere else on the page when they reach for Escape.
  useEffect(() => {
    if (openPanel === null) return undefined

    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      dismiss(openPanel)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [openPanel])

  // Focus is moved before the panel unmounts, onto a control that survives the
  // restart, so it never falls to the document body.
  const handleConfirmRestart = () => {
    restartRef.current?.focus()
    setOpenPanel(null)
    onRestart()
  }

  const toggle = (panel) => setOpenPanel((current) => (current === panel ? null : panel))

  return (
    <header className="relative z-20 flex h-[66px] w-full flex-shrink-0 items-center gap-4 border-b border-gray-300 bg-white px-6">
      <h1 className="wordmark-outline font-wordmark shrink-0 text-4xl font-bold text-white">
        Auditor
      </h1>

      {/* The level names itself. Nothing here knows which level is loaded.

          Out of flow, with equal left and right insets and auto side margins,
          so the box shrinks to the text and lands on the midpoint of the whole
          strip. `max-w-48` is what keeps it clear of the controls at 900px;
          a longer name truncates rather than colliding with them. */}
      <p className="absolute inset-x-0 top-1/2 mx-auto w-fit max-w-48 -translate-y-1/2 truncate text-center text-sm text-gray-700">
        {levelName}
      </p>

      {/* Fixed width and tabular figures: the digits change every round and
          must not drag the controls beside them along. Two lines, because one
          would take 164px of a width the centred name needs — see above. */}
      <div className="ml-auto w-26 shrink-0 text-right text-sm leading-tight whitespace-nowrap text-gray-900 tabular-nums">
        <span className="block">
          Round {round} of {totalRounds}
        </span>
        <span className="block font-semibold">Score: {formatScore(score)}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          ref={howToPlayRef}
          aria-expanded={openPanel === HOW_TO_PLAY}
          aria-controls={howToPlayPanelId}
          onClick={() => toggle(HOW_TO_PLAY)}
          className={STRIP_BUTTON_CLASSES}
        >
          How to play
        </button>

        <button
          type="button"
          ref={restartRef}
          aria-expanded={openPanel === RESTART}
          aria-controls={restartPanelId}
          onClick={() => toggle(RESTART)}
          className={STRIP_BUTTON_CLASSES}
        >
          Restart
        </button>
      </div>

      {openPanel === HOW_TO_PLAY && (
        <section
          id={howToPlayPanelId}
          aria-labelledby={howToPlayTitleId}
          className={PANEL_CLASSES}
        >
          <h2 id={howToPlayTitleId} className="text-base font-semibold text-gray-900">
            How to play
          </h2>

          <p className="mt-2 text-sm text-gray-900">
            The component below has been sabotaged with accessibility violations — or left
            perfectly compliant. Work out which.
          </p>

          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-gray-900">
            <li>Turn on Audit Mode.</li>
            <li>
              Select an element, on the card or in the audit targets list. The Inspector reports
              what it really is — role, accessible name, size, focus styles. It never tells you
              whether that passes.
            </li>
            <li>Pick the WCAG rule you think it breaks, and log it.</li>
            <li>
              Submit once you have logged everything you found. Submitting nothing means “this
              component is compliant”, and sometimes that is the right answer.
            </li>
          </ol>

          <p className="mt-3 text-sm text-gray-900">
            Every violation you catch is +1. Every one you miss, and everything you flag that was
            fine, is −1. A run is {totalRounds} rounds.
          </p>
        </section>
      )}

      {openPanel === RESTART && (
        <section id={restartPanelId} aria-labelledby={restartTitleId} className={PANEL_CLASSES}>
          <h2 id={restartTitleId} className="text-base font-semibold text-gray-900">
            Are you sure you want to restart?
          </h2>

          <p id={restartDescriptionId} className="mt-2 text-sm text-gray-900">
            This ends the run in progress. The score and every round played so far are discarded.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              ref={cancelRestartRef}
              onClick={() => dismiss(RESTART)}
              aria-describedby={restartDescriptionId}
              className={PANEL_BUTTON_CLASSES}
            >
              Cancel
            </button>

            {/* Not "Restart" a second time: two controls with one accessible
                name is a puzzle for anyone listing them. */}
            <button
              type="button"
              onClick={handleConfirmRestart}
              aria-describedby={restartDescriptionId}
              className={PANEL_PRIMARY_BUTTON_CLASSES}
            >
              Restart the run
            </button>
          </div>
        </section>
      )}
    </header>
  )
}

export default TopStrip
