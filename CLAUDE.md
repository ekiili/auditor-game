> **CLAUDE.md — v20 (2026-08-03)**
> This file is maintained by the Planner. Do not edit, append to, or
> reorganize it. If you find it incomplete, ambiguous, or contradicted by
> your task prompt, do not resolve the conflict yourself — report the
> discrepancy and stop. Begin every task report by quoting this version line.
> If a copy of this file appears in your session context, ignore it and read
> the file on disk. The injected copy has been stale before.

# Auditor — Developer Instructions

## Project Overview

You are building **Auditor**, a purely client-side React SPA (Vite + Tailwind CSS). It is an accessibility training game: a perfect WCAG 2.2 AA baseline component is deliberately "sabotaged" with accessibility violations, and the player must find them.

Target standard: **WCAG 2.2 Level AA** (the European Accessibility Act baseline).

Phase 1 covers a single level — an E-commerce Checkout Card — and four violations. The architecture assumes more levels will follow.

The full product specification is at `docs/prd.md`. Where the PRD and this file disagree, this file wins.

The project was called Audit Game until 2026-08-03. Older commits, `docs/decisions.md` entries and the PRD may still use that name; that is history, not a discrepancy to report. Anything player-facing says Auditor.

## Core Tech Stack

* **Vite + React** (functional components, hooks)
* **JavaScript / JSX** — not TypeScript. The repo carries no TypeScript surface at all: no `.ts`, no `.d.ts`, no `tsconfig`, and no type packages. Do not reintroduce any of these.
* **Tailwind CSS v4**, CSS-first configuration. There is no `tailwind.config.js`; v4 auto-detects sources. Theme customization, if ever needed, goes in an `@theme` block in `src/index.css`.
* **`lucide-react`** — local SVG icons
* **`dom-accessibility-api`** — spec-correct accessible name computation for the Inspector (approved 2026-07-29)
* **Fredoka**, weight 700, latin subset — committed to the repo at `src/assets/fonts/`, used for the wordmark only. See **The committed font** below.
* **oxlint** — the linter in this repo. It is not ESLint; rule names differ. Enabled plugins are `react` and `oxc`; `jsx-a11y` is not enabled.

Build machinery pulled in by the above — `@vitejs/plugin-react`, `postcss`, `@tailwindcss/postcss`, `autoprefixer` — is expected and not a deviation.

**Tailwind v4 emits only the theme variables its own utilities use.** A palette colour referenced from anywhere Tailwind does not itself compile — hand-written CSS, a generated `<style>` element — resolves to nothing, silently, with no build error and no console warning. Any palette value needed outside a utility class must be pinned explicitly in `src/index.css`. This has already cost one debugging cycle, and the wordmark's outline colour is one of the values it applies to.

Do not add dependencies beyond these without asking.

### The committed font

The font file and its SIL Open Font License are committed at `src/assets/fonts/`. Nothing is ever fetched from Google Fonts or any other host — see Guardrail 1.

**The `@font-face` declaration lives in `src/index.css`, with its `url()` relative to that file.** This is not a stylistic choice. A declaration placed in a stylesheet beside the font and pulled in with a plain `@import` builds without error and produces a broken page: Vite rebases `url()` against the stylesheet it is compiling, does not follow the `@import` when doing so, emits no asset, and the runtime request 404s. The build's only warning describes the path as resolving at runtime, which it does not.

**`font-display: swap`.** The wordmark is text and must never be invisible, which rules out `block`; it must always end up in Fredoka, which rules out `optional`, where the browser may abandon the face for the life of the page. The brief flash of the fallback on a cold cache costs nothing here: the fallback measures within half a pixel of Fredoka at the size used, and the level name is centred against the strip rather than against the wordmark, so nothing moves when the swap lands.

**Do not inline the font as a data URI.** It was inlined once, in response to a task prompt that over-stated Guardrail 1, and the arrangement cost separate caching and added a regeneration step. A same-origin request for a file the repo ships is not a guardrail violation.

---

## Architecture: The Three Layers

This project has one architectural rule that everything else serves: **the code that renders a component and the code that decides to break it must never live in the same file.**

If sabotage decisions leak into a component, a future editing session will "helpfully" repair the injected bugs and the game silently stops working.

```
Layer 1 — TRUTH         src/engine/saboteurEngine.js
                        Rolls the dice. Owns the compliant/broken split:
                        COMPLIANT_CHANCE = 0.05, so 5% of rounds are clean
                        and 95% carry at least one violation.
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

**Phase 1 — the complete `ecommerce-checkout` contract:**

| Rule | Audit target | Prop | Compliant (default) | Variant | Failure mode |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1.1.1** Non-text Content | `product-image` | `imageAlt` | descriptive string | `undefined` | Image has no accessible description. |
| **3.3.2** Labels or Instructions | `quantity-input` | `labelMode` | `'programmatic'` | `'visual-only'` | Visible label text is not programmatically associated. |
| **2.4.7** Focus Visible | `add-to-cart` | `focusStyle` | `'visible'` | `'none'` | Keyboard focus indicator is absent. |
| **2.5.8** Target Size (Minimum) | `remove-item` | `removeButtonSize` | `'default'` | `'compact'` | Touch target is 16px, below the 24px minimum. |

This table maps rules to sabotage. It is not the whole prop surface of the level component — see **Level component props outside sabotage** in Data Contracts.

### Levels

Each level is a self-contained directory exporting one object from its `index.js`. Its fields are defined by the **Level module** contract below.

`auditTargets` and `sabotageMap` are deliberately different lengths. The player may guess any target × any rule combination; only pairs in `sabotageMap` are ever injected. **Never derive the player's options from `sabotageMap`** — that hands over the answer key. The quantity stepper buttons are permanent decoys.

`src/levels/index.js` is a registry array. Nothing imports a level by name; consumers iterate the registry.

**A level's `name` is displayed in the top strip and is capped in width there.** A long name truncates rather than colliding with the strip's other contents. Keep new level names short enough to read whole.

### File Structure

```
start-dev.cmd                      double-click launcher — dev server
start-preview.cmd                  double-click launcher — production preview
docs/
├─ prd.md                          product specification
└─ decisions.md                    architecture decision record
src/
├─ main.jsx
├─ App.jsx
├─ index.css                       includes the @font-face declaration
├─ assets/
│  └─ fonts/                       committed .woff2 and its OFL licence
├─ components/                     shared, level-agnostic UI
│  ├─ TopStrip.jsx
│  ├─ AuditModeToggle.jsx
│  ├─ TargetList.jsx
│  ├─ SelectionOverlay.jsx
│  ├─ ReadoutPanel.jsx
│  ├─ RulePicker.jsx
│  ├─ GuessLog.jsx
│  ├─ FindingsList.jsx
│  ├─ ReviewMarks.jsx
│  └─ SessionReport.jsx
├─ data/
│  └─ wcagRules.js                 static rule data only — no logic
├─ engine/
│  ├─ saboteurEngine.js            violation selection
│  ├─ scoring.js                   guess comparison
│  ├─ readout.js                   live-DOM inspection — read-only
│  └─ review.js                    outcome derivation for the review
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

