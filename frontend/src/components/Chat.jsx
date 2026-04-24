import { useState } from 'react'

const DEPT_BTN = {
  hr: '#7c3aed',
  engineering: '#0284c7',
  finance: '#059669',
}

export default function Chat({ onSend, disabled, userRole }) {
  const [input, setInput] = useState('')
  const btnColor = DEPT_BTN[userRole] ?? '#374151'

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
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2.5 rounded-[14px] px-3.5 py-2.5"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about your department's documents…"
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none text-sm focus:outline-none disabled:opacity-50 max-h-32 overflow-y-auto placeholder:text-white/25"
        style={{
          lineHeight: '1.5rem',
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
          fontFamily: 'inherit',
        }}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="shrink-0 text-white text-xs font-medium rounded-[10px] px-4 py-1.5 transition-opacity disabled:opacity-30"
        style={{ background: btnColor }}
      >
        Send
      </button>
    </form>
  )
}
