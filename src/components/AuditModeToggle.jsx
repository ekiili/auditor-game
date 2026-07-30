const TOGGLE_CLASSES =
  'inline-flex min-h-11 items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'

function AuditModeToggle({ auditMode, onToggle }) {
  return (
    <button type="button" aria-pressed={auditMode} onClick={onToggle} className={TOGGLE_CLASSES}>
      Audit Mode
    </button>
  )
}

export default AuditModeToggle
