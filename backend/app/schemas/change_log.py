"""
变更记录相关的Pydantic模型
"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, Any
from uuid import UUID


class FieldChangeResponse(BaseModel):
    """字段变更响应模型"""

    id: UUID
    field_path: str = Field(..., description="字段路径")
    old_value: Optional[Any] = Field(None, description="旧值")
    new_value: Optional[Any] = Field(None, description="新值")
    human_description: Optional[str] = Field(None, description="人类可读描述")

    model_config = ConfigDict(from_attributes=True)


class ChangeLogResponse(BaseModel):
    """变更记录响应模型(详细信息)"""

    id: UUID
    timestamp: datetime = Field(..., description="操作时间")
    user_email: str = Field(..., description="操作人邮箱")
    operation_type: str = Field(..., description="操作类型")
    resource_type: str = Field(..., description="资源类型")
    resource_name: str = Field(..., description="资源标识符")
    client_type: Optional[str] = Field(None, description="客户端类型")
    customer_id: str = Field(..., description="Google Ads客户ID")
    created_at: datetime = Field(..., description="记录创建时间")
    field_changes: list[FieldChangeResponse] = Field(
        default_factory=list, description="字段变更列表"
    )

    model_config = ConfigDict(from_attributes=True)


class ChangeLogListItem(BaseModel):
    """变更记录列表项(简化信息,用于表格展示)"""

    id: UUID
    timestamp: datetime
    user_email: str
    operation_type: str
    resource_type: str
    client_type: Optional[str]
    field_count: int = Field(..., description="变更字段数量")

    model_config = ConfigDict(from_attributes=True)


class PaginationMeta(BaseModel):
    """分页元数据"""

    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    total_pages: int = Field(..., description="总页数")


class ChangeLogListResponse(BaseModel):
    """变更记录列表响应(带分页)"""

    data: list[ChangeLogListItem] = Field(..., description="数据列表")
    meta: PaginationMeta = Field(..., description="分页信息")


class ResourceTypeStats(BaseModel):
    """资源类型统计"""

    resource_type: str
    count: int


class OperationTypeStats(BaseModel):
    """操作类型统计"""

    operation_type: str
    count: int


class ChangeLogStatsResponse(BaseModel):
    """变更记录统计响应"""

    total_changes: int = Field(..., description="总变更数")
    today_changes: int = Field(..., description="今日变更数")
    by_resource_type: list[ResourceTypeStats] = Field(
        ..., description="按资源类型统计"
    )
    by_operation_type: list[OperationTypeStats] = Field(
        ..., description="按操作类型统计"
    )
    most_active_users: list["UserStatsResponse"] = Field(
        ..., description="最活跃用户"
    )


class UserStatsResponse(BaseModel):
    """用户统计信息"""

    user_email: str
    operation_count: int = Field(..., description="操作次数")


class SyncStatusResponse(BaseModel):
    """数据同步状态响应"""

    last_sync_time: Optional[datetime] = Field(None, description="上次同步时间")
    next_sync_time: Optional[datetime] = Field(None, description="下次同步时间")
    is_running: bool = Field(..., description="是否正在同步")
    sync_interval_minutes: int = Field(..., description="同步间隔(分钟)")


class SyncTriggerResponse(BaseModel):
    """手动触发同步响应"""

    status: str = Field(..., description="状态: success/error")
    message: str = Field(..., description="消息")
    synced_count: int = Field(0, description="同步的记录数")
    errors: list[str] = Field(default_factory=list, description="错误列表")
