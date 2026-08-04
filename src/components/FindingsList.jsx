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
//
// The highlight is carried by the wrapper around the whole finding, not by the
// title control alone. A coloured bar across the top line and nothing beneath
// it reads as a header for everything that follows — including the next
// finding — which is the opposite of what selecting one finding means.
//
// `has-[button:hover]` rather than `hover` on the wrapper: the button is the
// only thing here that can be activated, so it is the only thing whose hover
// should preview what selecting will do. A plain `hover` on the wrapper would
// light the block up when the pointer crossed a paragraph.
const FINDING_BASE = 'rounded-md p-1'

// The title outranks its explanation at every moment, selected or not, so the
// weight lives here rather than in either state's classes.
const ENTRY_BASE =
  'flex min-h-11 w-full items-center rounded-md bg-transparent px-3 py-2 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

const SECTIONS = [
  {
    outcome: OUTCOMES.MISSED,
    heading: 'Violations you missed',
    entriesOf: (result) => result.falseNegatives,
    carriesEvidence: false,
    panel: 'rounded-lg border border-red-700 bg-red-50 p-4',
    headingClasses: 'text-base font-semibold text-red-900',
    divider: 'border-red-200',
    findingRest: 'text-red-900 has-[button:hover]:bg-red-100',
    findingSelected: 'bg-red-800 text-white has-[button:hover]:bg-red-900',
    entryRest: 'focus-visible:outline-red-800',
    entrySelected: 'focus-visible:outline-white',
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
    divider: 'border-amber-200',
    findingRest: 'text-amber-900 has-[button:hover]:bg-amber-100',
    findingSelected: 'bg-amber-800 text-white has-[button:hover]:bg-amber-900',
    entryRest: 'focus-visible:outline-amber-800',
    entrySelected: 'focus-visible:outline-white',
  },
  {
    outcome: OUTCOMES.CAUGHT,
    heading: 'Violations you caught',
    // Both kinds of catch, in one section. A defensible answer is professionally
    // correct and belongs among the player's successes; a panel of its own would
    // present a correct answer as a category of failure. Exact catches first,
    // then defensible ones — an order, not a ranking, and the only thing that
    // separates them once they are on screen is the extra line one of them
    // carries.
    entriesOf: (result) => [
      ...result.truePositives,
      ...result.defensible.map((entry) => ({
        ...entry.guess,
        primaryRuleId: entry.primaryRuleId,
        remark: entry.remark,
      })),
    ],
    carriesEvidence: false,
    panel: 'rounded-lg border border-emerald-700 bg-emerald-50 p-4',
    headingClasses: 'text-base font-semibold text-emerald-900',
    divider: 'border-emerald-200',
    findingRest: 'text-emerald-900 has-[button:hover]:bg-emerald-100',
    findingSelected: 'bg-emerald-800 text-white has-[button:hover]:bg-emerald-900',
    entryRest: 'focus-visible:outline-emerald-800',
    entrySelected: 'focus-visible:outline-white',
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

      {/* Spacing and a hairline rule, not a border per finding: a bordered box
          inside a bordered panel reads as a card and competes with the panel
          for the eye. The divider belongs to the gap between two findings, so
          it sits outside the highlight rather than inside it. */}
      <ul className="mt-2 flex flex-col">
        {findings.map((finding, index) => {
          const isSelected = finding.target === selectedTarget
          // The rule the player actually logged, in every section. A defensible
          // entry names its own answer at the top and the sharper one below;
          // relabelling the top line with the primary rule would tell the
          // player they logged something they did not.
          const rule = ruleFor(finding.ruleId)
          // Present only on a defensible entry, which is the only thing that
          // carries a remark. Falls back to the bare criterion number if the
          // rule is not in the table, exactly as the top line does.
          const primaryRule = finding.remark ? ruleFor(finding.primaryRuleId) : null
          const sharperRule = primaryRule
            ? `${primaryRule.id} · ${primaryRule.name}`
            : finding.primaryRuleId
          // Both sides of the snapshot, for this element only. `null` is a
          // legitimate focus value and is passed through as one.
          const readout = snapshot?.elements?.[finding.target] ?? null
          const focusReadout = snapshot?.focus?.[finding.target] ?? null
          const evidence = section.carriesEvidence
            ? evidenceSentence(finding.ruleId, readout, focusReadout)
            : null

          return (
            <li
              key={`${finding.ruleId}::${finding.target}`}
              className={index === 0 ? undefined : `mt-3 border-t pt-3 ${section.divider}`}
            >
              <div
                className={`${FINDING_BASE} ${isSelected ? section.findingSelected : section.findingRest}`}
              >
                {/* The summary and the reading sit outside the control, so the
                    button's accessible name stays the element and the rule
                    rather than a paragraph of explanation. Colour is inherited
                    from the wrapper, so the selected state cannot end up half
                    applied. */}
                <button
                  type="button"
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => onSelect(finding.target)}
                  className={`${ENTRY_BASE} ${isSelected ? section.entrySelected : section.entryRest}`}
                >
                  {labelForTarget(auditTargets, finding.target)} —{' '}
                  {rule ? rule.shortLabel : finding.ruleId}
                </button>

                {rule && <p className="mt-1 px-3 text-sm">{rule.description}</p>}

                {evidence && <p className="mt-1 px-3 text-sm font-medium">{evidence}</p>}

                {/* The one line a defensible entry carries beyond its
                    neighbours — the same structural position and the same
                    weight the flagged-in-error reading occupies, because both
                    do the same job: the rule above explains the criterion, and
                    this explains this particular verdict.

                    The remark is rendered exactly as the level authored it.
                    Nothing here composes, trims or rewords it; the only text
                    added is the sharper rule's own identifier and name, which
                    the remark refers to but does not spell out.

                    No colour of its own. The wrapper owns the foreground in
                    both the resting and the selected state, so this line cannot
                    end up with one state's text over the other's background. */}
                {finding.remark && (
                  <p className="mt-1 px-3 text-sm font-medium">
                    <span className="font-semibold">Sharper rule — {sharperRule}:</span>{' '}
                    {finding.remark}
                  </p>
                )}
              </div>
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

  // Nothing missed, nothing flagged in error, nothing caught under a criterion
  // other than its primary one, and something caught. The same screen
  // emphasised, not a separate one.
  //
  // The defensible clause is what keeps this heading agreeing with the one on
  // the end-of-session report. Without it a round with one exact catch and one
  // defensible catch would be headed "Perfect!" here and listed as imperfect
  // there, for the same round.
  const isPerfect =
    result.falseNegatives.length === 0 &&
    result.falsePositives.length === 0 &&
    result.defensible.length === 0 &&
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
