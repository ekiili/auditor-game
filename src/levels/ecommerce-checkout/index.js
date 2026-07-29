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

const sabotageMap = [
  { ruleId: RULE_IDS.NON_TEXT_CONTENT, target: 'product-image' },
  { ruleId: RULE_IDS.LABELS_OR_INSTRUCTIONS, target: 'quantity-input' },
  { ruleId: RULE_IDS.FOCUS_VISIBLE, target: 'add-to-cart' },
  { ruleId: RULE_IDS.TARGET_SIZE_MIN, target: 'remove-item' },
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
