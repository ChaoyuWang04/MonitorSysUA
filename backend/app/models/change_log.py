"""
操作记录主表模型
记录Google Ads账户中的所有变更操作
"""

from sqlalchemy import Column, String, DateTime, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class ChangeLog(Base):
    """
    操作记录表
    存储从Google Ads API获取的change_event数据
    """

    __tablename__ = "change_logs"

    # 主键
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        comment="主键UUID",
    )

    # 操作时间(来自Google Ads API)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="操作发生时间",
    )

    # 操作人信息
    user_email = Column(
        String(255),
        nullable=False,
        index=True,
        comment="操作人邮箱",
    )

    # 操作类型
    operation_type = Column(
        String(50),
        nullable=False,
        comment="操作类型: CREATE/UPDATE/REMOVE",
    )

    # 资源信息
    resource_type = Column(
        String(100),
        nullable=False,
        index=True,
        comment="资源类型: CAMPAIGN/AD/ASSET等",
    )

    resource_name = Column(
        String(500),
        nullable=False,
        comment="资源标识符(Google Ads resource name)",
    )

    # 客户端类型
    client_type = Column(
        String(50),
        nullable=True,
        comment="操作来源: WEB_INTERFACE/API/GOOGLE_ADS_EDITOR等",
    )

    # Google Ads账户ID
    customer_id = Column(
        String(50),
        nullable=False,
        comment="Google Ads客户ID",
    )

    # 记录创建时间(系统时间)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
        comment="记录创建时间",
    )

    # 关系:一个变更记录可以有多个字段变更
    field_changes = relationship(
        "FieldChange",
        back_populates="change_log",
        cascade="all, delete-orphan",
    )

    # 复合索引:用于查询和去重
    __table_args__ = (
        Index(
            "idx_unique_change",
            "customer_id",
            "timestamp",
            "resource_name",
            "operation_type",
            unique=True,
        ),
        Index("idx_timestamp_desc", timestamp.desc()),
        Index("idx_user_resource", "user_email", "resource_type"),
    )

    def __repr__(self):
        return (
            f"<ChangeLog(id={self.id}, "
            f"timestamp={self.timestamp}, "
            f"user={self.user_email}, "
            f"operation={self.operation_type}, "
            f"resource={self.resource_type})>"
        )
