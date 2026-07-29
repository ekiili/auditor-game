# Audit Game - Developer Instructions

## Project Overview
You are building "Audit Game", a purely client-side React SPA (Vite + Tailwind CSS). It is an accessibility training game where a perfect WCAG 2.2 AA baseline component is deliberately "sabotaged" with accessibility violations, and the user must find them.

## Core Tech Stack
* Vite & React (Functional components, Hooks)
* Tailwind CSS (Styling)
* `lucide-react` (Local SVG icons)

## STRICT GUARDRAILS (NEVER VIOLATE THESE)
1. **No External APIs:** The app must be 100% playable completely offline. Do not use external CDNs, fonts, or image URLs. Use local UI icons (`lucide-react`) and standard HTML/CSS for image placeholders.
2. **Client-Side Only:** No backend, no database, no authentication. State lives entirely in the browser.
3. **The "React Way" for Sabotage:** When instructed to introduce an accessibility bug (e.g., removing an `alt` tag, shrinking a target size), you MUST do this via React state and props (e.g., `alt={isBugActive ? undefined : "text"}`). NEVER use Vanilla JS DOM manipulation (like `document.getElementById`).
4. **Step-by-Step Execution:** Do not build ahead. If asked to build a button, only build the button. Do not hallucinate game loops, menus, or extra features unless explicitly instructed.

## Accessibility Standards
Unless explicitly told to "sabotage" or "break" a rule via state, all baseline code you write MUST strictly adhere to WCAG 2.2 AA standards. This includes:
* Proper semantic HTML.
* Clear visual focus indicators for keyboard navigation.
* Correct ARIA labels for icon-only buttons.