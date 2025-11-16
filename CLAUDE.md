# CLAUDE 实施笔记

## 项目：Google Ads ChangeEvent 监控系统

**最后更新**: 2025-11-15
**当前状态**: 技术栈升级中 - 迁移至 Next.js 全栈方案
**项目阶段**: MVP概念验证完成，准备正式开发

---

## 🎯 项目概述

构建一个**基于 Google Ads ChangeEvent 的数据驱动优化行为分析平台**，帮助企业：
1. 实时监控广告账户的所有变更操作
2. 追踪优化师的操作行为和频率
3. 分析操作对广告效果的影响（后期功能）

### MVP 验证成果

在 `mvp/` 目录中使用 Flask + SQLite + Python 完成了概念验证：

#### ✅ 1. Google Ads API 使用方式验证

**验证内容**:
- 使用官方 `google-ads-python` 库成功获取 ChangeEvent 数据
- 验证了查询 `change_event` 表的 GAQL 语法
- 确认了 `old_resource` 和 `new_resource` 的 oneof 结构
- 掌握了 Enum 转换方法（`Enum.Name()`）

**关键发现**:
- ChangeEvent API 只返回变更过的字段（field-level granularity）
- Protobuf 数据需要用 `MessageToDict()` 转换为 Python dict
- oneof 字段需要用 `ListFields()` 解包

**参考文件**:
- `googletest/googlemvptest.py` - 完整的 API 调用和数据处理流程
- `googletest/googleapioutput.md` - 真实的 API 返回数据示例
- `googletest/intro.md` - 详细的技术说明文档

#### ✅ 2. Deep Diff 引擎验证

**验证内容**:
- 实现了递归 `deep_diff()` 函数，能够对比任意深度的嵌套对象
- 处理了基础类型、嵌套对象、repeated fields（list）的 diff
- 验证了字段路径拼接逻辑（`prefix.field.subfield`）

**关键发现**:
- 递归 diff 算法可以完整捕获所有字段变更
- 需要特殊处理 Python 保留字（如 `type` → `type_`）
- 数组变更建议整体记录（而非逐项 diff）

**MVP 实现** (`googlemvptest.py:39-72`):
```python
def deep_diff(old: Dict[str, Any], new: Dict[str, Any], prefix="") -> Dict[str, Tuple[Any, Any]]:
    """深度递归 diff，返回所有字段变更"""
    diffs = {}
    all_keys = set(old.keys()) | set(new.keys())

    for key in all_keys:
        full_key = f"{prefix}.{key}" if prefix else key
        old_val = old.get(key)
        new_val = new.get(key)

        if old_val == new_val:
            continue

        # 嵌套对象递归
        if isinstance(old_val, dict) and isinstance(new_val, dict):
            nested = deep_diff(old_val, new_val, prefix=full_key)
            diffs.update(nested)
            continue

        # 列表直接记录
        if isinstance(old_val, list) and isinstance(new_val, list):
            if old_val != new_val:
                diffs[full_key] = (old_val, new_val)
            continue

        # 基础字段
        diffs[full_key] = (old_val, new_val)

    return diffs
```

**TypeScript 迁移**: 已在 `docs/tech-design.md` 的 "Deep Diff Engine" 章节中设计了完全对等的 TypeScript 实现。

#### ✅ 3. 数据模型设计验证

**验证内容**:
- 设计了 `change_events` 表 Schema（字段级别存储）
- 验证了 JSONB 类型存储复杂变更详情的可行性
- 确认了索引策略（按时间、用户、资源类型）

**关键发现**:
- 需要存储完整的 `old_resource` 和 `new_resource`（为未来分析预留）
- 同时存储计算后的 `field_changes`（便于查询）
- 需要 `changed_fields_paths` 数组（快速筛选变更类型）

**正式项目改进**:
- 从 SQLite 升级到 PostgreSQL（生产级可靠性）
- 添加 `old_resource_raw` 和 `new_resource_raw` 字段
- 使用 Drizzle ORM 替代原生 SQL（类型安全）

#### ✅ 4. 系统设计初心验证

