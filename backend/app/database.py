"""
数据库连接和会话管理
使用SQLAlchemy 2.0异步引擎
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

from app.config import settings

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.LOG_LEVEL == "DEBUG",  # 在DEBUG模式下打印SQL语句
    future=True,
    pool_pre_ping=True,  # 连接池健康检查
    pool_size=10,  # 连接池大小
    max_overflow=20,  # 最大溢出连接数
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# 声明基类
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    依赖注入函数,用于FastAPI路由

    使用示例:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """
    初始化数据库表
    在应用启动时调用
    """
    async with engine.begin() as conn:
        # 导入所有模型,确保它们被注册
        from app.models import change_log, field_change  # noqa

        # 创建所有表
        await conn.run_sync(Base.metadata.create_all)
