## 零、如何使用本文档 / 与Claude协作规范

写在最一开始:
think ultra hard and use chrome dev tool, 请主动思考修改这个系统会涉及到的影响, 并且你要永远逐步阐述推理过程,以及分析我们该如何将这一点落地的非常的robust,同时请向我提问以确保我们对于系统的期待是一致的,我们不仅要实现这个新的feature并且要确保它和其他系统组件的互动是完美的.

### 文档定位与作用
本文档是Claude的**核心上下文**,在每次对话时自动加载。它记录了：
- 当前系统架构、模块职责、数据结构
- 当前系统操作流程、命名规范、路线图以供参考

### 协作流程规范（模糊需求处理机制）

当你提出需求时,我会按以下**架构师模式**工作:

#### 第1步: 需求分析阶段
- **深入理解**: 探索你的业务目标、技术约束、期望效果
- **澄清模糊**: 主动询问不明确的部分,避免基于假设开发
- **调研背景**: 查阅相关代码、文档、业界最佳实践

#### 第2步: 方案设计阶段
- **多方案对比**: 提出2-3个候选方案,列出各自优劣
- **技术讲解**: 阐述核心技术原理、架构设计思路
- **教学模式**: 如涉及新技术,先教会你相关背景知识
- **风险评估**: 说明潜在风险、性能影响、维护成本

#### 第3步: 实施细节商议
- **确认方案**: 你选择方案后,共同敲定实施细节
- **接口设计**: 数据结构、API定义、函数签名
- **文件组织**: 新模块位置、命名规范、依赖关系
- **分阶段计划**: 将大任务拆分为可交付的小步骤

#### 第4步: 编码与验证
- **遵循规范**: 严格按照项目现有代码风格和命名约定
- **安全优先**: 主动检查安全漏洞(SQL注入、XSS、命令注入等)
- **测试验证**: 提供测试步骤或脚本,确保功能正常
- **文档更新**: 更新CLAUDE.md对应章节,补充新增功能

#### 第5步: 更新日志留痕 ⭐
**重要**: 每次大更新完成后,必须在`docs/changelog/`记录详细更新日志
- **触发条件**: 新增核心模块、架构变更、Breaking Changes、重要优化
- **日志格式**: 参考`docs/changelog/README.md`规范
- **包含内容**: 功能摘要(面向产品) + 技术细节(面向开发者) + 迁移指南

### 使用场景示例

<details>
<summary>示例: 模糊需求"我想优化生成速度"</summary>

**我的响应流程**:
1. **需求分析**: 询问当前瓶颈在哪个环节(Prompt生成? API调用? 图片拼接?)
2. **方案设计**:
   - 方案A: 引入缓存机制(适合重复生成)
   - 方案B: 批量并发请求(适合大量首次生成)
   - 方案C: 切换更快的Provider(需要测试)
3. **技术讲解**: 说明缓存策略(LRU、TTL)、并发控制(线程池、限流)
4. **实施**: 你选择方案后,共同确定缓存键设计、过期策略
5. **文档**: 更新CLAUDE.md的性能指标,在changelog记录优化效果
</details>

<details>
<summary>示例2: 明确需求"添加新的AI图片Provider"</summary>

### 提问最佳实践

**清晰的提问**:
- ✅ "我想让系统支持视频素材生成,需要改哪些模块?"
- ✅ "当前批量生成54组合需要10分钟,能优化到5分钟吗?"
- ✅ "A/B测试数据应该存在数据库还是JSON文件?"

**模糊的提问**:
- ⚠️ "能不能优化一下?" (什么方面的优化?)
- ⚠️ "加个新功能" (什么功能?解决什么问题?)
- ⚠️ "这个不太好" (哪里不好?期望是什么?)

**我的承诺**: 即使提问模糊,我也会主动澄清,确保理解你的真实需求。

---

---

## 一、系统概览

### 项目定位
MonitorSysUA 是一个 Google Ads 优化师操作监控系统,实时追踪和展示账户中所有操作记录,以类 Notion 多维表格形式呈现。

### 核心价值
- **操作透明化**: 记录所有优化师的调整动作(预算、目标、地区、素材等)
- **历史可追溯**: 完整的变更历史和字段级别对比
- **数据可视化**: 统计图表、趋势分析、操作人排行

### 技术栈总览