**核心目标**（来自 `googletest/intro.md`）:
1. 构建优化师行为记录系统
2. 支持操作效果学习（Phase 2）
3. 为未来的强化学习系统打基础

**架构验证**:
```
Google Ads API → ETL Collector → Diff Engine → Behavior DB → Dashboard
```

**MVP 成功验证**:
- ✅ 数据采集可行（ChangeEvent API 稳定可靠）
- ✅ Diff 引擎有效（捕获所有字段变更）
- ✅ 数据存储可扩展（JSONB 支持复杂查询）
- ✅ UI 展示清晰（Flask 简易 Dashboard 验证）

---

### 从 MVP 到正式项目的技术演进

| 维度 | MVP（概念验证） | 正式项目（生产就绪） |
|-----|----------------|-------------------|
| **后端框架** | Flask (Python) | Next.js + tRPC (TypeScript) |
| **数据库** | SQLite（文件数据库） | PostgreSQL（生产级） |
| **ORM** | 无（原生 SQL） | Drizzle ORM（类型安全） |
| **Google Ads 库** | google-ads-python（官方） | google-ads-node（官方） |
| **Diff 引擎** | Python `deep_diff()` | TypeScript `deepDiff()` |
| **前端** | 无（仅后端） | Next.js + Material UI |
| **API 设计** | REST（Flask routes） | tRPC（端到端类型安全） |
| **部署** | 本地运行 | Vercel（云端自动部署） |
| **类型安全** | 无 | TypeScript 全栈类型安全 |

**技术栈升级原因**:
1. **类型安全**: TypeScript + tRPC + Drizzle 实现端到端类型安全
2. **开发效率**: Next.js 全栈开发，前后端统一语言
3. **生产可靠**: PostgreSQL 替代 SQLite，支持并发和大数据量
4. **可维护性**: 类型推导、自动补全、重构安全
5. **可扩展性**: tRPC 易于添加新 API，Drizzle 易于迁移数据库

**MVP 现已完成使命，正式项目将采用全新技术栈重新开发。**

---

## 🛠️ 技术栈选型（正式项目）

### 前端
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **UI 组件**: Material UI (MUI v6)
- **状态管理**: React Hooks + tRPC 客户端
- **样式**: MUI 主题系统 + Emotion

### 后端
- **框架**: Next.js API Routes + tRPC
- **语言**: TypeScript
- **API 类型**: tRPC (端到端类型安全)
- **运行时**: Node.js

### 数据库
- **数据库**: PostgreSQL
- **ORM**: Drizzle ORM
- **迁移工具**: Drizzle Kit
- **连接池**: pg/postgres.js

### 外部集成
- **Google Ads API**: google-ads-node (Node.js 官方客户端，与 MVP 的 Python 官方库保持一致)
- **认证**: OAuth 2.0 (google-ads.yaml 配置)

### 开发工具
- **包管理**: pnpm
- **代码质量**: ESLint + Prettier
- **类型检查**: TypeScript strict mode
- **构建工具**: Next.js (内置 Turbopack)

---

## 📂 项目结构（规划）

