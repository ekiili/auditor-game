import { useEffect, useReducer, useRef } from 'react'
import AuditModeToggle from './components/AuditModeToggle.jsx'
import ReadoutPanel from './components/ReadoutPanel.jsx'
import SelectionOverlay from './components/SelectionOverlay.jsx'
import TargetList from './components/TargetList.jsx'
import { selectViolations } from './engine/saboteurEngine.js'
import { levels } from './levels/index.js'
import {
  gameReducer,
  INITIAL_STATE,
  selectTarget,
  startRound,
  toggleAuditMode,
} from './state/gameState.js'

const [currentLevel] = levels

const ACTIVATION_KEYS = ['Enter', ' ']

function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)
  const canvasRef = useRef(null)
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

    if (element) dispatch(selectTarget(element.dataset.auditTarget))
  }

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
          </div>
        )}
      </div>

      {state.auditMode && (
        <SelectionOverlay targetId={state.selectedTarget} containerRef={canvasRef} />
      )}
    </main>
  )
}

export default App