```
┌─────────────────────────────────────────────────────┐
│ 前端: Vite + React 18 + TypeScript                  │
│ - UI框架: Ant Design 5.x + ProComponents            │
│ - 状态管理: Zustand 4.x (轻量级)                    │
│ - HTTP客户端: Axios                                  │
│ - 图表: Apache ECharts 5.x                          │
│ - 路由: React Router 6                               │
│ - 类型安全: openapi-typescript (后端类型同步)       │
│ - 开发服务器: Vite Dev Server (localhost:3000)     │
└────────────────┬────────────────────────────────────┘
                 │ REST API (JSON)
┌────────────────▼────────────────────────────────────┐
│ 后端: FastAPI + Python 3.12                         │
│ - ORM: SQLAlchemy 2.0 (async)                       │
│ - 定时任务: APScheduler                              │
│ - API集成: google-ads v28.4.0                        │
│ - 数据验证: Pydantic                                 │
│ - 开发服务器: Uvicorn (localhost:8000)              │
└────────────────┬────────────────────────────────────┘
                 │ SQL
┌────────────────▼────────────────────────────────────┐
│ 数据库: PostgreSQL 16 (本地安装)                     │
│ - change_logs: 操作记录主表                          │
│ - field_changes: 字段变更明细表                      │
│ - 索引: 复合唯一索引防止重复                         │
│ - 连接: localhost:5432                               │
└─────────────────────────────────────────────────────┘
```

### 本地开发环境要求

| 组件 | 版本 | 安装说明 |
|------|------|----------|
| **Python** | 3.12+ | 使用 pyenv 或官方安装包 |
| **PostgreSQL** | 16+ | 使用 Homebrew (Mac) 或官方安装包 |
| **Node.js** | 18+ | 使用 nvm 或官方安装包 |
| **Git** | 2.x | 系统自带或官方安装 |

---

## 二、后端架构 (✅ Phase 1 已完成)

### 2.1 目录结构

```
backend/
├── app/
│   ├── main.py                    # FastAPI入口,注册路由
│   ├── config.py                  # 环境变量配置
│   ├── database.py                # 数据库连接池
│   ├── models/                    # SQLAlchemy模型
│   │   ├── change_log.py         # 操作记录表
│   │   └── field_change.py       # 字段变更明细表
│   ├── schemas/                   # Pydantic验证模型
│   │   └── change_log.py         # API请求/响应schema
│   ├── api/                       # API路由
│   │   ├── changes.py            # 变更记录CRUD
│   │   └── sync.py               # 数据同步控制
│   ├── services/                  # 业务逻辑
│   │   ├── google_ads_service.py # Google Ads API客户端
│   │   ├── sync_service.py       # 数据同步逻辑
│   │   └── field_humanizer.py    # 字段人类化
│   └── tasks/                     # 定时任务
│       └── scheduler.py          # APScheduler配置
├── requirements.txt               # Python依赖
└── .env                           # 环境变量配置
```

### 2.2 数据库设计

#### change_logs (操作记录主表)
```sql
CREATE TABLE change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,      -- 操作发生时间
    user_email VARCHAR(255) NOT NULL,                 -- 操作人邮箱
    operation_type VARCHAR(50) NOT NULL,              -- CREATE/UPDATE/REMOVE
    resource_type VARCHAR(100) NOT NULL,              -- CAMPAIGN/AD/BUDGET等
    resource_name VARCHAR(500) NOT NULL,              -- Google Ads资源标识符
    client_type VARCHAR(50),                          -- WEB/API/EDITOR
    customer_id VARCHAR(50) NOT NULL,                 -- 客户账户ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 复合唯一索引防止重复记录
    UNIQUE(customer_id, resource_name, timestamp, operation_type)
);

-- 查询优化索引
CREATE INDEX idx_timestamp ON change_logs(timestamp DESC);
CREATE INDEX idx_user_email ON change_logs(user_email);
CREATE INDEX idx_resource_type ON change_logs(resource_type);
```

#### field_changes (字段变更明细表)
```sql
CREATE TABLE field_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_log_id UUID NOT NULL REFERENCES change_logs(id) ON DELETE CASCADE,
    field_path VARCHAR(255) NOT NULL,                 -- 字段路径(如 budget.amount_micros)
    old_value JSONB,                                   -- 旧值(支持复杂类型)
    new_value JSONB,                                   -- 新值
    human_description TEXT,                            -- 人类可读描述

    -- 外键索引
    FOREIGN KEY (change_log_id) REFERENCES change_logs(id)
);

CREATE INDEX idx_change_log_id ON field_changes(change_log_id);
```

