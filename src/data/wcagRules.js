export const wcagRules = [
  {
    id: '1.1.1',
    name: 'Non-text Content',
    description:
      'Images and other non-text content must have a text alternative that describes their purpose, so screen reader users know what they convey.',
    target: 'product-image',
  },
  {
    id: '3.3.2',
    name: 'Labels or Instructions',
    description:
      'Form inputs must have a programmatically associated label, so assistive technology users know what value is expected.',
    target: 'quantity-input',
  },
  {
    id: '2.4.7',
    name: 'Focus Visible',
    description:
      'Interactive elements must show a clearly visible indicator when they receive keyboard focus, so keyboard users can track their position on the page.',
    target: 'add-to-cart',
  },
  {
    id: '2.5.8',
    name: 'Target Size (Minimum)',
    description:
      'Interactive controls must offer a clickable/tappable area of at least 24 by 24 CSS pixels, so users with limited precision can activate them reliably.',
    target: 'remove-item',
  },
]