```
MonitorSysUA/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # 仪表板路由组
│   │   ├── layout.tsx          # Dashboard 布局
│   │   ├── page.tsx            # 主页面
│   │   └── events/             # 事件列表页
│   ├── api/                     # API Routes (仅用于 webhook 等)
│   ├── layout.tsx              # 根布局
│   └── globals.css             # 全局样式
│
├── components/                   # React 组件
│   ├── events/                  # 业务组件
│   │   ├── event-table.tsx     # 使用 MUI DataGrid
│   │   ├── event-filters.tsx   # 使用 MUI Form 组件
│   │   └── event-detail.tsx    # 使用 MUI Dialog
│   └── layout/
│       ├── header.tsx          # 使用 MUI AppBar
│       └── sidebar.tsx         # 使用 MUI Drawer
│
├── server/                       # tRPC 后端
│   ├── api/                     # tRPC routers
│   │   ├── root.ts             # Root router
│   │   ├── events.ts           # Events router
│   │   └── stats.ts            # Statistics router
│   ├── db/                      # 数据库层
│   │   ├── index.ts            # Drizzle 实例
│   │   └── schema.ts           # Drizzle schema
│   └── google-ads/              # Google Ads 客户端
│       ├── client.ts           # API 客户端封装
│       └── types.ts            # TypeScript 类型定义
│
├── lib/                          # 工具函数
│   ├── utils.ts                # 通用工具
│   ├── trpc/                   # tRPC 配置
│   │   ├── client.ts           # tRPC 客户端
│   │   └── server.ts           # tRPC 服务端
│   └── validations/            # Zod schemas
│
├── db/                           # 数据库迁移
│   ├── migrations/             # Drizzle 迁移文件
│   └── seed.ts                 # 种子数据（可选）
│
├── public/                       # 静态资源
├── docs/                         # 文档
│   ├── tech-design.md          # 技术设计文档
│   └── mvpdesign.md            # MVP 设计（参考）
│
├── mvp/                          # MVP 原型（仅供参考）
│   └── [Flask/SQLite 实现]
│
├── .env.local                    # 环境变量
├── drizzle.config.ts            # Drizzle 配置
├── next.config.js               # Next.js 配置
├── tailwind.config.ts           # Tailwind 配置
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 依赖管理
├── prd.md                       # 产品需求文档
├── todo.md                      # 开发任务清单
└── CLAUDE.md                    # 本文件
```

---

## 📊 核心数据模型

### change_events 表（Drizzle Schema）

基于 MVP 验证的数据模型，使用 Drizzle ORM 重新设计：

```typescript
// server/db/schema.ts
import { pgTable, serial, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const changeEvents = pgTable('change_events', {
  id: serial('id').primaryKey(),

  // 时间信息
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

  // 操作信息
  userEmail: text('user_email').notNull(),
  resourceType: text('resource_type').notNull(), // CAMPAIGN_BUDGET, CAMPAIGN, etc.
  operationType: text('operation_type').notNull(), // CREATE, UPDATE, REMOVE
  resourceName: text('resource_name').notNull(),
  clientType: text('client_type'), // UI, API, EDITOR

  // 关联信息
  campaign: text('campaign'),
  adGroup: text('ad_group'),

  // 变更详情
  summary: text('summary').notNull(), // 人类可读的变更摘要
  fieldChanges: jsonb('field_changes'), // 字段级变更详情
  changedFieldsPaths: jsonb('changed_fields_paths'), // 变更字段路径数组
}, (table) => ({
  timestampIdx: index('timestamp_idx').on(table.timestamp),
  userEmailIdx: index('user_email_idx').on(table.userEmail),
  resourceTypeIdx: index('resource_type_idx').on(table.resourceType),
  operationTypeIdx: index('operation_type_idx').on(table.operationType),
  campaignIdx: index('campaign_idx').on(table.campaign),
}));

export type ChangeEvent = typeof changeEvents.$inferSelect;
export type NewChangeEvent = typeof changeEvents.$inferInsert;
```

---

## 🔌 API 设计（tRPC）

### Events Router

```typescript
// server/api/events.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/lib/trpc/server';

export const eventsRouter = createTRPCRouter({
  // 获取事件列表（带筛选和分页）
  list: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      userEmail: z.string().optional(),
      resourceType: z.string().optional(),
      operationType: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // 实现查询逻辑
    }),

  // 同步 Google Ads 数据
  sync: publicProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      // 调用 Google Ads API
    }),

  // 获取统计信息
  stats: publicProcedure
    .query(async ({ ctx }) => {
      // 返回统计数据
    }),
});
```

---

## 🎨 UI 组件规划（Material UI）

### 核心组件

1. **数据表格** (`components/events/event-table.tsx`)
   - 使用 MUI 的 `DataGrid` 组件（@mui/x-data-grid）
   - 内置排序、筛选、分页功能
   - 行点击打开详情弹窗

2. **筛选表单** (`components/events/event-filters.tsx`)
   - 使用 MUI `TextField` + `Select` + `Autocomplete` 组件
   - `DatePicker` 组件（@mui/x-date-pickers）
   - 用户/资源类型/操作类型下拉选择