### 2.3 核心API端点

| 端点 | 方法 | 说明 | 关键参数 |
|------|------|------|----------|
| `/api/changes/` | GET | 变更列表(分页) | `page`, `page_size`, `user_email`, `resource_type`, `start_date`, `end_date`, `sort_by` |
| `/api/changes/{id}` | GET | 单条变更详情 | 包含所有字段变更明细 |
| `/api/changes/stats/summary` | GET | 统计数据 | 总记录数、操作人数、资源类型分布 |
| `/api/changes/users/list` | GET | 操作人列表 | 用于前端筛选器 |
| `/api/sync/trigger` | POST | 手动触发同步 | `minutes` (同步时间范围) |
| `/api/sync/status` | GET | 同步状态 | 是否正在同步、最后同步时间 |
| `/api/sync/stats` | GET | 同步统计 | 成功/失败次数、平均耗时 |

### 2.4 Google Ads API集成

**`backend/app/services/google_ads_service.py`** 核心方法:

```python
class GoogleAdsService:
    def fetch_change_events(self,
                           customer_id: str,
                           start_date: datetime,
                           end_date: datetime) -> List[Dict]:
        """
        从Google Ads API获取change_event数据

        支持20+种资源类型:
        - CAMPAIGN, CAMPAIGN_BUDGET, AD_GROUP, AD
        - BIDDING_STRATEGY, KEYWORD, ASSET, ASSET_SET
        - CAMPAIGN_CRITERION, AD_GROUP_CRITERION
        - ... (完整列表见代码)

        返回: 解析后的变更事件列表
        """

    def _parse_change_event(self, event) -> Dict:
        """解析protobuf格式的change_event"""

    def _extract_field_changes(self,
                               old_resource,
                               new_resource,
                               resource_type: str) -> List[Dict]:
        """提取字段级别的变更信息"""
```

**字段人类化** (`field_humanizer.py`):
- 预算金额: `12000000 micros` → `$12.00`
- 状态: `ENABLED` → `启用`, `PAUSED` → `暂停`
- 百分比: 计算变化幅度 `+15.3%`

### 2.5 定时任务

**APScheduler配置** (`backend/app/tasks/scheduler.py`):
```python
# 每10分钟执行一次增量同步
scheduler.add_job(
    sync_task,
    trigger='interval',
    minutes=config.SYNC_INTERVAL_MINUTES,  # 默认10分钟
    id='google_ads_sync',
    replace_existing=True
)
```

**同步逻辑** (`backend/app/services/sync_service.py`):
1. 查询最后同步时间,确定时间范围
2. 调用 `GoogleAdsService.fetch_change_events()`
3. 使用 `ON CONFLICT` upsert 防止重复
4. 记录同步统计(成功数、失败数、耗时)

---

## 三、前端架构 (⏳ Phase 2 设计完成)

> 完整设计文档见: `/docs/frontend-design.md`
> API对接文档见: `/docs/api-integration.md`

### 3.1 技术选型理由

| 技术 | 选择理由 | 替代方案 |
|------|----------|----------|
| **Vite** | 比 Webpack 快 10-100 倍,开发体验极佳 | CRA(已过时), Webpack(慢) |
| **Zustand** | 仅 3KB,API 简洁,无 Boilerplate | Redux(复杂), Mobx(魔法多) |
| **Ant Design ProComponents** | 企业级 ProTable 组件,开箱即用 Notion 风格 | 手写表格(工作量大) |
| **React Router 6** | 标准路由,文档清晰 | UmiJS 约定路由(魔法多,不透明) |
| **openapi-typescript** | 自动从后端生成 TS 类型,100% 类型安全 | 手写类型(易出错) |

**为什么不用 UmiJS/Ant Design Pro 全家桶?**
- 开发者是单人且对 UmiJS 不熟悉
- 约定式路由、配置式开发对新手不透明
- Vite + 标准 React 生态更容易理解和调试

### 3.2 目录结构

