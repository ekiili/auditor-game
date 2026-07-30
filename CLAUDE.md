> **CLAUDE.md — v7 (2026-07-30)**
> This file is maintained by the Planner. Do not edit, append to, or
> reorganize it. If you find it incomplete, ambiguous, or contradicted by
> your task prompt, do not resolve the conflict yourself — report the
> discrepancy and stop. Begin every task report by quoting this version line.
> If a copy of this file appears in your session context, ignore it and read
> the file on disk. The injected copy has been stale before.

# Audit Game — Developer Instructions

## Project Overview

You are building **Audit Game**, a purely client-side React SPA (Vite + Tailwind CSS). It is an accessibility training game: a perfect WCAG 2.2 AA baseline component is deliberately "sabotaged" with accessibility violations, and the player must find them.

Target standard: **WCAG 2.2 Level AA** (the European Accessibility Act baseline).

Phase 1 covers a single level — an E-commerce Checkout Card — and four violations. The architecture assumes more levels will follow.

The full product specification is at `docs/prd.md`. Where the PRD and this file disagree, this file wins; where a task prompt and this file disagree, **stop and report**.

## Core Tech Stack

* **Vite + React** (functional components, hooks)
* **JavaScript / JSX** — not TypeScript
* **Tailwind CSS v4**, CSS-first configuration. There is no `tailwind.config.js`; v4 auto-detects sources. Theme customization, if ever needed, goes in an `@theme` block in `src/index.css`.
* **`lucide-react`** — local SVG icons
* **`dom-accessibility-api`** — spec-correct accessible name computation for the Inspector (approved 2026-07-29)
* **oxlint** — the linter in this repo. It is not ESLint; rule names differ.

Build machinery pulled in by the above — `@vitejs/plugin-react`, `postcss`, `@tailwindcss/postcss`, `autoprefixer` — is expected and not a deviation.

Do not add dependencies beyond these without asking.

---

## Architecture: The Three Layers

This project has one architectural rule that everything else serves: **the code that renders a component and the code that decides to break it must never live in the same file.**

If sabotage decisions leak into a component, a future editing session will "helpfully" repair the injected bugs and the game silently stops working.

```
Layer 1 — TRUTH         src/engine/saboteurEngine.js
                        Rolls the dice. Owns the 80/20 compliant/broken split.
                        Outputs violations drawn from a level's sabotageMap.
                        Knows nothing about JSX or any specific level.

Layer 2 — TRANSLATION   src/levels/<level>/sabotage.js
                        Pure function: violations[] -> props object.
                        The ONLY place where a rule ID meets a component prop.
                        Lives inside the level, because every level has a
                        different prop contract.

Layer 3 — PRESENTATION  src/levels/<level>/*.jsx
                        Receives flat, neutral props. Renders them.
                        Never imports from engine/, data/, or its own
                        level index.js. Contains no conditionals about "bugs".
```

Dependencies point inward only. A component never reaches outward toward the game.

### Variant Props

Level components are **configurable**, not breakable. Their props describe rendering variants in neutral language, and every prop defaults to the compliant value — so a component rendered with no props is flawlessly compliant. The baseline is the default; sabotage is the deviation.

Variant values live in `src/levels/<level>/variants.js` as frozen constants, imported by both the components and `sabotage.js`. Neither imports from the other.

Never name a prop `isBroken`, `isBugActive`, `hasViolation`, or similar, and never write a comment inside a component describing anything as a bug.

Current contract for `ecommerce-checkout`:

| Prop | Compliant (default) | Variant | Rule |
| :--- | :--- | :--- | :--- |
| `imageAlt` | descriptive string | `undefined` | 1.1.1 |
| `labelMode` | `'programmatic'` | `'visual-only'` | 3.3.2 |
| `focusStyle` | `'visible'` | `'none'` | 2.4.7 |
| `removeButtonSize` | `'default'` | `'compact'` | 2.5.8 |

### Levels

Each level is a self-contained directory exporting one object from its `index.js`. Its shape is the **Level module** contract below.

