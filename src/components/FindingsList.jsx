import { useId } from 'react'
import { WCAG_RULES } from '../data/wcagRules.js'
import { deriveEvidence, EVIDENCE, OUTCOMES } from '../engine/review.js'

// Every player-facing sentence the review adds lives here. The engine decides
// which reading answers a finding; this turns that reading into words.
//
// Each states what was found rather than passing judgement, the way the
// Inspector does — the reading is the teaching, and a verdict on top of it
// would do the noticing for the player.
const EVIDENCE_TEXT = {
  [EVIDENCE.ACCESSIBLE_NAME]: ({ accessibleName }) =>
    accessibleName === null
      ? 'It had no accessible name when you submitted.'
      : `Its accessible name was “${accessibleName}”.`,

  [EVIDENCE.SIZE]: ({ width, height }) => `It measured ${width} × ${height} CSS pixels.`,

  [EVIDENCE.FOCUS_STYLING]: ({ outlineStyle, outlineWidth, boxShadow, hasVisibleIndicator }) => {
    if (!hasVisibleIndicator) return 'While it held focus it drew no outline and no box-shadow.'
    if (outlineStyle === 'none' || parseFloat(outlineWidth) === 0) {
      return `While it held focus its box-shadow was ${boxShadow}.`
    }
    return `While it held focus its outline was ${outlineStyle} ${outlineWidth}.`
  },

  // Not an error state, and it must not read as one: the player did the audit
  // without running the test, which is the lesson rather than a fault.
  [EVIDENCE.FOCUS_NEVER_REACHED]: () =>
    'Focus never reached this element during the round. A focus indicator can only be judged while the element holds focus.',

  // Never "you did not test it". The criterion genuinely does not apply.
  [EVIDENCE.FOCUS_NOT_APPLICABLE]: ({ tagName }) =>
    `The <${tagName}> element never takes keyboard focus, so this criterion does not apply to it.`,

  [EVIDENCE.NONE]: () => null,
}

function evidenceSentence(ruleId, readout, focusReadout) {
  const evidence = deriveEvidence(ruleId, readout, focusReadout)
  const toText = EVIDENCE_TEXT[evidence.kind]
  return toText ? toText(evidence) : null
}

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
    carriesEvidence: false,
    panel: 'rounded-lg border border-red-700 bg-red-50 p-4',
    headingClasses: 'text-base font-semibold text-red-900',
    bodyClasses: 'text-red-900',
    entryRest: 'text-red-900 hover:bg-red-100 focus-visible:outline-red-800',
    entrySelected: 'bg-red-800 text-white hover:bg-red-900 focus-visible:outline-red-900',
  },
  {
    outcome: OUTCOMES.FLAGGED_IN_ERROR,
    heading: 'Flagged in error',
    entriesOf: (result) => result.falsePositives,
    // The rule alone explains the criterion; the reading explains this
    // particular verdict, and only this section needs one.
    carriesEvidence: true,
    panel: 'rounded-lg border border-amber-700 bg-amber-50 p-4',
    headingClasses: 'text-base font-semibold text-amber-900',
    bodyClasses: 'text-amber-900',
    entryRest: 'text-amber-900 hover:bg-amber-100 focus-visible:outline-amber-800',
    entrySelected: 'bg-amber-800 text-white hover:bg-amber-900 focus-visible:outline-amber-900',
  },
  {
    outcome: OUTCOMES.CAUGHT,
    heading: 'Violations you caught',
    entriesOf: (result) => result.truePositives,
    carriesEvidence: false,
    panel: 'rounded-lg border border-emerald-700 bg-emerald-50 p-4',
    headingClasses: 'text-base font-semibold text-emerald-900',
    bodyClasses: 'text-emerald-900',
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

function ruleFor(ruleId) {
  return WCAG_RULES.find((entry) => entry.id === ruleId) ?? null
}

function Section({ section, findings, auditTargets, snapshot, selectedTarget, onSelect }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className={section.panel}>
      <h2 id={headingId} className={section.headingClasses}>
        {section.heading}
      </h2>

      <ul className="mt-2 flex flex-col gap-3">
        {findings.map((finding) => {
          const isSelected = finding.target === selectedTarget
          const rule = ruleFor(finding.ruleId)
          // Both sides of the snapshot, for this element only. `null` is a
          // legitimate focus value and is passed through as one.
          const readout = snapshot?.elements?.[finding.target] ?? null
          const focusReadout = snapshot?.focus?.[finding.target] ?? null
          const evidence = section.carriesEvidence
            ? evidenceSentence(finding.ruleId, readout, focusReadout)
            : null

          return (
            <li key={`${finding.ruleId}::${finding.target}`}>
              {/* The summary and the reading sit outside the control, so the
                  button's accessible name stays the element and the rule
                  rather than a paragraph of explanation. */}
              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => onSelect(finding.target)}
                className={`${ENTRY_BASE} ${isSelected ? section.entrySelected : section.entryRest}`}
              >
                {labelForTarget(auditTargets, finding.target)} — {rule ? rule.shortLabel : finding.ruleId}
              </button>

              {rule && (
                <p className={`mt-1 px-3 text-sm ${section.bodyClasses}`}>{rule.description}</p>
              )}

              {evidence && (
                <p className={`mt-1 px-3 text-sm font-medium ${section.bodyClasses}`}>{evidence}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FindingsList({ result, auditTargets, snapshot, selectedTarget, onSelect }) {
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
          snapshot={snapshot}
          selectedTarget={selectedTarget}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export default FindingsList
