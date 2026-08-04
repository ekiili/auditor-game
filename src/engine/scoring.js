const TRUE_POSITIVE_POINTS = 1
const FALSE_POSITIVE_POINTS = -1
const FALSE_NEGATIVE_POINTS = -1
const COMPLIANT_CORRECT_POINTS = 1

// A defensible answer is professionally correct, so it is worth what an exact
// one is worth. There is deliberately no DEFENSIBLE_POINTS constant beside the
// four above: a second number equal to the first is a number that can drift
// away from it, and the decision is that the two score identically rather than
// that they happen to score the same today. What separates them is "Perfect!",
// which is a property of the round and not of the scoreboard.

export function isSamePair(a, b) {
  return a.ruleId === b.ruleId && a.target === b.target
}

export const GUESS_OUTCOMES = Object.freeze({
  TRUE_POSITIVE: 'truePositive',
  DEFENSIBLE: 'defensible',
  FALSE_POSITIVE: 'falsePositive',
})

/**
 * Which of the three buckets a single guess falls into, tested in the order the
 * Round result contract fixes: exact pair, then same target under a criterion
 * that violation lists as also defensible, then neither.
 *
 * Returns `{ outcome, violation, remark }`. `violation` is the entry from
 * `truth` the guess caught, by reference, so the caller can tell two catches of
 * the same violation apart from catches of different ones — `null` on a false
 * positive. `remark` is the alternative's player-facing text, `null` unless the
 * outcome is defensible.
 *
 * Deliberately not resolution-aware. Whether a violation has already been
 * caught by an earlier guess is a property of the round, not of this guess, and
 * folding it in here would make the answer depend on argument order.
 */
export function classifyGuess(guess, truth) {
  const exact = truth.find((violation) => isSamePair(violation, guess))
  if (exact) {
    return { outcome: GUESS_OUTCOMES.TRUE_POSITIVE, violation: exact, remark: null }
  }

  // Defensibility is per violation, never per rule: naming an overlapping
  // criterion against an element that was not broken is an ordinary false
  // alarm, and the target check is what keeps it one.
  for (const violation of truth) {
    if (violation.target !== guess.target) continue

    const alternative = violation.alsoDefensible.find((entry) => entry.ruleId === guess.ruleId)
    if (alternative) {
      return { outcome: GUESS_OUTCOMES.DEFENSIBLE, violation, remark: alternative.remark }
    }
  }

  return { outcome: GUESS_OUTCOMES.FALSE_POSITIVE, violation: null, remark: null }
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

/**
 * A violation is resolved by the first guess that catches it, exactly or
 * defensibly. A player who logs both the primary rule and a defensible one
 * against the same violation has found it once, so the second guess is neither
 * a second catch nor a false alarm — it is discarded, and appears in none of
 * the four arrays.
 *
 * That is why this walks the guesses in order rather than filtering four times
 * over. Each pass of a filter would answer its own question independently, and
 * a violation caught twice would be counted twice by one of them.
 */
export function scoreRound(truth, guesses) {
  const dedupedGuesses = dedupeGuesses(guesses)

  const truePositives = []
  const defensible = []
  const falsePositives = []
  // Violation entries by identity, not by index: `classifyGuess` hands back the
  // entry it matched, so identity is already the thing being tracked.
  const resolved = new Set()

  for (const guess of dedupedGuesses) {
    const { outcome, violation, remark } = classifyGuess(guess, truth)

    if (outcome === GUESS_OUTCOMES.FALSE_POSITIVE) {
      falsePositives.push(guess)
      continue
    }

    if (resolved.has(violation)) continue
    resolved.add(violation)

    if (outcome === GUESS_OUTCOMES.TRUE_POSITIVE) {
      truePositives.push(guess)
    } else {
      defensible.push({ guess, primaryRuleId: violation.ruleId, remark })
    }
  }

  const falseNegatives = truth.filter((violation) => !resolved.has(violation))

  const wasCompliant = truth.length === 0

  let score =
    truePositives.length * TRUE_POSITIVE_POINTS +
    defensible.length * TRUE_POSITIVE_POINTS +
    falsePositives.length * FALSE_POSITIVE_POINTS +
    falseNegatives.length * FALSE_NEGATIVE_POINTS

  if (wasCompliant && dedupedGuesses.length === 0) {
    score += COMPLIANT_CORRECT_POINTS
  }

  return {
    truePositives,
    defensible,
    falsePositives,
    falseNegatives,
    score,
    wasCompliant,
  }
}
