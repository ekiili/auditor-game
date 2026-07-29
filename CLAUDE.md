> **CLAUDE.md — v2 (2026-07-29)**
> This file is maintained by the Planner. Do not edit, append to, or
> reorganize it. If you find it incomplete, ambiguous, or contradicted by
> your task prompt, do not resolve the conflict yourself — report the
> discrepancy and stop. Begin every task report by quoting this version line.

# Audit Game — Developer Instructions

## Project Overview

You are building **Audit Game**, a purely client-side React SPA (Vite + Tailwind CSS). It is an accessibility training game: a perfect WCAG 2.2 AA baseline component is deliberately "sabotaged" with accessibility violations, and the player must find them.

Target standard: **WCAG 2.2 Level AA** (the European Accessibility Act baseline).

Phase 1 scope is a single target component — an E-commerce Checkout Card — and four specific violations.

## Core Tech Stack

* **Vite + React** (functional components, hooks)
* **JavaScript / JSX** (not TypeScript)
* **Tailwind CSS** for all styling
* **`lucide-react`** for local SVG icons

Verify the Tailwind install steps against whichever major version resolves at install time — the config and PostCSS setup differ between v3 and v4. Do not add dependencies beyond these without asking first.

---

## Architecture: The Three Layers

This project has one architectural rule that everything else serves: **the code that renders the component and the code that decides to break it must never live in the same file.**

If sabotage decisions leak into the component, a future editing session will "helpfully" repair the injected bugs and the game silently stops working.

```
Layer 1 — TRUTH        src/engine/saboteurEngine.js
                       Rolls the dice. Owns the 80/20 compliant/broken split.
                       Outputs an array of WCAG rule IDs. Knows nothing about JSX.

Layer 2 — TRANSLATION  src/engine/sabotageProps.js
                       Pure function: violations[] -> flat props object.
                       The ONLY place where a rule ID meets a component prop.

Layer 3 — PRESENTATION src/components/CheckoutCard.jsx
                       Receives flat, neutral props. Renders them.
                       Never imports from engine/. Never sees a rule ID.
                       Contains no conditionals about "bugs".
```

### The Prop Contract

`CheckoutCard` is a **configurable** component, not a breakable one. Its props describe rendering variants in neutral language. Every prop defaults to the compliant value, so `<CheckoutCard />` rendered bare is a flawless WCAG 2.2 AA component.

| Prop | Compliant (default) | Variant | Corresponds to |
| :--- | :--- | :--- | :--- |
| `imageAlt` | descriptive string | `undefined` | 1.1.1 Non-text Content |
| `labelMode` | `'programmatic'` | `'visual-only'` | 3.3.2 Labels or Instructions |
| `focusStyle` | `'visible'` | `'none'` | 2.4.7 Focus Visible |
| `removeButtonSize` | `'default'` (≥44px hit area) | `'compact'` (16px) | 2.5.8 Target Size (Min) |

Do not rename these props to things like `isBugActive`, `hasAltBug`, or `isBroken`. The neutral naming is deliberate and load-bearing.

### File Structure

```
src/
├─ main.jsx
├─ App.jsx
├─ index.css
├─ assets/               local product image (SVG or committed file)
├─ components/
│  └─ CheckoutCard.jsx   the baseline target component
├─ engine/
│  ├─ saboteurEngine.js  violation selection (the Truth)
│  └─ sabotageProps.js   rule IDs -> component props
├─ state/                game state (rounds, score, guesses)
└─ data/
   └─ wcagRules.js       static rule definitions — data only, no logic
```

`src/data/wcagRules.js` is the single source of truth for rule metadata and feeds both the engine and the player-facing Inspector dropdown.

---

## STRICT GUARDRAILS (NEVER VIOLATE THESE)

**1. No External APIs.**
The app must be 100% playable completely offline. No external CDNs, no remote fonts, no image URLs, no analytics, no network calls of any kind. Use `lucide-react` for icons and a locally committed asset or inline SVG for the product image. Never `placeholder.com`, `picsum.photos`, `unsplash.com`, or similar.

**2. Client-Side Only.**
No backend, no database, no authentication, no SSR, no Next.js server components, no serverless functions. The build output must be plain static files (`index.html` + JS + CSS) deployable to GitHub Pages or Vercel with zero backend.

**3. No Persistence of Any Kind.**
State lives in React memory only. Do not use `localStorage`, `sessionStorage`, `IndexedDB`, or cookies. A page refresh resets the session — this is intended behaviour, not a bug to fix.

