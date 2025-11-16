# MonitorSysUA 开发任务清单

**最后更新**: 2025-11-15
**项目**: Google Ads ChangeEvent 监控系统
**当前阶段**: Phase 1 准备启动

---

## 📌 总体进度

- [ ] **Phase 1**: 项目基础设施 (预计 1-2 周)
- [ ] **Phase 2**: 核心功能开发 (预计 2-3 周)
- [ ] **Phase 3**: UI/UX 完善 (预计 1-2 周)
- [ ] **Phase 4**: 测试与优化 (预计 1 周)
- [ ] **Phase 5**: 未来扩展 (Phase 2+ 产品功能)

**总预计时间**: 5-8 周（Phase 1-4）

---

## Phase 1: 项目基础设施

> **目标**: 搭建完整的开发环境，配置所有必要的工具和依赖
> **预计时间**: 1-2 周
> **关键交付物**: 可运行的 Next.js 项目 + 数据库连接 + Google Ads API 测试通过

### 1.1 项目初始化（1-2 天）

请参考context7查询最新版本安装, 确保在每一个工具在安装和使用之前都使用了context7 mcp进行了最新文档的查询

- [ ] 创建 Next.js 项目（使用 App Router）
  ```bash
  pnpm create next-app@latest monitor-sys-ua --typescript --app --eslint
  ```

- [ ] 配置 TypeScript
  - [ ] 设置 `tsconfig.json`（strict mode）
  - [ ] 配置路径别名 (`@/...`)
  - [ ] 测试类型检查 (`pnpm tsc --noEmit`)

- [ ] 安装并配置 tRPC
  - [ ] 安装依赖 (`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/next`)
  - [ ] 安装 React Query (`@tanstack/react-query`)
  - [ ] 安装 Zod (`zod`)
  - [ ] 创建 tRPC 初始化文件 (`server/api/trpc.ts`)
  - [ ] 创建 Provider 组件 (`app/providers.tsx`)

- [ ] 安装并配置 Material UI
  - [ ] 安装核心包 (`@mui/material`, `@emotion/react`, `@emotion/styled`)
  - [ ] 安装扩展包 (`@mui/x-data-grid`, `@mui/x-date-pickers`, `@mui/icons-material`)
  - [ ] 安装日期库 (`date-fns`)
  - [ ] 创建主题配置 (`theme/index.ts`)
  - [ ] 配置 `app/layout.tsx`（ThemeProvider, CssBaseline）

- [ ] 配置 ESLint + Prettier
  - [ ] 安装 Prettier
  - [ ] 配置 `.eslintrc.json`
  - [ ] 配置 `.prettierrc`
  - [ ] 测试代码格式化

### 1.2 数据库设置（2-3 天）

- [ ] 安装 Drizzle ORM 和 PostgreSQL 客户端
  - [ ] `pnpm add drizzle-orm pg`
  - [ ] `pnpm add -D drizzle-kit @types/pg`

- [ ] 创建 PostgreSQL 数据库
  - [ ] 安装 PostgreSQL（本地或使用 Docker）
  - [ ] 创建数据库 `monitor_sys_ua`
  - [ ] 配置数据库用户和权限

- [ ] 编写 Drizzle schema
  - [ ] 创建 `server/db/schema.ts`
  - [ ] 定义 `changeEvents` 表（包含 `oldResourceRaw`, `newResourceRaw` 等字段）
  - [ ] 添加索引定义（timestamp, userEmail, resourceType, operationType, campaign）
  - [ ] 添加唯一约束（防止重复）
  - [ ] 导出类型 (`ChangeEvent`, `NewChangeEvent`)

- [ ] 配置 Drizzle Kit
  - [ ] 创建 `drizzle.config.ts`
  - [ ] 配置数据库连接字符串
  - [ ] 配置迁移文件输出路径

- [ ] 生成并应用初始迁移
  - [ ] 运行 `pnpm drizzle-kit generate`
  - [ ] 检查生成的 SQL 文件
  - [ ] 运行 `pnpm drizzle-kit migrate`
  - [ ] 验证表已创建（使用 psql 或 GUI 工具）

- [ ] 创建数据库连接模块
  - [ ] 创建 `server/db/index.ts`（Drizzle 实例）
  - [ ] 配置连接池
  - [ ] 测试数据库连接

### 1.3 Google Ads 集成基础（2-3 天）

