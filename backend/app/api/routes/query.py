import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user
from app.db.models import User
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_service import run_query, run_query_stream, _CITATION_RE
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/query", tags=["query"])


@router.post("", response_model=QueryResponse)
async def query(
    body: QueryRequest,
    current_user: User = Depends(get_current_user),
):
    if not body.stream:
        try:
            result = await run_query(body.query, current_user.role, body.top_k)
        except Exception as exc:
            logger.exception("Query route error user=%s", current_user.id)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
        return QueryResponse(answer=result["answer"], sources=result["sources"])

    try:
        stream, sources = await run_query_stream(body.query, current_user.role, body.top_k)
    except Exception as exc:
        logger.exception("Stream query route error user=%s", current_user.id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    async def event_stream():
        tokens = []
        async for token in stream:
            tokens.append(token)
            yield f"data: {json.dumps({'token': token})}\n\n"
        final_sources = sources if _CITATION_RE.search("".join(tokens)) else []
        yield f"data: {json.dumps({'sources': final_sources, 'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