**4. The "React Way" for Sabotage.**
Violations are applied by passing variant props down from the engine, per the Prop Contract above. **Never** use vanilla DOM manipulation (`document.getElementById`, `querySelector`, direct `style` or attribute mutation) to inject or remove a violation. If you find yourself reaching for a ref to change markup, stop — the answer is a prop.

**5. Never Auto-Correct Injected Violations.**
Code in `src/engine/` that appears to break accessibility is intentional. Do not fix it, do not add a comment warning about it, do not "improve" it while editing nearby lines, and do not refactor it toward compliance. If `eslint-plugin-jsx-a11y` or any other tool flags these paths, add a narrowly scoped disable comment — never change the behaviour to satisfy the linter.

**6. Audit Mode Intercepts, It Does Not Rewrite.**
When Audit Mode suppresses link navigation or form submission, do it with React event handlers and `preventDefault()`. Never strip `href`, swap a `<button>` for a `<div>`, add `disabled`, or unmount elements. Altering the markup would change the exact accessibility properties the player is being asked to judge.

**7. Step-by-Step Execution.**
Do not build ahead. If asked to build a button, build only that button. Do not invent game loops, menus, routing, animations, or extra features unless explicitly instructed. If a task's scope is ambiguous, ask rather than resolving it silently.

---

## Accessibility Standards

**Scope:** the game's own chrome — the HUD, the Floating Inspector, buttons, modals, the review overlay — is **always** fully WCAG 2.2 AA compliant. Only the target component inside the center canvas is ever degraded, and only through the variant props defined in the Prop Contract.

All baseline code you write must strictly adhere to WCAG 2.2 AA:

* Proper semantic HTML (`<button>`, `<input>`, `<label>`, correct heading levels — never a clickable `<div>`).
* Clear, high-contrast visual focus indicators on every interactive element. Use explicit Tailwind `focus-visible:` utilities; never rely on browser defaults, and never emit `outline: none` without an equally visible replacement.
* Accessible names for all icon-only buttons (`aria-label` or visually hidden text).
* Text contrast of at least 4.5:1 against its background.
* All interactive targets at least 24×24 CSS pixels; aim for 44×44 on primary actions. Pad the button — don't just resize the glyph.
* Logical, complete keyboard operability and tab order.

### Phase 1 Violation Set

The Saboteur will only ever inject these four, and each maps to exactly one element:

| Rule | Element (`data-audit-target`) | Failure mode |
| :--- | :--- | :--- |
| **1.1.1** Non-text Content | `product-image` | Screen reader announces the raw filename. |
| **3.3.2** Labels or Instructions | `quantity-input` | Screen reader announces "edit text, blank". |
| **2.4.7** Focus Visible | `add-to-cart` | Keyboard users can't see focus on Tab. |
| **2.5.8** Target Size (Minimum) | `remove-item` | Touch target is 16px, below the 24px minimum. |

Every auditable element carries a stable `data-audit-target` attribute. This is a neutral identifier for the Inspector to attach guesses to — it never indicates whether that element is currently broken.

---

## Terminology

Use these terms consistently in code and in commit messages:

* **Truth** — the array of rule IDs the Saboteur actually injected this round.
* **Guesses** — the violations the player has logged.
* **True Positive / False Positive / False Negative** — the three scoring outcomes.
* **Baseline Component** — `CheckoutCard.jsx` in its default, uncompromised state.
* **Target** — the component currently rendered in the center canvas.
* Rule IDs are WCAG numbers as strings: `"1.1.1"`, `"3.3.2"`, `"2.4.7"`, `"2.5.8"`.

## Workflow & Verification

* Before declaring a task done, confirm `npm run dev` starts clean and `npm run build` emits static assets to `dist/`.
* Verify Tailwind classes are actually applying visually — a present config file is not proof.
* Manually tab through any UI you touch and confirm focus is visible (except where a variant prop deliberately removes it).
* Report any deviation from these instructions and why, rather than deviating silently.
* Commit with conventional prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.
* Never add a dependency, change the build target, or alter the file structure above without asking.

## Pending Decisions — Ask, Don't Assume

These are not yet settled. If a task requires one of them, stop and ask:

* Exact point values for true positives, false positives, false negatives, and correctly identifying a clean component.
* Whether a guess is logged as *(element + rule)* or *rule alone*.
* Deployment target — GitHub Pages requires `base: '/<repo-name>/'` in `vite.config.js`; Vercel does not.
* Visual treatment of the review phase when missed bugs are revealed.