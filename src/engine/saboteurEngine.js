// 5% of rounds are clean. Rare enough that "there must be something here"
// stays a bad instinct to act on, common enough that a whole session is
// unlikely to pass without one.
const COMPLIANT_CHANCE = 0.05
const MIN_VIOLATION_COUNT = 1
const MAX_VIOLATION_COUNT = 3

function shuffle(entries, random) {
  const result = [...entries]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Sabotage map entries are emitted whole, so a Violation entry is the entry the
// level authored — `alsoDefensible` included, exactly as written. The engine
// chooses which failures occur; it has no opinion on which criteria overlap on
// them, and composing or trimming that field here would put a judgement about
// one level inside a module that knows about none.
//
// This passthrough is why nothing below mentions `alsoDefensible`: reshaping an
// entry into a fresh object is what would break it, not leaving it alone.
export function selectViolations(level, random = Math.random) {
  if (random() < COMPLIANT_CHANCE) return []

  const maxCount = Math.min(MAX_VIOLATION_COUNT, level.sabotageMap.length)
  if (maxCount < MIN_VIOLATION_COUNT) return []

  const range = maxCount - MIN_VIOLATION_COUNT + 1
  const count = MIN_VIOLATION_COUNT + Math.floor(random() * range)

  return shuffle(level.sabotageMap, random).slice(0, count)
}
