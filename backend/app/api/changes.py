"""
变更记录API端点
提供变更记录的查询、统计等功能
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID

from app.database import get_db
from app.models.change_log import ChangeLog
from app.models.field_change import FieldChange
from app.schemas.change_log import (
    ChangeLogResponse,
    ChangeLogListItem,
    ChangeLogListResponse,
    PaginationMeta,
    ChangeLogStatsResponse,
    ResourceTypeStats,
    OperationTypeStats,
    UserStatsResponse,
)

router = APIRouter()


@router.get("/", response_model=ChangeLogListResponse)
async def list_changes(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    user_email: Optional[str] = Query(None, description="筛选操作人"),
    resource_type: Optional[str] = Query(None, description="筛选资源类型"),
    operation_type: Optional[str] = Query(None, description="筛选操作类型"),
    start_date: Optional[date] = Query(None, description="起始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取变更记录列表(带分页和筛选)

    支持的筛选条件:
    - user_email: 操作人邮箱
    - resource_type: 资源类型(CAMPAIGN, AD, ASSET等)
    - operation_type: 操作类型(CREATE, UPDATE, REMOVE)
    - start_date/end_date: 日期范围
    """

    # 构建查询条件
    conditions = []

    if user_email:
        conditions.append(ChangeLog.user_email == user_email)

    if resource_type:
        conditions.append(ChangeLog.resource_type == resource_type)

    if operation_type:
        conditions.append(ChangeLog.operation_type == operation_type)

    if start_date:
        conditions.append(ChangeLog.timestamp >= datetime.combine(start_date, datetime.min.time()))

    if end_date:
        conditions.append(ChangeLog.timestamp <= datetime.combine(end_date, datetime.max.time()))

    # 查询总数
    count_query = select(func.count(ChangeLog.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # 查询数据(按时间倒序)
    offset = (page - 1) * page_size
    query = (
        select(
            ChangeLog.id,
            ChangeLog.timestamp,
            ChangeLog.user_email,
            ChangeLog.operation_type,
            ChangeLog.resource_type,
            ChangeLog.client_type,
            func.count(FieldChange.id).label("field_count"),
        )
        .outerjoin(FieldChange, ChangeLog.id == FieldChange.change_log_id)
        .group_by(ChangeLog.id)
        .order_by(desc(ChangeLog.timestamp))
        .offset(offset)
        .limit(page_size)
    )

    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    rows = result.all()

    # 构建响应
    data = [
        ChangeLogListItem(
            id=row[0],
            timestamp=row[1],
            user_email=row[2],
            operation_type=row[3],
            resource_type=row[4],
            client_type=row[5],
            field_count=row[6],
        )
        for row in rows
    ]

    meta = PaginationMeta(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

    return ChangeLogListResponse(data=data, meta=meta)


@router.get("/{change_id}", response_model=ChangeLogResponse)
async def get_change_detail(
    change_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    获取单个变更记录的详细信息(包含字段变更明细)
    """

    # 查询变更记录(eager load字段变更)
    query = (
        select(ChangeLog)
        .options(selectinload(ChangeLog.field_changes))
        .where(ChangeLog.id == change_id)
    )

    result = await db.execute(query)
    change_log = result.scalar_one_or_none()

    if not change_log:
        raise HTTPException(status_code=404, detail="变更记录不存在")

    return ChangeLogResponse.model_validate(change_log)


@router.get("/stats/summary", response_model=ChangeLogStatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    获取统计数据

    包含:
    - 总变更数
    - 今日变更数
    - 按资源类型统计
    - 按操作类型统计
    - 最活跃用户Top 5
    """

    # 总变更数
    total_result = await db.execute(select(func.count(ChangeLog.id)))
    total_changes = total_result.scalar_one()

    # 今日变更数
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(func.count(ChangeLog.id)).where(ChangeLog.timestamp >= today_start)
    )
    today_changes = today_result.scalar_one()

    # 按资源类型统计
    resource_query = (
        select(ChangeLog.resource_type, func.count(ChangeLog.id))
        .group_by(ChangeLog.resource_type)
        .order_by(desc(func.count(ChangeLog.id)))
    )
    resource_result = await db.execute(resource_query)
    by_resource = [
        ResourceTypeStats(resource_type=row[0], count=row[1])
        for row in resource_result.all()
    ]

    # 按操作类型统计
    operation_query = (
        select(ChangeLog.operation_type, func.count(ChangeLog.id))
        .group_by(ChangeLog.operation_type)
        .order_by(desc(func.count(ChangeLog.id)))
    )
    operation_result = await db.execute(operation_query)
    by_operation = [
        OperationTypeStats(operation_type=row[0], count=row[1])
        for row in operation_result.all()
    ]

    # 最活跃用户Top 5
    user_query = (
        select(ChangeLog.user_email, func.count(ChangeLog.id))
        .group_by(ChangeLog.user_email)
        .order_by(desc(func.count(ChangeLog.id)))
        .limit(5)
    )
    user_result = await db.execute(user_query)
    most_active_users = [
        UserStatsResponse(user_email=row[0], operation_count=row[1])
        for row in user_result.all()
    ]

    return ChangeLogStatsResponse(
        total_changes=total_changes,
        today_changes=today_changes,
        by_resource_type=by_resource,
        by_operation_type=by_operation,
        most_active_users=most_active_users,
    )


@router.get("/users/list", response_model=List[UserStatsResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
):
    """
    获取所有操作人列表(带操作次数)
    """

    query = (
        select(ChangeLog.user_email, func.count(ChangeLog.id))
        .group_by(ChangeLog.user_email)
        .order_by(ChangeLog.user_email)
    )

    result = await db.execute(query)
    return [
        UserStatsResponse(user_email=row[0], operation_count=row[1])
        for row in result.all()
    ]
