export default function SourceCard({ source }) {
  const pct = source.rerank_score != null
    ? Math.round((1 / (1 + Math.exp(-source.rerank_score))) * 100)
    : null

  return (
    <div className="flex flex-col gap-0.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs shadow-sm min-w-[140px] max-w-[200px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-gray-700 truncate">[{source.index}] {source.source}</span>
        {pct != null && <span className="text-gray-400 shrink-0">{pct}%</span>}
      </div>
      <span className="text-gray-400 capitalize">{source.department}</span>
    </div>
  )
}
