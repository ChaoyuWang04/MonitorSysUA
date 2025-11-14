"""
字段变更明细表模型
记录每个操作中具体哪些字段发生了变化
"""

from sqlalchemy import Column, String, Text, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class FieldChange(Base):
    """
    字段变更明细表
    存储字段级别的变更信息(old_value -> new_value)
    """

    __tablename__ = "field_changes"

    # 主键
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        comment="主键UUID",
    )

    # 外键:关联到change_logs表
    change_log_id = Column(
        UUID(as_uuid=True),
        ForeignKey("change_logs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="关联的变更记录ID",
    )

    # 字段路径(例如: "budget.amount_micros")
    field_path = Column(
        String(255),
        nullable=False,
        comment="字段路径",
    )

    # 旧值(JSON格式,支持复杂类型)
    old_value = Column(
        JSONB,
        nullable=True,
        comment="变更前的值",
    )

    # 新值(JSON格式)
    new_value = Column(
        JSONB,
        nullable=True,
        comment="变更后的值",
    )

    # 人类可读描述
    human_description = Column(
        Text,
        nullable=True,
        comment="人类可读的变更描述,如'预算从$50提升到$80'",
    )

    # 关系:多个字段变更属于一个变更记录
    change_log = relationship(
        "ChangeLog",
        back_populates="field_changes",
    )

    # 索引
    __table_args__ = (
        Index("idx_change_log_field", "change_log_id", "field_path"),
    )

    def __repr__(self):
        return (
            f"<FieldChange(id={self.id}, "
            f"field={self.field_path}, "
            f"old={self.old_value}, "
            f"new={self.new_value})>"
        )
