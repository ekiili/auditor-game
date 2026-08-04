import { RULE_IDS } from '../../data/wcagRules.js'
import CheckoutCard from './CheckoutCard.jsx'
import { applySabotage } from './sabotage.js'

const auditTargets = [
  { id: 'product-image', label: 'Product image' },
  { id: 'quantity-input', label: 'Quantity input' },
  { id: 'quantity-decrease', label: 'Decrease quantity button' },
  { id: 'quantity-increase', label: 'Increase quantity button' },
  { id: 'add-to-cart', label: 'Add to Cart button' },
  { id: 'remove-item', label: 'Remove item button' },
]

// `alsoDefensible` is authored here, per sabotage, because whether two criteria
// genuinely overlap depends on what was broken and where — it is a judgement
// about this failure on this element, not a property of either rule. Nothing
// computes it, and an empty array is a statement rather than an omission: it
// says this failure has one sharp answer and no defensible alternative.
//
// The key is present on every entry. `applySabotage` ignores it entirely, since
// it changes nothing about how the component renders.
const sabotageMap = [
  { ruleId: RULE_IDS.NON_TEXT_CONTENT, target: 'product-image', alsoDefensible: [] },
  {
    ruleId: RULE_IDS.LABELS_OR_INSTRUCTIONS,
    target: 'quantity-input',
    alsoDefensible: [
      {
        ruleId: RULE_IDS.NAME_ROLE_VALUE,
        remark:
          'Correct — the field has no accessible name, and that is exactly what 4.1.2 covers. 3.3.2 is the sharper answer here: the visible label text is already on the page and simply is not tied to the field, so what failed is the association rather than the name the control exposes.',
      },
    ],
  },
  { ruleId: RULE_IDS.FOCUS_VISIBLE, target: 'add-to-cart', alsoDefensible: [] },
  { ruleId: RULE_IDS.TARGET_SIZE_MIN, target: 'remove-item', alsoDefensible: [] },
]

const ecommerceCheckoutLevel = {
  id: 'ecommerce-checkout',
  name: 'E-commerce Checkout Card',
  Component: CheckoutCard,
  auditTargets,
  sabotageMap,
  applySabotage,
}

export default ecommerceCheckoutLevel
