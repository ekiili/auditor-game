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

## 18. Audit Mode off means no visible game

**Date:** 2026-07-29 · **Status:** Accepted

Before Audit Mode is enabled, the target component appears exactly as it would to
an ordinary user of a real website — no Inspector list, no overlays, no
annotations. The two-phase rhythm is deliberate: experience the interface first,
then examine it. Auditing an interface you have never used is not the workflow
being taught.

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

## Open questions

Not yet decided. Listed so they are not silently resolved by implementation.

- **Review phase presentation.** Outline plus badge with an explanatory panel on hover is agreed; the data structure behind it is not. Whether the review also explains *false positives* — including exempt cases such as the user-agent spinner exception — remains open.
- **Final report contents.** Must show what the player missed. Everything beyond that is undecided.
