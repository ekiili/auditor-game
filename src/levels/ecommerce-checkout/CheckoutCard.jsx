import { X } from 'lucide-react'
import productImage from './assets/product.svg'
import QuantityStepper from './QuantityStepper.jsx'
import {
  DEFAULT_IMAGE_ALT,
  FOCUS_STYLES,
  LABEL_MODES,
  REMOVE_BUTTON_LABELS,
  REMOVE_BUTTON_SIZES,
  TITLE_MARKUP,
} from './variants.js'

const DEFAULTS = {
  imageAlt: DEFAULT_IMAGE_ALT,
  labelMode: LABEL_MODES.PROGRAMMATIC,
  focusStyle: FOCUS_STYLES.VISIBLE,
  removeButtonSize: REMOVE_BUTTON_SIZES.DEFAULT,
  removeButtonLabel: REMOVE_BUTTON_LABELS.DESCRIBED,
  titleMarkup: TITLE_MARKUP.HEADING,
  // Whether the card's controls take part in the tab order. Defaults to the
  // ordinary interactive card; a caller rendering it as a static illustration
  // passes false. Nothing here is disabled or hidden — the controls keep their
  // roles, names and states, and only leave the sequential tab order.
  interactive: true,
}

const FOCUS_STYLE_CLASSES = {
  [FOCUS_STYLES.VISIBLE]:
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-800',
  [FOCUS_STYLES.NONE]: 'outline-none',
}

const REMOVE_BUTTON_CLASSES = {
  [REMOVE_BUTTON_SIZES.DEFAULT]:
    'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
  [REMOVE_BUTTON_SIZES.COMPACT]:
    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
}

const REMOVE_ICON_CLASSES = {
  [REMOVE_BUTTON_SIZES.DEFAULT]: 'h-5 w-5',
  [REMOVE_BUTTON_SIZES.COMPACT]: 'h-3 w-3',
}

// One string, used by both title variants. Written once rather than repeated in
// each branch so the two renderings cannot drift apart: every visual property
// the title has comes from here, and there is no second place to edit.
const TITLE_CLASSES = 'text-base font-semibold text-gray-900'

const TITLE_TEXT = 'Wireless Over-Ear Headphones'

const REMOVE_BUTTON_NAME = 'Remove item'

function CheckoutCard(props) {
  const {
    imageAlt,
    labelMode,
    focusStyle,
    removeButtonSize,
    removeButtonLabel,
    titleMarkup,
    interactive,
  } = {
    ...DEFAULTS,
    ...props,
  }

  const tabIndex = interactive ? undefined : -1

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={productImage}
          alt={imageAlt}
          data-audit-target="product-image"
          width={80}
          height={80}
          className="h-20 w-20 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {titleMarkup === TITLE_MARKUP.HEADING ? (
              <h2 data-audit-target="product-title" className={TITLE_CLASSES}>
                {TITLE_TEXT}
              </h2>
            ) : (
              <div data-audit-target="product-title" className={TITLE_CLASSES}>
                {TITLE_TEXT}
              </div>
            )}

            <button
              type="button"
              aria-label={
                removeButtonLabel === REMOVE_BUTTON_LABELS.DESCRIBED
                  ? REMOVE_BUTTON_NAME
                  : undefined
              }
              data-audit-target="remove-item"
              tabIndex={tabIndex}
              className={REMOVE_BUTTON_CLASSES[removeButtonSize]}
            >
              <X className={REMOVE_ICON_CLASSES[removeButtonSize]} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-1 text-sm font-medium text-gray-700">$79.99</p>

          <div className="mt-4">
            <QuantityStepper labelMode={labelMode} interactive={interactive} />
          </div>
        </div>
      </div>

      <button
        type="button"
        data-audit-target="add-to-cart"
        tabIndex={tabIndex}
        className={`mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 ${FOCUS_STYLE_CLASSES[focusStyle]}`}
      >
        Add to Cart
      </button>
    </div>
  )
}

export default CheckoutCard