- [ ] 安装 google-ads-node（官方库）
  - [ ] 研究官方文档和示例
  - [ ] 安装依赖包
  - [ ] 配置 TypeScript 类型

- [ ] 配置 OAuth 2.0 凭证
  - [ ] 复制 `googletest/google-ads.yaml` 到项目根目录
  - [ ] 配置 `.env.local` 文件
    - `GOOGLE_ADS_CUSTOMER_ID`
    - `GOOGLE_ADS_CLIENT_ID`
    - `GOOGLE_ADS_CLIENT_SECRET`
    - `GOOGLE_ADS_DEVELOPER_TOKEN`
    - `GOOGLE_ADS_REFRESH_TOKEN`
  - [ ] 测试凭证有效性

- [ ] 实现基础 API 客户端
  - [ ] 创建 `server/google-ads/client.ts`
  - [ ] 实现 GoogleAdsClient 初始化
  - [ ] 实现基础的 `query()` 方法封装

- [ ] 测试 ChangeEvent 查询
  - [ ] 编写简单的测试脚本
  - [ ] 查询最近 1 天的 ChangeEvent
  - [ ] 验证能够成功获取数据
  - [ ] 打印原始数据结构（用于理解 Protobuf 格式）

---

## Phase 2: 核心功能开发

> **目标**: 实现完整的数据采集、解析和存储流程
> **预计时间**: 2-3 周
> **关键交付物**: 能够从 Google Ads API 拉取数据并存储到数据库

### 2.1 Protobuf 处理引擎（2-3 天）

- [ ] 实现 `unwrapChangedResource()` 函数
  - [ ] 创建 `server/google-ads/protobuf-utils.ts`
  - [ ] 处理 oneof 结构解包
  - [ ] 支持所有资源类型（CAMPAIGN_BUDGET, CAMPAIGN, AD_GROUP, AD_GROUP_AD）
  - [ ] 单元测试：验证解包逻辑

- [ ] 实现 `proto ToObject()` 转换
  - [ ] 研究 google-ads-node 的 Protobuf 转 JSON 方法
  - [ ] 实现通用的转换函数
  - [ ] 处理特殊字段（如 `type_`）
  - [ ] 单元测试：验证转换结果

- [ ] 实现 Enum 转换工具
  - [ ] 创建 Enum 映射表
  - [ ] 实现 Enum 整数 → 字符串名称转换
  - [ ] 支持所有相关 Enum 类型：
    - `ChangeEventResourceType`
    - `ResourceChangeOperation`
    - `ChangeClientType`
  - [ ] 单元测试：验证 Enum 转换

- [ ] 综合测试 Protobuf 处理
  - [ ] 使用真实 API 返回数据测试
  - [ ] 验证所有资源类型都能正确处理
  - [ ] 处理边界情况（null, undefined, 空对象）

### 2.2 Deep Diff Engine（核心，3-4 天）

> **重要**: 这是系统的核心算法，需要完全复刻 MVP 的 Python 实现

- [ ] 实现 `deepDiff()` 主函数
  - [ ] 创建 `server/google-ads/diff-engine.ts`
  - [ ] 实现递归 diff 算法
  - [ ] 定义 `DiffResult` 接口
  - [ ] 参考 MVP 的 `googlemvptest.py:39-72`

- [ ] 实现 `deepEqual()` 辅助函数
  - [ ] 深度相等比较（基础类型、对象、数组）
  - [ ] 处理 null 和 undefined
  - [ ] 单元测试：各种相等情况

- [ ] 实现 `isObject()` 类型判断
  - [ ] 判断是否为普通对象
  - [ ] 排除 null 和数组
  - [ ] 单元测试：边界情况

- [ ] 处理基础类型 diff
  - [ ] 字符串、数字、布尔值
  - [ ] null 和 undefined
  - [ ] 单元测试：基础类型变更

- [ ] 处理嵌套对象 diff
  - [ ] 递归调用 `deepDiff()`
  - [ ] 正确拼接字段路径（`prefix.field.subfield`）
  - [ ] 单元测试：多层嵌套对象

- [ ] 处理数组 diff
  - [ ] 整体记录数组变更（不逐项 diff）
  - [ ] 使用 `deepEqual()` 判断数组是否相等
  - [ ] 单元测试：数组变更检测

- [ ] 边界情况测试
  - [ ] 一边为 null 的情况（CREATE/REMOVE）
  - [ ] 空对象
  - [ ] 循环引用（如果可能）
  - [ ] 性能测试：大型嵌套对象

