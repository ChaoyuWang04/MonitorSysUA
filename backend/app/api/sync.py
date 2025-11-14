"""
数据同步API端点
提供手动触发同步、查询同步状态等功能
"""

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import logging

from app.database import get_db
from app.services.google_ads_service import GoogleAdsService
from app.services.sync_service import SyncService
from app.schemas.change_log import SyncStatusResponse, SyncTriggerResponse
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# 全局同步状态
sync_state = {
    "is_running": False,
    "last_sync_time": None,
    "next_sync_time": None,
}


@router.post("/trigger", response_model=SyncTriggerResponse)
async def trigger_sync(
    background_tasks: BackgroundTasks,
    minutes: int = 15,
    db: AsyncSession = Depends(get_db),
):
    """
    手动触发数据同步

    Args:
        minutes: 同步最近N分钟的数据(默认15分钟)
    """

    if sync_state["is_running"]:
        return SyncTriggerResponse(
            status="error",
            message="同步正在进行中,请稍后再试",
            synced_count=0,
            errors=[],
        )

    try:
        # 标记为正在同步
        sync_state["is_running"] = True
        logger.info(f"🚀 手动触发同步: 最近 {minutes} 分钟")

        # 初始化服务
        google_ads_service = GoogleAdsService()
        sync_service = SyncService(google_ads_service)

        # 执行同步
        synced_count, errors = await sync_service.sync_changes(db, minutes=minutes)

        # 更新状态
        sync_state["last_sync_time"] = datetime.now()

        if errors:
            return SyncTriggerResponse(
                status="partial_success",
                message=f"同步完成,但有 {len(errors)} 条记录失败",
                synced_count=synced_count,
                errors=errors[:10],  # 只返回前10个错误
            )
        else:
            return SyncTriggerResponse(
                status="success",
                message=f"同步成功,共同步 {synced_count} 条记录",
                synced_count=synced_count,
                errors=[],
            )

    except Exception as e:
        logger.error(f"❌ 同步失败: {e}")
        return SyncTriggerResponse(
            status="error",
            message=f"同步失败: {str(e)}",
            synced_count=0,
            errors=[str(e)],
        )

    finally:
        # 清除同步标志
        sync_state["is_running"] = False


@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status(
    db: AsyncSession = Depends(get_db),
):
    """
    获取数据同步状态

    返回:
    - 上次同步时间
    - 下次同步时间(如果启用了定时任务)
    - 是否正在同步
    - 同步间隔
    """

    # 获取数据库中最后一条记录的时间
    try:
        sync_service = SyncService(GoogleAdsService())
        last_time = await sync_service.get_last_sync_time(db)
    except Exception:
        last_time = None

    return SyncStatusResponse(
        last_sync_time=sync_state.get("last_sync_time") or last_time,
        next_sync_time=sync_state.get("next_sync_time"),
        is_running=sync_state["is_running"],
        sync_interval_minutes=settings.SYNC_INTERVAL_MINUTES,
    )


@router.get("/stats")
async def get_sync_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    获取同步统计信息

    返回:
    - 总记录数
    - 今日同步数
    - 最后同步时间
    """

    try:
        google_ads_service = GoogleAdsService()
        sync_service = SyncService(google_ads_service)
        stats = await sync_service.get_sync_stats(db)

        return {
            "status": "success",
            "data": stats,
        }

    except Exception as e:
        logger.error(f"❌ 获取统计信息失败: {e}")
        return {
            "status": "error",
            "message": str(e),
        }