```
frontend/
├── public/                        # 静态资源
├── src/
│   ├── main.tsx                  # 应用入口
│   ├── App.tsx                   # 根组件(路由配置)
│   ├── api/                      # API调用层
│   │   ├── http.ts              # Axios封装(拦截器、错误处理)
│   │   ├── changes.ts           # 变更记录API
│   │   └── sync.ts              # 同步控制API
│   ├── types/                    # TypeScript类型
│   │   ├── api.d.ts             # 自动生成(openapi-typescript)
│   │   └── common.d.ts          # 通用类型
│   ├── stores/                   # Zustand状态管理
│   │   ├── useTableStore.ts     # 表格筛选/分页状态
│   │   └── useSyncStore.ts      # 同步状态
│   ├── pages/                    # 页面组件
│   │   ├── ChangeLogList/       # 变更记录列表(核心)
│   │   │   ├── index.tsx        # ProTable主组件
│   │   │   ├── columns.tsx      # 列定义
│   │   │   ├── DetailDrawer.tsx # 详情抽屉
│   │   │   └── BatchActions.tsx # 批量操作
│   │   ├── Dashboard/           # 统计看板
│   │   │   ├── index.tsx
│   │   │   ├── StatsCards.tsx   # 统计卡片
│   │   │   └── Charts.tsx       # ECharts图表
│   │   └── Settings/            # 系统设置
│   ├── components/               # 通用组件
│   │   ├── Layout/              # 布局框架
│   │   ├── SyncStatusBadge/     # 同步状态徽章
│   │   └── ErrorBoundary/       # 错误边界
│   ├── utils/                    # 工具函数
│   │   ├── format.ts            # 格式化(时间、金额)
│   │   └── constants.ts         # 常量定义
│   └── styles/                   # 全局样式
│       └── global.css
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 3.3 核心功能模块

#### 3.3.1 ProTable 变更记录列表

**关键特性**:
- ✅ **自动列头**: 根据 `columns` 配置自动生成筛选器
- ✅ **远程搜索**: `request` 函数接管数据加载
- ✅ **筛选联动**: 用户邮箱、资源类型、日期范围多条件组合
- ✅ **排序**: 支持时间、资源类型排序
- ✅ **分页**: 前后端协同分页
- ✅ **详情抽屉**: 点击行展开,显示字段级变更对比

**ProTable columns 配置示例**:
```typescript
const columns: ProColumns<ChangeLogItem>[] = [
  {
    title: '操作时间',
    dataIndex: 'timestamp',
    valueType: 'dateTime',
    width: 180,
    sorter: true,                         // 启用排序
    hideInSearch: true                    // 搜索栏隐藏(用dateRange代替)
  },
  {
    title: '操作人',
    dataIndex: 'user_email',
    valueType: 'select',
    request: async () => {                 // 远程加载选项
      const users = await fetchUsers();
      return users.map(u => ({ label: u, value: u }));
    }
  },
  {
    title: '资源类型',
    dataIndex: 'resource_type',
    valueType: 'select',
    valueEnum: {                           // 静态枚举
      'CAMPAIGN': { text: '广告系列', status: 'Processing' },
      'AD': { text: '广告', status: 'Success' },
      'CAMPAIGN_BUDGET': { text: '预算', status: 'Warning' }
    }
  },
  {
    title: '操作类型',
    dataIndex: 'operation_type',
    valueType: 'select',
    valueEnum: {
      'CREATE': { text: '创建', status: 'Success' },
      'UPDATE': { text: '更新', status: 'Processing' },
      'REMOVE': { text: '删除', status: 'Error' }
    }
  },
  {
    title: '日期范围',
    dataIndex: 'dateRange',
    valueType: 'dateRange',                // 日期范围选择器
    hideInTable: true,                     // 表格中隐藏(仅搜索栏显示)
    search: {
      transform: (value) => ({             // 转换为start_date/end_date
        start_date: value[0],
        end_date: value[1]
      })
    }
  }
];
```

**request 函数实现**:
```typescript
const request = async (params, sort, filter) => {
  const { current, pageSize, user_email, resource_type, dateRange } = params;

  const response = await fetchChangeLogs({
    page: current,
    page_size: pageSize,
    user_email,
    resource_type,
    start_date: dateRange?.[0],
    end_date: dateRange?.[1],
    sort_by: sort?.timestamp ? 'timestamp' : undefined
  });

  return {
    data: response.items,
    total: response.total,
    success: true
  };
};
```

#### 3.3.2 统计看板 (Dashboard)

**统计卡片** (`StatsCards.tsx`):
```typescript
<Row gutter={16}>
  <Col span={6}>
    <Statistic
      title="总操作数"
      value={stats.total_changes}
      prefix={<LineChartOutlined />}
    />
  </Col>
  <Col span={6}>
    <Statistic
      title="操作人数"
      value={stats.total_users}
      prefix={<UserOutlined />}
    />
  </Col>
  <Col span={6}>
    <Statistic
      title="今日操作"
      value={stats.today_changes}
      valueStyle={{ color: '#3f8600' }}
    />
  </Col>
