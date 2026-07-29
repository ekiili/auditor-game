// Engine injection: startRound and nextRound each need a freshly selected
// violation set, but a pure reducer must never call an RNG (or any other
// engine function) itself — doing so would make it impure and untestable.
// The caller computes the violations (via `selectViolations(level, random)`)
// and passes them in the action payload; this reducer only ever consumes
// that payload, never generates its own.

import { scoreRound } from '../engine/scoring'

const TOTAL_ROUNDS = 10

export const INITIAL_STATE = {
  levelId: null,
  round: 1,
  totalRounds: TOTAL_ROUNDS,
  score: 0,
  status: 'auditing',
  auditMode: false,
  truth: [],
  guesses: [],
  lastResult: null,
  history: [],
}

function isSamePair(a, b) {
  return a.ruleId === b.ruleId && a.target === b.target
}

export function startRound({ levelId, violations }) {
  return { type: 'startRound', payload: { levelId, violations } }
}

export function toggleAuditMode() {
  return { type: 'toggleAuditMode' }
}

export function addGuess(guess) {
  return { type: 'addGuess', payload: guess }
}

export function removeGuess(guess) {
  return { type: 'removeGuess', payload: guess }
}

export function submitAudit() {
  return { type: 'submitAudit' }
}

export function nextRound({ violations }) {
  return { type: 'nextRound', payload: { violations } }
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
      }
    }

    case 'toggleAuditMode': {
      return { ...state, auditMode: !state.auditMode }
    }

    case 'addGuess': {
      const guess = action.payload
      const alreadyLogged = state.guesses.some((logged) => isSamePair(logged, guess))
      if (alreadyLogged) return state
      return { ...state, guesses: [...state.guesses, guess] }
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
      const result = scoreRound(state.truth, state.guesses)
      return {
        ...state,
        score: state.score + result.score,
        lastResult: result,
        history: [...state.history, result],
        status: 'reviewing',
      }
    }

    case 'nextRound': {
      if (state.round >= state.totalRounds) {
        return { ...state, status: 'gameOver' }
      }
      const { violations } = action.payload
      return {
        ...state,
        round: state.round + 1,
        truth: violations,
        guesses: [],
        lastResult: null,
        status: 'auditing',
        auditMode: false,
      }
    }

    default:
      return state
  }
}
