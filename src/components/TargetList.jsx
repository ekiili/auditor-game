import { useId } from 'react'

// The radio itself is sr-only rather than hidden, so it keeps native
// arrow-key navigation and "n of six" position announcements. The visible
// label styling therefore has to carry focus and checked state via `peer:`.
const OPTION_CLASSES =
  'flex min-h-11 cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 peer-hover:bg-gray-100 peer-checked:border-indigo-700 peer-checked:bg-indigo-700 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-700'

function TargetList({ auditTargets, selectedTarget, onSelect }) {
  const groupName = useId()

  return (
    <fieldset className="w-full max-w-sm">
      <legend className="mb-2 text-sm font-semibold text-gray-900">Audit targets</legend>

      <div className="flex flex-col gap-1">
        {auditTargets.map((target) => (
          <label key={target.id} className="block">
            <input
              type="radio"
              name={groupName}
              value={target.id}
              checked={selectedTarget === target.id}
              onChange={() => onSelect(target.id)}
              className="peer sr-only"
            />
            <span className={OPTION_CLASSES}>{target.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default TargetList
