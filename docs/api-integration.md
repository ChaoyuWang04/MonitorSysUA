# 前后端API对接文档

> **文档版本**: v1.0
> **创建日期**: 2025-11-13
> **后端**: FastAPI + PostgreSQL
> **前端**: React + Vite + Ant Design Pro

---

## 📑 目录

1. [API概览](#1-api概览)
2. [类型定义同步](#2-类型定义同步)
3. [API端点详情](#3-api端点详情)
4. [错误处理](#4-错误处理)
5. [认证与授权](#5-认证与授权)
6. [测试与调试](#6-测试与调试)
7. [最佳实践](#7-最佳实践)

---

## 1. API概览

### 1.1 基础信息

| 项目 | 值 |
|------|-----|
| **Base URL** | `http://localhost:8000` (开发) |
| **API前缀** | `/api` |
| **数据格式** | JSON |
| **字符编码** | UTF-8 |
| **时区** | Asia/Shanghai (UTC+8) |

### 1.2 API端点清单

| 端点 | 方法 | 功能 | 前端使用位置 |
|------|------|------|--------------|
| `/api/changes/` | GET | 获取变更记录列表 | ChangeLog页面 |
| `/api/changes/{id}` | GET | 获取单条变更详情 | DetailDrawer组件 |
| `/api/changes/stats/summary` | GET | 获取统计数据 | Dashboard页面 |
| `/api/changes/users/list` | GET | 获取用户列表 | ProTable筛选 |
| `/api/sync/trigger` | POST | 手动触发同步 | SyncButton组件 |
| `/api/sync/status` | GET | 获取同步状态 | Dashboard页面 |
| `/api/sync/stats` | GET | 获取同步统计 | Settings页面 |
| `/` | GET | 根路径健康检查 | 启动检查 |
| `/health` | GET | 健康检查 | Docker healthcheck |
| `/docs` | GET | Swagger文档 | 开发调试 |

---

## 2. 类型定义同步

### 2.1 工作流程

```
┌────────────────┐
│  后端Pydantic  │  1. 定义Pydantic模型
│     Models     │
└───────┬────────┘
        │
        │ 2. FastAPI自动生成
        ▼
┌────────────────┐
│  OpenAPI JSON  │  openapi.json
└───────┬────────┘
        │
        │ 3. openapi-typescript工具
        ▼
┌────────────────┐
│  TypeScript    │  src/services/api/types.ts
│     Types      │
└───────┬────────┘
        │
        │ 4. 前端使用
        ▼
┌────────────────┐
│  React组件     │  完全类型安全
└────────────────┘
```

### 2.2 后端生成OpenAPI规范

**创建 `backend/generate_openapi.py`**:

```python
"""
生成OpenAPI规范文件
"""

import json
import sys
sys.path.append('.')

from app.main import app

# 生成OpenAPI JSON
openapi_schema = app.openapi()

# 写入文件
output_path = '../frontend/openapi.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(openapi_schema, f, indent=2, ensure_ascii=False)

print(f'✅ OpenAPI规范已生成: {output_path}')
```

**执行命令**:

```bash
cd backend
python generate_openapi.py
```

### 2.3 前端生成TypeScript类型

**在 `frontend/package.json` 添加脚本**:

```json
{
  "scripts": {
    "generate:types": "openapi-typescript openapi.json -o src/services/api/types.ts"
  }
}
```

**执行命令**:

```bash
cd frontend
npm run generate:types
```

### 2.4 类型同步最佳实践

1. **每次后端修改API后执行类型同步**:

```bash
# 一键脚本
cd backend && python generate_openapi.py && cd ../frontend && npm run generate:types
```

2. **集成到Git工作流** (可选):

```bash
# .git/hooks/pre-commit
#!/bin/bash
cd backend && python generate_openapi.py
cd ../frontend && npm run generate:types
git add frontend/openapi.json frontend/src/services/api/types.ts
```

3. **CI/CD自动化** (可选):

```yaml
# .github/workflows/sync-types.yml
name: Sync API Types
on:
  push:
    paths:
      - 'backend/app/**/*.py'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate OpenAPI
        run: cd backend && python generate_openapi.py
      - name: Generate Types
        run: cd frontend && npm run generate:types
      - name: Create PR
        # 创建PR自动提交类型更新
```

---

## 3. API端点详情

### 3.1 变更记录列表

#### GET `/api/changes/`

**功能**: 获取变更记录列表，支持分页、筛选、排序

**请求参数**:

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `page` | int | 否 | 页码（从1开始） | 1 |
| `page_size` | int | 否 | 每页大小（1-100） | 20 |
| `user_email` | string | 否 | 筛选操作人 | optimizer@example.com |
| `resource_type` | string | 否 | 筛选资源类型 | CAMPAIGN |
| `operation_type` | string | 否 | 筛选操作类型 | UPDATE |
| `start_date` | date | 否 | 起始日期 | 2025-11-01 |
| `end_date` | date | 否 | 结束日期 | 2025-11-13 |

**响应示例**:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-11-13T14:23:15",
      "user_email": "optimizer@example.com",
      "operation_type": "UPDATE",
      "resource_type": "CAMPAIGN_BUDGET",
      "client_type": "WEB_INTERFACE",
      "field_count": 2
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "page_size": 20,
    "total_pages": 8
  }
}
```

**前端调用示例**:

```typescript
// src/services/api/changes.ts
export const fetchChangeLogs = async (
  params: FetchChangeLogsParams
): Promise<ChangeLogListResponse> => {
  return http.get('/changes/', { params })
}

// 使用
const result = await fetchChangeLogs({
  page: 1,
  page_size: 20,
  user_email: 'optimizer@example.com',
  resource_type: 'CAMPAIGN',
  start_date: '2025-11-01',
  end_date: '2025-11-13',
})
```

---

### 3.2 变更记录详情

#### GET `/api/changes/{id}`

**功能**: 获取单条变更记录的详细信息

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | UUID | 是 | 变更记录ID |

**响应示例**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-11-13T14:23:15",
  "user_email": "optimizer@example.com",
  "operation_type": "UPDATE",
  "resource_type": "CAMPAIGN_BUDGET",
  "resource_name": "customers/2766411035/campaignBudgets/12345",
  "client_type": "WEB_INTERFACE",
  "customer_id": "2766411035",
  "created_at": "2025-11-13T14:24:00",
  "field_changes": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "field_path": "amount_micros",
      "old_value": 50000000,
      "new_value": 80000000,
      "human_description": "预算从 $50.00 提升到 $80.00 (+$30.00, +60.0%)"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "field_path": "status",
      "old_value": "ENABLED",
      "new_value": "PAUSED",
      "human_description": "状态: 暂停投放"
    }
  ]
}
```

**前端调用示例**:

```typescript
// src/services/api/changes.ts
export const fetchChangeDetail = async (
  id: string
): Promise<ChangeLogDetailResponse> => {
  return http.get(`/changes/${id}`)
}

// 使用
const detail = await fetchChangeDetail('550e8400-e29b-41d4-a716-446655440000')
```

---

### 3.3 统计数据

#### GET `/api/changes/stats/summary`

**功能**: 获取变更记录的统计信息

**请求参数**: 无

**响应示例**:

```json
{
  "total_changes": 1523,
  "today_changes": 87,
  "by_resource_type": [
    { "resource_type": "CAMPAIGN", "count": 450 },
    { "resource_type": "AD", "count": 320 },
    { "resource_type": "ASSET", "count": 280 },
    { "resource_type": "CAMPAIGN_BUDGET", "count": 250 },
    { "resource_type": "AD_GROUP", "count": 223 }
  ],
  "by_operation_type": [
    { "operation_type": "UPDATE", "count": 890 },
    { "operation_type": "CREATE", "count": 420 },
    { "operation_type": "REMOVE", "count": 213 }
  ],
  "most_active_users": [
    { "user_email": "optimizer1@example.com", "operation_count": 345 },
    { "user_email": "optimizer2@example.com", "operation_count": 289 },
    { "user_email": "optimizer3@example.com", "operation_count": 234 },
    { "user_email": "optimizer4@example.com", "operation_count": 198 },
    { "user_email": "optimizer5@example.com", "operation_count": 157 }
  ]
}
```

**前端调用示例**:

```typescript
// src/services/api/stats.ts
export const fetchStats = async (): Promise<StatsResponse> => {
  return http.get('/changes/stats/summary')
}

// 使用
const stats = await fetchStats()
```

---

### 3.4 用户列表

#### GET `/api/changes/users/list`

**功能**: 获取所有操作人列表（用于筛选）

**请求参数**: 无

**响应示例**:

```json
[
  {
    "user_email": "optimizer1@example.com",
    "operation_count": 345
  },
  {
    "user_email": "optimizer2@example.com",
    "operation_count": 289
  }
]
```

**前端调用示例**:

```typescript
// src/services/api/changes.ts
export const fetchUsers = async (): Promise<string[]> => {
  const res = await http.get<Array<{ user_email: string }>>('/changes/users/list')
  return res.map((item) => item.user_email)
}

// 在ProTable中使用
columns: [
  {
    title: '操作人',
    dataIndex: 'user_email',
    valueType: 'select',
    request: async () => {
      const users = await fetchUsers()
      return users.map(email => ({ label: email, value: email }))
    },
  },
]
```

---

### 3.5 手动触发同步

#### POST `/api/sync/trigger`

**功能**: 手动触发一次数据同步

**请求参数**:

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| `minutes` | int | 否 | 同步最近N分钟的数据 | 15 |

**请求示例**:

```bash
curl -X POST "http://localhost:8000/api/sync/trigger?minutes=30"
```

**响应示例**:

```json
{
  "status": "success",
  "message": "同步成功，共同步 45 条记录",
  "synced_count": 45,
  "errors": []
}
```

**前端调用示例**:

```typescript
// src/services/api/sync.ts
export const triggerSync = async (
  minutes: number = 15
): Promise<SyncTriggerResponse> => {
  return http.post('/sync/trigger', null, {
    params: { minutes },
  })
}

// 使用
const result = await triggerSync(30)
message.success(result.message)
```

---

### 3.6 同步状态

#### GET `/api/sync/status`

**功能**: 获取数据同步状态

**请求参数**: 无

**响应示例**:

```json
{
  "last_sync_time": "2025-11-13T14:23:15",
  "next_sync_time": "2025-11-13T14:33:15",
  "is_running": false,
  "sync_interval_minutes": 10
}
```

**前端调用示例**:

```typescript
// src/services/api/sync.ts
export const fetchSyncStatus = async (): Promise<SyncStatusResponse> => {
  return http.get('/sync/status')
}

// 使用
const status = await fetchSyncStatus()
console.log('上次同步:', status.last_sync_time)
console.log('下次同步:', status.next_sync_time)
console.log('正在同步:', status.is_running)
```

---

## 4. 错误处理

### 4.1 错误响应格式

所有错误响应遵循统一格式:

```json
{
  "detail": "错误描述信息"
}
```

### 4.2 HTTP状态码

| 状态码 | 说明 | 前端处理 |
|--------|------|----------|
| 200 | 成功 | 正常处理数据 |
| 400 | 请求参数错误 | 显示错误提示 |
| 401 | 未授权 | 跳转登录页（暂未实现） |
| 403 | 拒绝访问 | 显示权限错误 |
| 404 | 资源不存在 | 显示404提示 |
| 500 | 服务器错误 | 显示服务器错误提示 |

### 4.3 前端错误处理

**在HTTP拦截器中统一处理**:

```typescript
// src/services/http.ts
http.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          message.error('请求参数错误')
          break
        case 401:
          message.error('未授权，请重新登录')
          // 跳转登录页
          break
        case 403:
          message.error('拒绝访问')
          break
        case 404:
          message.error('请求的资源不存在')
          break
        case 500:
          message.error('服务器错误')
          break
        default:
          message.error((data as any)?.detail || '请求失败')
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接')
    } else {
      message.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)
```

**在组件中处理特定错误**:

```typescript
try {
  const data = await fetchChangeLogs(params)
  // 成功处理
} catch (error) {
  // HTTP拦截器已经显示了通用错误提示
  // 这里可以做额外的错误处理
  console.error('获取变更记录失败:', error)
}
```

---

## 5. 认证与授权

### 5.1 当前状态

❌ **暂未实现认证系统**

当前版本为MVP，没有登录和权限管理，所有API可直接访问。

### 5.2 未来扩展（预留）

如果后续需要添加认证，建议方案：

**后端**:
- 使用JWT Token认证
- FastAPI的`Depends`依赖注入验证token

**前端**:
- 在HTTP拦截器中添加token到请求头
- 在localStorage存储token
- token过期时自动跳转登录页

**示例代码（预留）**:

```typescript
// 请求拦截器添加token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器处理401
if (status === 401) {
  localStorage.removeItem('token')
  window.location.href = '/login'
}
```

---

## 6. 测试与调试

### 6.1 Swagger文档

后端提供自动生成的Swagger文档，可用于测试API:

- **地址**: http://localhost:8000/docs
- **功能**:
  - 查看所有API端点
  - 查看请求/响应格式
  - 在线测试API调用

### 6.2 使用Postman测试

**导入OpenAPI规范**:

1. 打开Postman
2. Import → Link
3. 输入: http://localhost:8000/openapi.json
4. 自动生成所有API的测试集合

**常用测试**:

```
GET http://localhost:8000/api/changes/?page=1&page_size=10
GET http://localhost:8000/api/changes/{id}
GET http://localhost:8000/api/changes/stats/summary
POST http://localhost:8000/api/sync/trigger?minutes=15
```

### 6.3 浏览器DevTools调试

**Network标签**:
- 查看所有HTTP请求
- 查看请求参数和响应数据
- 查看请求耗时

**Console标签**:
- HTTP拦截器会自动打印日志
- 🚀 请求: GET /api/changes
- ✅ 响应: {...data}
- ❌ 错误: {...error}

**React DevTools**:
- 查看组件props
- 查看组件state
- 查看Hooks值

### 6.4 常见调试场景

**场景1: API返回数据但前端不显示**

```typescript
// 检查数据格式是否匹配
console.log('API返回:', data)
console.log('期望格式:', '{ data: [], meta: { total: 0 } }')

// 检查ProTable的request函数返回格式
return {
  data: result.data,  // 必须是data字段
  success: true,      // 必须是success字段
  total: result.meta.total, // 必须是total字段
}
```

**场景2: 类型错误**

```bash
# 重新生成类型
cd backend && python generate_openapi.py
cd ../frontend && npm run generate:types

# 检查类型是否匹配
npm run type-check
```

**场景3: 跨域错误**

```typescript
// 检查vite.config.ts中的proxy配置
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

---

## 7. 最佳实践

### 7.1 API调用封装

**✅ 好的做法**:

```typescript
// 1. 在services/api/中封装
export const fetchChangeLogs = async (params: FetchParams) => {
  return http.get('/changes/', { params })
}

// 2. 创建Hook封装业务逻辑
export const useChangeLogs = (params: FetchParams) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  // ...
  return { data, loading, refetch }
}

// 3. 在组件中使用Hook
const { data, loading } = useChangeLogs({ page: 1 })
```

**❌ 不好的做法**:

```typescript
// 直接在组件中调用http
const data = await http.get('/api/changes')
```

### 7.2 类型安全

**✅ 好的做法**:

```typescript
// 使用自动生成的类型
import type { ChangeLogListResponse } from '@/services/api/types'

const result: ChangeLogListResponse = await fetchChangeLogs()
```

**❌ 不好的做法**:

```typescript
// 使用any
const result: any = await fetchChangeLogs()
```

### 7.3 错误处理

**✅ 好的做法**:

```typescript
try {
  const data = await fetchChangeLogs(params)
  return data
} catch (error) {
  console.error('获取失败:', error)
  return null // 或返回默认值
}
```

**❌ 不好的做法**:

```typescript
const data = await fetchChangeLogs(params)
// 不处理错误，可能导致应用崩溃
```

### 7.4 请求参数

**✅ 好的做法**:

```typescript
// 参数验证
const params = {
  page: Math.max(1, page),
  page_size: Math.min(100, Math.max(1, pageSize)),
  user_email: userEmail?.trim(),
}

const data = await fetchChangeLogs(params)
```

**❌ 不好的做法**:

```typescript
// 直接传递可能无效的参数
const data = await fetchChangeLogs({
  page: -1, // 无效
  page_size: 1000, // 超出限制
})
```

### 7.5 缓存策略

**场景1: 频繁请求的数据（如统计数据）**

```typescript
// 使用轮询Hook，避免频繁手动调用
usePolling(() => refetch(), { interval: 60000 })
```

**场景2: 不常变化的数据（如用户列表）**

```typescript
// 在localStorage缓存
const cachedUsers = localStorage.getItem('users')
if (cachedUsers && Date.now() - lastFetch < 3600000) {
  return JSON.parse(cachedUsers)
}
```

---

## 8. 故障排查指南

### 8.1 后端未启动

**症状**: `ERR_CONNECTION_REFUSED`

**排查**:

```bash
# 检查后端是否运行
docker-compose ps backend

# 查看后端日志
docker-compose logs backend

# 重启后端
docker-compose restart backend
```

### 8.2 API返回404

**症状**: `404 Not Found`

**排查**:

1. 检查URL是否正确
2. 检查API前缀（应该是`/api/`）
3. 查看Swagger文档确认端点存在

### 8.3 数据格式不匹配

**症状**: ProTable不显示数据

**排查**:

```typescript
// 在request函数中添加日志
request: async (params) => {
  const result = await fetchChangeLogs(params)
  console.log('API返回:', result)

  // 检查是否符合ProTable要求的格式
  return {
    data: result.data,     // 必须
    success: true,         // 必须
    total: result.meta.total, // 必须
  }
}
```

### 8.4 类型错误

**症状**: TypeScript报错

**解决**:

```bash
# 重新生成类型
cd backend && python generate_openapi.py
cd ../frontend && npm run generate:types

# 检查类型
npm run type-check
```

---

## 9. 总结

### 9.1 关键要点

✅ **类型安全**: 使用openapi-typescript自动生成类型
✅ **统一封装**: 在services/api/中封装所有API调用
✅ **错误处理**: 在HTTP拦截器中统一处理错误
✅ **最佳实践**: 使用Hook封装业务逻辑

### 9.2 快速参考

```typescript
// 1. 调用API
import { fetchChangeLogs } from '@/services/api/changes'
const data = await fetchChangeLogs({ page: 1, page_size: 20 })

// 2. 使用Hook
import { useChangeLogs } from '@/hooks/useChangeLogs'
const { data, loading, refetch } = useChangeLogs({ page: 1 })

// 3. ProTable集成
<ProTable
  request={async (params) => {
    const result = await fetchChangeLogs(params)
    return { data: result.data, success: true, total: result.meta.total }
  }}
/>
```

---

**文档结束**
