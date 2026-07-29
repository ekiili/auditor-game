export const RULE_IDS = Object.freeze({
  NON_TEXT_CONTENT: '1.1.1',
  LABELS_OR_INSTRUCTIONS: '3.3.2',
  FOCUS_VISIBLE: '2.4.7',
  TARGET_SIZE_MIN: '2.5.8',
})

export const WCAG_RULES = Object.freeze([
  Object.freeze({
    id: RULE_IDS.NON_TEXT_CONTENT,
    name: 'Non-text Content',
    description:
      'An image has no text alternative, so a screen reader announces the raw filename instead of what the image shows.',
  }),
  Object.freeze({
    id: RULE_IDS.LABELS_OR_INSTRUCTIONS,
    name: 'Labels or Instructions',
    description:
      'A form input has no programmatic label, so a screen reader announces it as a blank, unnamed field.',
  }),
  Object.freeze({
    id: RULE_IDS.FOCUS_VISIBLE,
    name: 'Focus Visible',
    description:
      'An interactive element has no visible focus indicator, so a keyboard user tabbing through the page loses track of where they are.',
  }),
  Object.freeze({
    id: RULE_IDS.TARGET_SIZE_MIN,
    name: 'Target Size (Minimum)',
    description:
      'An interactive control has a clickable area smaller than 24 by 24 CSS pixels, so a user with limited precision struggles to activate it.',
  }),
])
