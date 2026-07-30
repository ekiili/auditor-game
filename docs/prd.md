# PRD: Audit Game (Phase 1)

## 1. Product Overview
*   **Concept:** A procedural training simulator for web accessibility auditing.
*   **Phase 1 Goal:** Build a flawless, self-contained web application focusing entirely on one component: an E-commerce Checkout Card. 
*   **Architecture:** A purely client-side Single Page Application (SPA) using React, Vite, and Tailwind CSS. It must be fully static and capable of being hosted on GitHub Pages or Vercel with zero backend logic.
*   **Target Standard:** WCAG 2.2 Level AA (The European Accessibility Act baseline).

## 2. The Core Training Loop
The application must procedurally generate new scenarios by executing this sequence:
1.  **Render:** The app loads a base React component.
2.  **Sabotage:** The `SaboteurEngine` randomly determines the component's state:
    *   *Broken State (80% chance):* Injects 1 to 3 WCAG violations into the DOM/CSS.
    *   *Compliant State (20% chance):* Injects 0 violations.
3.  **Inspect:** The player toggles "Audit Mode" to inspect elements safely. (Audit Mode disables native HTML actions like link navigation or form submission).
4.  **Audit & Submit:** The player logs suspected violations via a dropdown, or explicitly declares the component as "Compliant," then clicks Submit.
5.  **Score & Reveal:** The game compares the player's log against the Saboteur's actual injections:
    *   Points awarded for correctly identifying bugs (True Positives) or correctly identifying a clean component.
    *   Points deducted for flagging good code (False Positives) or missing injected bugs (False Negatives).
6.  **Next Round:** Missed bugs are highlighted for educational review, and the player clicks "Next" to generate a brand new scenario. The session lasts for 10 rounds, ending with a final score report.

## 3. UI Architecture
The screen should be divided into three distinct zones:
*   **Left Column (HUD):** Displays Current Score, Round Number (X/10), and the "Submit Audit" button.
*   **Center Canvas (The Target):** Renders the E-commerce component (e.g., a card showing a product image, title, price, quantity selector, and an "Add to Cart" button).
*   **Floating Inspector (The Tool):** A toggleable UI that allows the user to log their WCAG violation guesses against specific elements.

## 4. The Saboteur Engine (Phase 1 Target Rules)
For Phase 1, the engine will only randomly inject these four specific failures:

| WCAG Rule | Saboteur Action (What the code does) | Player Experience (How it fails) |
| :--- | :--- | :--- |
| **1.1.1 Non-text Content** | Strips the `alt=""` attribute from the product image. | Screen readers will read the raw image filename. |
| **3.3.2 Labels or Instructions** | Removes the programmatic `<label>` from the "Quantity" input and replaces it with visual text. | Screen readers announce "Edit text, blank". |
| **2.4.7 Focus Visible** | Injects `outline: none;` into the CSS of the "Add to Cart" button. | Keyboard users hitting `Tab` cannot see focus. |
| **2.5.8 Target Size (Min)** | Shrinks the 'Remove Item' 'X' icon to 16x16 CSS pixels. | The touch target is smaller than the required 24x24 pixels. |

## 5. State Management Requirements
The application must silently track the true state of the board in memory (no databases). The state management must track:
*   The current round number and total score.
*   Whether "Audit Mode" is currently toggled on or off.
*   The actual list of violations injected by the Saboteur this round (the Truth).
*   The list of violations currently guessed by the player.
*   The round status (e.g., actively playing, reviewing missed bugs, or game over).

## 6. Strict Development Guardrails
*   **Client-Side Only:** This is a pure SPA. Do not use Next.js server components, SSR, or Node.js backend logic. The build output must be standard static files (`index.html`, JS, CSS).
*   **No External APIs:** The app must run 100% locally and offline in the browser. 
*   **Separation of Concerns:** The base "Accessible Component" code and the "Saboteur" injection logic must live in separate files. Do not mix them, to ensure the AI does not auto-correct the injected bugs.