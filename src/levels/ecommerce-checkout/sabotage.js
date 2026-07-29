import { RULE_IDS } from '../../data/wcagRules.js'
import { FOCUS_STYLES, LABEL_MODES, REMOVE_BUTTON_SIZES } from './variants.js'

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
  }

  if (isViolated(RULE_IDS.NON_TEXT_CONTENT, 'product-image')) {
    props.imageAlt = undefined
  }

  return props
}
