"""
Google Ads API集成服务
从Google Ads API获取变更事件数据
"""

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class GoogleAdsService:
    """
    Google Ads API服务类
    封装了与Google Ads API的所有交互
    """

    def __init__(self):
        """初始化Google Ads客户端"""
        try:
            self.client = GoogleAdsClient.load_from_storage(
                settings.GOOGLE_ADS_CONFIG_PATH
            )
            self.customer_id = settings.GOOGLE_ADS_CUSTOMER_ID
            logger.info(f"✅ Google Ads客户端初始化成功 (Customer: {self.customer_id})")
        except Exception as e:
            logger.error(f"❌ Google Ads客户端初始化失败: {e}")
            raise

    def fetch_change_events(
        self,
        start_time: datetime,
        end_time: datetime,
        limit: int = 1000,
    ) -> List[Dict[str, Any]]:
        """
        获取指定时间范围内的变更事件

        Args:
            start_time: 开始时间
            end_time: 结束时间
            limit: 最大返回记录数

        Returns:
            变更事件列表
        """
        ga_service = self.client.get_service("GoogleAdsService")

        # 格式化时间(Google Ads API要求的格式)
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
        end_str = end_time.strftime("%Y-%m-%d %H:%M:%S")

        # 构建GAQL查询
        query = f"""
            SELECT
              change_event.change_date_time,
              change_event.change_resource_type,
              change_event.user_email,
              change_event.client_type,
              change_event.resource_change_operation,
              change_event.change_resource_name,
              change_event.old_resource,
              change_event.new_resource,
              change_event.changed_fields
            FROM change_event
            WHERE change_event.change_date_time BETWEEN '{start_str}' AND '{end_str}'
            ORDER BY change_event.change_date_time DESC
            LIMIT {limit}
        """

        try:
            logger.info(
                f"🔍 查询Google Ads变更事件: {start_str} ~ {end_str} (limit: {limit})"
            )

            response = ga_service.search(customer_id=self.customer_id, query=query)

            # 解析结果
            events = []
            for row in response:
                event = self._parse_change_event(row.change_event)
                if event:
                    events.append(event)

            logger.info(f"✅ 成功获取 {len(events)} 条变更记录")
            return events

        except GoogleAdsException as ex:
            logger.error(f"❌ Google Ads API请求失败:")
            for error in ex.failure.errors:
                logger.error(f"  - Error: {error.message}")
                if error.location:
                    for field_path in error.location.field_path_elements:
                        logger.error(f"    Field: {field_path.field_name}")
            raise

        except Exception as e:
            logger.error(f"❌ 获取变更事件失败: {e}")
            raise

    def _parse_change_event(self, event) -> Optional[Dict[str, Any]]:
        """
        解析单个change_event对象

        Args:
            event: Google Ads API返回的change_event对象

        Returns:
            解析后的字典,如果解析失败返回None
        """
        try:
            # 基础信息
            parsed = {
                "timestamp": event.change_date_time,
                "user_email": event.user_email or "unknown",
                "operation_type": event.resource_change_operation.name,
                "resource_type": event.change_resource_type.name,
                "resource_name": event.change_resource_name,
                "client_type": event.client_type.name if event.client_type else None,
                "customer_id": self.customer_id,
            }

            # 解析字段变更(如果是UPDATE操作)
            if event.resource_change_operation.name == "UPDATE":
                parsed["field_changes"] = self._extract_field_changes(event)
            else:
                parsed["field_changes"] = []

            return parsed

        except Exception as e:
            logger.warning(f"⚠️ 解析变更事件失败: {e}")
            return None

    def _extract_field_changes(self, event) -> List[Dict[str, Any]]:
        """
        提取字段级别的变更信息

        Args:
            event: change_event对象

        Returns:
            字段变更列表
        """
        field_changes = []

        try:
            # 获取旧值和新值资源对象
            resource_type = event.change_resource_type.name
            old_resource = self._get_resource_by_type(
                event.old_resource, resource_type
            )
            new_resource = self._get_resource_by_type(
                event.new_resource, resource_type
            )

            # 遍历变更的字段
            if hasattr(event, "changed_fields") and event.changed_fields:
                for field_path in event.changed_fields.paths:
                    try:
                        old_value = self._get_nested_attr(old_resource, field_path)
                        new_value = self._get_nested_attr(new_resource, field_path)

                        field_changes.append(
                            {
                                "field_path": field_path,
                                "old_value": self._serialize_value(old_value),
                                "new_value": self._serialize_value(new_value),
                            }
                        )
                    except Exception as e:
                        logger.debug(f"跳过字段 {field_path}: {e}")

        except Exception as e:
            logger.warning(f"⚠️ 提取字段变更失败: {e}")

        return field_changes

    def _get_resource_by_type(self, resource_container, resource_type: str) -> Any:
        """
        根据资源类型从容器中获取资源对象

        Args:
            resource_container: 资源容器对象
            resource_type: 资源类型字符串

        Returns:
            资源对象
        """
        # 资源类型映射(转换为小写+下划线格式)
        type_mapping = {
            "AD": "ad",
            "AD_GROUP": "ad_group",
            "AD_GROUP_AD": "ad_group_ad",
            "AD_GROUP_ASSET": "ad_group_asset",
            "AD_GROUP_CRITERION": "ad_group_criterion",
            "ASSET": "asset",
            "CAMPAIGN": "campaign",
            "CAMPAIGN_BUDGET": "campaign_budget",
            "CAMPAIGN_CRITERION": "campaign_criterion",
            "CAMPAIGN_ASSET": "campaign_asset",
            # ... 可扩展更多类型
        }

        attr_name = type_mapping.get(resource_type)
        if attr_name and hasattr(resource_container, attr_name):
            return getattr(resource_container, attr_name)

        return None

    def _get_nested_attr(self, obj, field_path: str) -> Any:
        """
        获取嵌套属性值

        Args:
            obj: 对象
            field_path: 字段路径(例如: "budget.amount_micros")

        Returns:
            属性值
        """
        if obj is None:
            return None

        parts = field_path.split(".")
        current = obj

        for part in parts:
            if hasattr(current, part):
                current = getattr(current, part)
            else:
                return None

        return current

    def _serialize_value(self, value: Any) -> Any:
        """
        序列化值为JSON兼容格式

        Args:
            value: 原始值

        Returns:
            序列化后的值
        """
        if value is None:
            return None

        # 处理枚举类型
        if hasattr(value, "name"):
            return value.name

        # 处理日期时间
        if isinstance(value, datetime):
            return value.isoformat()

        # 处理protobuf消息
        if hasattr(value, "DESCRIPTOR"):
            return str(value)

        # 基础类型直接返回
        if isinstance(value, (str, int, float, bool)):
            return value

        # 其他类型转为字符串
        return str(value)

    def fetch_recent_changes(self, minutes: int = 15) -> List[Dict[str, Any]]:
        """
        获取最近N分钟的变更(便捷方法)

        Args:
            minutes: 时间范围(分钟)

        Returns:
            变更事件列表
        """
        end_time = datetime.now()
        start_time = end_time - timedelta(minutes=minutes)
        return self.fetch_change_events(start_time, end_time)
