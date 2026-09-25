'use client'

interface InboxConfirmDialogProps {
  open: boolean
  channelLabel: string
  windowWarning?: string | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function InboxConfirmDialog({
  open,
  channelLabel,
  windowWarning,
  busy,
  onCancel,
  onConfirm,
}: InboxConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 bg-slate-900/50">
      <div
        data-inbox-confirm
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbox-confirm-title"
        className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 space-y-4"
      >
        <h3 id="inbox-confirm-title" className="text-lg font-semibold text-slate-900 inbox-wrap">
          Approve &amp; Send on {channelLabel}?
        </h3>
        <p className="text-base text-slate-700 inbox-wrap">
          Redirect sinks stay on until a separate go-live CLEAR. No auto-send.
        </p>
        {windowWarning ? (
          <p className="text-base text-amber-800 inbox-wrap">{windowWarning}</p>
        ) : null}
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inbox-tap flex-1 border rounded-lg text-base disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inbox-tap flex-1 bg-blue-600 text-white rounded-lg text-base disabled:opacity-50"
          >
            Confirm Approve&amp;Send
          </button>
        </div>
      </div>
    </div>
  )
}