3. **详情对话框** (`components/events/event-detail.tsx`)
   - 使用 MUI `Dialog` 组件
   - 显示变更前后对比
   - 高亮显示差异字段

4. **统计图表** (`components/stats/`)
   - 集成 Recharts 或 MUI X Charts
   - 使用 MUI `Card` + `CardContent` 布局
   - 操作频率趋势图
   - 资源类型分布饼图

---

## 🔄 开发流程

### 阶段 1: 项目初始化（1-2天）
- [ ] 创建 Next.js 15 项目
- [ ] 配置 TypeScript + ESLint + Prettier
- [ ] 安装和配置 Material UI (MUI v6)
- [ ] 配置 MUI 主题系统
- [ ] 设置 Drizzle ORM + PostgreSQL
- [ ] 配置 tRPC

### 阶段 2: 数据库层（2-3天）
- [ ] 编写 Drizzle schema (`server/db/schema.ts`)
- [ ] 创建数据库迁移
- [ ] 编写数据库操作函数
- [ ] 测试数据库连接

### 阶段 3: Google Ads 集成（3-5天）
- [ ] 安装 google-ads-api 客户端
- [ ] 实现 ChangeEvent 数据获取
- [ ] 实现 Protobuf 解析和数据转换
- [ ] 编写单元测试

### 阶段 4: tRPC 后端（3-4天）
- [ ] 创建 Events Router
- [ ] 实现查询、筛选、分页逻辑
- [ ] 实现同步接口
- [ ] 实现统计接口

### 阶段 5: 前端 UI（5-7天）
- [ ] 安装必要的 MUI 组件包
- [ ] 配置 MUI 主题和全局样式
- [ ] 实现事件列表页面（DataGrid）
- [ ] 实现筛选器组件
- [ ] 实现详情对话框
- [ ] 实现统计仪表板

### 阶段 6: 测试与优化（2-3天）
- [ ] 端到端测试
- [ ] 性能优化
- [ ] UI/UX 优化
- [ ] 文档完善

---

## 🔑 关键技术决策

### 1. 为什么选择 Next.js 全栈？

**优势**:
- 前后端统一技术栈（TypeScript）
- tRPC 提供端到端类型安全
- Server Components 优化性能
- 简化部署流程
- 优秀的开发体验

**权衡**:
- 相比纯前端框架，学习曲线稍陡
- 但长期维护成本更低

### 5. 为什么选择 Material UI？

**优势**:
- 成熟的企业级 UI 组件库
- 开箱即用的完整组件生态
- 强大的主题定制能力
- DataGrid 等高级组件支持
- 优秀的可访问性支持
- 完善的文档和社区支持

**对比 shadcn/ui**:
- MUI 提供完整的组件包，无需逐个安装
- 更适合企业级数据密集型应用
- DataGrid 功能强大，适合展示 ChangeEvent 数据

### 2. 为什么选择 Drizzle ORM？

**优势**:
- TypeScript-first，类型推导强大
- 性能优秀，接近原生 SQL
- 轻量级，无运行时开销
- 支持多数据库（可从 PostgreSQL 迁移到其他数据库）
- Schema 即代码，易于版本控制

**对比 Prisma**:
- Drizzle 更轻量，构建速度更快
- Drizzle 的 SQL-like API 更直观
- Prisma 的生成器增加了复杂性

### 3. 为什么选择 PostgreSQL？

**优势**:
- 生产级可靠性
- 支持 JSONB 类型（存储 field_changes）
- 强大的索引能力
- 并发性能优秀
- 可扩展性好

**相比 SQLite**:
- 适合多用户并发访问
- 更好的查询优化器
- 可部署到云端（Supabase, Neon 等）

### 4. 为什么选择 tRPC？

**优势**:
- 完全类型安全，前后端共享类型
- 无需编写 API 文档（类型即文档）
- 优秀的 DX（开发体验）
- 与 Next.js 集成完美
- 自动序列化/反序列化

**对比 REST API**:
- 减少样板代码
- 避免类型不一致问题
- 重构更安全

---

## 🧪 测试策略

### 单元测试
- Google Ads 客户端函数
- 数据转换函数
- Drizzle 查询函数