- [ ] 与 MVP Python 版本对比测试
  - [ ] 使用相同输入数据
  - [ ] 验证输出结果一致性
  - [ ] 修正任何差异

### 2.3 数据解析器（2-3 天）

- [ ] 实现 `parseChangeEvent()` 主函数
  - [ ] 创建 `server/google-ads/parser.ts`
  - [ ] 接收 rawEvent（Google Ads API 原始返回）
  - [ ] 返回 `NewChangeEvent` 对象

- [ ] 提取基础信息
  - [ ] timestamp, userEmail, resourceType, operationType
  - [ ] resourceName, clientType, campaign, adGroup
  - [ ] Enum 转换处理

- [ ] 调用 Protobuf 处理函数
  - [ ] 使用 `unwrapChangedResource()` 解包
  - [ ] 使用 `protoToObject()` 转换
  - [ ] 得到 oldResourceObj 和 newResourceObj

- [ ] 调用 Deep Diff Engine
  - [ ] 使用 `deepDiff()` 计算字段变更
  - [ ] 得到 fieldChanges 对象

- [ ] 实现 `generateSummary()` 函数
  - [ ] 创建 `server/google-ads/summary-generator.ts`
  - [ ] 根据 resourceType 和 operationType 生成摘要
  - [ ] 特殊处理：
    - CAMPAIGN_BUDGET: "Budget changed from $X to $Y"
    - CAMPAIGN status: "Campaign status changed from X to Y"
    - CAMPAIGN name: "Campaign renamed from X to Y"
  - [ ] 通用情况: "Created/Updated/Removed {resourceType}"

- [ ] 组装完整的 ChangeEvent 对象
  - [ ] 包含所有必需字段
  - [ ] 包含 `oldResourceRaw`, `newResourceRaw`（完整原始数据）
  - [ ] 包含 `fieldChanges`（计算后的 diff）
  - [ ] 包含 `changedFieldsPaths`（Google API 提供的路径）
  - [ ] 包含 `summary`（人类可读摘要）

- [ ] 集成测试：完整解析流程
  - [ ] 使用真实 API 数据测试
  - [ ] 验证所有字段都正确填充
  - [ ] 验证 diff 结果准确
  - [ ] 验证摘要生成正确

### 2.4 数据库操作层（2-3 天）

- [ ] 实现 `insertEvent()` 函数
  - [ ] 创建 `server/db/queries.ts`
  - [ ] 单条事件插入
  - [ ] 使用 `onConflictDoNothing()` 处理去重
  - [ ] 返回插入结果

- [ ] 实现 `insertEvents()` 批量插入
  - [ ] 接收 `NewChangeEvent[]` 数组
  - [ ] 批量插入到数据库
  - [ ] 自动去重（基于 unique constraint）
  - [ ] 返回插入成功数量

- [ ] 实现 `getEvents()` 查询函数
  - [ ] 支持分页（page, pageSize）
  - [ ] 支持筛选（userEmail, resourceType, operationType, search）
  - [ ] 使用 Drizzle 的 where() 构建条件
  - [ ] 按 timestamp 倒序排列
  - [ ] 返回 data + total + pagination 信息

- [ ] 实现 `getEventById()` 函数
  - [ ] 根据 id 查询单个事件
  - [ ] 返回完整的事件详情
  - [ ] 处理不存在的情况

- [ ] 实现 `getUserEmails()` 函数
  - [ ] 查询所有不重复的用户邮箱
  - [ ] 按字母顺序排序
  - [ ] 用于筛选器的选项

- [ ] 实现 `getStats()` 统计函数
  - [ ] 总事件数
  - [ ] 总用户数（distinct count）
  - [ ] 资源类型分布（group by）
  - [ ] 操作类型分布（group by）
  - [ ] 使用 SQL aggregation

- [ ] 测试数据库查询
  - [ ] 插入测试数据
  - [ ] 验证查询结果正确
  - [ ] 验证筛选功能
  - [ ] 验证分页功能
  - [ ] 性能测试：大数据量查询

### 2.5 tRPC API 层（2-3 天）

- [ ] 创建 tRPC 初始化配置
  - [ ] 完善 `server/api/trpc.ts`
  - [ ] 配置 error formatter（处理 Zod 错误）
  - [ ] 创建 context（可添加 session 等）