</Row>
```

**ECharts 图表** (`Charts.tsx`):
- **操作趋势图**: 折线图,展示每日操作数量
- **资源类型分布**: 饼图,TOP 5 资源类型
- **操作人排行**: 横向柱状图,操作最多的优化师

**图表配置示例**:
```typescript
// 操作趋势 - 折线图
const trendOption = {
  xAxis: { type: 'category', data: dates },
  yAxis: { type: 'value' },
  series: [{
    data: counts,
    type: 'line',
    smooth: true,
    areaStyle: { opacity: 0.3 }  // 面积图效果
  }],
  tooltip: { trigger: 'axis' }
};

// 资源类型分布 - 饼图
const pieOption = {
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],        // 环形图
    data: [
      { value: 335, name: 'CAMPAIGN' },
      { value: 234, name: 'AD' },
      { value: 135, name: 'BUDGET' }
    ]
  }]
};
```

#### 3.3.3 状态管理 (Zustand)

**表格状态** (`stores/useTableStore.ts`):
```typescript
interface TableState {
  filters: Record<string, any>;
  pageSize: number;
  setFilters: (filters: Record<string, any>) => void;
  resetFilters: () => void;
}

export const useTableStore = create<TableState>()(
  persist(                                  // 持久化到 localStorage
    (set) => ({
      filters: {},
      pageSize: 20,
      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),
      resetFilters: () => set({ filters: {} })
    }),
    { name: 'table-storage' }              // localStorage key
  )
);
```

**使用方式**:
```typescript
function ChangeLogList() {
  const { filters, setFilters } = useTableStore();

  // 筛选器变化时保存状态
  const onFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return <ProTable formProps={{ initialValues: filters }} />;
}
```

#### 3.3.4 类型安全 (openapi-typescript)

**自动化工作流**:
```bash
# 1. 后端生成 OpenAPI 规范
cd backend
python generate_openapi.py  # 输出: openapi.json

# 2. 前端生成 TypeScript 类型
cd frontend
npm run generate:types       # 读取: ../backend/openapi.json
                             # 输出: src/types/api.d.ts
```

**生成的类型示例**:
```typescript
// src/types/api.d.ts (自动生成)
export interface paths {
  "/api/changes/": {
    get: operations["list_changes_api_changes__get"];
  };
}

export interface components {
  schemas: {
    ChangeLogResponse: {
      id: string;
      timestamp: string;
      user_email: string;
      operation_type: "CREATE" | "UPDATE" | "REMOVE";
      resource_type: string;
      // ...
    };
  };
}
```

**使用类型**:
```typescript
import type { components } from '@/types/api';

type ChangeLogItem = components['schemas']['ChangeLogResponse'];

// 100% 类型安全的 API 调用
const fetchChangeLogs = async (
  params: FetchChangeLogsParams
): Promise<{ items: ChangeLogItem[]; total: number }> => {
  return http.get('/changes/', { params });
};
```

### 3.4 实时数据更新

**轮询策略** (`pages/ChangeLogList/index.tsx`):
```typescript
useEffect(() => {
  // 每30秒轮询一次最新数据
  const timer = setInterval(() => {
    actionRef.current?.reload();  // ProTable 提供的刷新方法
  }, 30000);

  return () => clearInterval(timer);
}, []);
```

**WebSocket方案 (可选优化)**:
- 后端推送: FastAPI 支持 WebSocket
- 前端监听: 使用 `useWebSocket` hook
- 适用场景: 需要秒级实时更新时启用

---

## 四、数据流与交互

### 4.1 数据同步流程

```
┌──────────────┐
│ Google Ads   │  每10分钟
│ API          │ ──────────┐
└──────────────┘           │
                           ▼
                  ┌─────────────────┐
                  │ APScheduler     │
                  │ (定时任务)       │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ GoogleAdsService│
                  │ fetch_change_   │
                  │ events()        │
                  └────────┬────────┘
                           │ 解析 protobuf
                           ▼
                  ┌─────────────────┐
                  │ SyncService     │
                  │ - 提取字段变更   │
                  │ - 字段人类化     │
                  └────────┬────────┘
                           │ SQL INSERT
                           ▼
                  ┌─────────────────┐
                  │ PostgreSQL      │
                  │ change_logs +   │
                  │ field_changes   │
                  └─────────────────┘
