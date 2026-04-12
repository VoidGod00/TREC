from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import time

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database import engine, Base
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler

# Import all models so SQLAlchemy registers them before create_all
from app.models.user import User          # noqa
from app.models.transaction import Transaction  # noqa
from app.models.budget import Budget, AILog     # noqa

# Import routers (after models to avoid circular import)
from app.routes.auth import router as auth_router
from app.routes.transactions import router as transactions_router
from app.routes.analytics import router as analytics_router
from app.routes.ai import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(debug=settings.DEBUG)
    logger.info("trec_starting", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
    Base.metadata.create_all(bind=engine)
    logger.info("database_tables_ready")
    yield
    logger.info("trec_shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",        # always on so you can test easily
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{ms:.1f}"
    return response


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error",
                 "errors": [{"field": ".".join(str(l) for l in e["loc"]),
                              "message": e["msg"]} for e in exc.errors()]},
    )


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


API = "/api/v1"
app.include_router(auth_router, prefix=API)
app.include_router(transactions_router, prefix=API)
app.include_router(analytics_router, prefix=API)
app.include_router(ai_router, prefix=API)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/", tags=["Root"])
def root():
    return {"message": settings.APP_NAME}
