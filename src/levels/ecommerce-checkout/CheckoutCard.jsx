import { X } from 'lucide-react'
import productImage from './assets/product.svg'
import QuantityStepper from './QuantityStepper.jsx'
import { DEFAULT_IMAGE_ALT, FOCUS_STYLES, LABEL_MODES, REMOVE_BUTTON_SIZES } from './variants.js'

const DEFAULTS = {
  imageAlt: DEFAULT_IMAGE_ALT,
  labelMode: LABEL_MODES.PROGRAMMATIC,
  focusStyle: FOCUS_STYLES.VISIBLE,
  removeButtonSize: REMOVE_BUTTON_SIZES.DEFAULT,
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

function CheckoutCard(props) {
  const { imageAlt, labelMode, focusStyle, removeButtonSize } = {
    ...DEFAULTS,
    ...props,
  }

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
            <h2 className="text-base font-semibold text-gray-900">
              Wireless Over-Ear Headphones
            </h2>

            <button
              type="button"
              aria-label="Remove item"
              data-audit-target="remove-item"
              className={REMOVE_BUTTON_CLASSES[removeButtonSize]}
            >
              <X className={REMOVE_ICON_CLASSES[removeButtonSize]} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-1 text-sm font-medium text-gray-700">$79.99</p>

          <div className="mt-4">
            <QuantityStepper labelMode={labelMode} />
          </div>
        </div>
      </div>

      <button
        type="button"
        data-audit-target="add-to-cart"
        className={`mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 ${FOCUS_STYLE_CLASSES[focusStyle]}`}
      >
        Add to Cart
      </button>
    </div>
  )
}

export default CheckoutCard
