import { useId } from 'react'
import { WCAG_RULES } from '../data/wcagRules.js'
import { OUTCOMES } from '../engine/review.js'

// Three panels, one per array of the Round result, in the order that puts the
// instructive content first and the player's successes last. The heading
// carries the category, so an entry needs no status label of its own and
// colour is reinforcement rather than the only signal.
//
// Selected state is a React conditional rather than a CSS variant, so the
// selected-and-hovered combination is expressed by construction and no two
// equal-specificity rules can race for the background.
const ENTRY_BASE =
  'flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

const SECTIONS = [
  {
    outcome: OUTCOMES.MISSED,
    heading: 'Violations you missed',
    entriesOf: (result) => result.falseNegatives,
    panel: 'rounded-lg border border-red-700 bg-red-50 p-4',
    headingClasses: 'text-base font-semibold text-red-900',
    entryRest: 'text-red-900 hover:bg-red-100 focus-visible:outline-red-800',
    entrySelected: 'bg-red-800 text-white hover:bg-red-900 focus-visible:outline-red-900',
  },
  {
    outcome: OUTCOMES.FLAGGED_IN_ERROR,
    heading: 'Flagged in error',
    entriesOf: (result) => result.falsePositives,
    panel: 'rounded-lg border border-amber-700 bg-amber-50 p-4',
    headingClasses: 'text-base font-semibold text-amber-900',
    entryRest: 'text-amber-900 hover:bg-amber-100 focus-visible:outline-amber-800',
    entrySelected: 'bg-amber-800 text-white hover:bg-amber-900 focus-visible:outline-amber-900',
  },
  {
    outcome: OUTCOMES.CAUGHT,
    heading: 'Violations you caught',
    entriesOf: (result) => result.truePositives,
    panel: 'rounded-lg border border-emerald-700 bg-emerald-50 p-4',
    headingClasses: 'text-base font-semibold text-emerald-900',
    entryRest: 'text-emerald-900 hover:bg-emerald-100 focus-visible:outline-emerald-800',
    entrySelected:
      'bg-emerald-800 text-white hover:bg-emerald-900 focus-visible:outline-emerald-900',
  },
]

// The element identifier is `target` on a finding and `id` on an auditTargets
// entry. The translation happens here, once and in the open.
function labelForTarget(auditTargets, target) {
  const entry = auditTargets.find((auditTarget) => auditTarget.id === target)
  return entry ? entry.label : target
}

function labelForRule(ruleId) {
  const rule = WCAG_RULES.find((entry) => entry.id === ruleId)
  return rule ? rule.shortLabel : ruleId
}

function Section({ section, findings, auditTargets, selectedTarget, onSelect }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className={section.panel}>
      <h2 id={headingId} className={section.headingClasses}>
        {section.heading}
      </h2>

      <ul className="mt-2 flex flex-col gap-1">
        {findings.map((finding) => {
          const isSelected = finding.target === selectedTarget

          return (
            <li key={`${finding.ruleId}::${finding.target}`}>
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(finding.target)}
                className={`${ENTRY_BASE} ${isSelected ? section.entrySelected : section.entryRest}`}
              >
                {labelForTarget(auditTargets, finding.target)} — {labelForRule(finding.ruleId)}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FindingsList({ result, auditTargets, selectedTarget, onSelect }) {
  const compliantHeadingId = useId()

  const populated = SECTIONS.map((section) => ({
    section,
    findings: section.entriesOf(result),
  })).filter(({ findings }) => findings.length > 0)

  // Nothing missed, nothing flagged in error, and something caught. The same
  // screen emphasised, not a separate one.
  const isPerfect =
    result.falseNegatives.length === 0 &&
    result.falsePositives.length === 0 &&
    result.truePositives.length > 0

  // All three arrays empty can only mean an empty Truth met with an empty log.
  const wasCleanAndReportedClean = populated.length === 0

  if (wasCleanAndReportedClean) {
    return (
      <section
        aria-labelledby={compliantHeadingId}
        className="rounded-lg border border-emerald-700 bg-emerald-50 p-4"
      >
        <h2 id={compliantHeadingId} className="text-base font-semibold text-emerald-900">
          Compliant — correctly reported
        </h2>
        <p className="mt-2 text-sm text-emerald-900">
          This component had no violations. Submitting an empty audit was the right answer.
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {isPerfect && <h2 className="text-base font-semibold text-emerald-900">Perfect!</h2>}

      {populated.map(({ section, findings }) => (
        <Section
          key={section.outcome}
          section={section}
          findings={findings}
          auditTargets={auditTargets}
          selectedTarget={selectedTarget}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export default FindingsList
