import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, health
from app.config import get_settings
from app.db.postgres import close_db, init_db
from app.utils.logger import get_logger

logger = get_logger(__name__)
_s = get_settings()

rag_semaphore: asyncio.Semaphore


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_semaphore
    rag_semaphore = asyncio.Semaphore(5)
    await init_db()
    logger.info("Application startup complete")
    yield
    await close_db()
    logger.info("Application shutdown complete")


app = FastAPI(
    title="Enterprise RAG",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _s.app_env == "development" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_s.cors_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
