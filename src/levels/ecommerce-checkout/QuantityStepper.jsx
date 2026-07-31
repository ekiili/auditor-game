import { useEffect, useId, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { LABEL_MODES } from './variants.js'

const LABEL_CLASSES = 'mb-1 block text-sm font-medium text-gray-700'

const STEPPER_BUTTON_CLASSES =
  'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

const INPUT_CLASSES =
  'w-16 rounded-md border border-gray-300 px-3 py-2 text-center text-sm text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

function clampQuantity(value) {
  return Math.max(1, value)
}

// `interactive` mirrors CheckoutCard's prop of the same name: false renders the
// same controls, with the same roles and names, outside the tab order.
function QuantityStepper({ labelMode = LABEL_MODES.PROGRAMMATIC, interactive = true }) {
  const tabIndex = interactive ? undefined : -1
  const [quantity, setQuantity] = useState(1)
  const [announcement, setAnnouncement] = useState('')
  const inputId = useId()
  const announcedQuantityRef = useRef(quantity)

  useEffect(() => {
    if (announcedQuantityRef.current === quantity) return
    announcedQuantityRef.current = quantity
    setAnnouncement(`Quantity: ${quantity}`)
  }, [quantity])

  const handleChange = (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    setQuantity(clampQuantity(value))
  }

  const handleDecrease = () => {
    setQuantity((current) => clampQuantity(current - 1))
  }

  const handleIncrease = () => {
    setQuantity((current) => clampQuantity(current + 1))
  }

  return (
    <div>
      {labelMode === LABEL_MODES.PROGRAMMATIC ? (
        <label htmlFor={inputId} className={LABEL_CLASSES}>
          Quantity
        </label>
      ) : (
        <span className={LABEL_CLASSES}>Quantity</span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Decrease quantity"
          data-audit-target="quantity-decrease"
          tabIndex={tabIndex}
          onClick={handleDecrease}
          className={STEPPER_BUTTON_CLASSES}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        <input
          id={inputId}
          name="quantity"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={quantity}
          onChange={handleChange}
          data-audit-target="quantity-input"
          tabIndex={tabIndex}
          className={INPUT_CLASSES}
        />

        <button
          type="button"
          aria-label="Increase quantity"
          data-audit-target="quantity-increase"
          tabIndex={tabIndex}
          onClick={handleIncrease}
          className={STEPPER_BUTTON_CLASSES}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}

export default QuantityStepper
