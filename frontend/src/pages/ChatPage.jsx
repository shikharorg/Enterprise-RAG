import { useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '../hooks/useQuery'
import RoleBadge from '../components/RoleBadge'
import MessageBubble from '../components/MessageBubble'
import ThinkingIndicator from '../components/ThinkingIndicator'
import SourceCard from '../components/SourceCard'
import UploadButton from '../components/UploadButton'
import Chat from '../components/Chat'

export default function ChatPage() {
  const { user, logout } = useAuth()
  const { messages, thinking, sources, sendQuery } = useQuery()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Enterprise Knowledge Base</h1>
        <div className="flex items-center gap-3">
          <RoleBadge role={user.role} />
          <span className="text-sm text-gray-500">{user.email}</span>
          <UploadButton />
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-6 gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Ask anything about your department's documents.</p>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {thinking && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>

        {sources.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sources</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <SourceCard key={s.index} source={s} />
              ))}
            </div>
          </div>
        )}

        <Chat onSend={sendQuery} disabled={thinking} />
      </main>
    </div>
  )
}
