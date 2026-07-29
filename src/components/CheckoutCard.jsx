import { useState } from 'react'
import { X } from 'lucide-react'
import productImage from '../assets/product.svg'

function CheckoutCard() {
  const [quantity, setQuantity] = useState(1)

  const handleQuantityChange = (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    setQuantity(Math.max(1, value))
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <img
          src={productImage}
          alt="Wireless over-ear headphones in indigo blue"
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
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-1 text-sm font-medium text-gray-700">$79.99</p>

          <div className="mt-4">
            <label
              htmlFor="checkout-quantity"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Quantity
            </label>
            <input
              id="checkout-quantity"
              name="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={handleQuantityChange}
              data-audit-target="quantity-input"
              className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        data-audit-target="add-to-cart"
        className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-800"
      >
        Add to Cart
      </button>
    </div>
  )
}

export default CheckoutCard