- [ ] 创建 Events Router
  - [ ] 创建 `server/api/routers/events.ts`
  - [ ] 实现 `list` procedure：
    - Input schema（page, pageSize, filters）
    - 调用 `getEvents()`
    - 返回分页数据
  - [ ] 实现 `sync` mutation：
    - Input schema（days）
    - 调用 `fetchAndParseChangeEvents()`
    - 调用 `insertEvents()`
    - 返回同步结果
  - [ ] 实现 `getById` procedure：
    - Input schema（id）
    - 调用 `getEventById()`
    - 处理 not found 错误

- [ ] 创建 Stats Router
  - [ ] 创建 `server/api/routers/stats.ts`
  - [ ] 实现 `overview` procedure：
    - 调用 `getStats()`
    - 返回统计数据
  - [ ] （可选）实现 `byUser` procedure
  - [ ] （可选）实现 `byResourceType` procedure

- [ ] 创建 Root Router
  - [ ] 创建 `server/api/root.ts`
  - [ ] 组合所有 sub-routers
  - [ ] 导出 `appRouter` 和类型 `AppRouter`

- [ ] 配置 tRPC HTTP handler
  - [ ] 创建 `app/api/trpc/[trpc]/route.ts`
  - [ ] 配置 fetch adapter
  - [ ] 处理 GET 和 POST 请求

- [ ] 配置 tRPC 客户端
  - [ ] 完善 `lib/trpc/client.ts`
  - [ ] 创建 React hooks
  - [ ] 配置在 `app/providers.tsx` 中使用

- [ ] API 集成测试
  - [ ] 测试所有 procedures
  - [ ] 验证输入验证（Zod）
  - [ ] 验证错误处理
  - [ ] 验证类型推导正确

---

## Phase 3: UI/UX 开发

> **目标**: 构建完整的用户界面，使用 Material UI 组件
> **预计时间**: 1-2 周
> **关键交付物**: 响应式、美观的 Web 应用

### 3.1 Material UI 主题配置（1 天）

- [ ] 创建主题配置
  - [ ] 完善 `theme/index.ts`
  - [ ] 配置 palette（primary, secondary, error 等）
  - [ ] 配置 typography（字体、字号）
  - [ ] 配置 breakpoints（响应式断点）
  - [ ] 配置 components 默认样式

- [ ] 在根布局中应用主题
  - [ ] 更新 `app/layout.tsx`
  - [ ] 包裹 ThemeProvider
  - [ ] 添加 CssBaseline
  - [ ] 测试主题生效

- [ ] 创建全局样式
  - [ ] 更新 `app/globals.css`
  - [ ] 设置基础样式
  - [ ] 确保与 MUI 兼容

### 3.2 布局组件（2-3 天）

- [ ] 实现 Header 组件
  - [ ] 创建 `components/layout/header.tsx`
  - [ ] 使用 MUI AppBar + Toolbar
  - [ ] 添加 Logo/标题
  - [ ] 添加同步按钮（Sync Button）
  - [ ] 添加用户信息显示（可选）
  - [ ] 响应式设计（移动端收起）

- [ ] 实现 Sidebar 组件
  - [ ] 创建 `components/layout/sidebar.tsx`
  - [ ] 使用 MUI Drawer
  - [ ] 添加导航菜单项：
    - 事件列表（Events List）
    - 统计仪表板（Dashboard）
  - [ ] 实现折叠/展开功能
  - [ ] 响应式设计（移动端为临时抽屉）

- [ ] 实现 Dashboard Layout
  - [ ] 创建 `app/(dashboard)/layout.tsx`
  - [ ] 组合 Header + Sidebar + Main Content
  - [ ] 使用 MUI Box/Container 布局
  - [ ] 实现响应式布局
  - [ ] 测试在不同屏幕尺寸下的表现

### 3.3 事件列表页（3-4 天）

- [ ] 创建事件列表页面
  - [ ] 创建 `app/(dashboard)/events/page.tsx`
  - [ ] 使用 Server Component 作为页面框架
  - [ ] 布局设计（Filters + Table）

- [ ] 实现 EventFilters 组件
  - [ ] 创建 `components/events/event-filters.tsx`
  - [ ] 使用 MUI TextField（搜索框）
  - [ ] 使用 MUI Select（资源类型、操作类型）
  - [ ] 使用 MUI Autocomplete（用户邮箱选择）
  - [ ] 使用 MUI DatePicker（时间范围选择，可选）
  - [ ] 添加"筛选"和"重置"按钮
  - [ ] 实现筛选状态管理（useState）
  - [ ] 筛选变化时触发查询

