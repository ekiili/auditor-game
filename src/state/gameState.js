// Engine injection: startRound and nextRound each need a freshly selected
// violation set, but a pure reducer must never call an RNG (or any other
// engine function) itself — doing so would make it impure and untestable.
// The caller computes the violations (via `selectViolations(level, random)`)
// and passes them in the action payload; this reducer only ever consumes
// that payload, never generates its own.

import { isSamePair, scoreRound } from '../engine/scoring.js'

const TOTAL_ROUNDS = 10

export const INITIAL_STATE = {
  levelId: null,
  round: 1,
  totalRounds: TOTAL_ROUNDS,
  score: 0,
  status: 'auditing',
  auditMode: false,
  selectedTarget: null,
  selectedRule: null,
  truth: [],
  guesses: [],
  lastResult: null,
  lastSnapshot: null,
  history: [],
}

export function startRound({ levelId, violations }) {
  return { type: 'startRound', payload: { levelId, violations } }
}

export function toggleAuditMode() {
  return { type: 'toggleAuditMode' }
}

export function selectTarget(targetId) {
  return { type: 'selectTarget', payload: targetId }
}

export function selectRule(ruleId) {
  return { type: 'selectRule', payload: ruleId }
}

export function addGuess(guess) {
  return { type: 'addGuess', payload: guess }
}

export function removeGuess(guess) {
  return { type: 'removeGuess', payload: guess }
}

// Payload convention matches startRound's: a named key inside a payload
// object, not the bare value that selectTarget and addGuess pass.
export function submitAudit({ snapshot }) {
  return { type: 'submitAudit', payload: { snapshot } }
}

export function nextRound({ violations }) {
  return { type: 'nextRound', payload: { violations } }
}

// Same payload form as nextRound's, and for the same reason: it carries the
// freshly rolled violations, and a session that later needs a second value
// alongside them has somewhere to put it.
export function restartSession({ violations }) {
  return { type: 'restartSession', payload: { violations } }
}

export function gameReducer(state = INITIAL_STATE, action) {
  switch (action.type) {
    case 'startRound': {
      const { levelId, violations } = action.payload
      return {
        ...state,
        levelId,
        truth: violations,
        guesses: [],
        lastResult: null,
        status: 'auditing',
        auditMode: false,
        selectedTarget: null,
        selectedRule: null,
      }
    }

    case 'toggleAuditMode': {
      const auditMode = !state.auditMode
      // Leaving Audit Mode discards the selection; entering it selects nothing.
      if (!auditMode) return { ...state, auditMode, selectedTarget: null, selectedRule: null }
      return { ...state, auditMode }
    }

    case 'selectTarget': {
      return { ...state, selectedTarget: action.payload }
    }

    case 'selectRule': {
      return { ...state, selectedRule: action.payload }
    }

    case 'addGuess': {
      const guess = action.payload
      const alreadyLogged = state.guesses.some((logged) => isSamePair(logged, guess))
      if (alreadyLogged) return state
      // A successful log clears the rule but keeps the element: logging a
      // second rule against the same element is common, reusing a leftover
      // rule against a new element is a mistake.
      return { ...state, guesses: [...state.guesses, guess], selectedRule: null }
    }

    case 'removeGuess': {
      const guess = action.payload
      return {
        ...state,
        guesses: state.guesses.filter((logged) => !isSamePair(logged, guess)),
      }
    }

    case 'submitAudit': {
      if (state.status !== 'auditing') return state
      const { snapshot } = action.payload
      const result = scoreRound(state.truth, state.guesses)
      return {
        ...state,
        score: state.score + result.score,
        lastResult: result,
        // Stored exactly as given, never rebuilt or derived — the same rule
        // that makes startRound receive its violations rather than roll them.
        // Snapshots are never appended to history.
        lastSnapshot: snapshot,
        history: [...state.history, result],
        status: 'reviewing',
        // The review's own selection means "the finding I am reading", and it
        // reaches the card as an intensified mark. A selection carried over
        // from the audit would open the review emphasising an element the
        // player never chose there, so scoring the round ends the selection
        // that belonged to auditing it.
        selectedTarget: null,
        selectedRule: null,
      }
    }

    case 'nextRound': {
      // The completed round was the last one, so the round number stays put.
      // The selection still clears: nextRound is one of the clearing paths for
      // both fields, on every branch it takes.
      if (state.round >= state.totalRounds) {
        return {
          ...state,
          status: 'gameOver',
          lastSnapshot: null,
          selectedTarget: null,
          selectedRule: null,
        }
      }
      const { violations } = action.payload
      return {
        ...state,
        round: state.round + 1,
        truth: violations,
        guesses: [],
        lastResult: null,
        lastSnapshot: null,
        status: 'auditing',
        auditMode: false,
        selectedTarget: null,
        selectedRule: null,
      }
    }

    case 'restartSession': {
      const { violations } = action.payload
      // Spread INITIAL_STATE rather than listing the fields: a field added to
      // the state later is reset by a restart automatically, where an
      // enumerated list would quietly carry it across into the new session.
      // Nothing survives but the level being played and the round rolled for
      // it, and neither is session progress.
      return { ...INITIAL_STATE, levelId: state.levelId, truth: violations }
    }

    default:
      return state
  }
}
