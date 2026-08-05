export const RULE_IDS = Object.freeze({
  NON_TEXT_CONTENT: '1.1.1',
  INFO_AND_RELATIONSHIPS: '1.3.1',
  LABELS_OR_INSTRUCTIONS: '3.3.2',
  FOCUS_VISIBLE: '2.4.7',
  TARGET_SIZE_MIN: '2.5.8',
  NAME_ROLE_VALUE: '4.1.2',
})

export const PRINCIPLES = Object.freeze({
  PERCEIVABLE: 'Perceivable',
  OPERABLE: 'Operable',
  UNDERSTANDABLE: 'Understandable',
  ROBUST: 'Robust',
})

export const WCAG_RULES = Object.freeze([
  Object.freeze({
    id: RULE_IDS.NON_TEXT_CONTENT,
    name: 'Non-text Content',
    shortLabel: 'Images need a text alternative',
    description:
      'Without a text alternative, a screen reader announces the raw filename instead of what the image shows.',
    principle: PRINCIPLES.PERCEIVABLE,
    keywords: Object.freeze([
      'image',
      'alt',
      'alt text',
      'picture',
      'graphic',
      'text alternative',
      'screen reader',
    ]),
  }),
  Object.freeze({
    id: RULE_IDS.INFO_AND_RELATIONSHIPS,
    name: 'Info and Relationships',
    shortLabel: 'Structure must be coded, not just styled',
    description:
      'Text that only looks like a heading is announced as ordinary text, so a screen reader user cannot jump between sections or tell where one begins.',
    principle: PRINCIPLES.PERCEIVABLE,
    keywords: Object.freeze([
      'structure',
      'heading',
      'semantics',
      'relationships',
      'markup',
      'list',
      'outline',
      'landmark',
    ]),
  }),
  Object.freeze({
    id: RULE_IDS.LABELS_OR_INSTRUCTIONS,
    name: 'Labels or Instructions',
    shortLabel: 'Form fields need a label',
    description:
      'Without a programmatic label, a screen reader announces the field as blank and unnamed.',
    principle: PRINCIPLES.UNDERSTANDABLE,
    keywords: Object.freeze([
      'label',
      'form',
      'input',
      'field',
      'instructions',
      'placeholder',
    ]),
  }),
  Object.freeze({
    id: RULE_IDS.FOCUS_VISIBLE,
    name: 'Focus Visible',
    shortLabel: 'Keyboard focus must be visible',
    description:
      'Without a visible focus indicator, a keyboard user moving through the page loses track of where they are.',
    principle: PRINCIPLES.OPERABLE,
    keywords: Object.freeze([
      'focus',
      'keyboard',
      'outline',
      'tab',
      'focus ring',
      'indicator',
    ]),
  }),
  Object.freeze({
    id: RULE_IDS.TARGET_SIZE_MIN,
    name: 'Target Size (Minimum)',
    shortLabel: 'Controls must be big enough to tap',
    description:
      'A clickable area smaller than 24 by 24 CSS pixels is hard to hit for a user with limited precision.',
    principle: PRINCIPLES.OPERABLE,
    keywords: Object.freeze([
      'target size',
      'touch',
      'tap',
      'small',
      'button size',
      'click area',
      'pointer',
    ]),
  }),
  Object.freeze({
    id: RULE_IDS.NAME_ROLE_VALUE,
    name: 'Name, Role, Value',
    shortLabel: 'Controls must announce what they are',
    description:
      'When a control does not expose its name, role and value, a screen reader can announce that something is there but not what it is or what it does.',
    principle: PRINCIPLES.ROBUST,
    keywords: Object.freeze([
      'name',
      'role',
      'value',
      'accessible name',
      'assistive technology',
      'screen reader',
      'aria',
      'unnamed',
    ]),
  }),
])