```

### 4.2 前端查询流程

```
┌─────────────┐
│ 用户操作    │ (筛选、排序、分页)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ ProTable     │ request={() => fetchChangeLogs(params)}
│ 自动触发请求  │
└──────┬───────┘
       │ HTTP GET /api/changes/?page=1&user_email=xxx
       ▼
┌──────────────┐
│ Axios        │ (拦截器添加 headers、错误处理)
│ http.get()   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ FastAPI      │ changes.py/list_changes()
│ 构建 SQLAlchemy│
│ 查询          │
└──────┬───────┘
       │ SELECT * FROM change_logs WHERE ... LIMIT 20
       ▼
┌──────────────┐
│ PostgreSQL   │
└──────┬───────┘
       │ 返回结果
       ▼
┌──────────────┐
│ Pydantic     │ 数据验证 + 序列化
│ Schema       │
└──────┬───────┘
       │ JSON Response
       ▼
┌──────────────┐
│ ProTable     │ 自动渲染表格 + 分页器
│ 数据展示      │
└──────────────┘
```

### 4.3 详情抽屉交互

```
用户点击表格行
    │
    ▼
调用 fetchChangeDetail(id)
    │ GET /api/changes/{id}
    ▼
获取完整记录 + field_changes
    │
    ▼
Drawer 打开,展示:
  ├─ 基础信息(操作人、时间、资源)
  ├─ 字段变更列表
  │   ├─ field_path: budget.amount_micros
  │   ├─ old_value: $10.00
  │   ├─ new_value: $12.00
  │   └─ human_description: "预算从 $10.00 增加到 $12.00 (+20%)"
  └─ 操作按钮(复制、导出)
```

---

## 五、关键技术决策

### 5.1 为什么用 PostgreSQL 而不是 MySQL?

| 特性 | PostgreSQL | MySQL |
|------|-----------|-------|
| **JSONB 类型** | ✅ 原生支持,可索引 | ❌ JSON 不可索引 |
| **复杂查询** | ✅ 支持 CTE、窗口函数 | ⚠️ 部分支持 |
| **并发性能** | ✅ MVCC 无锁读 | ⚠️ 表锁较多 |
| **扩展性** | ✅ PostGIS、全文搜索 | ❌ 扩展少 |

**结论**: 字段变更数据需要 JSONB 存储,PostgreSQL 是最佳选择。

### 5.2 为什么用 Zustand 而不是 Redux?

| 维度 | Zustand | Redux Toolkit |
|------|---------|---------------|
| **包体积** | 3KB | 15KB+ |
| **Boilerplate** | 几乎没有 | Actions、Reducers、Types |
| **学习曲线** | 30分钟 | 2-3天 |
| **TypeScript** | 原生支持 | 需额外配置 |

**代码对比**:
```typescript
// Zustand (5行)
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}));