- [ ] 实现 EventTable 组件
  - [ ] 创建 `components/events/event-table.tsx`
  - [ ] 使用 MUI DataGrid (`@mui/x-data-grid`)
  - [ ] 定义列配置（GridColDef）：
    - timestamp（时间）
    - userEmail（用户）
    - resourceType（资源类型）
    - operationType（操作类型）
    - campaign（Campaign）
    - summary（摘要）
  - [ ] 配置列宽和响应式
  - [ ] 启用排序功能
  - [ ] 启用服务端分页（paginationMode="server"）
  - [ ] 使用 tRPC 调用 `events.list`
  - [ ] 处理加载状态（loading spinner）
  - [ ] 处理错误状态
  - [ ] 行点击事件（打开详情对话框）

- [ ] 集成筛选和表格
  - [ ] 将筛选器状态传递给表格
  - [ ] 实现查询参数联动
  - [ ] 测试筛选功能
  - [ ] 优化用户体验（防抖、加载提示）

### 3.4 事件详情对话框（2-3 天）

- [ ] 实现 EventDetailDialog 组件
  - [ ] 创建 `components/events/event-detail-dialog.tsx`
  - [ ] 使用 MUI Dialog 组件
  - [ ] DialogTitle：显示"事件详情" + 关闭按钮
  - [ ] DialogContent：显示详细信息
  - [ ] 使用 `dividers` 分隔内容

- [ ] 显示基础信息
  - [ ] 用户邮箱
  - [ ] 时间（格式化）
  - [ ] 操作类型（使用 Chip 组件）
  - [ ] 资源类型
  - [ ] 资源名称
  - [ ] 客户端类型

- [ ] 显示变更摘要
  - [ ] 使用 Typography 组件
  - [ ] 显示 summary 字段

- [ ] 显示详细变更（fieldChanges）
  - [ ] 使用 Paper 组件包裹
  - [ ] 使用 `<pre>` 标签显示 JSON
  - [ ] 语法高亮（可选，使用 react-syntax-highlighter）
  - [ ] 显示字段级 diff：old → new
  - [ ] 高亮差异（颜色标识）

- [ ] 添加复制功能
  - [ ] 添加"复制 JSON"按钮（使用 IconButton + ContentCopyIcon）
  - [ ] 使用 `navigator.clipboard.writeText()`
  - [ ] 显示复制成功提示（Snackbar）

- [ ] 使用 tRPC 获取详情数据
  - [ ] 调用 `events.getById`
  - [ ] 处理加载状态
  - [ ] 处理错误情况（事件不存在）

- [ ] 测试对话框
  - [ ] 打开/关闭功能
  - [ ] 数据显示正确
  - [ ] 复制功能正常
  - [ ] 响应式设计（移动端全屏）

### 3.5 统计仪表板（3-4 天）

- [ ] 创建仪表板页面
  - [ ] 创建 `app/(dashboard)/page.tsx`（主页）
  - [ ] 使用 Grid 布局（MUI Grid2）
  - [ ] 规划卡片布局（2x2 或 3 列）

- [ ] 实现 OverviewCards 组件
  - [ ] 创建 `components/stats/overview-cards.tsx`
  - [ ] 使用 MUI Card + CardContent
  - [ ] 显示统计数字：
    - 总事件数
    - 活跃用户数
    - 资源类型数量
    - 操作类型数量
  - [ ] 使用 tRPC 调用 `stats.overview`
  - [ ] 添加图标（使用 MUI Icons）
  - [ ] 样式美化（颜色、间距）

- [ ] 实现 TimelineChart 组件（可选）
  - [ ] 创建 `components/stats/timeline-chart.tsx`
  - [ ] 使用 Recharts 或 MUI X Charts
  - [ ] 显示每日操作频率趋势线图
  - [ ] 配置 X 轴（日期）和 Y 轴（事件数）
  - [ ] 响应式设计

- [ ] 实现 ResourceTypeChart 组件
  - [ ] 创建 `components/stats/resource-type-chart.tsx`
  - [ ] 使用 Recharts PieChart 或 MUI X Charts
  - [ ] 显示资源类型分布饼图
  - [ ] 配置颜色和标签
  - [ ] 添加图例

- [ ] 实现 OperationTypeChart 组件
  - [ ] 创建 `components/stats/operation-type-chart.tsx`
  - [ ] 使用 Recharts BarChart
  - [ ] 显示操作类型分布柱状图
  - [ ] 配置颜色（CREATE=绿色, UPDATE=蓝色, REMOVE=红色）

