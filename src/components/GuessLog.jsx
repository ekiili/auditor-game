import { useId } from 'react'
import { X } from 'lucide-react'
import { WCAG_RULES } from '../data/wcagRules.js'

// The log shows what the player logged and nothing else. It has no access to
// the round's truth and must not acquire any: no correctness marking, no
// counts, no colour or icon distinguishing one entry from another.

const REMOVE_BUTTON_CLASSES =
  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

function GuessLog({ guesses, auditTargets, onRemove }) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="w-full rounded-lg border border-gray-300 bg-white p-4"
    >
      <h2 id={titleId} className="text-base font-semibold text-gray-900">
        Logged findings
      </h2>

      {guesses.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">Nothing logged yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {guesses.map((guess) => {
            // Resolved for display, never stored on the guess itself.
            const rule = WCAG_RULES.find((entry) => entry.id === guess.ruleId)
            const target = auditTargets.find((entry) => entry.id === guess.target)
            const ruleText = rule ? rule.shortLabel : guess.ruleId
            const targetText = target ? target.label : guess.target

            return (
              <li
                key={`${guess.ruleId}::${guess.target}`}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-sm text-gray-900">
                  {ruleText} — {targetText}
                </span>

                <button
                  type="button"
                  aria-label={`Remove ${ruleText} logged against ${targetText}`}
                  onClick={() => onRemove(guess)}
                  className={REMOVE_BUTTON_CLASSES}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default GuessLog
