import { useEffect, useReducer, useRef } from 'react'
import AuditModeToggle from './components/AuditModeToggle.jsx'
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-6">
      <h1 className="sr-only">Audit Game</h1>

      <AuditModeToggle auditMode={state.auditMode} onToggle={() => dispatch(toggleAuditMode())} />

      <div
        ref={canvasRef}
        className="w-full max-w-sm"
        onClickCapture={handleCanvasClickCapture}
        onKeyDownCapture={handleCanvasKeyDownCapture}
      >
        <LevelComponent {...currentLevel.applySabotage(state.truth)} />
      </div>

      {state.auditMode && (
        <TargetList
          auditTargets={currentLevel.auditTargets}
          selectedTarget={state.selectedTarget}
          onSelect={(targetId) => dispatch(selectTarget(targetId))}
        />
      )}

      {state.auditMode && (
        <SelectionOverlay targetId={state.selectedTarget} containerRef={canvasRef} />
      )}
    </main>
  )
}

export default App