// Redux Toolkit (30+行)
// 需要定义 slice、actions、reducers、store...
```

### 5.3 为什么用 ECharts 而不是 Recharts?

| 特性 | ECharts | Recharts |
|------|---------|----------|
| **图表类型** | 50+ | 10+ |
| **性能** | Canvas 渲染,支持10万数据点 | SVG,数据量大卡顿 |
| **交互** | 缩放、联动、动画丰富 | 基础交互 |
| **主题** | 官方主题库 | 需自定义 |

**结论**: ECharts 是企业级图表的事实标准。

---

## 六、开发阶段规划

### Phase 1: 后端MVP (✅ 已完成)
- [x] 数据库设计 (`models/`)
- [x] Google Ads API集成 (`services/google_ads_service.py`)
- [x] RESTful API (`api/changes.py`, `api/sync.py`)
- [x] 定时任务 (`tasks/scheduler.py`)
- [x] API文档 (Swagger UI)

**交付物**:
- 可运行的后端服务 (http://localhost:8000)
- 8个API端点全部可用
- 每10分钟自动同步Google Ads数据

---

### Phase 2: 前端开发 (⏳ 设计完成,待实施)

> 详细实施计划见: `/docs/frontend-design.md` 第四节

#### Phase 2.1: 项目初始化 (Day 1)
- [ ] 使用 Vite 创建项目
- [ ] 安装依赖 (Ant Design、ProComponents、Zustand、Axios、ECharts)
- [ ] 配置 TypeScript、ESLint、Prettier
- [ ] 配置 Vite Proxy 代理后端API

**输出**: 可启动的前端项目骨架

#### Phase 2.2: 核心架构 (Day 2-3)
- [ ] 搭建路由 (`React Router`)
- [ ] 封装HTTP客户端 (`api/http.ts`)
- [ ] 实现Zustand stores (`useTableStore`, `useSyncStore`)
- [ ] 生成后端类型 (`openapi-typescript`)

**输出**: 完整的前端基础架构

#### Phase 2.3: ProTable变更列表 (Day 4-5)
- [ ] 实现 ProTable 主页面
- [ ] 定义列配置 (`columns.tsx`)
- [ ] 实现详情抽屉 (`DetailDrawer.tsx`)
- [ ] 集成筛选、排序、分页

**输出**: 核心功能 - 类 Notion 操作记录表格

#### Phase 2.4: 统计看板 (Day 6-7)
- [ ] 实现统计卡片 (`StatsCards.tsx`)
- [ ] 实现 ECharts 图表 (`Charts.tsx`)
  - 操作趋势折线图
  - 资源类型饼图
  - 操作人排行柱状图

**输出**: 数据可视化看板

#### Phase 2.5: 实时更新 (Day 8)
- [ ] 实现30秒轮询
- [ ] 添加同步状态徽章
- [ ] 优化加载状态和错误处理

**输出**: 准实时数据展示

#### Phase 2.6: 优化与打包 (Day 9-10)
- [ ] 代码分割 (React.lazy)
- [ ] 打包优化 (chunk splitting)
- [ ] 生产构建配置
- [ ] 部署文档

**输出**: 生产就绪的前端应用

---

### Phase 3: 测试与优化 (⏰ 未开始)
- [ ] 单元测试 (Vitest)
- [ ] 集成测试 (Playwright)
- [ ] 性能优化 (缓存、懒加载)
- [ ] 监控告警 (Sentry)

---

### Phase 4: 生产部署 (⏰ 未开始)
- [ ] CI/CD流程 (GitHub Actions)
- [ ] 环境配置 (dev/staging/prod)
- [ ] 数据备份策略
- [ ] 日志收集 (ELK)

---

## 七、命名规范

### 7.1 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| **组件文件** | PascalCase | `DetailDrawer.tsx` |
| **工具函数** | camelCase | `format.ts` |
| **常量文件** | camelCase | `constants.ts` |
| **样式文件** | camelCase | `global.css` |
| **类型文件** | camelCase + `.d.ts` | `api.d.ts` |

### 7.2 变量命名

```typescript
// ✅ 正确
const userEmail = 'test@example.com';
const ChangeLogList: React.FC = () => {};
const API_BASE_URL = 'http://localhost:8000';
type ChangeLogItem = { id: string; /* ... */ };

// ❌ 错误
const UserEmail = 'test@example.com';      // 变量不用 PascalCase
const changeloglist = () => {};            // 组件必须 PascalCase
const apiBaseUrl = 'http://localhost:8000'; // 常量用全大写
```

### 7.3 Git Commit规范

```
<type>(<scope>): <subject>

type:
  - feat: 新功能
  - fix: 修复bug
  - docs: 文档更新
  - style: 代码格式(不影响逻辑)
  - refactor: 重构(不新增功能/不修复bug)
  - perf: 性能优化
  - test: 测试相关
  - chore: 构建/工具链相关

示例:
feat(frontend): 实现ProTable变更列表页面
fix(backend): 修复同步任务重复执行bug
docs(readme): 更新快速开始指南
```

---

## 八、常见问题与解决方案

### Q1: 如何调试Google Ads API?
```bash
# 1. 使用测试脚本验证
cd googletest
python googlemvptest.py

# 2. 查看后端日志
tail -f backend/logs/app.log

