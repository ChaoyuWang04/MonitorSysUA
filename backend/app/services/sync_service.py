"""
数据同步服务
从Google Ads API获取数据并存储到数据库
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import logging

from app.services.google_ads_service import GoogleAdsService
from app.services.field_humanizer import FieldHumanizer
from app.models.change_log import ChangeLog
from app.models.field_change import FieldChange

logger = logging.getLogger(__name__)


class SyncService:
    """
    数据同步服务
    负责从Google Ads获取数据并存储到PostgreSQL
    """

    def __init__(self, google_ads_service: GoogleAdsService):
        """
        初始化同步服务

        Args:
            google_ads_service: Google Ads API服务实例
        """
        self.google_ads_service = google_ads_service

    async def sync_changes(
        self, db: AsyncSession, minutes: int = 15
    ) -> Tuple[int, List[str]]:
        """
        同步最近N分钟的变更到数据库

        Args:
            db: 数据库会话
            minutes: 时间范围(分钟)

        Returns:
            (成功同步的记录数, 错误列表)
        """
        logger.info(f"🔄 开始同步最近 {minutes} 分钟的变更记录...")

        errors = []
        synced_count = 0

        try:
            # 从Google Ads API获取变更事件
            events = self.google_ads_service.fetch_recent_changes(minutes=minutes)

            logger.info(f"📥 获取到 {len(events)} 条变更事件")

            # 逐条存储到数据库
            for event in events:
                try:
                    await self._save_change_event(db, event)
                    synced_count += 1
                except Exception as e:
                    error_msg = f"保存事件失败: {event.get('resource_name', 'unknown')} - {e}"
                    logger.error(f"❌ {error_msg}")
                    errors.append(error_msg)

            # 提交事务
            await db.commit()

            logger.info(f"✅ 同步完成: 成功 {synced_count} 条, 失败 {len(errors)} 条")

            return synced_count, errors

        except Exception as e:
            logger.error(f"❌ 同步失败: {e}")
            await db.rollback()
            errors.append(str(e))
            return synced_count, errors

    async def _save_change_event(
        self, db: AsyncSession, event: Dict[str, Any]
    ) -> None:
        """
        保存单个变更事件到数据库

        Args:
            db: 数据库会话
            event: 变更事件数据
        """
        # 使用upsert避免重复插入
        stmt = insert(ChangeLog).values(
            timestamp=event["timestamp"],
            user_email=event["user_email"],
            operation_type=event["operation_type"],
            resource_type=event["resource_type"],
            resource_name=event["resource_name"],
            client_type=event["client_type"],
            customer_id=event["customer_id"],
        )

        # 如果存在则不更新(按唯一索引)
        stmt = stmt.on_conflict_do_nothing(
            index_elements=[
                "customer_id",
                "timestamp",
                "resource_name",
                "operation_type",
            ]
        )

        # 执行插入并获取ID
        result = await db.execute(stmt.returning(ChangeLog.id))
        row = result.fetchone()

        # 如果是新插入的记录,保存字段变更
        if row:
            change_log_id = row[0]
            await self._save_field_changes(
                db, change_log_id, event["field_changes"], event["resource_type"]
            )

    async def _save_field_changes(
        self,
        db: AsyncSession,
        change_log_id: Any,
        field_changes: List[Dict[str, Any]],
        resource_type: str,
    ) -> None:
        """
        保存字段变更明细

        Args:
            db: 数据库会话
            change_log_id: 变更记录ID
            field_changes: 字段变更列表
            resource_type: 资源类型
        """
        for field_change in field_changes:
            # 生成人类可读描述
            human_desc = FieldHumanizer.humanize(
                field_path=field_change["field_path"],
                old_value=field_change["old_value"],
                new_value=field_change["new_value"],
                resource_type=resource_type,
            )

            # 插入字段变更记录
            stmt = insert(FieldChange).values(
                change_log_id=change_log_id,
                field_path=field_change["field_path"],
                old_value=field_change["old_value"],
                new_value=field_change["new_value"],
                human_description=human_desc,
            )

            await db.execute(stmt)

    async def get_last_sync_time(self, db: AsyncSession) -> datetime:
        """
        获取上次同步的最后记录时间

        Args:
            db: 数据库会话

        Returns:
            最后记录的时间戳
        """
        result = await db.execute(select(func.max(ChangeLog.timestamp)))
        last_time = result.scalar_one_or_none()

        if last_time:
            return last_time
        else:
            # 如果没有记录,返回7天前
            return datetime.now() - timedelta(days=7)

    async def get_sync_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """
        获取同步统计信息

        Args:
            db: 数据库会话

        Returns:
            统计信息字典
        """
        # 总记录数
        total_result = await db.execute(select(func.count(ChangeLog.id)))
        total_count = total_result.scalar_one()

        # 最后同步时间
        last_sync_time = await self.get_last_sync_time(db)

        # 今日记录数
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_result = await db.execute(
            select(func.count(ChangeLog.id)).where(ChangeLog.timestamp >= today_start)
        )
        today_count = today_result.scalar_one()

        return {
            "total_records": total_count,
            "today_records": today_count,
            "last_sync_time": last_sync_time,
        }
