# 🧭 Database Migration Workflow（基于 Atlas + just）

聚焦“更新数据库结构”的单一流程，确保数据模型、Atlas Schema 与实际数据库一致，所有操作统一使用仓库提供的 `just` 命令。

---

## 🎯 目标与原则

1. 设计先行：`docs/system/database.md` 是建模唯一源，任何字段/表调整先更新设计文档。
2. Schema 真源：`server/db/schema.ts`（Drizzle）是数据库结构的实现真源，Atlas 通过 `atlas.hcl` 读取 Drizzle 导出。
3. 迁移标准化：仅通过 `just db-diff "<name>"` 生成迁移，避免手写 SQL 漏差。
4. 全链路校验：每次变更都要生成迁移、执行、校验、导出 Schema，保持前后端一致。

> 额外原则：
> - 🚫 不在 Go 程序中执行迁移（只走 Atlas/just 流程）。
> - ✅ 所有变更可追溯、可回滚。
> - 🧱 CI/CD 负责安全落地。
> - 📘 文档与代码保持一致。

---

## 🗂 关键目录

- `docs/system/database.md`：数据模型设计文档（起点）。
- `server/db/schema.ts`：Drizzle Schema（实现真源，Atlas 读取此导出）。
- `atlas.hcl`：Atlas 配置（指向 Drizzle 导出与迁移目录）。
- `atlas/migrations/`：迁移 SQL（由 `just db-diff` 生成）。
- `.drizzle/`：Drizzle 导出产物（`just db-export` 输出，供调试/对照）。

---

## 🔁 数据库更新流程（唯一路径）

0) 前置准备
- 确认 `.env` 中 `DATABASE_URL` 指向目标数据库，并已启动本地/目标实例。

1) 更新数据模型文档
- 在 `docs/system/database.md` 中补充或修改对应设计，明确字段含义、约束、关联。

2) 同步 Drizzle Schema
- 按设计修改 `server/db/schema.ts`，保持字段、约束、关系与文档一致（Atlas 通过 `atlas.hcl` 读取 Drizzle 导出）。

3) 生成迁移
- `just db-diff "<name>"`
- Atlas 基于 Drizzle 导出与对照库 diff，生成 SQL 到 `atlas/migrations/`。

4) 审阅迁移 SQL
- 打开新生成的 `atlas/migrations/*.sql`，确认索引、约束、默认值、可空性符合设计。

5) 应用迁移
- `just db-apply`
- 将迁移执行到 `DATABASE_URL` 指向的数据库。

6) 校验状态
- `just db-status`
- 确认数据库与迁移目录一致，无未应用或脏状态。

7) 导出最新 Schema（可选，便于对照/审计）
- `just db-export`
- 更新 `.drizzle/` 下的导出文件，供文档/调试使用。

8) 同步 ORM/类型
- Drizzle 以 `server/db/schema.ts` 为源，类型随代码更新；如需验证可运行 `just type-check`。

> 提醒：上述步骤为固定顺序，不要跳过设计文档更新；如需在 CI/CD 中执行迁移，复用相同的 `just` 命令即可。

---

## ✅ 交付检查清单

- [ ] `docs/system/database.md` 已更新且与需求一致。
- [ ] `server/db/schema.ts` 与设计对齐。
- [ ] `just db-diff "<name>"` 已生成迁移并经过人工审阅（`atlas/migrations/`）。
- [ ] `just db-apply` 已执行且成功。
- [ ] `just db-status` 显示一致。
- [ ] `just db-export` 如需导出已更新 `.drizzle/`。
- [ ] `just type-check`（可选）验证类型与 Schema 一致。
