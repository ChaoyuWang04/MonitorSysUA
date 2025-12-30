# 变更事件模块

## 范围与作用
- 拉取 Google Ads ChangeEvent，形成可搜索、可审计的操作历史，供看板、统计、评分使用。
- 支持中英文摘要、字段级 diff、分页筛选。

## 核心能力
- 手动同步：按账号拉取 1–30 天窗口，去重后更新 lastSyncedAt。
- 查询：过滤用户邮箱、资源类型、操作类型、关键词；服务端分页。
- 展示：详情弹窗展示摘要、字段变更、元数据；看板统计复用同源数据。

## 流程
1) UI 调用 `events.sync`（指定账号与日期范围）。
2) 服务端加载账号货币等上下文 → Python fetcher 拉取 → 解析/去重 → 插入 `change_events`。
3) 读取时聚合统计，供 Dashboard 与 Events 页面使用。

## 现状与计划
- 手动同步、列表、详情已端到端可用；调度/cron 尚未接入，可通过 UI 或脚本触发。
- 有摘要重算脚本 `regenerate_summaries.py`，自动化待定。
- `operation_scores` JSON 挂在 `change_events`，存放 T+1/T+3/T+7 评分结果指针，来源于评分任务。
