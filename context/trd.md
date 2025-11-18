# Google Ads ChangeEvent 监控系统 - 技术设计文档

## 文档信息

**项目名称**: MonitorSysUA - Google Ads ChangeEvent 监控系统
**版本**: 2.0
**最后更新**: 2025-11-15
**技术栈**: Next.js 15 + tRPC + Drizzle ORM + PostgreSQL + Material UI
**目标**: Phase 1 生产就绪的全栈应用

---

## 目录

1. [技术栈概览](#技术栈概览)
2. [项目架构](#项目架构)
3. [目录结构](#目录结构)
4. [数据库设计](#数据库设计)
5. [后端API设计](#后端api设计)
6. [前端设计](#前端设计)
7. [Google Ads 集成](#google-ads-集成)
8. [环境配置](#环境配置)
9. [开发工作流](#开发工作流)
10. [部署方案](#部署方案)
11. [性能优化](#性能优化)
12. [安全考虑](#安全考虑)

---

## 技术栈概览

### 前端技术

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Next.js** | 请参考context7查询最新版本安装 | React 全栈框架 | App Router、Server Components、优秀 DX |
| **React** | 请参考context7查询最新版本安装 | UI 库 | 随 Next.js 15 自动安装 |
| **TypeScript** | 请参考context7查询最新版本安装 | 类型系统 | 类型安全、更好的 IDE 支持 |
| **Material UI** | 请参考context7查询最新版本安装 | UI 组件库 | 企业级组件、完整生态 |
| **Emotion** | 请参考context7查询最新版本安装 | CSS-in-JS | MUI 的样式引擎 |
| **Recharts** | 请参考context7查询最新版本安装 | 图表库 | React 友好、功能丰富 |

### 后端技术

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **tRPC** | 请参考context7查询最新版本安装 | API 层 | 端到端类型安全、无需 codegen |
| **Zod** | 请参考context7查询最新版本安装 | Schema 验证 | 类型推导、运行时验证 |
| **Drizzle ORM** | 请参考context7查询最新版本安装 | ORM | TypeScript-first、轻量级 |
| **PostgreSQL** | 请参考context7查询最新版本安装 | 数据库 | 可靠、JSONB 支持、性能好 |
| **Node.js** | 请参考context7查询最新版本安装 | 运行时 | Next.js 要求 |

### 外部集成

| 服务 | 用途 |
|------|------|
| **Google Ads API** | ChangeEvent 数据源 |
| **OAuth 2.0** | Google Ads 认证 |

### 开发工具

| 工具 | 用途 |
|------|------|
| **pnpm** | 包管理 |
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Drizzle Kit** | 数据库迁移 |
| **Git** | 版本控制 |

---

## 项目架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       用户浏览器                              │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Next.js 前端（React + Material UI）           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │ 事件列表页   │  │ 统计仪表板   │  │ 详情对话框  │  │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓ tRPC Client                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                          │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    tRPC Router                         │  │
│  │  ┌────────────────┐        ┌───────────────────────┐  │  │
│  │  │ Events Router  │        │    Stats Router       │  │  │
│  │  │ - list()       │        │ - overview()          │  │  │
│  │  │ - sync()       │        │ - byUser()            │  │  │
│  │  │ - getById()    │        │ - byResourceType()    │  │  │
│  │  └────────────────┘        └───────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                     ↓                    ↓                    │
│  ┌────────────────────────────┐   ┌──────────────────────┐  │
│  │  Google Ads API Client     │   │   Drizzle ORM        │  │
│  │  - fetchChangeEvents()     │   │   - queries.ts       │  │
│  │  - parseProtobuf()         │   │   - schema.ts        │  │
│  └────────────────────────────┘   └──────────────────────┘  │
│                     ↓                    ↓                    │
└─────────────────────────────────────────────────────────────┘
                      ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│              外部服务                                          │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │  Google Ads API      │    │    PostgreSQL 数据库     │  │
│  │  (ChangeEvent)       │    │    (change_events 表)    │  │
│  └──────────────────────┘    └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 数据流向

1. **数据同步流**:
   ```
   用户点击"刷新" → tRPC sync mutation
                     → Google Ads API Client
                     → 获取 ChangeEvent (Protobuf)
                     → 解析转换为 TypeScript 对象
                     → Drizzle ORM 批量插入
                     → PostgreSQL 存储（去重）
                     → 返回同步结果
   ```

2. **数据查询流**:
   ```
   用户访问页面 → tRPC list query
                → Drizzle ORM 构建 SQL 查询
                → PostgreSQL 执行（带索引）
                → 返回类型安全数据
                → React 组件渲染
   ```

3. **类型安全流**:
   ```
   Drizzle Schema → 推导类型 → tRPC Router 使用
                                  ↓
                           tRPC Client 自动推导
                                  ↓
                           React 组件使用类型安全数据
   ```

---

## 目录结构

```
MonitorSysUA/
├── app/                                  # Next.js App Router
│   ├── (dashboard)/                     # Dashboard 路由组
│   │   ├── layout.tsx                   # Dashboard 布局（侧边栏+导航）
│   │   ├── page.tsx                     # 主页 - 统计仪表板
│   │   └── events/
│   │       └── page.tsx                 # 事件列表页
│   ├── api/                             # API Routes（非 tRPC）
│   │   └── trpc/                        # tRPC handler
│   │       └── [trpc]/
│   │           └── route.ts             # tRPC HTTP handler
│   ├── layout.tsx                       # 根布局（HTML、字体、Provider）
│   ├── globals.css                      # 全局样式（Tailwind directives）
│   └── providers.tsx                    # React Query + tRPC Provider
│
├── components/                           # React 组件
│   ├── events/                          # 事件相关业务组件
│   │   ├── event-table.tsx              # 事件表格（使用 MUI DataGrid）
│   │   ├── event-filters.tsx            # 筛选器表单（MUI Form）
│   │   ├── event-detail-dialog.tsx      # 详情对话框（MUI Dialog）
│   │   └── sync-button.tsx              # 同步按钮（MUI Button）
│   │
│   ├── stats/                           # 统计相关组件
│   │   ├── overview-cards.tsx           # 统计卡片（MUI Card）
│   │   ├── timeline-chart.tsx           # 时间线图表
│   │   └── resource-type-chart.tsx      # 资源类型分布图
│   │
│   └── layout/                          # 布局组件
│       ├── header.tsx                   # 顶部导航（MUI AppBar）
│       ├── sidebar.tsx                  # 侧边栏（MUI Drawer）
│       └── footer.tsx                   # 页脚
│
├── server/                               # 后端逻辑
│   ├── api/                             # tRPC API
│   │   ├── root.ts                      # Root router（组合所有 sub-routers）
│   │   ├── trpc.ts                      # tRPC 初始化、context、procedure 定义
│   │   └── routers/
│   │       ├── events.ts                # Events router（list, sync, getById）
│   │       └── stats.ts                 # Stats router（overview, byUser, etc.）
│   │
│   ├── db/                              # 数据库层
│   │   ├── index.ts                     # Drizzle 实例、连接配置
│   │   ├── schema.ts                    # Drizzle schema 定义
│   │   ├── queries.ts                   # 数据库查询函数
│   │   └── migrations/                  # 迁移文件（Drizzle Kit 生成）
│   │       ├── 0000_initial.sql
│   │       └── ...
│   │
│   └── google-ads/                      # Google Ads 集成
│       ├── client.ts                    # API 客户端封装
│       ├── parser.ts                    # Protobuf 解析器
│       ├── types.ts                     # TypeScript 类型定义
│       └── utils.ts                     # 工具函数（字段转换等）
│
├── lib/                                  # 工具库
│   ├── utils.ts                         # 通用工具函数
│   ├── trpc/                            # tRPC 配置
│   │   ├── client.ts                    # tRPC 客户端（React hooks）
│   │   └── server.ts                    # tRPC 服务端工具
│   └── validations/                     # Zod schemas
│       ├── event.ts                     # Event 相关 schemas
│       └── stats.ts                     # Stats 相关 schemas
│
├── theme/                                # MUI 主题配置
│   └── index.ts                         # MUI 主题定义
│
├── hooks/                                # 自定义 React Hooks
│   ├── use-events.ts                    # 事件列表 hook（封装 tRPC）
│   ├── use-stats.ts                     # 统计数据 hook
│   └── use-debounce.ts                  # 防抖 hook
│
├── types/                                # 全局 TypeScript 类型
│   ├── index.ts                         # 导出所有类型
│   └── google-ads.ts                    # Google Ads 相关类型
│
├── public/                               # 静态资源
│   ├── favicon.ico
│   └── images/
│
├── docs/                                 # 项目文档
│   ├── tech-design.md                   # 本文件
│   ├── mvpdesign.md                     # MVP 设计（参考）
│   └── api.md                           # API 文档（可选）
│
├── mvp/                                  # MVP 原型（仅供参考，不参与构建）
│   └── [Flask/SQLite 实现]
│
├── .env.local                            # 环境变量（本地）
├── .env.example                          # 环境变量示例
├── .gitignore                            # Git 忽略文件
├── drizzle.config.ts                     # Drizzle ORM 配置
├── next.config.js                        # Next.js 配置
├── tsconfig.json                         # TypeScript 配置
├── package.json                          # 依赖管理
├── pnpm-lock.yaml                        # pnpm 锁文件
├── eslint.config.js                      # ESLint 配置
├── prettier.config.js                    # Prettier 配置（可选）
├── README.md                             # 项目说明
├── prd.md                                # 产品需求文档
├── todo.md                               # 开发任务清单
└── CLAUDE.md                             # 实施笔记
```

---

## 数据库设计

### Drizzle ORM Schema

```typescript
// server/db/schema.ts
import { pgTable, serial, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const changeEvents = pgTable('change_events', {
  // 主键
  id: serial('id').primaryKey(),

  // 时间信息
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

  // 操作信息
  userEmail: text('user_email').notNull(),
  resourceType: text('resource_type').notNull(), // CAMPAIGN_BUDGET, CAMPAIGN, AD_GROUP, AD_GROUP_AD
  operationType: text('operation_type').notNull(), // CREATE, UPDATE, REMOVE
  resourceName: text('resource_name').notNull(),
  clientType: text('client_type'), // UI, API, EDITOR, null

  // 关联信息
  campaign: text('campaign'),
  adGroup: text('ad_group'),

  // 变更详情
  summary: text('summary').notNull(), // 人类可读的变更摘要，如 "Budget increased from $50 to $100"
  fieldChanges: jsonb('field_changes'), // 详细字段变更，格式: { field: { old: "...", new: "..." } }
  changedFieldsPaths: jsonb('changed_fields_paths').$type<string[]>(), // 变更字段路径数组
}, (table) => ({
  // 索引（加速查询）
  timestampIdx: index('timestamp_idx').on(table.timestamp),
  userEmailIdx: index('user_email_idx').on(table.userEmail),
  resourceTypeIdx: index('resource_type_idx').on(table.resourceType),
  operationTypeIdx: index('operation_type_idx').on(table.operationType),
  campaignIdx: index('campaign_idx').on(table.campaign),

  // 唯一约束（防止重复插入）
  uniqueEvent: uniqueIndex('unique_event').on(
    table.timestamp,
    table.resourceName,
    table.userEmail
  ),
}));

// 类型推导
export type ChangeEvent = typeof changeEvents.$inferSelect;
export type NewChangeEvent = typeof changeEvents.$inferInsert;
```

### PostgreSQL 生成的 DDL

```sql
CREATE TABLE change_events (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  user_email TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  client_type TEXT,
  campaign TEXT,
  ad_group TEXT,
  summary TEXT NOT NULL,
  field_changes JSONB,
  changed_fields_paths JSONB
);

-- 索引
CREATE INDEX timestamp_idx ON change_events (timestamp);
CREATE INDEX user_email_idx ON change_events (user_email);
CREATE INDEX resource_type_idx ON change_events (resource_type);
CREATE INDEX operation_type_idx ON change_events (operation_type);
CREATE INDEX campaign_idx ON change_events (campaign);

-- 唯一约束
CREATE UNIQUE INDEX unique_event ON change_events (timestamp, resource_name, user_email);
```

### 数据库查询函数

```typescript
// server/db/queries.ts
import { db } from './index';
import { changeEvents, type NewChangeEvent } from './schema';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';

// 插入事件（单个）
export async function insertEvent(event: NewChangeEvent) {
  return await db.insert(changeEvents).values(event).onConflictDoNothing();
}

// 批量插入事件（去重）
export async function insertEvents(events: NewChangeEvent[]) {
  if (events.length === 0) return { count: 0 };

  const result = await db.insert(changeEvents)
    .values(events)
    .onConflictDoNothing();

  return { count: result.rowCount || 0 };
}

// 获取事件列表（带筛选和分页）
export async function getEvents(params: {
  page?: number;
  pageSize?: number;
  userEmail?: string;
  resourceType?: string;
  operationType?: string;
  search?: string;
}) {
  const { page = 1, pageSize = 50, userEmail, resourceType, operationType, search } = params;

  // 构建 WHERE 条件
  const conditions = [];
  if (userEmail) conditions.push(eq(changeEvents.userEmail, userEmail));
  if (resourceType) conditions.push(eq(changeEvents.resourceType, resourceType));
  if (operationType) conditions.push(eq(changeEvents.operationType, operationType));
  if (search) {
    conditions.push(
      or(
        ilike(changeEvents.summary, `%${search}%`),
        ilike(changeEvents.campaign, `%${search}%`),
        ilike(changeEvents.resourceName, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询数据
  const data = await db.select()
    .from(changeEvents)
    .where(where)
    .orderBy(desc(changeEvents.timestamp))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  // 查询总数
  const totalResult = await db.select({ count: sql<number>`count(*)` })
    .from(changeEvents)
    .where(where);

  const total = Number(totalResult[0]?.count || 0);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// 获取单个事件详情
export async function getEventById(id: number) {
  const result = await db.select()
    .from(changeEvents)
    .where(eq(changeEvents.id, id))
    .limit(1);

  return result[0] || null;
}

// 获取所有用户邮箱（去重）
export async function getUserEmails() {
  const result = await db.selectDistinct({ userEmail: changeEvents.userEmail })
    .from(changeEvents)
    .orderBy(changeEvents.userEmail);

  return result.map(r => r.userEmail);
}

// 获取统计信息
export async function getStats() {
  const [totalEvents, totalUsers, resourceTypes, operationTypes] = await Promise.all([
    // 总事件数
    db.select({ count: sql<number>`count(*)` }).from(changeEvents),

    // 总用户数
    db.select({ count: sql<number>`count(distinct user_email)` }).from(changeEvents),

    // 资源类型分布
    db.select({
      resourceType: changeEvents.resourceType,
      count: sql<number>`count(*)`
    })
      .from(changeEvents)
      .groupBy(changeEvents.resourceType),

    // 操作类型分布
    db.select({
      operationType: changeEvents.operationType,
      count: sql<number>`count(*)`
    })
      .from(changeEvents)
      .groupBy(changeEvents.operationType),
  ]);

  return {
    totalEvents: Number(totalEvents[0]?.count || 0),
    totalUsers: Number(totalUsers[0]?.count || 0),
    resourceTypes,
    operationTypes,
  };
}
```

---

## 后端API设计

### tRPC 初始化

```typescript
// server/api/trpc.ts
import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

// 创建 context（可以包含 session、db 等）
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    headers: opts.headers,
    // 可以添加 session、db 等
  };
};

// 初始化 tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// 导出工具
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
```

### Events Router

```typescript
// server/api/routers/events.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { getEvents, getEventById, insertEvents } from '@/server/db/queries';
import { fetchAndParseChangeEvents } from '@/server/google-ads/client';

export const eventsRouter = createTRPCRouter({
  // 获取事件列表
  list: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      userEmail: z.string().optional(),
      resourceType: z.string().optional(),
      operationType: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await getEvents(input);
    }),

  // 同步 Google Ads 数据
  sync: publicProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      try {
        // 从 Google Ads API 获取数据
        const events = await fetchAndParseChangeEvents(input.days);

        // 插入数据库
        const result = await insertEvents(events);

        return {
          success: true,
          count: result.count,
          message: `Successfully synced ${result.count} events`,
        };
      } catch (error) {
        throw new Error(`Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // 获取单个事件详情
  getById: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const event = await getEventById(input.id);
      if (!event) {
        throw new Error('Event not found');
      }
      return event;
    }),
});
```

### Stats Router

```typescript
// server/api/routers/stats.ts
import { createTRPCRouter, publicProcedure } from '../trpc';
import { getStats } from '@/server/db/queries';

export const statsRouter = createTRPCRouter({
  // 总览统计
  overview: publicProcedure.query(async () => {
    return await getStats();
  }),

  // 按用户统计（可扩展）
  byUser: publicProcedure.query(async () => {
    // TODO: 实现按用户统计
    return [];
  }),

  // 按资源类型统计（可扩展）
  byResourceType: publicProcedure.query(async () => {
    // TODO: 实现按资源类型统计
    return [];
  }),
});
```

### Root Router

```typescript
// server/api/root.ts
import { createTRPCRouter } from './trpc';
import { eventsRouter } from './routers/events';
import { statsRouter } from './routers/stats';

export const appRouter = createTRPCRouter({
  events: eventsRouter,
  stats: statsRouter,
});

// 导出类型（供前端使用）
export type AppRouter = typeof appRouter;
```

### tRPC Client 配置

```typescript
// lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

---

## 前端设计

### Material UI 组件使用

#### 1. MUI 主题配置

```typescript
// theme/index.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});
```

```typescript
// app/layout.tsx
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '@/theme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 2. 数据表格（Event Table - MUI DataGrid）

```typescript
// components/events/event-table.tsx
'use client';

import { useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { trpc } from '@/lib/trpc/client';
import { Button, Box } from '@mui/material';

const columns: GridColDef[] = [
  { field: 'timestamp', headerName: '时间', width: 180, valueFormatter: (value) => new Date(value).toLocaleString() },
  { field: 'userEmail', headerName: '用户', width: 200 },
  { field: 'resourceType', headerName: '资源类型', width: 150 },
  { field: 'operationType', headerName: '操作类型', width: 120 },
  { field: 'campaign', headerName: 'Campaign', width: 200 },
  { field: 'summary', headerName: '摘要', width: 300, flex: 1 },
];

export function EventTable() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading } = trpc.events.list.useQuery({
    page: page + 1,
    pageSize
  });

  return (
    <Box sx={{ height: 600, width: '100%' }}>
      <DataGrid
        rows={data?.data || []}
        columns={columns}
        loading={isLoading}
        pagination
        paginationMode="server"
        rowCount={data?.total || 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowsPerPageOptions={[25, 50, 100]}
        disableSelectionOnClick
      />
    </Box>
  );
}
```

#### 3. 筛选器（Event Filters - MUI Form）

```typescript
// components/events/event-filters.tsx
'use client';

import { useState } from 'react';
import { Box, TextField, Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

export function EventFilters({ onFilter }: { onFilter: (values: any) => void }) {
  const [search, setSearch] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [operationType, setOperationType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter({ search, resourceType, operationType });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mb: 3 }}>
      <TextField
        label="搜索"
        placeholder="搜索摘要、Campaign..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>资源类型</InputLabel>
        <Select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          label="资源类型"
        >
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="CAMPAIGN">Campaign</MenuItem>
          <MenuItem value="AD_GROUP">Ad Group</MenuItem>
          <MenuItem value="CAMPAIGN_BUDGET">Budget</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>操作类型</InputLabel>
        <Select
          value={operationType}
          onChange={(e) => setOperationType(e.target.value)}
          label="操作类型"
        >
          <MenuItem value="">全部</MenuItem>
          <MenuItem value="CREATE">创建</MenuItem>
          <MenuItem value="UPDATE">更新</MenuItem>
          <MenuItem value="REMOVE">删除</MenuItem>
        </Select>
      </FormControl>

      <Button type="submit" variant="contained">筛选</Button>
      <Button variant="outlined" onClick={() => {
        setSearch('');
        setResourceType('');
        setOperationType('');
      }}>重置</Button>
    </Box>
  );
}
```

#### 4. 详情对话框（Event Detail Dialog - MUI Dialog）

```typescript
// components/events/event-detail-dialog.tsx
'use client';

import { trpc } from '@/lib/trpc/client';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export function EventDetailDialog({
  eventId,
  open,
  onOpenChange
}: {
  eventId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: event } = trpc.events.getById.useQuery({ id: eventId }, {
    enabled: open,
  });

  const handleCopy = () => {
    if (event?.fieldChanges) {
      navigator.clipboard.writeText(JSON.stringify(event.fieldChanges, null, 2));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        事件详情
        <IconButton onClick={() => onOpenChange(false)} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {event && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>基础信息</Typography>
              <Typography>用户: {event.userEmail}</Typography>
              <Typography>时间: {new Date(event.timestamp).toLocaleString()}</Typography>
              <Typography>操作: <Chip label={event.operationType} size="small" /></Typography>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>变更摘要</Typography>
              <Typography>{event.summary}</Typography>
            </Box>

            {event.fieldChanges && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6">详细变更</Typography>
                  <IconButton onClick={handleCopy} size="small">
                    <ContentCopyIcon />
                  </IconButton>
                </Box>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <pre style={{ margin: 0, overflow: 'auto' }}>
                    {JSON.stringify(event.fieldChanges, null, 2)}
                  </pre>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Google Ads 集成

### 客户端配置

```typescript
// server/google-ads/client.ts
import { GoogleAdsApi, Customer } from 'google-ads-api';
import fs from 'fs';
import path from 'path';
import { parseChangeEvent } from './parser';
import type { NewChangeEvent } from '../db/schema';

// 读取 Google Ads 配置
const configPath = path.join(process.cwd(), 'googletest', 'google-ads.yaml');
const config = fs.readFileSync(configPath, 'utf-8');

// 初始化 Google Ads API 客户端
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
});

// 获取客户实例
const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
});

// 获取并解析 ChangeEvent 数据
export async function fetchAndParseChangeEvents(days: number = 7): Promise<NewChangeEvent[]> {
  // 计算起始日期
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  // 构建 GAQL 查询
  const query = `
    SELECT
      change_event.resource_name,
      change_event.change_date_time,
      change_event.user_email,
      change_event.client_type,
      change_event.change_resource_type,
      change_event.change_resource_name,
      change_event.resource_change_operation,
      change_event.changed_fields,
      change_event.old_resource,
      change_event.new_resource,
      change_event.campaign,
      change_event.ad_group
    FROM change_event
    WHERE change_event.change_date_time >= '${startDateStr}'
      AND change_event.change_resource_type IN (
        'CAMPAIGN_BUDGET',
        'CAMPAIGN',
        'AD_GROUP',
        'AD_GROUP_AD'
      )
    ORDER BY change_event.change_date_time DESC
    LIMIT 10000
  `;

  try {
    // 执行查询
    const results = await customer.query(query);

    // 解析结果
    const events: NewChangeEvent[] = [];
    for (const row of results) {
      const event = parseChangeEvent(row);
      if (event) {
        events.push(event);
      }
    }

    return events;
  } catch (error) {
    console.error('Failed to fetch change events:', error);
    throw new Error(`Google Ads API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Protobuf 解析器

```typescript
// server/google-ads/parser.ts
import type { NewChangeEvent } from '../db/schema';

export function parseChangeEvent(rawEvent: any): NewChangeEvent | null {
  try {
    const changeEvent = rawEvent.change_event;

    // 提取基础信息
    const timestamp = new Date(changeEvent.change_date_time);
    const userEmail = changeEvent.user_email || 'unknown';
    const resourceType = changeEvent.change_resource_type;
    const operationType = changeEvent.resource_change_operation;
    const resourceName = changeEvent.change_resource_name;
    const clientType = changeEvent.client_type || null;
    const campaign = changeEvent.campaign || null;
    const adGroup = changeEvent.ad_group || null;

    // 提取 old_resource 和 new_resource
    const oldResource = extractResource(changeEvent.old_resource, resourceType);
    const newResource = extractResource(changeEvent.new_resource, resourceType);

    // 生成变更摘要
    const summary = generateSummary(resourceType, operationType, oldResource, newResource);

    // 提取字段变更
    const fieldChanges = extractFieldChanges(oldResource, newResource);
    const changedFieldsPaths = changeEvent.changed_fields?.paths || [];


    return {
      timestamp,
      userEmail,
      resourceType,
      operationType,
      resourceName,
      clientType,
      campaign,
      adGroup,
      summary,
      fieldChanges,
      changedFieldsPaths,
    };
  } catch (error) {
    console.error('Failed to parse change event:', error);
    return null;
  }
}

// 从 oneof 中提取资源
function extractResource(resourceWrapper: any, resourceType: string): any {
  if (!resourceWrapper) return null;

  switch (resourceType) {
    case 'CAMPAIGN_BUDGET':
      return resourceWrapper.campaign_budget;
    case 'CAMPAIGN':
      return resourceWrapper.campaign;
    case 'AD_GROUP':
      return resourceWrapper.ad_group;
    case 'AD_GROUP_AD':
      return resourceWrapper.ad_group_ad;
    default:
      return null;
  }
}

// 生成人类可读的摘要
function generateSummary(
  resourceType: string,
  operationType: string,
  oldResource: any,
  newResource: any
): string {
  if (operationType === 'CREATE') {
    return `Created ${resourceType}`;
  }

  if (operationType === 'REMOVE') {
    return `Removed ${resourceType}`;
  }

  // UPDATE 操作：生成具体变更摘要
  if (resourceType === 'CAMPAIGN_BUDGET' && oldResource && newResource) {
    const oldAmount = (oldResource.amount_micros || 0) / 1_000_000;
    const newAmount = (newResource.amount_micros || 0) / 1_000_000;
    return `Budget changed from $${oldAmount} to $${newAmount}`;
  }

  if (resourceType === 'CAMPAIGN' && oldResource && newResource) {
    if (oldResource.status !== newResource.status) {
      return `Campaign status changed from ${oldResource.status} to ${newResource.status}`;
    }
    if (oldResource.name !== newResource.name) {
      return `Campaign renamed from "${oldResource.name}" to "${newResource.name}"`;
    }
  }

  return `Updated ${resourceType}`;
}

// 提取字段级变更
function extractFieldChanges(oldResource: any, newResource: any): any {
  if (!oldResource || !newResource) return null;

  const changes: any = {};

  // 比较所有字段
  const allKeys = new Set([...Object.keys(oldResource), ...Object.keys(newResource)]);

  for (const key of allKeys) {
    if (oldResource[key] !== newResource[key]) {
      changes[key] = {
        old: oldResource[key],
        new: newResource[key],
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
```

---

## 环境配置

### `.env.local` 示例

```bash
# PostgreSQL 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/monitor_sys_ua

# Google Ads API 凭证
GOOGLE_ADS_CUSTOMER_ID=2766411035
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

### `.env.example`

```bash
# PostgreSQL 数据库连接
DATABASE_URL=postgresql://user:password@localhost:5432/monitor_sys_ua

# Google Ads API 凭证
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_REFRESH_TOKEN=

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

---

## 开发工作流

### 1. 初始化项目

```bash
# 创建 Next.js 项目
pnpm create next-app@latest monitor-sys-ua --typescript --tailwind --app --eslint

# 安装额外依赖
cd monitor-sys-ua
pnpm add @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query zod
pnpm add drizzle-orm pg google-ads-api recharts
pnpm add -D drizzle-kit @types/pg

# 安装 Material UI
pnpm add @mui/material @emotion/react @emotion/styled
pnpm add @mui/x-data-grid @mui/x-date-pickers @mui/icons-material
pnpm add date-fns
```

### 2. 配置 Drizzle

```bash
# 创建 drizzle.config.ts
cat > drizzle.config.ts << 'EOF'
import type { Config } from 'drizzle-kit';

export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
EOF

# 生成迁移
pnpm drizzle-kit generate

# 应用迁移
pnpm drizzle-kit migrate
```

### 3. 开发命令

```bash
# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 数据库迁移
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 代码检查
pnpm lint

# 类型检查
pnpm tsc --noEmit
```

---

## 部署方案

### Vercel 部署（推荐）

1. **准备工作**
   - 将代码推送到 GitHub/GitLab
   - 准备生产环境 PostgreSQL（Supabase/Neon）

2. **Vercel 配置**
   - 连接 Git 仓库
   - 配置环境变量（`.env.local` 的所有变量）
   - 构建命令：`pnpm build`
   - 输出目录：`.next`

3. **数据库迁移**
   ```bash
   # 在本地运行迁移（指向生产数据库）
   DATABASE_URL=<production_url> pnpm drizzle-kit migrate
   ```

4. **部署**
   - 推送代码自动触发部署
   - 或手动在 Vercel Dashboard 触发

---

## 性能优化

### 1. Next.js Server Components

- 在可能的地方使用 Server Components
- 减少客户端 JavaScript 包大小

### 2. tRPC Query 缓存

```typescript
// 配置 React Query 缓存策略
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 分钟
      cacheTime: 5 * 60 * 1000, // 5 分钟
    },
  },
});
```

### 3. 数据库查询优化

- 使用索引加速查询
- 避免 N+1 查询
- 使用 `prepare()` 预编译查询

### 4. 虚拟滚动（大数据量）

```bash
pnpm add @tanstack/react-virtual
```

---

## 安全考虑

### 1. 环境变量安全

- 绝不提交 `.env.local` 到 Git
- 使用 Vercel 环境变量管理

### 2. API 安全

- 添加 rate limiting（未来）
- 输入验证（Zod）
- SQL 注入防护（Drizzle ORM 自动处理）

### 3. 认证（Phase 2）

- 使用 NextAuth.js
- JWT token 管理
- RBAC 权限控制

---

## 总结

本文档详细描述了 Google Ads ChangeEvent 监控系统的技术架构和实施细节。

**关键亮点**:
- ✅ 端到端类型安全（TypeScript + tRPC + Drizzle）
- ✅ 现代化技术栈（Next.js 15 + React 19）
- ✅ 优秀的开发体验（热重载、类型推导、无需 codegen）
- ✅ 生产就绪（PostgreSQL、索引优化、错误处理）
- ✅ 可维护性高（模块化、文档完善）

**下一步**:
请参考 `todo.md` 开始 Phase 1 的开发工作。

---

**文档版本**: 2.0
**最后更新**: 2025-11-15
**维护者**: 开发团队
