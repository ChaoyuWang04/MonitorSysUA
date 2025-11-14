"""
字段变更人类可读转换器
将Google Ads API的字段变更转换为易懂的中文描述
"""

from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class FieldHumanizer:
    """
    字段变更人类可读转换器
    """

    # 字段名称中文映射
    FIELD_NAMES = {
        "name": "名称",
        "status": "状态",
        "amount_micros": "预算金额",
        "delivery_method": "投放方式",
        "bidding_strategy_type": "竞价策略",
        "target_cpa_micros": "目标CPA",
        "target_roas": "目标ROAS",
        "cpc_bid_micros": "CPC出价",
        "location": "地理位置",
        "language": "语言",
        "ad_rotation_mode": "广告轮播方式",
        "type": "类型",
        "url": "URL",
        "final_urls": "最终URL",
        "tracking_url_template": "跟踪模板",
    }

    # 状态值中文映射
    STATUS_NAMES = {
        "ENABLED": "启用",
        "PAUSED": "暂停",
        "REMOVED": "已删除",
        "UNKNOWN": "未知",
    }

    # 竞价策略中文映射
    BIDDING_STRATEGY_NAMES = {
        "TARGET_CPA": "目标CPA",
        "TARGET_ROAS": "目标ROAS",
        "MAXIMIZE_CONVERSIONS": "尽可能提高转化次数",
        "MAXIMIZE_CONVERSION_VALUE": "尽可能提高转化价值",
        "TARGET_SPEND": "尽可能争取更多点击",
        "MANUAL_CPC": "手动CPC",
        "MANUAL_CPM": "手动CPM",
    }

    @staticmethod
    def humanize(
        field_path: str, old_value: Any, new_value: Any, resource_type: str
    ) -> str:
        """
        将字段变更转换为人类可读描述

        Args:
            field_path: 字段路径
            old_value: 旧值
            new_value: 新值
            resource_type: 资源类型

        Returns:
            人类可读的变更描述
        """
        try:
            # 特殊字段处理
            if "amount_micros" in field_path:
                return FieldHumanizer._humanize_amount(old_value, new_value)

            if "status" in field_path:
                return FieldHumanizer._humanize_status(old_value, new_value)

            if "bidding_strategy" in field_path:
                return FieldHumanizer._humanize_bidding_strategy(
                    old_value, new_value
                )

            if "target_cpa" in field_path:
                return FieldHumanizer._humanize_target_cpa(old_value, new_value)

            if "target_roas" in field_path:
                return FieldHumanizer._humanize_target_roas(old_value, new_value)

            if "cpc_bid" in field_path:
                return FieldHumanizer._humanize_cpc_bid(old_value, new_value)

            # 通用字段处理
            field_name = FieldHumanizer.FIELD_NAMES.get(
                field_path.split(".")[-1], field_path
            )

            if old_value == new_value:
                return f"{field_name}: 无变化"

            return f"{field_name}: {old_value} → {new_value}"

        except Exception as e:
            logger.warning(f"⚠️ 字段人类化失败 ({field_path}): {e}")
            return f"{field_path}: {old_value} → {new_value}"

    @staticmethod
    def _humanize_amount(old_value: Any, new_value: Any) -> str:
        """金额字段(micros转美元)"""
        try:
            old_usd = float(old_value) / 1_000_000 if old_value else 0
            new_usd = float(new_value) / 1_000_000 if new_value else 0

            if old_usd == 0 and new_usd > 0:
                return f"预算设置为 ${new_usd:.2f}"
            elif new_usd == 0 and old_usd > 0:
                return f"预算移除(原 ${old_usd:.2f})"
            elif new_usd > old_usd:
                diff = new_usd - old_usd
                percent = (diff / old_usd * 100) if old_usd > 0 else 0
                return f"预算从 ${old_usd:.2f} 提升到 ${new_usd:.2f} (+${diff:.2f}, +{percent:.1f}%)"
            else:
                diff = old_usd - new_usd
                percent = (diff / old_usd * 100) if old_usd > 0 else 0
                return f"预算从 ${old_usd:.2f} 降低到 ${new_usd:.2f} (-${diff:.2f}, -{percent:.1f}%)"

        except Exception:
            return f"预算: {old_value} → {new_value}"

    @staticmethod
    def _humanize_status(old_value: Any, new_value: Any) -> str:
        """状态字段"""
        old_status = FieldHumanizer.STATUS_NAMES.get(str(old_value), str(old_value))
        new_status = FieldHumanizer.STATUS_NAMES.get(str(new_value), str(new_value))

        if old_status == "启用" and new_status == "暂停":
            return "状态: 暂停投放"
        elif old_status == "暂停" and new_status == "启用":
            return "状态: 恢复投放"
        elif new_status == "已删除":
            return "状态: 删除"
        else:
            return f"状态: {old_status} → {new_status}"

    @staticmethod
    def _humanize_bidding_strategy(old_value: Any, new_value: Any) -> str:
        """竞价策略字段"""
        old_strategy = FieldHumanizer.BIDDING_STRATEGY_NAMES.get(
            str(old_value), str(old_value)
        )
        new_strategy = FieldHumanizer.BIDDING_STRATEGY_NAMES.get(
            str(new_value), str(new_value)
        )

        return f"竞价策略: {old_strategy} → {new_strategy}"

    @staticmethod
    def _humanize_target_cpa(old_value: Any, new_value: Any) -> str:
        """目标CPA字段"""
        try:
            old_cpa = float(old_value) / 1_000_000 if old_value else 0
            new_cpa = float(new_value) / 1_000_000 if new_value else 0

            return f"目标CPA: ${old_cpa:.2f} → ${new_cpa:.2f}"
        except Exception:
            return f"目标CPA: {old_value} → {new_value}"

    @staticmethod
    def _humanize_target_roas(old_value: Any, new_value: Any) -> str:
        """目标ROAS字段"""
        return f"目标ROAS: {old_value} → {new_value}"

    @staticmethod
    def _humanize_cpc_bid(old_value: Any, new_value: Any) -> str:
        """CPC出价字段"""
        try:
            old_bid = float(old_value) / 1_000_000 if old_value else 0
            new_bid = float(new_value) / 1_000_000 if new_value else 0

            return f"CPC出价: ${old_bid:.2f} → ${new_bid:.2f}"
        except Exception:
            return f"CPC出价: {old_value} → {new_value}"
