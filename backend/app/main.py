"""
FastAPI应用入口
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import init_db

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    在启动时初始化数据库,在关闭时清理资源
    """
    logger.info("🚀 Starting MonitorSysUA API Server...")

    # 启动时:初始化数据库
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

    # 启动定时任务
    try:
        from app.tasks.scheduler import start_scheduler, stop_scheduler
        start_scheduler()
        logger.info("✅ Scheduler started successfully")
    except Exception as e:
        logger.warning(f"⚠️ Scheduler启动失败(可在后续手动触发): {e}")

    yield

    # 关闭时:清理资源
    logger.info("👋 Shutting down MonitorSysUA API Server...")
    try:
        stop_scheduler()
    except Exception:
        pass


# 创建FastAPI应用
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Google Ads优化师操作监控系统 - 后端API",
    lifespan=lifespan,
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "MonitorSysUA API",
        "version": settings.API_VERSION,
    }


@app.get("/health")
async def health_check():
    """详细的健康检查"""
    return {
        "status": "ok",
        "database": "connected",  # TODO: 添加实际的数据库连接检查
        "sync_service": "running",  # TODO: 添加同步服务状态检查
    }


# 注册API路由
from app.api import changes, sync

app.include_router(changes.router, prefix="/api/changes", tags=["变更记录"])
app.include_router(sync.router, prefix="/api/sync", tags=["数据同步"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
    )
