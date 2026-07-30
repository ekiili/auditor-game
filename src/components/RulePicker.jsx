import { useId } from 'react'
import { WCAG_RULES } from '../data/wcagRules.js'
import { isSamePair } from '../engine/scoring.js'

// Every rule is offered against every target. The list is never narrowed by
// the current element, by sabotageMap, or by what could plausibly be wrong —
// narrowing it would hand the player the answer key.

// Colour lives on the option wrapper only, so both lines of text inherit it and
// stay readable against the checked fill.
const OPTION_CLASSES =
  'flex min-h-11 cursor-pointer flex-col justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 peer-hover:bg-gray-100 peer-checked:border-indigo-700 peer-checked:bg-indigo-700 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-700'

const LOG_BUTTON_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-500'

function resolveLogState(selectedTarget, selectedRule, guesses) {
  if (selectedTarget === null) {
    return { canLog: false, message: 'Select an element to log a rule against.' }
  }

  if (selectedRule === null) {
    return { canLog: false, message: 'Select a rule to log.' }
  }

  const pair = { ruleId: selectedRule, target: selectedTarget }

  if (guesses.some((logged) => isSamePair(logged, pair))) {
    return { canLog: false, message: 'Already logged for this element.' }
  }

  return { canLog: true, message: 'Ready to log.' }
}

function RulePicker({ selectedTarget, selectedRule, guesses, onSelectRule, onLog }) {
  const groupName = useId()
  const statusId = useId()
  const { canLog, message } = resolveLogState(selectedTarget, selectedRule, guesses)

  return (
    <div className="w-full">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-gray-900">Rules</legend>

        <div className="flex flex-col gap-1">
          {WCAG_RULES.map((rule) => (
            <label key={rule.id} className="block">
              <input
                type="radio"
                name={groupName}
                value={rule.id}
                checked={selectedRule === rule.id}
                onChange={() => onSelectRule(rule.id)}
                className="peer sr-only"
              />
              <span className={OPTION_CLASSES}>
                <span className="text-sm font-medium">{rule.shortLabel}</span>
                <span className="text-xs">
                  {rule.id} · {rule.name}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onLog}
          disabled={!canLog}
          aria-describedby={statusId}
          className={LOG_BUTTON_CLASSES}
        >
          Log rule
        </button>

        <p id={statusId} className="text-sm text-gray-600">
          {message}
        </p>
      </div>
    </div>
  )
}

export default RulePicker
