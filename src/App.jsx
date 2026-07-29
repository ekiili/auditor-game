import { useEffect, useReducer } from 'react'
import { selectViolations } from './engine/saboteurEngine.js'
import { levels } from './levels/index.js'
import { gameReducer, INITIAL_STATE, startRound } from './state/gameState.js'

const [currentLevel] = levels

function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)
  const LevelComponent = currentLevel.Component

  useEffect(() => {
    dispatch(
      startRound({
        levelId: currentLevel.id,
        violations: selectViolations(currentLevel),
      }),
    )
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <h1 className="sr-only">Audit Game</h1>
      <LevelComponent {...currentLevel.applySabotage(state.truth)} />
    </main>
  )
}

export default App
