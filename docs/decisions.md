# Architecture Decision Record

Design decisions for **Audit Game**, with the reasoning behind them. Newest entries at the bottom.

Each entry records what was decided and — more importantly — *why the obvious alternative was rejected*. Decisions marked **Provisional** are expected to change; decisions marked **Open** have not been made yet.

---

## 1. Two-agent development workflow

**Date:** 2026-07-29 · **Status:** Accepted

A Planner agent produces specifications; a Developer agent (Claude Code) implements them. The Planner never writes application code; the Developer never decides scope.

The separation exists because the failure modes differ. Planning failures are ambiguity and contradiction; implementation failures are silent over-reach and premature abstraction. Splitting the roles means each task prompt is a written contract that can be checked against its own report, and every build step ends with a verifiable definition of done rather than "looks right."

---

## 2. Sabotage flows through props, never DOM manipulation

**Date:** 2026-07-29 · **Status:** Accepted

Accessibility violations are injected by passing variant props into the target component. Imperative DOM mutation (`setAttribute`, `style.outline = 'none'`) is prohibited.

The imperative approach is tempting because it mirrors what the bug "is" — you literally strip the attribute. But React owns the DOM, and any re-render silently restores what was mutated, producing violations that appear and vanish unpredictably. Props survive re-renders because they *are* the render.

---

## 3. Three-layer separation between deciding and rendering

**Date:** 2026-07-29 · **Status:** Accepted

The PRD required the baseline component and the saboteur logic to live in separate files, so that an AI editing session could not "helpfully" repair the injected bugs. Decision 2 pushed conditionals toward the component. These pulled in opposite directions.

Resolved with three layers:

```
saboteurEngine.js   picks which violations occur (the Truth)
sabotage.js         maps rule IDs to component props
CheckoutCard.jsx    receives flat props and renders them
```

Dependencies point inward only. `CheckoutCard.jsx` imports nothing from the engine, never sees a rule ID, and contains no conditional describing a bug. The engine knows nothing about JSX.

---

## 4. Variant props are named neutrally

**Date:** 2026-07-29 · **Status:** Accepted

Props are `imageAlt`, `labelMode`, `focusStyle`, `removeButtonSize` — not `isBroken`, `hasAltBug`, or `isBugActive`.

This is a defence against a specific failure: an agent editing a file full of `isBugActive` flags feels the pull to fix what looks broken. A file describing rendering *variants* reads as a configurable component and invites no repair. Every prop defaults to the compliant value, so `<CheckoutCard />` with no props is a flawless WCAG 2.2 AA component — the baseline is the default, and sabotage is the deviation.

---

## 5. JavaScript, not TypeScript

**Date:** 2026-07-29 · **Status:** Accepted

The project stays in plain JS/JSX.

TypeScript's main benefit here would be catching typos in rule IDs and variant values — real risks, since `"2.4.7"` mistyped or `focusStyle="hidden"` both fail silently. That protection is bought instead with frozen constants: rule IDs live only in `wcagRules.js`, variant values only in `variants.js`, and no module writes those strings as literals. A mistyped constant throws immediately; a mistyped string does not.

The decision is reversible — Vite handles mixed `.js`/`.tsx`, so a single complex file can be converted later without migrating the project.

---

## 6. Levels are self-contained modules behind a registry

**Date:** 2026-07-29 · **Status:** Accepted

Each level is a directory owning its component, assets, and sabotage mapping, exporting one object: `{ id, name, Component, auditTargets, sabotageMap, applySabotage }`. A registry array is the only thing that knows levels exist; nothing imports a level by name.

Adopted before a second level existed, because the alternative — level one living directly in `App.jsx` — makes level two a refactor instead of an addition. The sabotage mapping belongs to the level rather than the shared engine, since every level has a different prop contract.

---

## 7. Guesses are logged as element + rule

**Date:** 2026-07-29 · **Status:** Accepted

A guess is a pair: which element violated which rule. Both must match for a true positive.

Requiring the element is what makes the game an auditing exercise rather than a checklist. Knowing "this card has a labelling problem" is worth far less than knowing which control is unlabelled.

---

## 8. The guessable set is larger than the breakable set

**Date:** 2026-07-29 · **Status:** Accepted