- [ ] 集成所有组件到仪表板
  - [ ] 布局所有卡片和图表
  - [ ] 测试数据加载
  - [ ] 优化加载状态显示
  - [ ] 响应式测试

### 3.6 数据同步功能（2 天）

- [ ] 实现 SyncButton 组件
  - [ ] 创建 `components/events/sync-button.tsx`
  - [ ] 使用 MUI Button + SyncIcon
  - [ ] 点击触发同步 mutation
  - [ ] 使用 tRPC 调用 `events.sync`

- [ ] 实现同步对话框（可选）
  - [ ] 创建 `components/events/sync-dialog.tsx`
  - [ ] 使用 MUI Dialog
  - [ ] 允许用户选择同步天数（1-30 天）
  - [ ] 显示同步进度（LinearProgress 或 CircularProgress）
  - [ ] 显示同步结果（成功/失败）

- [ ] 处理同步状态
  - [ ] 同步中：禁用按钮，显示 loading 图标
  - [ ] 同步成功：显示成功提示（Snackbar）
  - [ ] 同步失败：显示错误信息
  - [ ] 自动刷新事件列表

- [ ] 优化用户体验
  - [ ] 防止重复点击
  - [ ] 同步完成后刷新数据
  - [ ] 显示同步了多少条新记录

---

## Phase 4: 测试与优化

> **目标**: 确保系统质量和性能达标
> **预计时间**: 1 周
> **关键交付物**: 稳定、高性能的生产就绪应用

### 4.1 单元测试（2-3 天）

- [ ] 安装测试框架
  - [ ] `pnpm add -D vitest @testing-library/react @testing-library/jest-dom`
  - [ ] 配置 `vitest.config.ts`

- [ ] Deep Diff Engine 测试
  - [ ] 创建 `server/google-ads/__tests__/diff-engine.test.ts`
  - [ ] 测试基础类型 diff
  - [ ] 测试嵌套对象 diff
  - [ ] 测试数组 diff
  - [ ] 测试 null 处理
  - [ ] 测试边界情况
  - [ ] 确保测试覆盖率 > 90%

- [ ] Parser 函数测试
  - [ ] 创建 `server/google-ads/__tests__/parser.test.ts`
  - [ ] 测试 `parseChangeEvent()` 完整流程
  - [ ] 测试 `generateSummary()` 各种场景
  - [ ] 测试错误处理
  - [ ] 使用 Mock 数据

- [ ] Protobuf 工具测试
  - [ ] 测试 `unwrapChangedResource()`
  - [ ] 测试 Enum 转换
  - [ ] 测试各种资源类型

- [ ] 数据库查询测试
  - [ ] 测试 `insertEvent()` 和 `insertEvents()`
  - [ ] 测试 `getEvents()` 筛选逻辑
  - [ ] 测试 `getEventById()`
  - [ ] 测试 `getStats()`

### 4.2 集成测试（2-3 天）

- [ ] tRPC API 端到端测试
  - [ ] 测试 `events.list` procedure
  - [ ] 测试 `events.sync` mutation
  - [ ] 测试 `events.getById` procedure
  - [ ] 测试 `stats.overview` procedure
  - [ ] 验证输入验证（Zod errors）
  - [ ] 验证错误处理

- [ ] 数据库集成测试
  - [ ] 使用测试数据库
  - [ ] 测试完整的 CRUD 流程
  - [ ] 测试并发插入
  - [ ] 测试唯一约束
  - [ ] 清理测试数据

- [ ] Google Ads API 集成测试（可选）
  - [ ] 测试真实 API 调用
  - [ ] 验证数据解析正确
  - [ ] 处理 API 限流
  - [ ] 处理网络错误

### 4.3 E2E 测试（可选，1-2 天）

- [ ] 安装 Playwright
  - [ ] `pnpm add -D @playwright/test`
  - [ ] 配置 `playwright.config.ts`

- [ ] 编写关键用户流程测试
  - [ ] 测试：访问事件列表页
  - [ ] 测试：使用筛选器筛选事件
  - [ ] 测试：点击行打开详情对话框
  - [ ] 测试：点击同步按钮
  - [ ] 测试：访问统计仪表板

- [ ] 运行 E2E 测试
  - [ ] 本地测试
  - [ ] CI/CD 集成（可选）