The strip's own panels may live in files of their own alongside `TopStrip.jsx`; if the tree above is incomplete, report it rather than reorganizing the code to match.

`src/components/` is for UI shared across all levels. Level-specific components never go there.

**The two launchers wrap the existing npm scripts and add no build behaviour of their own.** They exist so the app can be started by double-click rather than from a terminal. They must not acquire logic: the production bundle they serve is byte-identical to a plain `npm run build`, and any change that would break that equality belongs in the build config instead.

### Import Conventions

* Relative imports inside `src/` carry an **explicit file extension**: `./scoring.js`, never `./scoring`.
* Directory imports are written **to the file**: `../levels/index.js`, never `../levels`.
* Bare package imports are unaffected: `react`, `lucide-react`, `dom-accessibility-api`.

Vite resolves the extensionless and directory forms by convention; native Node does not.

A **pure module** is one that transitively imports no `.jsx`. Every pure module must stay importable by plain `node`, because verification in this project runs under plain `node`.

Modules that reach JSX are outside that rule. The level `index.js` files are permanently among them by construction: the Level module contract requires a `Component`, and `node` cannot parse `.jsx` at all. This is a property of the architecture, not a defect, and must not be "fixed."

**A verification script imports the pure module it needs directly** — `sabotage.js`, `variants.js`, `saboteurEngine.js`, `scoring.js`, `readout.js`, `review.js`, `gameState.js`, `wcagRules.js` — never a level `index.js` or the registry. A script that fails with `ERR_UNKNOWN_FILE_EXTENSION` is reaching through a component; point it at the pure module instead and report that the task prompt sent it the wrong way.

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
* `name` — string, human-readable level name. Displayed in the top strip.
* `Component` — the React component. Renders a fully compliant baseline when given no props.
* `auditTargets` — array. Every element the player can point at, including ones that are never broken.
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

### Level component props outside sabotage

A level `Component` may receive props that describe a rendering variant without corresponding to any rule. These are **not** produced by `applySabotage` and never appear in the Variant Props table.

For `ecommerce-checkout`:

```js
{ interactive: boolean }   // default: true
```

* `interactive` — when `false`, the component's own controls are removed from the tab order. It is a rendering variant in neutral language and states nothing about correctness, compliance, or bugs. The component is not told why it is being asked.

The game sets it `false` while `status` is `'reviewing'`, and never otherwise. At `'gameOver'` the component is not rendered at all, so the prop does not arise there.

**Any future prop of this kind is recorded here before it is built.** A prop that crosses into a level component and is not in the Variant Props table has no other home, and an unrecorded one is indistinguishable from game logic leaking into the presentation layer.

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

`src/state/gameState.js` exports `INITIAL_STATE`, `gameReducer`, and nine action creators.

```js
{
  levelId: null,
  round: 1,
  totalRounds: 10,
  score: 0,
  status: 'auditing',
  auditMode: false,
  selectedTarget: null,
  selectedRule: null,
  truth: [],
  guesses: [],
  lastResult: null,
  lastSnapshot: null,
  history: []
}
```

* `truth` — array of **Violation entries**. Passed in by `startRound`; the reducer never generates it.
* `guesses` — array of **Guess entries**.
* `status` — one of `'auditing'`, `'reviewing'`, `'gameOver'`.
* `selectedTarget` — an `auditTargets` entry's `id`, or `null`. Cleared by `selectTarget(null)`, by `toggleAuditMode` when it turns Audit Mode off, by `startRound`, by `submitAudit`, and by `nextRound`. Turning Audit Mode on selects nothing. **Survives `addGuess`**, since the player often logs more than one rule against the same element.
* `selectedRule` — a `RULE_IDS` value, or `null`. Cleared by `toggleAuditMode` when it turns Audit Mode off, by `startRound`, by `submitAudit`, by `nextRound`, and **additionally by a successful `addGuess`**, so the next log is a deliberate choice rather than a leftover one. A rejected duplicate `addGuess` leaves it in place. **`selectTarget(null)` does not clear it** — the two fields diverge on exactly that one path, which is recorded here as fact rather than tidied away.

`submitAudit` clears both because the review opens immediately afterwards. A surviving selection would emphasise an element on the card as though the player had chosen a finding they never touched.
* `lastResult` — `null`, or the most recent **Round result**.
* `lastSnapshot` — `null`, or the most recent **Round snapshot**. Set by `submitAudit` from its payload and cleared by `nextRound`. The reducer stores what it is given and derives nothing, exactly as it does with `truth`. Snapshots are never appended to `history`.
* `history` — array of **Round result** objects, one per completed round.

