import { RULE_IDS } from '../../data/wcagRules'
import { DEFAULT_IMAGE_ALT, FOCUS_STYLES, REMOVE_BUTTON_SIZES } from './CheckoutCard'
import { LABEL_MODES } from './QuantityStepper'

export function applySabotage(violations = []) {
  const isViolated = (ruleId) => violations.includes(ruleId)

  return {
    imageAlt: isViolated(RULE_IDS.NON_TEXT_CONTENT) ? undefined : DEFAULT_IMAGE_ALT,
    labelMode: isViolated(RULE_IDS.LABELS_OR_INSTRUCTIONS)
      ? LABEL_MODES.VISUAL_ONLY
      : LABEL_MODES.PROGRAMMATIC,
    focusStyle: isViolated(RULE_IDS.FOCUS_VISIBLE) ? FOCUS_STYLES.NONE : FOCUS_STYLES.VISIBLE,
    removeButtonSize: isViolated(RULE_IDS.TARGET_SIZE_MIN)
      ? REMOVE_BUTTON_SIZES.COMPACT
      : REMOVE_BUTTON_SIZES.DEFAULT,
  }
}