### 4.4 性能优化（2-3 天）

- [ ] 数据库查询优化
  - [ ] 验证所有索引都已创建
  - [ ] 使用 `EXPLAIN ANALYZE` 分析查询计划
  - [ ] 优化慢查询（如有）
  - [ ] 测试大数据量性能（插入 10000+ 条记录）

- [ ] React Query 缓存配置
  - [ ] 配置 `staleTime`（数据新鲜度）
  - [ ] 配置 `cacheTime`（缓存时间）
  - [ ] 实现查询预取（prefetch）
  - [ ] 测试缓存效果

- [ ] 前端性能优化
  - [ ] 使用 React.memo 优化组件
  - [ ] 使用 useMemo 和 useCallback
  - [ ] 虚拟滚动（如果 DataGrid 数据量大）
  - [ ] 图片懒加载（如有）
  - [ ] 代码分割（dynamic import）

- [ ] DataGrid 优化
  - [ ] 配置虚拟滚动
  - [ ] 优化列渲染
  - [ ] 测试 1000+ 行数据的性能

- [ ] 性能测试
  - [ ] 使用 Lighthouse 测试首屏加载
  - [ ] 使用 Chrome DevTools 分析性能
  - [ ] 确保首屏加载 < 1.5s
  - [ ] 确保 TTI < 2s

### 4.5 文档完善（1-2 天）

- [ ] API 文档
  - [ ] tRPC 类型即文档（无需额外编写）
  - [ ] 添加 JSDoc 注释（关键函数）
  - [ ] 创建 API 使用示例

- [ ] 部署文档
  - [ ] 创建 `docs/deployment.md`
  - [ ] Vercel 部署步骤
  - [ ] 环境变量配置
  - [ ] 数据库迁移步骤
  - [ ] 故障排查指南

- [ ] 用户手册（可选）
  - [ ] 创建 `docs/user-guide.md`
  - [ ] 如何使用筛选器
  - [ ] 如何同步数据
  - [ ] 如何查看事件详情

- [ ] 开发者文档
  - [ ] 更新 README.md
  - [ ] 添加开发环境设置说明
  - [ ] 添加常用命令列表
  - [ ] 添加贡献指南（如开源）

### 4.6 部署准备（1-2 天）

- [ ] 配置 Vercel 部署
  - [ ] 创建 Vercel 项目
  - [ ] 连接 Git 仓库
  - [ ] 配置构建命令：`pnpm build`
  - [ ] 配置输出目录：`.next`

- [ ] 配置生产环境数据库
  - [ ] 创建 PostgreSQL 实例（Supabase/Neon/Railway）
  - [ ] 获取连接字符串
  - [ ] 配置 Vercel 环境变量：`DATABASE_URL`

- [ ] 配置环境变量
  - [ ] 在 Vercel Dashboard 添加所有环境变量：
    - `DATABASE_URL`
    - `GOOGLE_ADS_CUSTOMER_ID`
    - `GOOGLE_ADS_CLIENT_ID`
    - `GOOGLE_ADS_CLIENT_SECRET`
    - `GOOGLE_ADS_DEVELOPER_TOKEN`
    - `GOOGLE_ADS_REFRESH_TOKEN`

- [ ] 运行数据库迁移
  - [ ] 在本地指向生产数据库
  - [ ] 运行 `DATABASE_URL=<production_url> pnpm drizzle-kit migrate`
  - [ ] 验证表已创建

- [ ] 首次部署测试
  - [ ] 推送代码触发自动部署
  - [ ] 访问部署的 URL
  - [ ] 测试核心功能：
    - 事件列表加载
    - 数据同步
    - 详情对话框
    - 统计仪表板
  - [ ] 检查日志（Vercel Logs）
  - [ ] 修复部署问题（如有）

---

## Phase 5: 未来扩展（Phase 2+ 产品功能）

> **说明**: 这些功能在 Phase 1-4 完成后实施，属于产品 Phase 2-4 规划
> **预计时间**: 待定
> **优先级**: 低（Phase 1 完成后再考虑）

### 5.1 定时自动同步

- [ ] 选择定时任务方案
  - [ ] 研究 Vercel Cron（推荐）
  - [ ] 或使用 Node-cron
  - [ ] 或使用外部 Cron 服务

- [ ] 实现定时同步
  - [ ] 创建 `app/api/cron/sync/route.ts`
  - [ ] 配置 `vercel.json`（Vercel Cron）
  - [ ] 设置同步频率（5-15 分钟）
  - [ ] 实现错误通知

