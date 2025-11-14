# ChangeEvent-Based Campaign Optimization Monitoring System --- PRD

## 1. 项目背景与愿景

现代广告优化高度依赖经验，而经验往往不稳定难复现。本系统旨在建立一个
**基于 Google Ads ChangeEvent
的数据驱动优化行为分析平台**，帮助企业回答两个核心问题：

1.  **优化师是否对 Campaign 做出了及时、必要、有效的操作？**
2.  **哪些操作对 Campaign 的增长最有帮助？哪些操作反而造成负面影响？**

系统通过 Google Ads API 的 ChangeEvent
收集所有的广告操作（Campaign、AdGroup、Ad、Asset、Budget
等），储存在数据库中，并基于这些操作与后续广告表现之间的关系，构建一个"操作效果学习系统"，最终形成**可量化、可视化、可监督、可追责**的优化行为管理平台。

系统最终产出： - 优化师行为看板（完整审计日志） -
操作效果评估（操作后的正负面影响） -
自动化学习模型（识别最佳操作模式） -
主管级监控台（团队效率、响应速度、贡献度）

------------------------------------------------------------------------

## 2. 数据来源（Google Ads ChangeEvent）

ChangeEvent 是整个系统的数据核心。

### ChangeEvent 基本结构

  --------------------------------------------------------------------------------------
  字段                          类型                    描述
  ----------------------------- ----------------------- --------------------------------
  `resource_name`               string                  唯一事件标识符

  `change_date_time`            string                  修改提交时间

  `change_resource_type`        enum                    修改的资源类型（CAMPAIGN /
                                                        AD_GROUP / ASSET 等）

  `change_resource_name`        string                  被修改实体的资源名

  `client_type`                 enum                    操作来源（UI / API / Editor）

  `user_email`                  string                  操作者邮箱

  `resource_change_operation`   enum                    CREATE / UPDATE / REMOVE

  `changed_fields`              FieldMask               更改的字段路径列表（最短路径）

  `old_resource`                oneof ChangedResource   修改前值，仅包含被修改字段

  `new_resource`                oneof ChangedResource   修改后值，仅包含被修改字段

  `campaign`                    string                  关联 campaign（若相关）

  `ad_group`                    string                  关联 ad group（若相关）

  `asset`                       string                  关联 asset（若相关）
  --------------------------------------------------------------------------------------

### ChangedResource 结构

ChangedResource 是一个 oneof 包装：

    oneof resource {
      Campaign campaign
      AdGroup ad_group
      AdGroupAd ad_group_ad
      CampaignBudget campaign_budget
      AdGroupCriterion ad_group_criterion
      Asset asset
      AssetGroup asset_group
      ...（共几十种）
    }

每个资源包含其自身的 protobuf 结构，例如：

**CampaignBudget** - amount_micros - delivery_method

**Campaign** - status - advertising_channel_type - bidding_strategy -
target_roas.value - target_cpa.value - budget - start_date / end_date -
geo_target_type - ...（字段很多）

这些字段在 change_event.old_resource / new_resource
中**只会出现更改过的字段**。

------------------------------------------------------------------------

## 3. 系统目标

### 目标 1：构建优化师行为数据库

从所有 ChangeEvent 中提取结构化行为：

    {
      event_time,
      operator,
      client_type,
      resource_type,
      resource_id,
      operation,
      field_path,
      old_value,
      new_value
    }

并扩展为可搜索、可分析、可计算的行为记录。

用途： - 审计：谁做了什么？ - 合规：有没有操作延误？ -
行为量化：优化师每天在做什么？

------------------------------------------------------------------------

### 目标 2：行为 → 结果的因果关联分析

系统将自动分析：

-   每次操作后 24h / 3d / 7d / 28d 内的 campaign 关键指标变化
-   指标包括：花费、转化、ROAS、Revenue、CPI、CTR、Impressions 等

并建立操作-效果关系数据库：

    {
      operator,
      operation_type,
      resource_type,
      field,
      old_value,
      new_value,
      delta_performance: { ctr:+5%, cvr:+3%, spend:-10%, ... },
      effect_score
    }

该 effect_score 后续可作为"优化师绩效评分"的基础。

------------------------------------------------------------------------

## 4. 技术架构设计

### 数据流图

    Google Ads API → ChangeEvent Collector → Diff Engine → Behavior DB → Effect Analyzer → Dashboard (Frontend)

------------------------------------------------------------------------

## 5. 主要模块 PRD

### 模块 A：ChangeEvent Collector（事件收集器）

职责： - 每小时/每天抓取所有 ChangeEvent - 支持断点续传 - 存储原始
protobuf（做归档）

输出： - 原始 ChangeEvent JSON - 清洗后的结构化事件

关键字段： - resource_type - resource_name - old/new diff（递归 diff
引擎输出） - operator - timestamp

------------------------------------------------------------------------

### 模块 B：Diff Engine（字段对比引擎）

输入： - old_resource protobuf - new_resource protobuf

输出： - 所有字段的 path → old/new

要求： - 通过递归结构化提取所有字段 - 自动处理 oneof - 支持 campaign /
ad_group / asset 等全部资源 - 输出字段路径全路径，而非最短路径

------------------------------------------------------------------------

### 模块 C：Behavior DB（行为数据库）

结构：PostgreSQL

表：change_events

字段：

  字段            类型       描述
  --------------- ---------- ----------------------------
  id              serial     主键
  event_time      datetime   操作时间
  operator        string     优化师
  resource_type   enum       CAMPAIGN 等
  resource_name   string     resource_name
  operation       enum       CREATE / UPDATE / REMOVE
  field_path      string     campaign.target_roas.value
  old_value       text       旧值
  new_value       text       新值
  diff_json       jsonb      递归 diff 内容
  raw_event       jsonb      原始 ChangeEvent 内容

支持扩展： - 新资源类型 - 新字段 - 新操作模式

------------------------------------------------------------------------

### 模块 D：Effect Analyzer（操作效果分析器）

职责： - 在操作后计算若干时间窗口的 KPI 变化 - 输出操作效果评分

分析表结构：

  字段             描述
  ---------------- ---------------
  event_id         操作记录
  campaign_id      所属 campaign
  time_window      1h/6h/24h/3d
  metrics_before   记录前
  metrics_after    记录后
  delta            差值
  effect_score     综合评分

effect_score 计算方法可持续迭代。

------------------------------------------------------------------------

### 模块 E：Management Dashboard（主管可视化看板）

用户：项目主管

功能： - 优化师操作频率排行榜 - 优化师贡献度（操作效果评分） - 每个
campaign 的操作历史 - 每个操作的正负向影响 -
异常监控（无操作、连续负操作）

页面包括： 1. Team Overview\
2. Operator Leaderboard\
3. Campaign Detail View\
4. Operation Log Timeline\
5. Effect Impact Visualization\
6. Anomaly Detection Alerts

------------------------------------------------------------------------

## 6. 可扩展设计（未来方向）

-   AI 模块自动预测最佳下一步操作
-   优化师行为推荐
-   自动纠错：识别风险操作并提示
-   自动化实验设计（A/B 操作）

------------------------------------------------------------------------

## 7. 最终交付物

-   ChangeEvent Diff Engine
-   PostgreSQL Behavior DB
-   Effect Analyzer
-   Vue/React 前端可视化系统
-   REST API 层
-   全套监控与报警

------------------------------------------------------------------------

本 PRD 覆盖：

-   ChangeEvent 的结构
-   所有系统模块
-   数据库设计
-   前后端架构
-   后续扩展性
