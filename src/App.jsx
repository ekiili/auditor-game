import { levels } from './levels'

const [currentLevel] = levels

function App() {
  const LevelComponent = currentLevel.Component

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <h1 className="sr-only">Audit Game</h1>
      <LevelComponent />
    </main>
  )
}

export default App