* **`auditTargets`** — every element the player can point at, with a human-readable label. Includes elements that are never broken.
* **`sabotageMap`** — the (rule, target) pairs this level can actually break.

These lists are deliberately different lengths. The player may guess any target × any rule combination; only pairs in `sabotageMap` are ever injected. **Never derive the player's options from `sabotageMap`** — that hands over the answer key. The quantity stepper buttons are permanent decoys.

`src/levels/index.js` is a registry array. Nothing imports a level by name; consumers iterate the registry.

### File Structure

```
docs/
├─ prd.md                          product specification
└─ decisions.md                    architecture decision record
src/
├─ main.jsx
├─ App.jsx
├─ index.css
├─ components/                     shared, level-agnostic UI (HUD, Inspector)
├─ data/
│  └─ wcagRules.js                 static rule data only — no logic
├─ engine/
│  ├─ saboteurEngine.js            violation selection
│  ├─ scoring.js                   guess comparison
│  └─ readout.js                   live-DOM inspection — read-only
├─ state/
│  └─ gameState.js                 reducer and round lifecycle
└─ levels/
   ├─ index.js                     registry
   └─ ecommerce-checkout/
      ├─ index.js                  level module
      ├─ CheckoutCard.jsx
      ├─ QuantityStepper.jsx
      ├─ variants.js               frozen variant constants
      ├─ sabotage.js               violations[] -> props
      └─ assets/
```

Some of these do not exist yet. Build only what your current task specifies.

`src/components/` is for UI shared across all levels. Level-specific components never go there.

### Import Conventions

* Relative imports inside `src/` carry an **explicit file extension**: `./scoring.js`, never `./scoring`.
* Directory imports are written **to the file**: `../levels/index.js`, never `../levels`.
* Bare package imports are unaffected: `react`, `lucide-react`, `dom-accessibility-api`.

Vite resolves the extensionless and directory forms by convention; native Node does not.

A **pure module** is one that transitively imports no `.jsx`. Every pure module must stay importable by plain `node`, because throwaway Node scripts are this project's only verification mechanism.

Modules that reach JSX are outside that rule. The level `index.js` files are permanently among them by construction: the Level module contract requires a `Component`, and `node` cannot parse `.jsx` at all. This is a property of the architecture, not a defect, and must not be "fixed."

**A verification script imports the pure module it needs directly** — `sabotage.js`, `variants.js`, `saboteurEngine.js`, `scoring.js`, `readout.js`, `gameState.js`, `wcagRules.js` — never a level `index.js` or the registry. A script that fails with `ERR_UNKNOWN_FILE_EXTENSION` is reaching through a component; point it at the pure module instead and report that the task prompt sent it the wrong way.

---

## Data Contracts

The shapes below are shared across layer boundaries. They are defined **here, once**. Task prompts refer to them by name and do not re-describe them.

A shape described in prose in a task prompt is authoritative only for that task and expires when the task ends. Two prompts that each describe the same shape will eventually disagree, and both layers will report success while the pipeline does nothing. If a task prompt describes a shape that contradicts this section, **stop and report**.

Where a contract describes code that already exists, the code is authoritative and any disagreement is a defect in this file — report it. Where a contract is marked **specified, not yet implemented**, this file is authoritative and the code must be built to match it.

### Violation entry

```js
{ ruleId: string, target: string }
```

* `ruleId` — a WCAG criterion number as a string, sourced from `RULE_IDS` in `src/data/wcagRules.js`. Never written as a literal outside that file.
* `target` — an audit target identifier, matching a `data-audit-target` attribute value.

Produced by `saboteurEngine.js`. Consumed by a level's `applySabotage` and by `scoring.js`.

An **array** of violation entries is the round's Truth. An empty array is valid and means a clean round — it is not an error condition and must not be treated as one.

### Guess entry

```js
{ ruleId: string, target: string }
```

Structurally identical to a Violation entry, and deliberately so: comparison is field equality, with no translation step between the two.

