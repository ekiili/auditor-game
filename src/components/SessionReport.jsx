import { useId, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { WCAG_RULES } from '../data/wcagRules.js'
import { isFlawlessRound } from '../engine/review.js'

// The content of the `'gameOver'` state: one row per completed round, in the
// order they were played, each expanding to what went wrong in it.
//
// A list of rounds, not a matrix. Nothing here draws a gridline, a cell border
// or a column rule, and the score is not aligned into a column of its own —
// ten right-aligned figures read as a spreadsheet even with no rules drawn
// between them. Rows are separated the way findings are separated inside a
// review panel: spacing and one hairline, never a bordered card each.

const ROW_BUTTON_CLASSES =
  'flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

// Signed, so a round that lost a point says so without needing a colour to
// carry it. Zero is written plain: `+0` reads as a gain that was not one.
function formatScore(score) {
  return score > 0 ? `+${score}` : String(score)
}

// The element identifier is `target` on a finding and `id` on an auditTargets
// entry. The translation happens here, once and in the open.
function labelForTarget(auditTargets, target) {
  const entry = auditTargets.find((auditTarget) => auditTarget.id === target)
  return entry ? entry.label : target
}

function ruleLabel(ruleId) {
  const rule = WCAG_RULES.find((entry) => entry.id === ruleId)
  return rule ? rule.shortLabel : ruleId
}

// The same two-part naming the findings list uses, so a round recalled here
// reads in the terms the player met it in.
function findingLine(auditTargets, finding) {
  return `${labelForTarget(auditTargets, finding.target)} — ${ruleLabel(finding.ruleId)}`
}

function Findings({ heading, findings, auditTargets, headingClasses, bodyClasses }) {
  if (findings.length === 0) return null

  return (
    <div className="mt-2 first:mt-0">
      <h4 className={`text-sm font-semibold ${headingClasses}`}>{heading}</h4>
      <ul className={`mt-1 flex flex-col gap-1 text-sm ${bodyClasses}`}>
        {findings.map((finding) => (
          <li key={`${finding.ruleId}::${finding.target}`}>
            {findingLine(auditTargets, finding)}
          </li>
        ))}
      </ul>
    </div>
  )
}

// A flawless round has no findings to list, and an expander that opens onto
// nothing is a dead end — worst for the player who cannot see that the region
// is empty and has only been told it is now expanded. So it states the result
// in one line instead, and distinguishes the two ways a round can be flawless:
// finding everything that was wrong is a different skill from recognising that
// nothing was.
function flawlessSummary(round) {
  if (round.wasCompliant) {
    return 'This component was compliant, and you reported it as compliant.'
  }
  return 'You found every violation and flagged nothing that was fine.'
}

function SessionReport({ history, auditTargets, score, onRestart, restartRef }) {
  const titleId = useId()
  const totalId = useId()
  const rowIdBase = useId()
  // Transient, and deliberately not in the reducer: which rows a player has
  // opened is a property of reading this screen, not of the session it
  // describes. Several may be open at once — comparing two bad rounds is the
  // obvious thing to want, and nothing is gained by closing one to open another.
  const [expanded, setExpanded] = useState(() => new Set())

  const toggle = (index) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <>
      <section
        aria-labelledby={titleId}
        className="rounded-lg border border-gray-300 bg-white p-4"
      >
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          Session complete
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          {history.length} rounds played. Open a round to see what it cost you.
        </p>

        <ul className="mt-3 flex flex-col">
          {history.map((round, index) => {
            const isOpen = expanded.has(index)
            const panelId = `${rowIdBase}-panel-${index}`
            const flawless = isFlawlessRound(round)
            const Chevron = isOpen ? ChevronDown : ChevronRight

            return (
              <li
                key={index}
                className={index === 0 ? undefined : 'mt-2 border-t border-gray-200 pt-2'}
              >
                {/* A heading wrapping the control, so the rounds are reachable
                    as a list of headings and not only by tabbing. The button is
                    a real button: aria-expanded is what states the open state,
                    and the chevron only mirrors it. */}
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(index)}
                    className={ROW_BUTTON_CLASSES}
                  >
                    <Chevron className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="font-semibold">Round {index + 1}</span>
                    <span className="font-semibold">{formatScore(round.score)}</span>
                    {flawless && (
                      <span className="font-semibold text-emerald-800">Perfect!</span>
                    )}
                  </button>
                </h3>

                {/* Always rendered, hidden when closed, so `aria-controls`
                    always resolves to something that exists. */}
                <div id={panelId} hidden={!isOpen} className="px-3 pt-1 pb-2">
                  {flawless ? (
                    <p className="text-sm text-gray-700">{flawlessSummary(round)}</p>
                  ) : (
                    <>
                      <Findings
                        heading="Missed"
                        findings={round.falseNegatives}
                        auditTargets={auditTargets}
                        headingClasses="text-red-900"
                        bodyClasses="text-red-900"
                      />
                      <Findings
                        heading="Flagged in error"
                        findings={round.falsePositives}
                        auditTargets={auditTargets}
                        headingClasses="text-amber-900"
                        bodyClasses="text-amber-900"
                      />
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <p id={totalId} className="mt-4 border-t border-gray-200 pt-3 text-sm text-gray-900">
          <span className="font-semibold">Session total: {formatScore(score)}</span>
        </p>
      </section>

      <div>
        <button
          type="button"
          ref={restartRef}
          onClick={onRestart}
          className="inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        >
          Start a new session
        </button>
      </div>
    </>
  )
}

export default SessionReport