### Action creators

Action types are bare camelCase strings, identical to their creator names — no namespace prefix, no `SCREAMING_CASE`:

`startRound` · `toggleAuditMode` · `selectTarget` · `selectRule` · `addGuess` · `removeGuess` · `submitAudit` · `nextRound` · `restartSession`

Payload shapes are recorded here as literal shapes, not by reference to each other. Reading one creator to work out another's convention is how the two were confused once already.

| Creator | `action.payload` |
| :--- | :--- |
| `startRound({ levelId, violations })` | `{ levelId, violations }` |
| `submitAudit({ snapshot })` | `{ snapshot }` |
| `nextRound({ violations })` | `{ violations }` |
| `restartSession({ violations })` | `{ violations }` |
| `selectTarget(targetId)` | `targetId` — an `auditTargets` entry's `id`, or `null` |
| `selectRule(ruleId)` | `ruleId` — a `RULE_IDS` value, or `null` |
| `addGuess(guess)` | `guess` — a whole **Guess entry** |
| `removeGuess(guess)` | `guess` — a whole **Guess entry** |
| `toggleAuditMode()` | none — the action is `{ type: 'toggleAuditMode' }` and carries no `payload` key at all |

`restartSession` returns the session to its opening state — round 1, score 0, empty `history`, `status` back to `'auditing'`, Audit Mode off — with the payload's violations as the new round's Truth, and `levelId` preserved. Like `startRound` and `nextRound`, it receives Truth rather than generating it. **It is dispatched from any status**, not only `'gameOver'`; the reducer has never guarded on status, so only the UI routes into it ever needed adding.

**Three payload forms exist and none is being migrated.** A payload carrying more than one value — or one value that may plausibly need a companion later — is an **object with named keys**. A payload carrying a single identifier or a single whole contract shape is that **value, bare**. An action that needs no data omits the `payload` key entirely rather than setting it to `null` or `undefined`.

A new action declares which form it takes, is added to the table above before it is built, and ships its creator and its reducer branch together.

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

This contract describes what scoring produces. The evidence the review explains it with is the **Round snapshot** below.

### Round snapshot

Captured when the player confirms Submit, carried in `submitAudit`'s payload, and stored as `lastSnapshot`.

```js
{
  elements: { [auditTargetId]: Readout object },
  focus:    { [auditTargetId]: Focus readout | null }
}
```

* Both maps hold an entry for **every** audit target in the level — all six on `ecommerce-checkout` — not only the ones the player flagged. A missed violation needs explaining as much as a false alarm does.
* Keys are the audit target identifier: the same string that appears in `data-audit-target`, as `target` in a Violation entry, and as `id` in an `auditTargets` entry.
* `elements` values are read live from the DOM at the moment Submit is confirmed. They are never `null`.
* **Nothing may be overlaying or obstructing the page when the snapshot is read.** Whatever the submit confirmation is at the time, it is dismissed first and the reading is taken afterwards. This ordering is part of the contract, not an implementation detail: anything that blocks page scrolling can reclaim a space-taking scrollbar, narrowing the viewport, and any fluid element then reports a width the player never saw. The rule is about the page being unobstructed, not about any particular confirmation mechanism, and it survives changes to that mechanism.
* `focus` values are accumulated **during** the round as the player moves focus, not read at submission. The submit confirmation may itself take focus, so nothing about the card's focus state can be assumed to survive to that point.
* A `focus` value of `null` means exactly one thing: that element never received focus during the round. It never means "focused but unmeasurable." The key is always present — absence is expressed as `null`, as everywhere else in these contracts.
* **`null` does not distinguish "not focused" from "not focusable."** `product-image` is an `<img>` and never enters the tab order, so its entry is `null` in every round that will ever be played. Anything reading `focus` must establish that an element is focusable at all before treating `null` as something the player failed to do. Telling a player they neglected to keyboard-test an image would teach them something false.
* **Focus moves only as a consequence of a deliberate player action.** Selecting an element is such an action, and selection applies focus, so a reading harvested this way is legitimate evidence of what the player was shown. `readout.js` still never calls `.focus()`; moving focus is the caller's act, never the reader's, and nothing harvests a reading from an element the player never chose. Practical effect: a `focus` entry exists for every focusable element the player selected during the round, and `null` now means the player never selected that element at all.

The snapshot exists because a false alarm is explained by the measurement the player misjudged — "it measured 44 by 44" — and that measurement is gone once the next round renders. A missed violation is explained from the rule's static `description` and needs no snapshot.

### Review marks

Returned by `deriveMarks` in `src/engine/review.js`, consumed by `ReviewMarks.jsx`:

```js
{ [auditTargetId]: { outcome, lineStyle, weight } }
```

* Keys are audit target identifiers, present only for elements that carry an outcome.
* `outcome` — `'missed'`, `'flaggedInError'`, or `'caught'`. The element's overall state under the precedence rule in Settled Decisions.
* `lineStyle` — `'solid'`, `'dashed'`, or `'dotted'`. Sourced from `LINE_STYLES`; never written as a literal elsewhere.
* `weight` — `'normal'` or `'heavy'`. Derived from the dimensions held in the Round snapshot, not measured at review time.

`lineStyle` and `weight` are separate axes and neither is derived from the other. `lineStyle` states the outcome; `weight` states both that an outcome is `caught` and, at render time, whether the finding is selected.

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

**1. Nothing Is Fetched From Outside The Project.**
The app must be 100% playable completely offline. No CDNs, no remote fonts, no image URLs, no analytics, no cross-origin requests of any kind. Use `lucide-react` for icons, locally committed assets for images, and the committed font file for the wordmark. Never `placeholder.com`, `picsum.photos`, Google Fonts, or similar.