Produced by the Inspector. Consumed by `scoring.js` and by the reducer's `addGuess` / `removeGuess`.

**Both** fields must match a violation entry for a true positive. The comparison itself lives in exactly one place — `isSamePair` in `src/engine/scoring.js` — and every other module imports it. Two copies of this rule would eventually disagree about what counts as a match.

### Level module

The single object exported from `src/levels/<level>/index.js`:

```js
{ id, name, Component, auditTargets, sabotageMap, applySabotage }
```

* `id` — string, unique across the registry, matching the level's directory name.
* `name` — string, human-readable level name.
* `Component` — the React component. Renders a fully compliant baseline when given no props.
* `auditTargets` — array. Every element the player can point at. Longer than `sabotageMap`.
* `sabotageMap` — array. The (rule, target) pairs this level can break.
* `applySabotage` — pure function. Takes an array of **Violation entries**, returns a **Sabotage props object**.

An **`auditTargets` entry**:

```js
{ id: string, label: string }
```

* `id` — matches a `data-audit-target` attribute value.
* `label` — player-facing text.

A **`sabotageMap` entry** is identical to a Violation entry:

```js
{ ruleId: string, target: string }
```

**The element identifier is called `id` in `auditTargets` and `target` everywhere else.** This is recorded as fact. Code moving between the two translates explicitly and at one visible point. Do not rename either side to match the other.

### Sabotage props object

Returned by a level's `applySabotage`. Spread into the level `Component` over its own defaults.

For `ecommerce-checkout`, a clean round returns:

```js
{ labelMode: 'programmatic', focusStyle: 'visible', removeButtonSize: 'default' }
```

**Key absence is load-bearing.** Three props always carry an explicit value, compliant or otherwise. `imageAlt` behaves differently:

* Rule 1.1.1 not injected — the `imageAlt` key is **omitted entirely**, so the component's own `DEFAULTS` survives the spread and supplies the compliant alt text.
* Rule 1.1.1 injected — the key is **present with the value `undefined`**, which overrides the default and removes the alt text.

`{}` and `{ imageAlt: undefined }` are therefore different instructions, not the same one. Any code inspecting this object must distinguish key presence from value, and any new prop following this pattern must be recorded here.

### Readout object

Returned by `inspectElement(element)` in `src/engine/readout.js`:

```js
{
  tagName: string,
  role: string | null,
  accessibleName: string | null,
  accessibleDescription: string | null,
  width: number,
  height: number,
  attributes: object
}
```

All seven keys are **always present**. A missing value is `null`; the key is never omitted.

* `role` — the explicit role attribute, else an implicit role from a small lookup covering `img`, `button`, `input[type=number]`, `input[type=text]`, `a[href]`, and `h1`–`h6`. Anything outside that lookup reports `null` rather than a guess.
* `width` / `height` — CSS pixels from the element's bounding rectangle, **rounded to one decimal place**.
* `attributes` — a **present-only map** holding only the attributes the element actually carries, so its key set is data about that element, not part of this contract. The seven reportable attributes are `alt`, `aria-label`, `aria-labelledby`, `aria-describedby`, `title`, `type`, `id`. On `ecommerce-checkout` only `alt`, `type`, `id`, and `aria-label` ever appear.

`alt=""` and no `alt` attribute are different states and must remain distinguishable: the first yields `{ alt: '' }`, the second omits the key.

Never test whether a top-level key exists in order to decide whether a value is missing. Read the value and compare it to `null`.

### Focus readout

Returned by `inspectFocus(element)` in `src/engine/readout.js`:

```js
{
  outlineStyle: string,
  outlineWidth: string,
  outlineColor: string,
  boxShadow: string,
  hasVisibleIndicator: boolean
}
```

The first four come straight from `getComputedStyle`. `hasVisibleIndicator` is derived — true when an outline is present with a non-`none` style and non-zero width, or a non-`none` box-shadow exists. It is a factual summary of computed styles, not a verdict.

