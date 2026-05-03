from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
_s = get_settings()

_client: AsyncOpenAI | None = None


def load_generator() -> None:
    global _client
    _client = AsyncOpenAI(api_key=_s.openai_api_key, timeout=_s.openai_timeout_seconds)


def get_client() -> AsyncOpenAI:
    if _client is None:
        raise RuntimeError("Generator not loaded. Call load_generator() at startup.")
    return _client


def _build_prompt(query: str, chunks: list[dict]) -> list[dict]:
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        dept = chunk.get("metadata", {}).get("role_access", "unknown")
        source = chunk.get("metadata", {}).get("source", "unknown")
        context_parts.append(f"[{i}] (department={dept}, source={source})\n{chunk['text']}")

    context = "\n\n".join(context_parts)

    return [
        {
            "role": "system",
            "content": (
                "You are a helpful enterprise knowledge assistant. "
                "IMPORTANT: If the user's message is a greeting or very short casual message with no question "
                "(like 'hi', 'hello', 'thanks', 'good'), do NOT use the context documents at all. "
                "Just respond warmly and briefly as a helpful assistant would, then invite them to ask about their department's documents. "
                "The context documents below are only relevant when the user asks an actual question. "
                "You are a helpful enterprise knowledge assistant. "
                "Answer the user's question using only the context provided. "
                "Cite sources by their bracketed number, e.g. [1]. "
                "Only if the question is a genuine off-topic request unrelated to work (e.g. write me a poem, what is the weather), "
                "respond with exactly: "
                "\"I can only answer questions based on your department's documents.\""
            ),
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {query}",
        },
    ]


def _extract_sources(chunks: list[dict]) -> list[dict]:
    sources = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata", {})
        sources.append({
            "index": i,
            "source": meta.get("source", "unknown"),
            "department": meta.get("role_access", "unknown"),
            "chunk_id": chunk.get("id"),
            "rerank_score": chunk.get("rerank_score"),
        })
    return sources


_FALLBACK = "I can only answer questions based on your department's documents."

_GREETING_MESSAGES = [
    {
        "role": "system",
        "content": (
            "You are a helpful enterprise knowledge assistant. "
            "If the user sends a greeting or casual message, respond warmly and briefly, "
            "then invite them to ask about their department's documents. "
            "If the question is genuinely off-topic (not a greeting), respond with exactly: "
            "'I can only answer questions based on your department's documents.'"
        ),
    },
]


async def generate(query: str, chunks: list[dict]) -> dict:
    if not chunks:
        logger.info("No chunks retrieved for query=%r, calling LLM for greeting handling", query[:60])
        messages = [*_GREETING_MESSAGES, {"role": "user", "content": query}]
        response = await get_client().chat.completions.create(
            model=_s.openai_model,
            messages=messages,
            temperature=0.2,
            max_tokens=256,
        )
        return {"answer": response.choices[0].message.content, "sources": []}

    messages = _build_prompt(query, chunks)
    sources = _extract_sources(chunks)

    response = await get_client().chat.completions.create(
        model=_s.openai_model,
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content
    logger.info(
        "Generated answer for query=%r using %d chunks, tokens=%d",
        query[:60],
        len(chunks),
        response.usage.total_tokens,
    )
    return {"answer": answer, "sources": sources}


async def generate_stream(query: str, chunks: list[dict]) -> AsyncIterator[str]:
    if not chunks:
        logger.info("No chunks retrieved for query=%r, calling LLM for greeting handling", query[:60])
        messages = [*_GREETING_MESSAGES, {"role": "user", "content": query}]
        stream = await get_client().chat.completions.create(
            model=_s.openai_model,
            messages=messages,
            temperature=0.2,
            max_tokens=256,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
        return

    messages = _build_prompt(query, chunks)

    stream = await get_client().chat.completions.create(
        model=_s.openai_model,
        messages=messages,
        temperature=0.2,
        max_tokens=1024,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta

    logger.info("Streamed answer for query=%r using %d chunks", query[:60], len(chunks))