### 集成测试
- tRPC 路由端到端测试
- 数据库操作测试

### E2E 测试（可选）
- Playwright 测试关键用户流程

---

## 📈 性能目标

- **首屏加载**: < 1.5s (使用 Server Components)
- **数据同步**: < 10s (7 天数据，~100 事件)
- **表格渲染**: < 200ms (50 行)
- **数据库查询**: < 100ms (带索引)
- **tRPC 调用**: < 50ms (本地网络)

---

## 🔒 安全考虑

### 已实施
- ✅ 环境变量管理（.env.local）
- ✅ Google Ads 凭证安全存储
- ✅ TypeScript 类型安全

### 待实施（后期）
- ⏳ 用户认证（NextAuth.js）
- ⏳ 角色权限管理（RBAC）
- ⏳ API 限流
- ⏳ CSRF 防护
- ⏳ XSS 防护

---

## 🐛 已知限制

### 当前阶段
1. **单账户**: 仅支持一个 Google Ads 账户
2. **手动同步**: 需要手动点击刷新（无定时任务）
3. **基础筛选**: 筛选功能较简单
4. **无性能分析**: 不分析操作对效果的影响

### 计划改进
- Phase 2: 添加定时同步（使用 Vercel Cron 或 Node-cron）
- Phase 3: 多账户支持
- Phase 4: 性能影响分析

---

## 📝 重要文件位置

### 文档
- **产品需求**: `prd.md`
- **开发任务**: `todo.md`
- **技术设计**: `docs/tech-design.md`
- **MVP 参考**: `mvp/README.md`

### 配置
- **环境变量**: `.env.local`
- **Google Ads 凭证**: `googletest/google-ads.yaml`
- **Drizzle 配置**: `drizzle.config.ts`
- **Next.js 配置**: `next.config.js`
- **MUI 主题**: `src/theme/index.ts`

### 核心代码（规划）
- **Drizzle Schema**: `server/db/schema.ts`
- **tRPC Root Router**: `server/api/root.ts`
- **Events Router**: `server/api/events.ts`
- **Google Ads 客户端**: `server/google-ads/client.ts`
- **事件表格组件**: `components/events/event-table.tsx`

---

## 🎓 开发参考

### 官方文档
- **Next.js**: https://nextjs.org/docs
- **tRPC**: https://trpc.io/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Material UI**: https://mui.com/material-ui/
- **MUI X Data Grid**: https://mui.com/x/react-data-grid/
- **Google Ads API**: https://developers.google.com/google-ads/api

### 有用的资源
- **T3 Stack**: https://create.t3.gg (类似技术栈参考)
- **Drizzle Examples**: https://github.com/drizzle-team/drizzle-orm
- **MUI Templates**: https://mui.com/material-ui/getting-started/templates/

---

## ✅ 实施检查清单

### 项目设置
- [ ] Next.js 15 项目创建
- [ ] TypeScript 配置
- [ ] Material UI 安装和配置
- [ ] MUI 主题设置
- [ ] Drizzle ORM 配置
- [ ] PostgreSQL 连接
- [ ] tRPC 设置

### 后端开发
- [ ] Drizzle schema 定义
- [ ] 数据库迁移
- [ ] Google Ads 客户端
- [ ] tRPC routers
- [ ] 数据同步逻辑

### 前端开发
- [ ] 页面布局
- [ ] 事件列表组件
- [ ] 筛选器组件
- [ ] 详情对话框
- [ ] 统计仪表板

### 测试与部署
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 文档完善
- [ ] 部署到 Vercel

---

## 🎯 成功标准

项目成功的标志：

- ✅ 用户可以实时查看 Google Ads 账户变更
- ✅ 筛选和搜索功能流畅
- ✅ 界面美观、响应式
- ✅ 类型安全，无运行时类型错误
- ✅ 性能达标（见性能目标）
- ✅ 代码质量高，易于维护
- ✅ 文档完善，易于交接

---

**文档结束**

详细的技术设计请参考：`docs/tech-design.md`
开发任务清单请参考：`todo.md`
产品需求文档请参考：`prd.md`