Call it against `document.activeElement`. Whether `:focus-visible` matches an unfocused element cannot be determined statically, and this function does not attempt it.

### Game state

`src/state/gameState.js` exports `INITIAL_STATE`, `gameReducer`, and six action creators.

```js
{
  levelId: null,
  round: 1,
  totalRounds: 10,
  score: 0,
  status: 'auditing',
  auditMode: false,
  truth: [],
  guesses: [],
  lastResult: null,
  history: []
}
```

* `truth` — array of **Violation entries**. Passed in by `startRound`; the reducer never generates it.
* `guesses` — array of **Guess entries**.
* `status` — one of `'auditing'`, `'reviewing'`, `'gameOver'`.
* `lastResult` — `null`, or the most recent **Round result**.
* `history` — array of **Round result** objects, one per completed round.

Action types are bare camelCase strings, identical to their creator names — no namespace prefix, no `SCREAMING_CASE`:

`startRound` · `toggleAuditMode` · `addGuess` · `removeGuess` · `submitAudit` · `nextRound`

Any new action follows the same convention, and ships its creator and its reducer branch together.

### Round result

Returned by `scoreRound` in `src/engine/scoring.js`, stored in `lastResult` and appended to `history`:

```js
{
  truePositives: [],
  falsePositives: [],
  falseNegatives: [],
  score: number,
  wasCompliant: boolean
}
```

The three arrays hold **Guess entries** for the first two and **Violation entries** for the third. `wasCompliant` records whether the round's Truth was empty.

The review phase's own data structure is still a Pending Decision. This contract describes what scoring already produces, not what the review phase will consume.

### Rule entry

Each entry in `WCAG_RULES` in `src/data/wcagRules.js`:

```js
{
  id: string,
  name: string,
  shortLabel: string,
  description: string,
  principle: string,
  keywords: string[]
}
```

* `id` — the WCAG criterion number, matching a `RULE_IDS` value.
* `name` — the official WCAG criterion name, shown as secondary text.
* `shortLabel` — plain-language, player-facing. The **primary** text in the rule picker.
* `description` — a longer plain-language explanation, for the review phase.
* `principle` — a member of `PRINCIPLES`, never a string literal.
* `keywords` — lowercase search terms for the picker's filter field. Never displayed.

`PRINCIPLES` is a frozen constant exported from the same file, with members `Perceivable`, `Operable`, `Understandable`, and `Robust`. Each entry's `keywords` array is frozen too.

The three text fields have distinct jobs and none substitutes for another: `shortLabel` is what the player scans, `name` is what the standard calls it, `description` is what the review phase explains with.

### Unrecorded contracts

None currently.

**No task may depend on an unrecorded shape.** If a task requires one, stop and report rather than inferring it from surrounding code — an inferred contract that happens to be wrong is the exact failure this section exists to prevent.

---

## STRICT GUARDRAILS (NEVER VIOLATE THESE)

**1. No External APIs.**
The app must be 100% playable completely offline. No CDNs, no remote fonts, no image URLs, no analytics, no network calls of any kind. Use `lucide-react` for icons and locally committed assets for images. Never `placeholder.com`, `picsum.photos`, or similar.

**2. Client-Side Only.**
No backend, no database, no authentication, no SSR, no Next.js server components, no serverless functions. Build output is plain static files deployable to GitHub Pages with zero backend. `vite.config.js` sets `base: '/audit-game/'` to match the repo name — do not remove it.