**Same-origin requests for files the repo ships are not a violation.** The build emitting a font, a stylesheet or an image and the page requesting it back is ordinary behaviour. A task prompt demanding literally zero requests is over-stating this guardrail — report the over-statement rather than contorting the build to satisfy it.

**2. Client-Side Only.**
No backend, no database, no authentication, no SSR, no Next.js server components, no serverless functions. Build output is plain static files deployable to GitHub Pages with zero backend. `vite.config.js` sets `base: '/audit-game/'` to match the repo name — do not remove it. The repo name still reflects the old project name; the base path is not a discrepancy.

**3. No Persistence of Any Kind.**
State lives in React memory only. No `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. A page refresh resets the session — this is intended, not a bug to fix.

**4. Sabotage Flows Through Props.**
Violations are applied by passing variant props down from the engine. Never inject or remove a violation by mutating the DOM (`setAttribute`, `element.style`, `classList`). React owns the DOM; anything mutated imperatively is silently restored on the next render.

**5. Reading the DOM Is Allowed; Mutating It Is Not.**
The Inspector computes its readout from the rendered elements — `getComputedStyle`, `getBoundingClientRect`, attribute lookups, accessible name computation. This is required, because a readout derived from game state would agree with the sabotage layer even when the sabotage layer is broken. Read freely. Never write.

Two sanctioned exceptions: `document.getElementById('root')` in `main.jsx`, which React requires to mount; and calling `.focus()` on an audit target in response to a deliberate player action, which moves focus without altering the element.

**6. Never Auto-Correct Injected Violations.**
Code producing an accessibility violation via a variant prop is intentional. Do not fix it, do not comment on it, do not "improve" it while editing nearby lines, and do not refactor it toward compliance. If a linter flags these paths, add a narrowly scoped disable comment and report it — never change behaviour to satisfy a linter.

**7. Never Rewrite the Audited Markup.**
The card's accessibility properties are the thing the player is being asked to judge, so nothing outside the level component may alter them. Never strip `href`, swap a `<button>` for a `<div>`, add `disabled`, remove an element from the tab order, or unmount elements.

**Suppress activation only through React event handlers and `preventDefault()`**, never by changing markup — on the rare occasions anything is suppressed at all. The card stays fully operable during `'auditing'`; see **The card stays live during an audit** in Settled Decisions.

**One suppression remains and is load-bearing:** the capture-phase `mousedown` handler on the canvas wrapper, which does not apply to controls that accept typed text. It is recorded under the focus decision below, together with what it costs and why it is exempted where it is. Do not remove it as redundant and do not widen it back over text-entry controls.

**Never suppress focus.** Anything that removes a control from the tab order destroys the thing being audited.

**This guardrail governs the `'auditing'` state.** It exists because the component's focus behaviour is itself under audit. Once the round is scored and `status` is `'reviewing'`, there is nothing left to judge, and focusability is released through the `interactive` prop recorded in Data Contracts.

**8. Step-by-Step Execution.**
Do not build ahead. If asked to build a button, build only that button. Do not invent game loops, menus, routing, animations, or extra features unless explicitly instructed. If a task's scope is ambiguous, ask rather than resolving it silently.

---

## Accessibility Standards

**Scope:** the game's own chrome — the top strip, HUD, Inspector, buttons, submit confirmation, review marks, findings list and end-of-session report — is **always** fully WCAG 2.2 AA compliant. Only the level component inside the canvas is ever degraded, and only through variant props.

All baseline code must strictly adhere to WCAG 2.2 AA:

* Semantic HTML (`<button>`, `<input>`, `<label>`, correct heading levels — never a clickable `<div>`).
* Visible, high-contrast focus indicators on every interactive element, via explicit Tailwind `focus-visible:` utilities. Never rely on browser defaults; never emit `outline: none` without a visible replacement.
* Accessible names for all icon-only buttons.
* Text contrast at least 4.5:1 — **in every interactive state and every combination of them**: rest, hover, selected, selected-and-hovered, expanded, expanded-and-hovered, and focus-visible. Foreground and background are set together or not at all, and this fails in both directions: a hover background arriving underneath a selected state's white text is the same bug as a hover text colour arriving over a resting background. Where two state variants carry equal specificity, source order decides which wins, so a combined state needs a variant of its own rather than relying on either half. Fix these by expressing the combination, never with `!important` or an invented specificity bump.
* Interactive targets at least 24×24 CSS pixels; 44×44 preferred, and 44×44 is what the chrome's controls actually use. Pad the control — don't just resize the glyph.
* `useId()` for all form element ids. Hardcoded ids break label association when a component renders twice.
* Complete Tailwind class strings in lookup maps. Tailwind scans source text, so `` `h-${size}` `` generates no CSS.

**The wordmark is the one exception, and it is exempt rather than excused.** Its white fill sits on a white strip at 1:1, which the standard permits because a logotype is not held to the text contrast requirement. What carries the letterforms is the outline, measured at 8.09:1. Nothing else in the chrome may borrow this exemption.

`jsx-a11y` is not enabled in this repo's linter, so none of the above is machine-checked. It is verified by reading and by behavioural testing only.

### Phase 1 Audit Targets

Six elements carry `data-audit-target`. The four that can be broken are in the Variant Props table above; the last two are decoys — always compliant, always flaggable.

`product-image` · `quantity-input` · `add-to-cart` · `remove-item` · `quantity-decrease` · `quantity-increase`

The attribute is a neutral identifier. It never indicates whether an element is currently broken.

---

## Settled Decisions

Recorded here so they are not re-litigated. Full reasoning is in `docs/decisions.md`.

A decision that has a **shape** belongs in Data Contracts, not here. This section holds only choices with no shape — behaviour, policy, and rationale.

* **Scoring:** +1 per true positive, −1 per false positive, −1 per false negative. A correct empty submission on a clean round scores +1. Round scores may go negative and are not clamped. Values are provisional and defined as named constants for tuning.
* **No "Declare Compliant" control.** Submit means "I have logged every violation I found." An empty log is a valid answer, guarded by a confirmation step.
* **The submit confirmation is an inline panel, not a modal.** It sits inside the tools region, directly beneath the Submit control. It does not overlay or tint the page, does not block interaction elsewhere, and participates in normal layout with no stacking of its own. Because it is not a dialog, the browser supplies none of the behaviour a dialog would: moving focus into the panel when it opens, dismissal on Escape, and returning focus to the Submit control on cancel are each built deliberately. Losing them would trade a visual complaint for an accessibility failure, in the one project that cannot afford one.
  * **Its placement outside the card's column is load-bearing, not cosmetic.** The card lives in a column of its own, and no column's width or height responds to another's contents, so nothing added inside the tools region can move the card. Had the panel been placed near the card, opening it would shift the element geometry captured at submission — and that geometry is the evidence the review explains false alarms with. Any later relocation must preserve this property.
  * The confirming control is not named the same as the control that opens the panel. Two identically named buttons in the document at once are a puzzle for anyone listing controls by name.
* **Audit Mode starts off** each round, so the player can use the component normally first.
* **The card stays live during an audit.** The component under audit remains fully operable while Audit Mode is on. The previous suppression of Enter and Space was incomplete — arrow keys and typing still changed the quantity — and completing it would have meant enumerating every route by which a control can be operated, a list that grows with every component added. Nothing consequential happens when the card is operated: the quantity counter is the only functioning control and the ✕ closes nothing. Operating a control is also part of how a real audit is conducted. This does not weaken Guardrail 7, which governs how anything would be suppressed if it ever were.
* **The game is fully playable with a mouse alone.** It is a point-and-click game, and every check the player is asked to make must be reachable without the keyboard. A player who never presses Tab must be able to complete a round and evaluate all four criteria. Keyboard operation remains fully supported; neither input method is the fallback.
* **Selecting an element applies real keyboard focus to it.** Both selection routes — the target list and clicking the card — move focus onto the target. There is no separate control for this and no player action beyond selecting: every other reading in the Inspector is presented on selection, and requiring an extra click for this one made 2.4.7 the only criterion the player had to request. The focus moved is real, so the reading it produces is honest.
  * **The call passes the `focusVisible` option, and that option is not optional.** Moving focus without it suppresses the state the browser uses to decide whether to draw an indicator, so a compliant element reports as failing. Verified against Chromium, WebKit and Firefox: the naive call fails on all three and the option matches real keyboard navigation on all three, on every focusable target and both `add-to-cart` variants. This is interoperable behaviour, not one engine's quirk. A refactor that drops the option silently reintroduces false failures everywhere, with no error and no visual clue.
  * **Do not defer the call out of the click dispatch.** It looks like it should help and fails identically on all three engines.
  * **The canvas route requires pointer-driven focus to be suppressed first.** The browser focuses a control on `mousedown`, before any click handler runs, and marks that focus pointer-driven; the later `focusVisible` call is then a no-op on an already-focused element, and a compliant control reports as failing on the card route while reading correctly from the list. A capture-phase `mousedown` handler on the canvas wrapper calling `preventDefault()` prevents this. Measured: without it, only the canvas route breaks, and only there.
    * **The suppression does not apply to controls that accept typed text, and this exemption is not optional either.** The browser's default `mousedown` handling places the text caret as well as moving focus, so suppressing it pins the caret to the end of the value: a player clicking into the middle of a number and typing corrects the wrong digit, with no visible cause. Measured both ways — with the suppression applied, all six click positions typed at the end; with text-entry controls exempted, the caret follows the pointer exactly as it does with Audit Mode off.
    * **The exemption is sound because it costs nothing.** A control that accepts typed text always matches `:focus-visible` however focus arrives, so leaving the browser's own pointer focus in place there changes no reading — measured directly, Tab and pointer readings identical down to the outline colour, in both a compliant round and one with 3.3.2 injected on that field. This is the same fact as **Do not validate this on `quantity-input`** below, seen from the other side.
    * **The exemption is a predicate over the element, never a check for a target id.** A rule written around one element is wrong the first time a level contains a second field.
  * **Do not validate this on `quantity-input`.** Elements that take keyboard input always match the focus-visible state, so the text field passes on every route on every engine and proves nothing. The four buttons are the evidence.
  * **On an element that can never receive focus, the Inspector says so.** `product-image` is an `<img>` and is not focusable in any engine. The panel states that rather than showing an empty reading: a stated reason teaches that not everything is meant to be focusable, while silence teaches nothing.
  * Real Safari on macOS and iOS is untested and that gap is accepted. The WebKit engine result stands in for it.
* **Element-fact predicates live in `readout.js`** — currently `isKeyboardFocusable` and `isTextEntry`. Both the Inspector and the review need the same facts, and the Inspector must not import from the review phase, which would point the dependency backwards. `isTextEntry` takes a live element rather than a Readout object, because its caller runs during a `mousedown` when no readout exists yet. It is written as a deny-list of non-text input types rather than an allow-list of text ones: the DOM normalises unknown and absent types to `text`, so an allow-list would silently misclassify any input type HTML gains in future, and a deny-list will not.
* **Audit Mode off means no visible game.** Before Audit Mode is enabled the page below the strip looks like an ordinary website — no Inspector, no overlays, no annotations over the card. The target list, overlay, readout panel, rule picker and guess log are absent from the DOM, not hidden. The top strip is not covered by this: it sits outside the canvas and puts nothing over the card, so the audited component still presents itself untouched.
* **A strip runs across the top of the screen in every status.** It carries, left to right: the Auditor wordmark, the level name, where the player is in the session with the running score, a "how to play" control, and Restart. It is the game's chrome, not the audited page's.
  * **Its height is fixed, not derived from its contents.** Nothing in it — no score, level name, round number, wordmark or open panel — may deepen it. The columns below fill the viewport height minus the strip, and the game does not scroll, so a strip that grew with its contents would move the card.
  * **The level name is centred against the strip's full width**, not against the space left between the wordmark and the controls, which would drift every time either of those changed size. At narrow widths this forces the session figures onto two lines so the centred name has room; the strip's fixed height already had the vertical room, so this costs nothing. A long level name truncates rather than colliding.
  * **The strip's panels are positioned out of the layout flow**, anchored to the strip, and clipped by the root wrapper's existing overflow. They occupy no layout space, so opening one cannot move the card — which is the whole answer to that constraint, and is stronger than being careful about heights. They add no backdrop, no tint, no scroll lock, and block nothing. At narrow widths a panel may overlap part of the card; that is ordinary popover occlusion and the card does not move.
  * **The page's single `h1` is the visible wordmark**, replacing the earlier visually hidden heading. Two elements both reading "Auditor" would announce it twice.
  * **The wordmark is white text with a 6px outline at 36px, in Fredoka.** 6px was chosen deliberately, after the owner compared everything from 2px to 16px. It is past the point where the counters of the A, d and o stay open — they are solid at this weight, and the mark reads as purple lettering with a white seam rather than white lettering with a purple outline. That is the intended look. Thinner is hard to see; thicker produces an artifact inside the o. Do not adjust it as a tidy-up.
* **Restart is available in every status, not only at game over.** A run is something a player can abandon: someone attempting a flawless run wants to start over the moment a round goes wrong, and making them play out the remaining rounds obstructs the thing the game teaches. It is guarded by an inline confirmation carrying the same hand-built obligations as the submit confirmation — focus moves in, Escape dismisses, cancel returns focus to the control that opened it.
  * **Two restart controls exist at `'gameOver'` and that is deliberate.** The end-of-session report keeps its own. They carry different names — **Restart** in the strip, **Start a new run** on the report — so that a player listing the page's controls by name is not shown the same one twice.
* **The "how to play" panel explains the game to someone who has never seen it.** It also closes on Escape and returns focus to its own control: a panel that visually covers other content and cannot be dismissed from the keyboard is a defect regardless of whether a task prompt asked for that behaviour.
* **The game never scrolls the page.** Every column is constrained to the viewport height, less the strip, and scrolls internally within its own container. The audited component is visible at every moment of the round, because the game's core act is comparing what the element looks like against what the Inspector reports about it, and that comparison cannot survive a scroll. Two consequences are load-bearing and must survive any later refactor:
  * **Every scrolling column carries `position: relative`.** The `sr-only` helpers are `position: absolute` with no offsets, so without a positioned ancestor they resolve against the initial containing block, escape their column's `overflow`, and grow the document past the viewport — two 1px elements are enough to defeat the whole decision. Any new scroll container needs the same treatment. `position: relative` is safe here: it does not create a containing block for `position: fixed` and so cannot capture the selection overlay, where `transform`, `filter`, `perspective` and `contain` would.
  * **The selection overlay's capture-phase scroll listeners stay.** The card still moves when its own column scrolls on a short viewport, so the tracking is doing real work and is not redundant.
* **The wide layout is three regions side by side: the card, the audit target list, and everything else.** At `lg` and above the tools do not share one column. The target list stands alone; the Inspector, rule picker, guess log, Submit control and submit confirmation occupy a second. Selecting a target and reading what the Inspector reports about it is the game's core act, and in a single scrolling column that act meant scrolling between the two. A third tools column was considered and rejected as the larger change.
  * **The card is centred horizontally in its own column, which is the only fluid region.** Both tools columns carry fixed widths, and the wrapper around them is pinned to their sum in every status. This is the mechanism upholding the constraint above, not a styling preference: the card's column can change width only if a tools column does, and neither responds to its contents. It also means the review — one column occupying the space two held — leaves the card exactly where the audit left it, at the moment the player is asked to compare the marks against what they just audited. A tools region that shrink-wrapped its own content would slide the card sideways there.
  * **Below `lg` everything stacks in a single scrolling column, exactly as it did before the split.** This is a decision, not an omission: the game targets a reasonably wide window. The two sub-columns generate no boxes at that width, so the panels remain direct children of the same column and the narrow layout is unchanged rather than approximately preserved — which is also what keeps the `sr-only` helpers inside a positioned ancestor there. Do not introduce a narrow-screen split, a fixed-height tools region, or any other new treatment below `lg` without asking.
* **Interception is capture-phase**, on a sizing-only wrapper around the level component. A bubble-phase handler runs after the card's own handler has already fired. The wrapper adds no padding, margin, border, or transform — a transform would create a containing block and move the overlay.
* **The Inspector reports facts, not verdicts.** It shows role, accessible name, dimensions, and focus styles in neutral styling. Empty values are never coloured, iconed, or flagged. The absence is the signal; noticing it is the skill.
* **Element selection is list-primary.** The player selects from a list of the level's audit targets. Canvas clicking also works, via one delegated handler using `closest('[data-audit-target]')`, so the level component stays unaware the game exists.
* **The selection highlight is a separate positioned overlay**, sized to exactly the element's bounding rectangle. The visible ring is an `outline` with `outline-offset` on the overlay, which reads as surrounding the element without changing any measured rectangle. While the round is being audited it is never drawn as a style on the audited element — `outline`, `border`, and `background` are each either an audited property or affect measured target size. The review marks below are the one sanctioned exception: they are applied after the snapshot has been captured and after the component has stopped being audited, and they must still not affect layout.
* **The Inspector's target list uses visually hidden native radio inputs**, inside a `<fieldset>` with a visible `<legend>`, inheriting arrow-key navigation and position announcements rather than reimplementing them. Visually hidden means `sr-only` — never `display:none`, `hidden`, or `aria-hidden`.
* **The Inspector describes the element the player most recently moved to**, however they reached it — the target list, a canvas click, or Tab. There is no separate selected element and focused element.
* **The selection highlight is not rendered while the current element matches `:focus-visible`**, so the player sees that element's own focus styling or its absence. Since selection applies focus, this retires the overlay for every focusable target: `product-image` is the only element that still draws one. The consequence is deliberate — on the sabotaged `add-to-cart` the card shows nothing at all, because showing something there would disguise the very absence the player is meant to notice. **The player's confirmation of what is selected is the highlighted row in the target list**, which is present throughout the audit. Do not reintroduce a card-side selection ring to compensate.
  * The focus readout is captured when the element receives focus and retained until the current element changes, so moving focus away to read the panel does not empty it.
* **No live region in the Inspector.** The panel changes on every Tab, and announcing each change would talk over the target list's own announcements.
* **The rule picker is an always-visible radio group**, never a searchable dropdown. A filter field appears above it once the rule count justifies one; at four rules there is none.
* **The picker lists rules, not applicable rules.** It is never filtered by the current element, never by `sabotageMap`, never by what could plausibly be wrong. Every rule is offered against every target — twenty-four pairs against a `sabotageMap` of four — and narrowing the list would hand over the answer key.
* **A confirmed submission places focus on the advance control.** The Submit control unmounts in the same commit that reaches `'reviewing'`, so the element a native `<dialog>` would restore focus to no longer exists and focus would fall to the document body. Focus is moved deliberately instead. This is not achieved by adding `tabIndex` to a container.
* **The review explains all three outcomes** — violations the player caught, violations they missed, and things they flagged that were fine. Over-reporting is as damaging as under-reporting in real auditing, and a scoring penalty with no explanation teaches caution rather than judgement.
* **The review is marked on the card and read in the findings list.** Every element carrying an outcome receives a static, non-interactive mark, so the whole result is visible at once. All interaction — selecting a finding, reading its explanation — belongs to the findings list, which is the single authoritative place a result is read. Marks are applied to the elements themselves rather than as positioned overlays, and must not affect layout: the card in review measures identically to the card the player audited.
* **Marks reach the elements as generated styling, not as anything handed to the component.** They are emitted as a `<style>` element carrying rules keyed on `data-audit-target`, scoped by an attribute on the wrapper. The level component receives nothing about them and stays unaware the review exists, exactly as it is unaware of canvas clicks. Do not "simplify" this into props, class names, or per-target enumeration; each of those puts game knowledge inside the presentation layer.
* **The auditing tools unmount when the review opens.** The target list, Inspector, rule picker and guess log are absent during `'reviewing'`. They belong to the act of auditing, which is over, and leaving them above the findings would contradict the findings list being the single authoritative place a result is read.
* **Selecting a finding never draws a second ring.** The selection overlay is not rendered during `'reviewing'`. Selecting an entry intensifies the mark the element already carries, so the element keeps exactly one ring and that ring still states its outcome. Two rings at different offsets and colours read as an accident rather than as emphasis.
  * **Intensification changes weight and nothing else.** The mark thickens; its line style, colour and offset are untouched. The outcome's line style therefore survives selection intact, colour still carries the outcome, and a player who cannot separate the three panel colours can still see which element is selected. Weight is also the one axis that cannot affect layout here.
  * **Weight carries two things at once** — it distinguishes a caught outcome from the other two, and it distinguishes selected from unselected. Both steps must stay legible, including on a caught mark that already starts heavy. Any change to the weight values is checked against both readings, not just one.
  * **The review opens with nothing selected.** `submitAudit` clears the selection precisely so that the element the player happened to be inspecting does not arrive already emphasised.
* **A mark describes an element, not a finding.** A finding is a (rule, target) pair, but a mark is drawn on an element, so a mark reports that element's overall state. Precedence: an unresolved violation outranks everything else, and a flagged-in-error mark appears only when the element was otherwise clean. An element flagged under the wrong rule therefore reads as missed. That is the common case rather than an edge case — recognising something is wrong while naming the wrong criterion is the result the game most needs to teach — and both findings remain in the list, where there is room to explain the distinction.
* **Outcome is carried by line style, never by colour alone.** Missed is dashed; flagged in error is dotted; caught is solid, at every size. Caught is drawn additionally at **double weight**, falling back to normal weight when the element's smaller dimension is under 24 CSS pixels, because a heavy line overwhelms a small target rather than reading as emphasis. Weight is a separate axis from line style and neither substitutes for the other. The threshold is evaluated against the dimensions already held in the Round snapshot, so no measurement is added at review time. Dashed and dotted are close to one another at small sizes and are accepted as such; the findings list remains the authoritative statement of what a mark means.
* **During review the card is inert but not hidden.** Once the round is scored, nothing in the level component is clickable or keyboard-reachable. It remains fully present in the accessibility tree: a player using a screen reader must still be able to work through the component and meet the violations directly, which is the more instructive experience. The HTML `inert` attribute is therefore the wrong mechanism — it removes content from the accessibility tree as well as from the tab order. This is the review-state counterpart to Guardrail 7 and does not weaken it: focusability is preserved throughout `'auditing'`, where it is under audit, and released only in `'reviewing'`, where nothing remains to be judged.
* **Findings are grouped into three sections** — missed, then flagged in error, then caught — each a distinct colour-coded panel mirroring one of the Round result's three arrays. The section heading carries the meaning of its category, so colour is reinforcement rather than the sole carrier and individual entries need no repeated status label. The order puts the instructive content first and the player's successes last. A section with no entries is not rendered at all: a round with nothing missed and nothing flagged in error shows the caught panel alone, filling the column under a "Perfect!" heading. This is the same screen emphasised, not a separate one.
  * **Within a section, a finding's element-and-rule line always reads as stronger than the explanation beneath it**, selected or not, and findings are separated from one another by spacing and a light divider. They are not individual bordered cards. The selection highlight covers the whole finding rather than its top line only — a highlight confined to the top line reads as a header for everything below it, including the next finding.
* **Every entry carries a plain-language summary of its rule**, identical in form across all three sections. Entries flagged in error carry one thing more — the measurement showing the element passed, taken from the Round snapshot — because the rule alone explains the criterion while the measurement explains this particular verdict. One case must not be folded into the general one: where an element can never receive focus at all, the review states that the criterion does not apply, never that the player failed to test it.
* **At game over the card is gone, not inert.** When `status` reaches `'gameOver'` the level component is not rendered at all, and the end-of-session report spans the full width of the layout with no empty column where the card stood. A fully working card beside a summary of a finished session invites an audit that can no longer be logged. This is distinct from `'reviewing'`, where the card stays present because the marks on it are half the result.
* **The end-of-session report reads as a debrief, not a spreadsheet.** It is the last thing the player sees, and a dense grid of round numbers and scores would end the session on the least instructive thing about it. Four decisions follow from that:
  * **One row per round, each expandable** to what was missed and what was wrongly flagged in that round. The detail is available without being imposed on a player who only wants the shape of their session.
  * **"Perfect!" means a flawless submission** — every violation present found, nothing flagged in error — and a correct empty submission on a clean round earns it too. Recognising a clean page is a real skill and is not treated as a lesser result.
  * **The session total sits at the bottom**, after the rounds rather than above them, so the report reads as an account of what happened before it reads as a verdict.
  * **Its own restart control returns to a fresh session** through `restartSession`.
* **The guess log shows what the player logged and nothing else.** No correctness marking, no counts against Truth, no colour or icon distinguishing a real violation from a decoy. It has no access to Truth and must not acquire any.
* **The quantity control is a custom stepper**, not a bare native number input. Native spinner arrows fall under 2.5.8's user-agent exception and would create unfair false positives.
* **No test framework.** Throwaway Node scripts, deleted before commit.

## Terminology

* **Truth** — the violations the Saboteur actually injected this round.
* **Guesses** — what the player has logged.
* **True Positive / False Positive / False Negative** — the three scoring outcomes.
* **Baseline** — a level component rendered with no props.
* **Audit target** — an element the player can point at, identified by its `data-audit-target` value. Called `target` in every contract except `auditTargets`, where the field is named `id`.
* **Run** — one session of ten rounds, ending at `'gameOver'` or at a restart.
* **Pure module** — a module that transitively imports no `.jsx`, and therefore loads under plain `node`.
* Rule IDs are WCAG numbers as strings: `"1.1.1"`, `"3.3.2"`, `"2.4.7"`, `"2.5.8"`. They appear as literals **only** in `src/data/wcagRules.js`; everything else imports `RULE_IDS`.

## Workflow & Verification

* Quote this file's version line at the top of every task report.
* Before declaring done: `npm run dev` clean, `npm run build` succeeds, `npm run preview` works at the base path.
* When verifying against a running server, confirm the port it actually bound to. A stale process from an earlier session can hold the default port and serve an old build, producing a pass against the wrong artifact.
* **Confirm what `HEAD` actually is before comparing against "the previous commit."** The repository owner commits directly and may have landed something on top of your last task. A comparison against the wrong baseline is a silent wrong answer.
* Browser-level verification uses Playwright, resolved from the local npx cache. It is **not** a project dependency and must not be added to `package.json`.
* Verify visually and behaviourally, not just by config. State how you verified each claim.
* **A declaration is not evidence that it took effect.** A font stack, a class string or a computed style may name something the machine never applied. Where a gate turns on something actually resolving, measure the rendered result rather than quoting the source — and where the obvious measurement is weak, say so and bring a second one.
* **A resume instruction scopes the work, never the verification.** If a task is stopped partway and resumed at a particular section, the gate list still applies whole. Gates are removed only by striking them by name.
* **`getBoundingClientRect` is viewport-relative.** Any gate comparing an element's position across two states must compare document-relative position, or report `scrollY` alongside and exclude it from the equality check. A page that scrolls between the two readings will otherwise report every element as moved.
* **A gate whose premise no longer holds is a finding, not a pass.** If the condition a gate was written to test cannot arise in the current build, report that and say why, rather than recording a pass against a situation that cannot occur.
* Report deviations and why, rather than deviating silently.
* Commits are per task, and a task commits only when its prompt says to. Task commits land on `main`. Conventional commit prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`. These bind your commits. Commits made directly by the repository owner may not carry them, and that is not a discrepancy to report.
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

* **Explaining exemptions.** A control excused by the standard — user-agent spinner arrows under 2.5.8, for instance — cannot be explained from a reading, because the exemption is not visible in the DOM. It needs written text per exemption. Phase 1 has none, since the quantity control is custom.
* **Rule list scope.** Whether the rule picker eventually lists every WCAG 2.2 AA success criterion, or only those introduced so far. `WCAG_RULES` currently holds only the four Phase 1 criteria; that is the current state, not a decision.
* **Grouping threshold.** The rule count at which the picker switches from a flat list to `<fieldset>`/`<legend>` groups by principle, and at which the filter field appears.