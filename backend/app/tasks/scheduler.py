"""
APScheduler定时任务调度器
每N分钟自动从Google Ads API同步数据
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging
import asyncio

from app.config import settings
from app.database import AsyncSessionLocal
from app.services.google_ads_service import GoogleAdsService
from app.services.sync_service import SyncService

logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler = None


async def sync_task():
    """
    定时同步任务
    从Google Ads API获取最近的变更并存储到数据库
    """
    logger.info(f"⏰ 定时同步任务开始执行...")

    # 创建异步数据库会话
    async with AsyncSessionLocal() as db:
        try:
            # 初始化服务
            google_ads_service = GoogleAdsService()
            sync_service = SyncService(google_ads_service)

            # 同步最近15分钟的数据(比间隔稍长一点,避免遗漏)
            minutes = settings.SYNC_INTERVAL_MINUTES + 5
            synced_count, errors = await sync_service.sync_changes(db, minutes=minutes)

            if errors:
                logger.warning(
                    f"⚠️ 定时同步完成,但有 {len(errors)} 条记录失败"
                )
                for error in errors[:5]:  # 只记录前5个错误
                    logger.error(f"  - {error}")
            else:
                logger.info(f"✅ 定时同步成功: {synced_count} 条记录")

        except Exception as e:
            logger.error(f"❌ 定时同步任务失败: {e}", exc_info=True)


def start_scheduler():
    """
    启动定时任务调度器

    在FastAPI应用启动时调用
    """
    global scheduler

    if scheduler is not None:
        logger.warning("⚠️ 调度器已经在运行中")
        return

    try:
        # 创建调度器
        scheduler = AsyncIOScheduler()

        # 添加定时任务(每N分钟执行一次)
        scheduler.add_job(
            sync_task,
            trigger=IntervalTrigger(minutes=settings.SYNC_INTERVAL_MINUTES),
            id="sync_google_ads_changes",
            name="同步Google Ads变更记录",
            replace_existing=True,
            max_instances=1,  # 同一时间只允许一个实例运行
            coalesce=True,  # 如果错过了执行时间,只执行一次
        )

        # 启动调度器
        scheduler.start()

        logger.info(
            f"✅ 定时任务已启动: 每 {settings.SYNC_INTERVAL_MINUTES} 分钟同步一次"
        )

        # 可选:立即执行一次同步
        logger.info("🚀 执行首次同步...")
        asyncio.create_task(sync_task())

    except Exception as e:
        logger.error(f"❌ 启动定时任务失败: {e}")
        raise


def stop_scheduler():
    """
    停止定时任务调度器

    在FastAPI应用关闭时调用
    """
    global scheduler

    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
        logger.info("👋 定时任务已停止")
    else:
        logger.warning("⚠️ 调度器未在运行")


def get_next_run_time() -> datetime:
    """
    获取下次执行时间

    Returns:
        下次执行的时间戳
    """
    global scheduler

    if scheduler is None:
        return None

    job = scheduler.get_job("sync_google_ads_changes")
    if job:
        return job.next_run_time

    return None