**3. No Persistence of Any Kind.**
State lives in React memory only. No `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. A page refresh resets the session — this is intended, not a bug to fix.

**4. Sabotage Flows Through Props.**
Violations are applied by passing variant props down from the engine. Never inject or remove a violation by mutating the DOM (`setAttribute`, `element.style`, `classList`). React owns the DOM; anything mutated imperatively is silently restored on the next render.

**5. Reading the DOM Is Allowed; Mutating It Is Not.**
The Inspector computes its readout from the rendered elements — `getComputedStyle`, `getBoundingClientRect`, attribute lookups, accessible name computation. This is required, because a readout derived from game state would agree with the sabotage layer even when the sabotage layer is broken. Read freely. Never write.

The sole sanctioned exception is `document.getElementById('root')` in `main.jsx`, which React requires to mount.

**6. Never Auto-Correct Injected Violations.**
Code producing an accessibility violation via a variant prop is intentional. Do not fix it, do not comment on it, do not "improve" it while editing nearby lines, and do not refactor it toward compliance. If oxlint's jsx-a11y rules flag these paths, add a narrowly scoped disable comment and report it — never change behaviour to satisfy a linter.

**7. Audit Mode Intercepts, It Does Not Rewrite.**
When Audit Mode suppresses link navigation or form submission, do it with React event handlers and `preventDefault()`. Never strip `href`, swap a `<button>` for a `<div>`, add `disabled`, or unmount elements. Altering the markup would change the exact accessibility properties the player is being asked to judge.

**8. Step-by-Step Execution.**
Do not build ahead. If asked to build a button, build only that button. Do not invent game loops, menus, routing, animations, or extra features unless explicitly instructed. If a task's scope is ambiguous, ask rather than resolving it silently.

---

## Accessibility Standards

**Scope:** the game's own chrome — HUD, Inspector, buttons, modals, review overlay — is **always** fully WCAG 2.2 AA compliant. Only the level component inside the canvas is ever degraded, and only through variant props.

All baseline code must strictly adhere to WCAG 2.2 AA:

* Semantic HTML (`<button>`, `<input>`, `<label>`, correct heading levels — never a clickable `<div>`).
* Visible, high-contrast focus indicators on every interactive element, via explicit Tailwind `focus-visible:` utilities. Never rely on browser defaults; never emit `outline: none` without a visible replacement.
* Accessible names for all icon-only buttons.
* Text contrast at least 4.5:1.
* Interactive targets at least 24×24 CSS pixels; 44×44 preferred. Pad the control — don't just resize the glyph.
* `useId()` for all form element ids. Hardcoded ids break label association when a component renders twice.
* Complete Tailwind class strings in lookup maps. Tailwind scans source text, so `` `h-${size}` `` generates no CSS.

### Phase 1 Violation Set

| Rule | Target | Failure mode |
| :--- | :--- | :--- |
| **1.1.1** Non-text Content | `product-image` | Image has no accessible description. |
| **3.3.2** Labels or Instructions | `quantity-input` | Visible label text is not programmatically associated. |
| **2.4.7** Focus Visible | `add-to-cart` | Keyboard focus indicator is absent. |
| **2.5.8** Target Size (Minimum) | `remove-item` | Touch target is 16px, below the 24px minimum. |

### Audit Targets

Six elements carry `data-audit-target`. The last two are decoys — always compliant, always flaggable.

`product-image` · `quantity-input` · `add-to-cart` · `remove-item` · `quantity-decrease` · `quantity-increase`

The attribute is a neutral identifier. It never indicates whether an element is currently broken.

---

## Settled Decisions

Recorded here so they are not re-litigated. Full reasoning is in `docs/decisions.md`.

* **Guesses are (element + rule) pairs.** Both must match for a true positive.
* **Scoring:** +1 per true positive, −1 per false positive, −1 per false negative. A correct empty submission on a clean round scores +1. Round scores may go negative and are not clamped. Values are provisional and defined as named constants for tuning.
* **No "Declare Compliant" control.** Submit means "I have logged every violation I found." An empty log is a valid answer, guarded by a confirmation step.
* **Audit Mode starts off** each round, so the player can use the component normally first.
* **Audit Mode off means no visible game.** Before Audit Mode is enabled the page looks like an ordinary website — no Inspector, no overlays, no annotations over the card.
* **The Inspector reports facts, not verdicts.** It shows role, accessible name, dimensions, and focus styles in neutral styling. Empty values are never coloured, iconed, or flagged. The absence is the signal; noticing it is the skill.
* **Element selection is list-primary.** The player selects from a list of the level's audit targets. Canvas clicking also works, via one delegated handler using `closest('[data-audit-target]')`, so the level component stays unaware the game exists.
* **The selection highlight is a separate positioned overlay**, sized from the element's bounding rectangle. It is never drawn as a style on the audited element — `outline`, `border`, and `background` are each either an audited property or affect measured target size.
* **The Inspector's target list uses visually hidden native radio inputs**, inheriting arrow-key navigation and position announcements rather than reimplementing them.
* **Rules are presented in plain language.** `shortLabel` is primary text, criterion number and official name secondary. See the Rule entry contract.
* **The rule picker is a filter field above an always-visible radio group**, not a searchable dropdown. Rules are never filtered by the selected element.
* **Rule data carries `principle`** as an explicit field from the start, alongside a frozen `PRINCIPLES` constant, even though nothing renders groups yet.
* **The quantity control is a custom stepper**, not a bare native number input. Native spinner arrows fall under 2.5.8's user-agent exception and would create unfair false positives.
* **No test framework.** Verification uses throwaway Node scripts, deleted before commit.

## Terminology

* **Truth** — the violations the Saboteur actually injected this round.
* **Guesses** — what the player has logged.
* **True Positive / False Positive / False Negative** — the three scoring outcomes.
* **Baseline** — a level component rendered with no props.
* **Target** — the component currently in the center canvas.
* **Pure module** — a module that transitively imports no `.jsx`, and therefore loads under plain `node`.
* Rule IDs are WCAG numbers as strings: `"1.1.1"`, `"3.3.2"`, `"2.4.7"`, `"2.5.8"`. They appear as literals **only** in `src/data/wcagRules.js`; everything else imports `RULE_IDS`.

## Workflow & Verification

* Quote this file's version line at the top of every task report.
* Before declaring done: `npm run dev` clean, `npm run build` succeeds, `npm run preview` works at the base path.
* When verifying against a running server, confirm the port it actually bound to. A stale process from an earlier session can hold the default port and serve an old build, producing a pass against the wrong artifact.
* Verify visually and behaviourally, not just by config. State how you verified each claim.
* Report deviations and why, rather than deviating silently.
* Conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`. These bind your commits. Commits made directly by the repository owner may not carry them, and that is not a discrepancy to report.
* Never add a dependency, change the build target, or alter the file structure without asking.
* Do not create test-framework config, CI workflows, or deployment automation unless a task asks for it.