- [ ] 监控和日志
  - [ ] 记录每次同步结果
  - [ ] 错误告警（邮件/Slack）
  - [ ] 同步历史记录

### 5.2 多账户支持

- [ ] 数据库 Schema 扩展
  - [ ] 新增 `accounts` 表
  - [ ] `change_events` 表添加 `account_id` 外键
  - [ ] 数据库迁移

- [ ] 后端 API 扩展
  - [ ] 账户管理 API（CRUD）
  - [ ] 修改查询逻辑（按账户筛选）
  - [ ] 修改同步逻辑（支持多账户）

- [ ] 前端 UI 扩展
  - [ ] 账户选择器（Sidebar）
  - [ ] 账户管理页面
  - [ ] 筛选器添加账户选项

### 5.3 用户认证与权限

- [ ] 安装 NextAuth.js
  - [ ] `pnpm add next-auth`
  - [ ] 配置 `app/api/auth/[...nextauth]/route.ts`

- [ ] 实现登录/登出
  - [ ] 选择认证方式（Google OAuth/邮箱）
  - [ ] 实现登录页面
  - [ ] 实现 session 管理

- [ ] 权限管理（RBAC）
  - [ ] 定义角色（Admin, User, Viewer）
  - [ ] 数据库添加用户和角色表
  - [ ] 实现权限检查中间件
  - [ ] 前端根据权限显示/隐藏功能

### 5.4 操作效果分析（核心 Phase 2 功能）

- [ ] 采集广告表现数据
  - [ ] 调用 Google Ads Performance API
  - [ ] 获取 Campaign 的 ROAS、花费、转化等指标
  - [ ] 存储到 `campaign_performance` 表

- [ ] 关联操作与效果
  - [ ] 匹配操作时间与性能数据
  - [ ] 计算操作前后的指标变化
  - [ ] 存储到 `performance_analysis` 表

- [ ] 生成操作效果评分
  - [ ] 实现评分算法
  - [ ] 正面影响：+0.5 ~ +1.0
  - [ ] 负面影响：-1.0 ~ -0.5
  - [ ] 无明显影响：0

- [ ] 前端展示
  - [ ] 操作效果排行榜
  - [ ] 操作效果趋势图
  - [ ] 优化师绩效评分

### 5.5 智能建议与预警

- [ ] 基于历史数据的建议
  - [ ] 分析高效操作模式
  - [ ] 推荐最佳实践
  - [ ] 显示建议操作

- [ ] 风险操作识别
  - [ ] 识别异常操作（如频繁修改 budget）
  - [ ] 实时预警
  - [ ] 发送通知

---

## 📊 任务统计

### Phase 1: 项目基础设施
- **总任务数**: ~30 个
- **预计时间**: 1-2 周
- **关键里程碑**: 项目初始化完成 + 数据库连接 + Google Ads API 测试通过

### Phase 2: 核心功能开发
- **总任务数**: ~60 个
- **预计时间**: 2-3 周
- **关键里程碑**: Deep Diff Engine 完成 + 数据同步成功 + tRPC API 可用

### Phase 3: UI/UX 开发
- **总任务数**: ~40 个
- **预计时间**: 1-2 周
- **关键里程碑**: 事件列表页完成 + 统计仪表板可用 + 详情对话框完成

### Phase 4: 测试与优化
- **总任务数**: ~30 个
- **预计时间**: 1 周
- **关键里程碑**: 测试覆盖率 > 80% + 性能达标 + 部署成功

### Phase 5: 未来扩展
- **总任务数**: ~30 个
- **预计时间**: 待定
- **关键里程碑**: Phase 2-4 产品功能

---

## ✅ 使用建议

1. **按 Phase 顺序执行**：不要跳过 Phase，确保基础扎实
2. **勤勾选完成状态**：每完成一个任务立即勾选，保持进度可见
3. **遇到阻塞及时记录**：在任务旁添加注释，说明阻塞原因
4. **定期回顾进度**：每周回顾一次，调整计划
5. **优先核心功能**：Phase 1-2 是最重要的，确保质量
6. **UI 可快速迭代**：Phase 3 的 UI 可以后期优化，先实现基本功能

---

**文档结束**

相关文档请参考：
- 产品需求：`docs/prd.md`
- 技术设计：`docs/tech-design.md`
- 实施笔记：`CLAUDE.md`
