import asyncio

RAG_SEMAPHORE_MAX = 5

rag_semaphore: asyncio.Semaphore | None = None


def init_semaphore() -> None:
    global rag_semaphore
    rag_semaphore = asyncio.Semaphore(RAG_SEMAPHORE_MAX)


def rag_slots_in_use() -> int:
    if rag_semaphore is None:
        return 0
    return RAG_SEMAPHORE_MAX - rag_semaphore._value