### Report Format

Reports are **exceptions-first**.

* One terse line of confirmation per checklist item. "Done" is sufficient for an item that went as specified.
* Expand only for: deviations from the prompt, figures the prompt explicitly asked to see, and failures.
* Where a prompt asks for real output — counts, printed objects, command results — paste the actual output. Do not describe it or summarise it as "works as expected."
* A long report about a task that went cleanly is a defect in the report, not evidence of thoroughness.

### Sampling Randomised Behaviour

Sabotage is random per page load. A single observation of a rendered level describes one round, not the level. Any claim about what a level "always" or "never" does must be drawn from repeated loads, and the report states how many.

## Pending Decisions — Ask, Don't Assume

Genuinely unsettled. This list is authoritative; `docs/decisions.md` points here rather than maintaining its own copy. If a task requires one of these, stop and ask:

* **Review phase data structure.** Outline plus badge with an explanatory panel on hover is agreed; the data structure behind it is not. `scoreRound` already produces and retains false-positive data, but whether the review **explains** false positives — including exempt cases such as the user-agent spinner exception — is open.
* **End-of-session report contents** beyond "what the player missed." The mechanism exists — `history` accumulates every round and `nextRound` reaches `gameOver` — but the contents are undefined.
* **Rule list scope.** Whether the rule picker eventually lists every WCAG 2.2 AA success criterion, or only those introduced so far. `WCAG_RULES` currently holds only the four Phase 1 criteria; that is the current state, not a decision.
* **Grouping threshold.** The rule count at which the picker switches from a flat list to `<fieldset>`/`<legend>` groups by principle, and at which the filter field appears.