import SourceCard from './SourceCard'

const DEPT_BG = {
  hr: '#7c3aed',
  engineering: '#0284c7',
  finance: '#059669',
}

export default function MessageBubble({ role, content, userRole, sources }) {
  const isUser = role === 'user'
  const userBg = DEPT_BG[userRole] ?? '#374151'

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className="max-w-[78%] px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
        style={{
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          ...(isUser
            ? { background: userBg, color: '#fff' }
            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)' })
        }}
      >
        {content}
      </div>
      {!isUser && sources && sources.length > 0 && (
        <div className="flex gap-1.5 flex-wrap max-w-[78%]">
          {Object.values(
            sources.reduce((acc, s) => {
              const key = s.source
              if (!acc[key] || (s.rerank_score ?? -Infinity) > (acc[key].rerank_score ?? -Infinity))
                acc[key] = s
              return acc
            }, {})
          ).map((s) => <SourceCard key={s.source} source={s} />)}
        </div>
      )}
    </div>
  )
}