`auditTargets` lists every element the player can point at (six). `sabotageMap` lists the pairs the engine can actually break (four). The Inspector's options derive from `auditTargets`; deriving them from `sabotageMap` would hand the player the answer key.

The quantity stepper buttons are permanent decoys — always compliant, always flaggable. False positives have to be possible in places that are never broken, or the game teaches suspicion instead of judgement.

---

## 9. Scoring is ±1 per decision

**Date:** 2026-07-29 · **Status:** Provisional

+1 per true positive, −1 per false positive, −1 per false negative. Correctly submitting an empty audit on a clean round scores +1 — recognising a compliant component is a decision and scores like one. Round scores may go negative and are not clamped.

Values are placeholders pending playtesting. They are defined as named constants so tuning touches one file.

---

## 10. No explicit "Declare Compliant" control

**Date:** 2026-07-29 · **Status:** Accepted

The PRD proposed a separate control for declaring a component clean. Rejected: **Submit** means "I have logged every violation I found," and an empty log is a valid, complete answer.

The concern was that apathy would score identically to diligence, but the scoring already handles it — a player who logs nothing every round loses a point per missed violation across the 80% of rounds that are broken. A confirmation step on empty submit ("Submit with no violations logged? You're declaring this component compliant.") guards against misclicks without adding a second mode.

---

## 11. Custom quantity stepper instead of a native number input

**Date:** 2026-07-29 · **Status:** Accepted

The native `<input type="number">` renders browser spinner arrows of roughly 10×13px. These are **not** a WCAG 2.2 failure — success criterion 2.5.8 exempts targets whose size is determined by the user agent and unmodified by the author — but a player inspecting the component cannot know that, and would lose a point for correctly noticing something small.

Replaced with 44×44 custom buttons. Native spinners are suppressed via CSS while `type="number"` is retained, preserving arrow-key increment and mobile numeric keypads.

Supporting details:
- Buttons stay **enabled** at the minimum rather than using `disabled`; a control that drops out of the tab order at quantity 1 is its own accessibility smell. The value is clamped instead.
- Quantity changes announce through a polite live region, suppressed on mount.

---

## 12. Implementation conventions

**Date:** 2026-07-29 · **Status:** Accepted

Smaller decisions, recorded so they are not re-litigated:

- **`base: '/audit-game/'`** in `vite.config.js`. GitHub Pages project sites serve from a subpath; Vite's default root-absolute asset paths would 404 into a blank page. Images are imported from `src/` rather than referenced from `public/`, so Vite rewrites their URLs.
- **`useId()`** for form element ids. Hardcoded ids break label association the moment two instances render.
- **Tailwind v4, CSS-first.** `tailwind.config.js` deleted; v4 auto-detects sources. Variant class names are written as complete literals in lookup maps, never interpolated — Tailwind scans source text and generates nothing for `` `h-${size}` ``.
- **No persistence.** No `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. A refresh resets the session by design.
- **The engine's RNG is injected**, defaulting to `Math.random`, so any outcome can be forced deterministically during verification.
- **The reducer stays pure.** Violations are selected by the caller and passed into the `startRound` payload rather than generated inside the reducer.
- **No test framework.** Verification uses throwaway Node scripts deleted before commit — appropriate at this size, revisitable later.

---

## 13. `CLAUDE.md` is Planner-maintained and versioned

**Date:** 2026-07-29 · **Status:** Accepted

The Developer may not edit, append to, or reorganise `CLAUDE.md`. It carries a version line, and every task report must quote that line back.

Added after a stale copy went unnoticed across two build steps. The problem was not unauthorised edits — it was that a stale file and a current one are indistinguishable in a report. Quoting the version turns a silent failure into an obvious one.

The single sanctioned exception to the no-DOM-manipulation rule is `main.jsx`'s `document.getElementById('root')`, which React requires to mount.

---

## 14. This document

**Date:** 2026-07-29 · **Status:** Accepted

Decisions are recorded as they are made, with the rejected alternative and the reason. The reasoning is the part worth keeping — the code shows what was built, not what was considered and discarded.

---

## 15. The Inspector reports facts, not verdicts

**Date:** 2026-07-29 · **Status:** Accepted

Two of the four Phase 1 violations produce no visual difference — a missing
image description and a label that is visually adjacent but not programmatically
associated both render identically to their compliant versions. Inspection must
therefore surface properties the screen cannot show.

Chosen approach: the player selects an element and reads its properties in a
panel — role, computed accessible name, target dimensions, focus indicator.
Rejected alternatives: annotating every element at once (removes the act of
investigating), screen-reader simulation alone (cannot express target size),
and dropping the invisible rules from Phase 1 (they are among the most common
real-world failures, and postponing them weakens the tool).

A screen-reader preview may be layered on later, reusing the same computed data.

**Sub-decisions:**

- Accessible names are computed with `dom-accessibility-api` rather than a
  hand-rolled resolver. The name computation is a real specification with a
  precedence order and edge cases; in a tool teaching correctness, a spec-correct
  implementation outweighs avoiding one small offline dependency.
- The readout is presented in neutral styling. Empty values are never coloured,
  iconed, or flagged as suspicious. Highlighting "Accessible name: (none)" would
  perform the audit for the player, reducing them to transcribing findings rather
  than making them.
- All values are computed from the live DOM, never from game state. Deriving the
  readout from the answer key would make the Inspector and the sabotage layer
  agree even when the sabotage layer is broken, hiding exactly the defects the
  readout exists to expose.

---

## 16. Architecture docs are updated in the same task as the refactor

**Date:** 2026-07-29 · **Status:** Accepted

Step 2 restructured the project around a level registry, but CLAUDE.md was not
updated to match. The stale description survived two commits and blocked step 3,
when the Developer correctly refused to guess between the file's stated
architecture and the task prompt's assumed one.

Any task that changes the file tree, the layer boundaries, or a prop contract
must ship the corresponding CLAUDE.md revision with it — not afterwards. A
specification that disagrees with the repository is worse than no specification,
because it is followed with confidence.

Two mechanisms caught this rather than luck: the requirement that every task
report quote the CLAUDE.md version line, and the instruction to report
discrepancies and stop rather than resolve them independently.

---

## 17. Element selection: list-primary, overlay highlight, no styling of the target

**Date:** 2026-07-29 · **Status:** Accepted

The player selects an element from a list of the level's audit targets in the
Inspector. Clicking the element on the canvas also works, via one delegated
handler using `closest('[data-audit-target]')`, so the level component remains
unaware the game exists.

The list is primary rather than the canvas because canvas clicking fails exactly
where it matters: the 2.5.8 violation shrinks a target to 16×16, forcing the
player to click a tiny control to report that it is tiny, and keyboard selection
cannot rely on the component's focus ring when `focusStyle: 'none'` may have
removed it.

Selection is drawn as a separate absolutely-positioned overlay, sized from the
element's bounding rectangle and offset slightly outward, never as a style on the
target itself. `outline`, `border`, and `background` are all either audited
properties or affect measured target size — styling the element would mask or
manufacture the very violations being assessed.

The Inspector's own list uses visually hidden native radio inputs, inheriting
arrow-key navigation and position announcements rather than reimplementing them.

---


## 18. Audit Mode off means no visible game

**Date:** 2026-07-29 · **Status:** Accepted

Before Audit Mode is enabled, the target component appears exactly as it would to
an ordinary user of a real website — no Inspector list, no overlays, no
annotations. The two-phase rhythm is deliberate: experience the interface first,
then examine it. Auditing an interface you have never used is not the workflow
being taught.

---


## 19. Rules are presented in plain language, not by number

**Date:** 2026-07-29 · **Status:** Accepted

Each rule carries a plain-language `shortLabel` shown as the primary text, with
the criterion number and official name secondary. Numbers are for citing
findings, not for locating rules in a list; expecting recall of "2.5.8" filters
for memorisation rather than judgement.

Each rule also carries a `keywords` array for search. Official WCAG names do not
contain the words beginners type — someone looking for the missing-image-
description rule searches "alt text", which appears nowhere in "Non-text
Content." Synonyms are what make search usable.

The rule picker is a filter field above an always-visible radio group, **not** a
searchable dropdown. A searchable dropdown is an ARIA combobox with a listbox
popup — one of the most error-prone widgets in the specification, and a poor
thing to hand-roll in an accessibility project. A text input filtering a visible
radio group provides the same function from two natively accessible primitives.

Rules are never filtered by the selected element. All criteria remain choosable
for every target, because knowing which criteria apply to which element is part
of the skill; filtering would leak what can be wrong with each element.

---

## 20. Rule data carries `principle` from the start; the picker groups only when it needs to

**Date:** 2026-07-29 · **Status:** Accepted

Phase 1 ships four rules, but the set will grow — WCAG 2.2 AA has roughly fifty
success criteria. Each rule entry therefore carries a `principle` field
(Perceivable, Operable, Understandable, Robust) immediately, alongside a frozen
`PRINCIPLES` constant, even though nothing renders groups yet. Adding the field
later would mean migrating every entry and every consumer; adding it now costs
one line per rule.

The value is stored explicitly rather than derived from the criterion number's
first digit. The derivation is real but fragile, and the human-readable principle
names are needed for group headings regardless.

The picker renders a flat list until the rule count passes a threshold, then
switches to `<fieldset>`/`<legend>` groups by principle, with the filter field
appearing on the same condition. Four rules across three principles would produce
groups of one — more chrome than content. Because the data already supports
grouping, adding rules five through fifteen requires no component changes.

Grouping by principle also teaches: auditors reason in terms of the four
principles, and repeatedly seeing a criterion under its parent builds that model
without instruction.

---

## 21. Shared data shapes are defined once in CLAUDE.md

**Date:** 2026-07-29 · **Status:** Accepted

Step 2 defined `applySabotage`'s input as an array of rule-ID strings; step 3
defined the engine's output as an array of `{ ruleId, target }` objects. Both
prompts were internally consistent, neither owned the shape, and nothing held
both in view. The result was a pipeline that silently applied no variants while
every layer reported success.

Shared shapes — violation entry, guess entry, readout object, level module, game
state — are therefore defined once in a Data Contracts section of `CLAUDE.md`.
Task prompts reference them by name rather than re-describing them, so two
prompts cannot disagree about a shape neither of them owns.

Prose in a task prompt is a poor place for a contract: it is authoritative only
for that task, and expires when the task is done.

---

## 22. Task prompts do not restate CLAUDE.md

**Date:** 2026-07-29 · **Status:** Accepted

Task prompts carry only what is specific to the task — goal, unique constraints,
verification, definition of done. Guardrails, layer rules, lint policy, and the
prohibition on building ahead live in `CLAUDE.md` and are not repeated.

Restating was justified while `CLAUDE.md` was known to be stale; it is not
justified now that the file is current and version-checked. Duplicated rules also
create the same drift risk as duplicated contracts — two copies eventually
disagree, and the task prompt is the one nobody updates.

Developer reports follow the same principle: terse confirmation per checklist
item, with expansion reserved for deviations, explicitly requested figures, and
failures.

---


## 23. Unrecorded shapes are confirmed before anything depends on them

**Date:** 2026-07-29 · **Status:** Accepted

Only three of the shared shapes were ever confirmed against the code: violation
entry, guess entry, and the level module's top-level keys. The readout object,
the reducer's state and action names, and the entry shapes inside `auditTargets`
and `sabotageMap` were assumed.

Unconfirmed shapes are marked unrecorded in `CLAUDE.md`, and no task may depend
on one. They are confirmed by a dedicated read-and-report task.

Rejected: bundling confirmation into the task that consumes the shapes. It saves
a round trip, but code gets written against assumptions while they are still
unverified, and a wrong one costs more than the trip saved.

---

## 24. "Pure module" means: imports no JSX

**Date:** 2026-07-29 · **Status:** Accepted

`CLAUDE.md` required every pure module to stay importable by plain `node` without
defining "pure module." The Level module contract requires a `Component`,
`Component` lives in a `.jsx` file, and `node` cannot parse `.jsx` — so both level
`index.js` files are unloadable by construction, not by defect.

A pure module imports no `.jsx`. Those must load under plain `node`. Modules that
reach JSX are outside the rule, and verification scripts import the pure module
they need directly rather than reaching through a level index or the registry.

Worth remembering: the rule read as correct for two revisions and failed the
first time a task actually tried to obey it.

---

## 25. Developer context is reset periodically, with a re-entry check

**Date:** 2026-07-30 · **Status:** Accepted

The Developer's session context is reset periodically to keep context cost down,
rather than carrying one session forward indefinitely.

A reset session has nothing but the repository and `CLAUDE.md`, so it is given a
re-entry task before build work resumes: establish the file tree, check each
recorded contract against its origin in the code, and list anything in the
repository the documentation does not account for. Discrepancies are reported,
never reconciled.

The first run found more than expected — two errors in the readout contract, four
shapes in use but unrecorded, and rule fields settled since ADR 19 that had never
been built. That the check doubles as a test of whether the documentation stands
alone was a side effect, not the reason for resetting.

---

## 26. The Inspector describes one element, and the highlight yields to keyboard focus

**Date:** 2026-07-30 · **Status:** Accepted

The Inspector panel always describes the element the player most recently moved
to, however they reached it — clicking the canvas, choosing it from the target
list, or tabbing to it.

Rejected: separate "selected element" and "currently focused" sections. Two
elements described at once is harder to read, and a focus section that stays
empty until the player tabs to the right element would make emptiness ambiguous.
The game depends on an empty value meaning something is missing.

The selection highlight is hidden while the current element has keyboard focus,
so the player sees that element's own focus styling or its absence. Our highlight
would otherwise read as a focus indicator on an element sabotaged to have none,
and 2.4.7 is one of the four Phase 1 violations — it would happen every time that
rule was tested.

---

## 27. The review explains all three outcomes

**Date:** 2026-07-31 · **Status:** Accepted

A scored round produces three outcomes: violations the player caught, violations
they missed, and things they flagged that were fine. The review explains all
three.

Rejected: explaining only what was missed. Over-reporting is as damaging as
under-reporting in real auditing — an auditor wrong about six of twenty findings
costs a developer a week and loses their credibility. Scoring already deducts for
a false alarm, but a penalty with no explanation teaches caution rather than
judgement.

Consequence for the data structure: the review captures the Inspector's readings
at the moment of submission. A miss is explained from the rule's static
`description`; a false alarm is explained from the measurement the player
misjudged, and that measurement is gone once the next round renders. Exemptions —
a control excused by the standard, such as user-agent spinner arrows — will need
written text rather than a generated reading. Phase 1 has none, since the
quantity control is custom.

---

## 28. — Review phase uses static marks on the card with interaction in the list

**Date:** 2026-07-31 · **Status:** Accepted

The review phase marks every affected element on the card with a static,
non-interactive outline coded by outcome, so the whole result is visible at
once. All interaction — selecting a finding, reading its explanation — happens
in the chrome column list, reusing the existing list-primary selection pattern
and the selection highlight overlay.

Chosen over badges on the card, which would have added focusable controls on
top of a component that already has its own, and would have required a second
positioned-overlay system. Chosen over a list-only review, which never shows
the component as a whole.

Supersedes the earlier convention of an outline plus badge with a hover panel,
which was decided before the viewport-locked layout and before list-primary
selection existed.

Consequence: outcome coding may not rely on colour alone.

---

## 29. Review phase mark styles

**Date:** 2026-07-31 · **Status:** Accepted

Each marked element in the review carries a line style that identifies its
outcome:

- Missed violation — dashed
- False alarm — dotted
- Caught violation — solid at double weight, falling back to normal weight when
  the element's smaller dimension is under 24px

The caught mark is a single line drawn heavier than the others, not a two-stroke
double line. The fallback exists because a heavy line overwhelms a small target
rather than reading as emphasis. The threshold is evaluated against the width
and height already recorded in the Round snapshot at submit, so no measurement
is added at review time.

Line style, not colour, is the primary distinction, satisfying the requirement
that outcome coding never rely on colour alone. Dashed and dotted are accepted
as being close to one another at small sizes; the findings list remains the
authoritative statement of what each mark means.

The CSS property used to draw the marks is deliberately not specified here. The
requirements are that it must not affect layout, must not collide with focus
indication, and must render at every target size in the card.

---

## 30. Review marks describe elements, not findings

**Date:** 2026-07-31 · **Status:** Accepted

A finding is an element-and-rule pair, but a mark is drawn on an element. A mark
therefore reports the state of the element as a whole, not of any one finding
against it.

Where an element carries more than one finding, precedence applies: an
unresolved violation outranks everything else, and a false alarm marks the card
only when the element was otherwise clean.

The consequence is that an element flagged under the wrong rule reads as a
missed violation on the card. This is the common case rather than an edge case —
recognising that something is wrong while naming the wrong criterion is the
result the game most needs to teach. Both findings remain in the list, where
there is room to explain the distinction.

Decision 30's style assignments are unchanged; this decision fixes what they are
assigned to.

Empty sections are hidden rather than shown as empty states. A round with
nothing missed and nothing flagged in error therefore fills the column with the
caught panel alone, under a "Perfect!" headline. This is the same screen
emphasised, not a separate one.

---

## 31. Findings are grouped into three coloured sections

**Date:** 2026-07-31 · **Status:** Accepted

The findings list presents three sections in a fixed order: missed violations,
things flagged in error, then violations caught. Each is a distinct
colour-coded panel.

The grouping maps one-to-one onto the three arrays of the Round result, so the
rendering is direct and the data contract is legible in the interface. The
section heading carries the meaning of its category, which keeps individual rows
free of repeated status labelling and means colour is reinforcement rather than
the sole carrier of meaning.

The order places the instructive content first and the player's successes last,
so the review teaches on the way in and ends on what went right.

Rejected: a flat list with a status on each row, which would have rendered two
different entry shapes as uniform rows and mimicked the in-round log while
containing entries the player never made.

---

## 32. What a review entry tells the player

**Date:** 2026-07-31 · **Status:** Accepted

Every finding carries a short plain-language summary of its rule, regardless of
outcome. This is the teaching layer and it reads the same whether the player
caught the violation, missed it, or flagged something that was fine.

Findings flagged in error carry one thing more: the measurement showing the
element passed. The rule alone explains the criterion; the measurement explains
this particular verdict, and it is only available because the game records what
the player saw at the moment they submitted.

Two cases are handled separately and must not be collapsed into the general
one. Where a player flagged a focus failure on an element they never focused,
the review says so plainly — auditing without testing is itself the lesson.
Where an element can never receive focus at all, the review states that the
criterion does not apply to it. Wording that case as a failure to test would
teach the player something false, which this project cannot afford.

---

## 33. The card is inert during review but remains readable

**Date:** 2026-07-31 · **Status:** Accepted

During the review the card responds to nothing. It is not clickable and nothing
on it can be reached by keyboard. All interaction belongs to the findings list,
which is the single authoritative place to read a result.

Inert does not mean hidden. The card stays fully available to assistive
technology, so a player using a screen reader can still work through the
component and encounter the violations directly rather than being left with a
list of findings about something they can no longer examine.

A consequence worth recording: with nothing focusable on the card, the review
marks no longer compete with focus indication for the same styling.

---

## 34. The game is playable with a mouse alone

**Date:** 2026-08-01 · **Status:** Accepted

Every check the player is asked to make must be reachable without the keyboard.
This is a point-and-click game, and a player who never presses Tab must still be
able to complete a round and evaluate all four criteria.

Focus visibility is the criterion this affects. Rather than requiring the player
to tab to a control, the Inspector offers a control that moves real keyboard
focus onto the current element. The focus is genuine, so the reading stays
honest — what changes is who initiates the test, not whether it happens.

Rejected: leaving the check keyboard-only. Nobody using a mouse will reach for
Tab to evaluate one criterion out of an eventual fifty, so the check would go
unused.

The obvious implementation does not work: moving focus by script suppresses the
state the browser uses to decide whether to show an indicator, so a compliant
element would report as failing. Verified across three browser engines before
being accepted. Real Safari on macOS and iOS remains untested and that gap is
accepted.

---

## Open questions

Open questions are tracked in the Pending Decisions section of `CLAUDE.md`,
which is authoritative. Three documents were each maintaining a different list
of what remained undecided; consolidating into the file the Developer actually
reads removes the divergence at its source. Questions are recorded here as
numbered entries once they are answered, not while they are open.

---