# 3. 检查凭据
cat googletest/google-ads.yaml
```

### Q2: 前端请求后端API时CORS错误?
**后端配置** (`backend/app/main.py`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**前端配置** (`frontend/vite.config.ts`):
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true
    }
  }
}
```

### Q3: 如何新增一个资源类型?
1. **后端**: 在 `google_ads_service.py` 的 `RESOURCE_TYPES` 列表添加
2. **前端**: 在 `constants.ts` 的 `RESOURCE_TYPE_MAP` 添加中文映射
3. **数据库**: 无需修改(VARCHAR 字段足够灵活)

### Q4: 数据库迁移怎么做?
```bash
# 使用 Alembic (推荐)
cd backend
alembic revision --autogenerate -m "添加新字段"
alembic upgrade head

# 或手动修改 models/ 后重建表
# 1. 备份数据
pg_dump -U postgres -d monitorsysua > backup.sql

# 2. 删除并重建表
psql -U postgres -d monitorsysua -c "DROP TABLE field_changes CASCADE;"
psql -U postgres -d monitorsysua -c "DROP TABLE change_logs CASCADE;"

# 3. 重新启动后端,表会自动创建
./start.sh
```

### Q5: 如何优化大数据量查询?
- **索引**: 确保 `timestamp`, `user_email`, `resource_type` 有索引
- **分页**: 前端使用合理的 `page_size` (20-50)
- **缓存**: 使用 Redis 缓存统计数据 (Phase 3)
- **归档**: 旧数据定期迁移到历史表 (3个月以上)

### Q6: PostgreSQL连接失败怎么办?
```bash
# 1. 检查PostgreSQL是否运行
pg_isready

# 2. 检查数据库是否存在
psql -U postgres -l | grep monitorsysua

# 3. 创建数据库(如不存在)
psql -U postgres -c "CREATE DATABASE monitorsysua;"

# 4. 检查连接参数
cat backend/.env | grep DATABASE_URL

# 5. 测试连接
psql -U postgres -d monitorsysua -c "SELECT version();"
```

### Q7: 后端服务启动失败?
```bash
# 1. 检查Python版本
python --version  # 应为 3.12+

# 2. 检查依赖是否安装
cd backend
pip list | grep fastapi

# 3. 重新安装依赖
pip install -r requirements.txt

# 4. 检查环境变量
cat .env

# 5. 查看详细错误日志
python -m uvicorn app.main:app --reload
```

---

## 九、参考资源

### 官方文档
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Ant Design Pro](https://procomponents.ant.design/)
- [ECharts](https://echarts.apache.org/zh/index.html)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [PostgreSQL](https://www.postgresql.org/docs/)

### 项目文档
- `/README.md` - 项目总览与快速开始
- `/docs/frontend-design.md` - 前端完整设计(3000行)
- `/docs/api-integration.md` - API对接指南
- `/docs/changelog/` - 更新日志目录

### 启动命令
```bash
# 快速启动(推荐)
./start.sh

# 或分步启动

# 1. 启动PostgreSQL (如未启动)
brew services start postgresql@16  # Mac
# sudo systemctl start postgresql  # Linux

# 2. 启动后端
cd backend
source venv/bin/activate  # 激活虚拟环境
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. 启动前端 (在新终端)
cd frontend
npm run dev

# 查看后端日志
tail -f backend/logs/app.log

# 查看PostgreSQL日志
tail -f /usr/local/var/log/postgresql@16.log  # Mac
# tail -f /var/log/postgresql/postgresql-16-main.log  # Linux

# 停止服务
# Ctrl+C 停止后端和前端
# brew services stop postgresql@16  # 停止PostgreSQL (可选)
```

---

## 十、当前状态总结

### 已完成 ✅
- 后端完整实现(API、数据库、定时任务)
- 前端完整设计文档(架构、组件、实施计划)
- API对接文档(类型安全、错误处理)
- 本地开发环境配置

### 进行中 ⏳
- 前端项目实施(按 Phase 2.1-2.6 执行)

### 待开始 ⏰
- 测试与优化(Phase 3)
- 生产部署(Phase 4)

### 下一步行动
1. 执行 `frontend-design.md` 中的 **Phase 2.1**: 初始化前端项目
2. 或由开发者提出新需求,我将按照"协作流程规范"的架构师模式工作

---

**文档版本**: v0.3.0
**最后更新**: 2025-11-13
**维护者**: Claude + Sam Wong
