import { RULE_IDS } from '../../data/wcagRules.js'
import {
  FOCUS_STYLES,
  LABEL_MODES,
  REMOVE_BUTTON_LABELS,
  REMOVE_BUTTON_SIZES,
  TITLE_MARKUP,
} from './variants.js'

export function applySabotage(violations = []) {
  const isViolated = (ruleId, target) =>
    violations.some((violation) => violation.ruleId === ruleId && violation.target === target)

  const props = {
    labelMode: isViolated(RULE_IDS.LABELS_OR_INSTRUCTIONS, 'quantity-input')
      ? LABEL_MODES.VISUAL_ONLY
      : LABEL_MODES.PROGRAMMATIC,
    focusStyle: isViolated(RULE_IDS.FOCUS_VISIBLE, 'add-to-cart')
      ? FOCUS_STYLES.NONE
      : FOCUS_STYLES.VISIBLE,
    removeButtonSize: isViolated(RULE_IDS.TARGET_SIZE_MIN, 'remove-item')
      ? REMOVE_BUTTON_SIZES.COMPACT
      : REMOVE_BUTTON_SIZES.DEFAULT,
    // Two rules land on `remove-item`, and this is the other one. Each reads
    // its own pair and neither consults the other's answer, so the four
    // combinations of the two are all reachable and all meaningful.
    removeButtonLabel: isViolated(RULE_IDS.NAME_ROLE_VALUE, 'remove-item')
      ? REMOVE_BUTTON_LABELS.ICON_ONLY
      : REMOVE_BUTTON_LABELS.DESCRIBED,
    titleMarkup: isViolated(RULE_IDS.INFO_AND_RELATIONSHIPS, 'product-title')
      ? TITLE_MARKUP.STYLED_TEXT
      : TITLE_MARKUP.HEADING,
  }

  if (isViolated(RULE_IDS.NON_TEXT_CONTENT, 'product-image')) {
    props.imageAlt = undefined
  }

  return props
}
