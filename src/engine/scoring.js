const TRUE_POSITIVE_POINTS = 1
const FALSE_POSITIVE_POINTS = -1
const FALSE_NEGATIVE_POINTS = -1
const COMPLIANT_CORRECT_POINTS = 1

function isSamePair(a, b) {
  return a.ruleId === b.ruleId && a.target === b.target
}

function dedupeGuesses(guesses) {
  const seen = new Set()
  const deduped = []
  for (const guess of guesses) {
    const key = `${guess.ruleId}::${guess.target}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(guess)
  }
  return deduped
}

export function scoreRound(truth, guesses) {
  const dedupedGuesses = dedupeGuesses(guesses)

  const truePositives = dedupedGuesses.filter((guess) =>
    truth.some((truthEntry) => isSamePair(truthEntry, guess)),
  )
  const falsePositives = dedupedGuesses.filter(
    (guess) => !truth.some((truthEntry) => isSamePair(truthEntry, guess)),
  )
  const falseNegatives = truth.filter(
    (truthEntry) => !dedupedGuesses.some((guess) => isSamePair(truthEntry, guess)),
  )

  const wasCompliant = truth.length === 0

  let score =
    truePositives.length * TRUE_POSITIVE_POINTS +
    falsePositives.length * FALSE_POSITIVE_POINTS +
    falseNegatives.length * FALSE_NEGATIVE_POINTS

  if (wasCompliant && dedupedGuesses.length === 0) {
    score += COMPLIANT_CORRECT_POINTS
  }

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    score,
    wasCompliant,
  }
}
