import { useState } from 'react'
import api from '../services/api'

export function useQuery() {
  const [messages, setMessages] = useState([])
  const [thinking, setThinking] = useState(false)
  const [sources, setSources] = useState([])

  function appendMessage(msg) {
    setMessages((prev) => [...prev, msg])
  }

  function updateLastAssistant(patchOrFn) {
    setMessages((prev) => {
      const next = [...prev]
      const idx = next.findLastIndex((m) => m.role === 'assistant')
      if (idx !== -1) {
        const patch = typeof patchOrFn === 'function' ? patchOrFn(next[idx]) : patchOrFn
        next[idx] = { ...next[idx], ...patch }
      }
      return next
    })
  }

  async function sendQuery(query, stream = true) {
    appendMessage({ role: 'user', content: query })
    setThinking(true)
    setSources([])

    if (!stream) {
      try {
        const res = await api.post('/query', { query, stream: false })
        appendMessage({ role: 'assistant', content: res.data.answer })
        setSources(res.data.sources)
      } finally {
        setThinking(false)
      }
      return
    }

    appendMessage({ role: 'assistant', content: '' })

    try {
      const res = await fetch('/api/v1/query', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, stream: true }),
      })

      if (!res.ok) {
        const err = await res.json()
        updateLastAssistant({ content: err.detail ?? 'Request failed' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = JSON.parse(line.slice(6))
          if (payload.token !== undefined) {
            setThinking(false)
            updateLastAssistant((prev) => ({ content: (prev.content ?? '') + payload.token }))
          }
          if (payload.done) {
            setSources(payload.sources ?? [])
          }
        }
      }
    } finally {
      setThinking(false)
    }
  }

  return { messages, thinking, sources, sendQuery }
}
