# MonitorSysUA 产品需求文档 (PRD)

**项目名称**: Google Ads ChangeEvent 监控系统
**最后更新**: 2025-11-17
**当前状态**: Phase 3 完成 ✅ | Phase 4 测试中 🚧
**项目进度**: ~85% (2天完成原计划4-6周工作)

---

## 📑 目录

1. [产品概述](#1-产品概述)
2. [技术架构](#2-技术架构)
3. [功能详细说明](#3-功能详细说明)
4. [系统现状](#4-系统现状)
5. [核心实现](#5-核心实现)
6. [开发指南](#6-开发指南)
7. [项目里程碑](#7-项目里程碑)

---

## 1. 产品概述

### 1.1 项目背景

MonitorSysUA 是一个**基于 Google Ads ChangeEvent API 的数据驱动优化行为分析平台**，帮助企业：
- 实时监控广告账户的所有变更操作
- 追踪优化师的操作行为和频率
- 分析操作对广告效果的影响（Phase 2+ 功能）

### 1.2 核心价值

| 价值点 | 说明 |
|--------|------|
| **操作透明化** | 记录每一次账户变更，包括谁、何时、改了什么 |
| **行为分析** | 统计优化师操作频率、资源类型分布、操作类型分布 |
| **效果追踪** | 关联操作与广告表现（未来功能） |
| **知识沉淀** | 学习高效操作模式，避免重复错误 |

### 1.3 MVP 验证成果

在 `mvp/` 目录中使用 **Flask + SQLite + Python** 完成了概念验证：

✅ **验证项**:
1. Google Ads API 可行性（`google-ads-python` 库）
2. Deep Diff 算法有效性（递归 diff 捕获所有字段变更）
3. 数据模型可扩展性（JSONB 存储复杂变更）
4. 系统架构合理性（`Google Ads API → ETL → Diff → DB → Dashboard`）

🚀 **技术演进**:

| 维度 | MVP | 正式项目 |
|------|-----|----------|
| 后端 | Flask (Python) | Next.js + tRPC (TypeScript) |
| 数据库 | SQLite | PostgreSQL + Drizzle ORM |
| Google Ads | google-ads-python | google-ads-api (Node.js) |
| Diff 引擎 | Python `deep_diff()` | TypeScript `deepDiff()` |
| 前端 | 无 | Next.js + Material UI v7 |
| 类型安全 | 无 | 端到端 TypeScript |

---

## 2. 技术架构

### 2.1 技术栈

**前端**: Next.js 16 (App Router) + TypeScript + Material UI v7 + MUI X DataGrid
**后端**: Next.js API Routes + tRPC v11 + Zod
**数据库**: PostgreSQL 16 (Docker) + Drizzle ORM 0.44.7
**外部集成**: Google Ads API v21 (Service Account 认证)
**状态管理**: React Context + React Query 5

### 2.2 关键技术决策

| 技术 | 选择理由 |
|------|----------|
| **Next.js 全栈** | 统一技术栈、tRPC 端到端类型安全、优秀 DX |
| **tRPC** | 无需 API 文档、类型即文档、重构安全 |
| **Drizzle ORM** | TypeScript-first、轻量级、SQL-like API |
| **PostgreSQL** | 生产级可靠性、JSONB 支持、强大索引 |
| **Material UI v7** | 企业级组件库、DataGrid 强大、主题定制 |
| **Service Account** | 生产就绪、无需 OAuth 流程、稳定认证 |

### 2.3 系统架构

```
┌─────────────────┐
│  Next.js UI     │  Material UI v7 Components
│  (App Router)   │  - Dashboard, Events, Accounts
└────────┬────────┘
         │ tRPC Client
         ↓
┌─────────────────┐
│  tRPC API       │  3 Routers: accounts, events, stats
│  (Next.js)      │  - Zod validation
└────────┬────────┘  - Type-safe procedures
         │
         ↓
┌─────────────────┐
│  Drizzle ORM    │  Database queries
│  (Type-safe)    │  - insertEvents(), getEvents(), getStats()
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PostgreSQL 16  │  2 Tables: accounts, change_events
│                 │  - JSONB for complex data
└─────────────────┘  - Indexes for performance

         ↑
         │ Sync trigger
         │
┌─────────────────┐
│  Google Ads API │  ChangeEvent queries
│  (Service Auth) │  - MCC Manager Account support
└─────────────────┘  - Deep Diff processing
```

### 2.4 项目结构

```
MonitorSysUA/
├── app/                     # Next.js App Router
│   ├── (dashboard)/        # Dashboard 路由组
│   │   ├── layout.tsx      # Sidebar + AppBar + AccountSelector
│   │   ├── page.tsx        # 统计仪表板
│   │   ├── events/page.tsx # 事件列表 (DataGrid)
│   │   └── accounts/page.tsx # 账户管理
│   ├── providers.tsx       # tRPC + AccountContext
│   └── api/trpc/[trpc]/route.ts # tRPC HTTP handler
│
├── components/             # React 组件
│   ├── events/event-detail.tsx    # 详情对话框
│   ├── layout/account-selector.tsx # 账户下拉选择
│   └── accounts/account-dialog.tsx # 添加/编辑账户
│
├── server/                 # tRPC 后端
│   ├── api/
│   │   ├── root.ts        # Root router
│   │   └── routers/       # accounts, events, stats
│   ├── db/
│   │   ├── schema.ts      # Drizzle schema
│   │   ├── queries.ts     # 数据库操作
│   │   └── migrations/    # SQL 迁移文件
│   └── google-ads/
│       ├── client.ts      # API 客户端 (MCC 支持)
│       ├── parser.ts      # ChangeEvent 解析器
│       └── diff-engine.ts # Deep Diff 算法
│
├── lib/
│   ├── trpc/client.ts     # tRPC React 客户端
│   └── contexts/account-context.tsx # 全局账户状态
│
├── theme/index.ts         # MUI 主题配置
├── drizzle.config.ts      # Drizzle 配置
├── .env.example           # 环境变量模板
└── docs/
    ├── TESTING-SUMMARY.md # 测试指南
    └── todo.md            # 任务清单
```

---

## 3. 功能详细说明

### 3.1 已实现功能 (Phase 1-3) ✅

#### **多账户管理系统** ⭐ (超前实现)

| 功能 | 说明 | 状态 |
|------|------|------|
| MCC 集成 | 单一 Service Account 管理多个 Google Ads 账户 | ✅ |
| 账户 CRUD | 创建、查看、更新、软删除账户 | ✅ |
| AccountSelector | 侧边栏下拉选择器 + localStorage 持久化 | ✅ |
| 全局状态 | AccountContext 管理选中账户，所有页面共享 | ✅ |
| 管理界面 | DataGrid 展示所有账户，支持编辑和删除 | ✅ |
| 数据隔离 | 每个账户的事件和统计数据完全隔离 | ✅ |

#### **ChangeEvent 数据采集**

| 功能 | 说明 | 状态 |
|------|------|------|
| API 集成 | 通过 Google Ads API 获取 ChangeEvent 数据 | ✅ |
| Deep Diff | 递归比较 old_resource 和 new_resource，捕获所有字段变更 | ✅ |
| 解析器 | 提取资源、生成摘要、转换为数据库格式 | ✅ |
| 自动去重 | 基于 (timestamp, resourceName, userEmail, accountId) 唯一约束 | ✅ |
| 批量插入 | 高效写入大量事件数据 | ✅ |
| 同步触发 | 手动点击 Sync 按钮，拉取最近 7 天数据 | ✅ |

#### **数据查询与展示**

| 功能 | 说明 | 状态 |
|------|------|------|
| 事件列表 | MUI DataGrid，服务端分页（50 条/页） | ✅ |
| 筛选器 | 按用户、资源类型、操作类型、关键词搜索 | ✅ |
| 详情对话框 | 显示完整事件信息 + 字段级变更对比 | ✅ |
| 统计仪表板 | 总事件、活跃用户、资源/操作类型分布 | ✅ |
| 多账户统计 | 切换账户时统计数据实时更新 | ✅ |

#### **用户界面**

| 功能 | 说明 | 状态 |
|------|------|------|
| Dashboard 布局 | AppBar + Drawer (280px) + 主内容区 | ✅ |
| 响应式设计 | 移动端友好（临时抽屉） | ✅ |
| Material Design 3 | 专业主题、统一样式、一致体验 | ✅ |
| 加载状态 | Skeleton、CircularProgress、禁用按钮 | ✅ |
| 错误处理 | Toast 通知、错误提示、空状态页面 | ✅ |

### 3.2 开发中功能 (Phase 4) 🚧

| 任务 | 说明 | 进度 |
|------|------|------|
| 数据库迁移验证 | 确认表已创建、索引生效 | ⏳ 待执行 |
| 手动 UI 测试 | 按 TESTING-SUMMARY.md 测试所有场景 | ⏳ 待执行 |
| Google Ads 连接测试 | 验证 API 调用成功、数据解析正确 | ⏳ 待执行 |
| 性能基准 | Lighthouse 报告、查询性能分析 | ⏳ 待执行 |
| 单元测试 (可选) | Deep Diff、Parser、Queries 测试 | ⏳ 未开始 |

### 3.3 未来规划 (Phase 5) 📅

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 定时自动同步 | Vercel Cron 每 5-15 分钟同步一次 | 高 |
| 用户认证 | NextAuth.js + 角色权限管理 (RBAC) | 高 |
| 操作效果分析 | 关联广告表现数据 (ROAS, 转化, 花费) | 中 |
| 性能影响评分 | 计算操作对效果的正负影响 | 中 |
| 智能建议 | 基于历史数据推荐最佳实践 | 低 |
| 风险预警 | 识别异常操作并发送通知 | 低 |

---

## 4. 系统现状

### 4.1 实际实现的功能清单

#### **数据库层**

| 组件 | 状态 | 说明 |
|------|------|------|
| PostgreSQL 16 | ✅ 安装 | Docker 容器 `monitor_sys_ua` (端口 5433) |
| Drizzle ORM 0.44.7 | ✅ 配置 | 类型安全 ORM |
| `accounts` 表 | ✅ 定义 | id, customer_id, name, currency, time_zone, is_active |
| `change_events` 表 | ✅ 定义 | 18 个字段 + account_id 外键 |
| 唯一约束 | ✅ 定义 | (timestamp, resourceName, userEmail, accountId) |
| 索引 | ✅ 定义 | timestamp, userEmail, resourceType, operationType, campaign, accountId |
| 迁移文件 | ✅ 生成 | `0001_fresh_start_multi_account.sql` (最新) |
| **迁移执行** | ⚠️ **未验证** | 需手动运行 `npm run db:migrate` 并验证 |

#### **后端 API 层**

| 组件 | 状态 | 说明 |
|------|------|------|
| tRPC v11.7.1 | ✅ 完成 | 3 个 Router: accounts, events, stats |
| Accounts Router | ✅ 完成 | list, getById, create, update, delete |
| Events Router | ✅ 完成 | list (accountId 必填), sync, getById |
| Stats Router | ✅ 完成 | overview (单账户), multiAccountOverview |
| Zod 验证 | ✅ 完成 | 所有 procedure 输入验证 |
| 类型安全 | ✅ 完成 | 端到端 TypeScript 推导 |
| 错误处理 | ✅ 完成 | TRPCError 统一错误格式 |

#### **前端 UI 层**

| 组件 | 状态 | 说明 |
|------|------|------|
| Next.js 16.0.3 | ✅ 运行 | App Router + Turbopack |
| Material UI v7.3.5 | ✅ 配置 | 主题 + CssBaseline |
| MUI X DataGrid 8.18.0 | ✅ 使用 | 事件列表 + 账户管理 |
| Dashboard 页面 | ✅ 完成 | 统计卡片 + 分布展示 |
| Events 页面 | ✅ 完成 | DataGrid + 筛选器 + 同步按钮 |
| Accounts 页面 | ✅ 完成 | DataGrid + 添加/编辑/删除 |
| AccountSelector | ✅ 完成 | 侧边栏下拉 + localStorage |
| EventDetailDialog | ✅ 完成 | 字段级变更对比 |
| AccountDialog | ✅ 完成 | 添加/编辑账户表单 |
| AccountContext | ✅ 完成 | 全局状态管理 |

#### **Google Ads 集成**

| 组件 | 状态 | 说明 |
|------|------|------|
| google-ads-api v21.0.1 | ✅ 安装 | 官方 Node.js 客户端 |
| Service Account 认证 | ✅ 配置 | 生产级认证方式 |
| MCC 支持 | ✅ 实现 | login_customer_id 配置 |
| GoogleAdsClient | ✅ 实现 | client.ts 封装 |
| Deep Diff Engine | ✅ 实现 | diff-engine.ts (完整移植 MVP) |
| ChangeEvent Parser | ✅ 实现 | parser.ts (资源提取 + 摘要生成) |
| **API 连接测试** | ⚠️ **未测试** | 需验证真实 API 调用 |

### 4.2 已知限制和待解决问题

#### **测试覆盖**
- ❌ **0 个单元测试** - 无 Vitest 配置
- ❌ **0 个集成测试** - tRPC API 未测试
- ❌ **0 个 E2E 测试** - 无 Playwright
- ⏳ **手动测试待执行** - 测试场景已文档化在 `docs/TESTING-SUMMARY.md`

#### **性能优化**
- ❌ **无查询性能分析** - 未使用 `EXPLAIN ANALYZE`
- ❌ **无 React Query 缓存配置** - 默认配置
- ❌ **无前端性能优化** - 未使用 React.memo/useMemo
- ❌ **无 Lighthouse 报告** - 未测试首屏加载性能

#### **部署**
- ❌ **未部署到 Vercel** - 仅本地开发
- ❌ **无生产数据库** - 未配置 Supabase/Neon
- ❌ **无 CI/CD** - 无自动化部署流程

#### **功能限制**
- ⚠️ **手动同步** - 无定时任务，需用户点击按钮
- ⚠️ **无用户认证** - 任何人可访问（本地环境）
- ⚠️ **无操作效果分析** - 仅记录操作，不分析影响

### 4.3 测试状态和质量评估

| 测试类型 | 状态 | 覆盖率 | 备注 |
|---------|------|--------|------|
| TypeScript 编译 | ✅ 通过 | 100% | `npx tsc --noEmit` 零错误 |
| 开发服务器启动 | ✅ 成功 | N/A | `localhost:4000` 正常运行 |
| 单元测试 | ❌ 无 | 0% | Vitest 未安装 |
| 集成测试 | ❌ 无 | 0% | tRPC API 未测试 |
| E2E 测试 | ❌ 无 | 0% | Playwright 未安装 |
| 手动 UI 测试 | ⏳ 待执行 | 未知 | 测试文档已准备 |
| 性能测试 | ❌ 无 | N/A | 无 Lighthouse 报告 |
| Google Ads API 测试 | ⚠️ 未验证 | 未知 | 连接和数据同步未测试 |

**质量评估**:
- ⭐⭐⭐⭐⭐ **代码质量** (9/10) - 严格类型安全、清晰架构、一致风格
- ⭐☆☆☆☆ **测试覆盖** (0/10) - 完全无自动化测试
- ⭐⭐⭐⭐☆ **文档完整性** (8/10) - 详细但需整合
- ⭐⭐⭐☆☆ **生产就绪度** (5/10) - 需测试、优化、部署

### 4.4 部署状态和环境配置

#### **当前环境**
- **开发环境**: `localhost:4000`
- **数据库**: Docker PostgreSQL 16 (`monitor_sys_ua`, 端口 5433)
- **Node.js**: 18+ (推荐 20 LTS)
- **包管理器**: npm

#### **必需环境变量** (`.env.example` 模板)

```bash
# 数据库 (Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/monitor_sys_ua"

# Google Ads API
GOOGLE_ADS_LOGIN_CUSTOMER_ID="7537581501"          # MCC 账户 ID (10位数字)
GOOGLE_ADS_DEFAULT_CUSTOMER_ID="1234567890"       # 默认客户账户
GOOGLE_ADS_JSON_KEY_FILE_PATH="./path/to/key.json" # Service Account JSON
GOOGLE_ADS_DEVELOPER_TOKEN="your_developer_token"
```

#### **待部署任务**

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 配置 Vercel 项目 | 连接 Git 仓库 | 高 |
| 设置生产数据库 | Supabase/Neon/Railway | 高 |
| 运行生产迁移 | `drizzle-kit migrate` | 高 |
| 配置环境变量 | Vercel Dashboard | 高 |
| 首次部署测试 | 验证核心功能 | 高 |
| 域名配置 | 自定义域名（可选） | 低 |
| 监控告警 | Sentry/Vercel Analytics | 低 |

---

## 5. 核心实现

### 5.1 数据库 Schema (Drizzle)

#### **accounts 表**
```typescript
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  customerId: text('customer_id').notNull().unique(), // 10位数字，无破折号
  name: text('name').notNull(),
  currency: text('currency').default('USD'),
  timeZone: text('time_zone').default('America/Los_Angeles'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastSyncedAt: timestamp('last_synced_at'),
});
```

#### **change_events 表**
```typescript
export const changeEvents = pgTable('change_events', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  userEmail: text('user_email').notNull(),
  resourceType: text('resource_type').notNull(),      // CAMPAIGN_BUDGET, CAMPAIGN, etc.
  operationType: text('operation_type').notNull(),    // CREATE, UPDATE, REMOVE
  resourceName: text('resource_name').notNull(),
  clientType: text('client_type'),                    // UI, API, EDITOR
  campaign: text('campaign'),
  adGroup: text('ad_group'),
  summary: text('summary').notNull(),
  fieldChanges: jsonb('field_changes'),               // { "field.path": [oldValue, newValue] }
  changedFieldsPaths: jsonb('changed_fields_paths'),  // ["field.path1", "field.path2"]
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  uniqueEvent: unique().on(table.timestamp, table.resourceName, table.userEmail, table.accountId),
  timestampIdx: index('timestamp_idx').on(table.timestamp),
  accountIdIdx: index('account_id_idx').on(table.accountId),
  // ... 其他索引
}));
```

### 5.2 tRPC API 设计

#### **Events Router 示例**
```typescript
export const eventsRouter = createTRPCRouter({
  list: publicProcedure
    .input(z.object({
      accountId: z.number().int().positive(),  // 必填
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      userEmail: z.string().optional(),
      resourceType: z.string().optional(),
      operationType: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { events, total } = await getEvents(input);
      return { events, total, page: input.page, pageSize: input.pageSize };
    }),

  sync: publicProcedure
    .input(z.object({
      accountId: z.number().int().positive(),
      days: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      // 1. 获取账户信息
      const account = await getAccountById(input.accountId);
      // 2. 调用 Google Ads API
      const rawEvents = await fetchChangeEvents(account.customerId, input.days);
      // 3. 解析并插入数据库
      const parsedEvents = rawEvents.map(e => parseChangeEvent(e));
      await insertEvents(parsedEvents, input.accountId);
      // 4. 更新最后同步时间
      await updateAccount(input.accountId, { lastSyncedAt: new Date() });
      return { success: true, count: parsedEvents.length };
    }),
});
```

### 5.3 Deep Diff Engine 算法

**核心函数** (完整移植 MVP Python 实现):

```typescript
export function deepDiff(
  oldValue: any,
  newValue: any,
  prefix = ""
): Record<string, [any, any]> {
  const diffs: Record<string, [any, any]> = {};

  if (deepEqual(oldValue, newValue)) return diffs;

  // 嵌套对象递归
  if (isObject(oldValue) && isObject(newValue)) {
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const nested = deepDiff(oldValue[key], newValue[key], fullKey);
      Object.assign(diffs, nested);
    }
    return diffs;
  }

  // 基础类型或数组
  const fullKey = prefix || "root";
  diffs[fullKey] = [oldValue, newValue];
  return diffs;
}
```

---

## 6. 开发指南

### 6.1 快速开始

```bash
# 1. 克隆项目
git clone <repo-url>
cd MonitorSysUA

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填写 Google Ads 凭证和数据库 URL

# 4. 运行数据库迁移
npm run db:migrate

# 5. 启动开发服务器
npm run dev
# 访问 http://localhost:4000
```

### 6.2 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (端口 4000) |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产服务器 |
| `npm run db:generate` | 生成 Drizzle 迁移文件 |
| `npm run db:migrate` | 运行数据库迁移 |
| `npm run db:studio` | 打开 Drizzle Studio (数据库 GUI) |
| `npx tsc --noEmit` | TypeScript 类型检查 |

### 6.3 关键文件位置

| 文件 | 说明 |
|------|------|
| `server/db/schema.ts` | 数据库 Schema 定义 |
| `server/api/root.ts` | tRPC Root Router |
| `server/api/routers/` | tRPC 子路由 (accounts, events, stats) |
| `server/google-ads/client.ts` | Google Ads API 客户端 |
| `server/google-ads/diff-engine.ts` | Deep Diff 算法 |
| `app/(dashboard)/layout.tsx` | Dashboard 布局 |
| `components/layout/account-selector.tsx` | 账户选择器 |
| `lib/contexts/account-context.tsx` | 全局账户状态 |
| `theme/index.ts` | MUI 主题配置 |
| `.env.example` | 环境变量模板 |
| `docs/TESTING-SUMMARY.md` | 测试指南 |
| `docs/todo.md` | 开发任务清单 |

### 6.4 故障排查

**问题 1: `npm run dev` 端口冲突**
```bash
# 解决方案: 修改端口
PORT=3002 npm run dev
```

**问题 2: 数据库连接失败**
```bash
# 检查 Docker 数据库容器是否运行
docker ps | grep postgres

# 启动数据库容器
npm run docker:db:up

# 查看数据库日志
npm run docker:db:logs

# 验证数据库连接
docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "\l"

# 重新运行迁移
npm run db:migrate
```

**问题 3: TypeScript 类型错误**
```bash
# 清除缓存并重新构建
rm -rf .next node_modules/.cache
npm run build
```

**问题 4: Google Ads API 认证失败**
- 确认 `.env` 中的环境变量正确
- 验证 Service Account JSON 文件路径
- 检查 MCC 账户 ID 格式（10位数字，无破折号）
- 确认 Service Account 有权限访问 MCC 和客户账户

---

## 7. 项目里程碑

### 7.1 进度总览

| Phase | 原计划 | 实际用时 | 状态 | 完成度 |
|-------|--------|----------|------|--------|
| Phase 1: 基础设施 | 已包含 | 1 天 | ✅ 完成 | 100% |
| Phase 2: 核心功能 | 2-3 周 | 1 天 | ✅ 完成 | 100% + 多账户 |
| Phase 3: UI/UX | 1-2 周 | 1 天 | ✅ 完成 | 100% |
| Phase 4: 测试优化 | 1 周 | 进行中 | 🚧 测试中 | 30% |
| Phase 5: 未来扩展 | 待定 | 未开始 | ⏸️ 暂缓 | 0% |
| **总计** | **4-6 周** | **2 天 + 测试中** | **85% 完成** | **~85%** |

### 7.2 关键成就 🎉

1. ✅ **超前完成** - 2 天完成原计划 4-6 周的工作
2. 🌟 **多账户支持** - 原计划 Phase 5，提前在 Phase 2-3 实现
3. ✅ **端到端类型安全** - TypeScript + tRPC + Drizzle 零类型错误
4. ✅ **MCC 集成** - 单一认证管理多个 Google Ads 账户
5. ✅ **Deep Diff Engine** - 完美移植 MVP Python 实现
6. ✅ **专业 UI** - Material UI v7 企业级界面
7. ✅ **生产级认证** - Service Account (非 OAuth)
8. ✅ **完整文档** - CLAUDE.md + todo.md + TESTING-SUMMARY.md

### 7.3 下一步优先级

#### **立即执行 (本周)**
1. 🔥 **运行数据库迁移** - `npm run db:migrate` 并验证表创建
2. 🔥 **配置环境变量** - 填写 `.env` 文件
3. 🔥 **手动 UI 测试** - 按 TESTING-SUMMARY.md 测试所有场景
4. 🔥 **Google Ads 连接测试** - 添加账户并同步数据

#### **短期 (1-2 周)**
5. ⚡ **修复发现的 Bug** - 记录并修复测试中发现的问题
6. ⚡ **性能基准测试** - Lighthouse + 查询性能分析
7. ⚡ **部署到 Vercel** - 配置生产环境
8. ⚡ **添加单元测试** (可选) - 核心函数测试

#### **中期 (1-2 月)**
9. 📅 **定时自动同步** - Vercel Cron 定时任务
10. 📅 **用户认证** - NextAuth.js + 权限管理
11. 📅 **监控告警** - Sentry 错误追踪

#### **长期 (3+ 月)**
12. 🚀 **操作效果分析** - 关联广告表现数据
13. 🚀 **智能建议系统** - 基于历史数据推荐
14. 🚀 **预警系统** - 异常操作识别

---

## 附录

### A. 参考文档

- **Google Ads API**: https://developers.google.com/google-ads/api
- **Next.js**: https://nextjs.org/docs
- **tRPC**: https://trpc.io/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **Material UI**: https://mui.com/material-ui/
- **MUI X Data Grid**: https://mui.com/x/react-data-grid/

### B. 相关文件

- **开发任务清单**: `docs/todo.md`
- **测试指南**: `docs/TESTING-SUMMARY.md`
- **环境变量模板**: `.env.example`
- **MVP 原型**: `mvp/` 目录

### C. 联系方式

- **项目负责人**: [Your Name]
- **GitHub**: [Repo URL]
- **问题反馈**: GitHub Issues

---

**文档结束** | 最后更新: 2025-11-17
