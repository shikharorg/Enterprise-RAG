import { useState } from 'react'

export default function Chat({ onSend, disabled }) {
  const [input, setInput] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || disabled) return
    setInput('')
    onSend(q, true)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question…"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50 max-h-40 overflow-y-auto"
        style={{ lineHeight: '1.5rem' }}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="shrink-0 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl px-4 py-1.5 text-sm font-medium transition-colors"
      >
        Send
      </button>
    </form>
  )
}
