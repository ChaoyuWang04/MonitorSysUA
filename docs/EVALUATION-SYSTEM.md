# 评价系统使用文档

## 概述

评价系统是 MonitorSysUA 的核心功能，基于 PRD 实现了完整的**监控 → 评价 → 建议**流程。系统采用混合架构：
- **Python**：复杂计算引擎（NumPy优化性能）
- **TypeScript**：API层和业务逻辑（tRPC类型安全）
- **PostgreSQL**：数据持久化

## 核心模块

### A2: 安全线计算模块
**功能**：计算基于历史数据（180天前）的 ROAS7 和 RET7 基准线

**实现文件**：
- Python: `server/evaluation/python/baseline_calculator.py`
- TypeScript Wrapper: `server/evaluation/wrappers/baseline-calculator.ts`
- tRPC API: `server/api/routers/evaluation.ts`

**核心逻辑**：
```python
# 1. 获取6个月前（180天）的月份数据
reference_month = current_date - 180 days

# 2. 查询该月份所有campaign数据
campaigns = query_campaigns_by_month(reference_month)

# 3. 计算基准线
baseline_roas7 = total_revenue / total_spend
baseline_ret7 = total_d7_active_users / total_installs
```

**API调用示例**：
```typescript
// 计算单个产品/国家的安全线
const result = await trpc.evaluation.calculateBaseline.mutate({
  productName: "Solitaire",
  countryCode: "US",
  platform: "Android",
  channel: "Google",
});
// 返回：{ baseline_roas7, baseline_ret7, reference_period, ... }

// 批量更新所有安全线
await trpc.evaluation.updateAllBaselines.mutate();

// 查询安全线
const baseline = await trpc.evaluation.getBaseline.query({
  productName: "Solitaire",
  countryCode: "US",
  platform: "Android",
  channel: "Google",
});
```

**数据表**：`safety_baseline`
- 存储每个产品+国家+平台+渠道组合的基准线
- 参考周期（reference_period）：如 "2025-05"（2025年5月）
- 每月更新一次（建议每月1号执行）

---

### A3: Campaign 评价引擎
**功能**：评价 campaign 表现，计算达成率，生成建议

**实现文件**：
- Python: `server/evaluation/python/campaign_evaluator.py`
- TypeScript Wrapper: `server/evaluation/wrappers/campaign-evaluator.ts`
- tRPC API: `server/api/routers/evaluation.ts`

**核心逻辑**：
```python
# 1. 判断 campaign 类型
campaign_type = "test" if total_spend < 1000 else "mature"

# 2. 计算达成率
roas_achievement = (actual_roas7 / baseline_roas7) * 100
ret_achievement = (actual_ret7 / baseline_ret7) * 100
min_achievement = min(roas_achievement, ret_achievement)

# 3. 生成建议
if min_achievement < 60:
    recommendation = "关停"
elif min_achievement < 85:
    recommendation = "保守缩量"
elif min_achievement < 100:
    recommendation = "继续观察"
elif min_achievement < 110:
    recommendation = "保守扩量或观察"
else:
    recommendation = "激进扩量"
```

**API调用示例**：
```typescript
// 评价单个 campaign
const result = await trpc.evaluation.evaluateCampaign.mutate({
  campaignId: "campaign-123",
  evaluationDate: "2025-11-21", // 可选，默认今天
});
// 返回：{
//   campaign_type: "test" | "mature",
//   roas_achievement_rate: 141.91,
//   ret_achievement_rate: 120.45,
//   min_achievement_rate: 120.45,
//   status: "excellent",
//   recommendation_type: "激进扩量",
//   action_options: [...]
// }

// 批量评价所有 campaigns
const results = await trpc.evaluation.evaluateAllCampaigns.mutate({
  evaluationDate: "2025-11-21",
});

// 查询历史评价
const evaluations = await trpc.evaluation.getCampaignEvaluations.query({
  campaignId: "campaign-123",
  startDate: "2025-11-01",
  endDate: "2025-11-21",
});
```

**状态分类**：
- **excellent** (优秀): 达成率 ≥ 110%
- **healthy** (健康): 100% ≤ 达成率 < 110%
- **observation** (观察): 85% ≤ 达成率 < 100%
- **warning** (警告): 60% ≤ 达成率 < 85%
- **danger** (危险): 达成率 < 60%

**建议动作类型**：
- **激进扩量**：预算 +5%，tROAS -5%
- **保守扩量**：预算 +3%，tROAS -3%
- **继续观察**：保持现状
- **保守缩量**：预算 -3%，tROAS +3%
- **关停**：暂停 campaign

**数据表**：`campaign_evaluation`
- 存储每次评价结果
- 唯一索引：campaign_id + evaluation_date

---

### A4: 素材评价引擎
**功能**：评价测试 campaign 的素材表现（D3 和 D7 评价）

**实现文件**：
- Python: `server/evaluation/python/creative_evaluator.py`
- TypeScript Wrapper: `server/evaluation/wrappers/creative-evaluator.ts`
- tRPC API: `server/api/routers/evaluation.ts`

**核心逻辑**：

**D3 评价（CPI + ROAS3）**：
```python
# 评价标准
cpi_pass = actual_cpi <= max_cpi
roas_pass = actual_roas_d3 >= min_roas_d3

# 状态判定
if not cpi_pass or not roas_pass:
    status = "不及格"  # 失败，停止投放
else:
    status = "测试中"  # 通过D3，继续到D7
```

**D7 评价（CPI + ROAS7 + CVR）**：
```python
# 评价标准
cpi_pass = actual_cpi <= max_cpi
roas_pass = actual_roas_d7 >= min_roas_d7
cvr_excellent = actual_cvr >= excellent_cvr  # 0.67% (20/3000)

# 状态判定
if cpi_pass and roas_pass and cvr_excellent:
    status = "出量好素材"  # 建议同步到成熟campaign
elif cpi_pass and roas_pass:
    status = "及格"  # 可以继续使用
else:
    status = "不及格"  # 停止投放
```

**API调用示例**：
```typescript
// D3 评价
const d3Result = await trpc.evaluation.evaluateCreativeD3.mutate({
  creativeId: "creative-123",
  campaignId: "campaign-456",
});
// 返回：{
//   creative_status: "不及格" | "测试中",
//   actual_cpi, actual_roas,
//   cpi_threshold, roas_threshold,
//   reason: "ROAS3 5.27% 低于阈值 10.00%"
// }

// D7 评价
const d7Result = await trpc.evaluation.evaluateCreativeD7.mutate({
  creativeId: "creative-123",
  campaignId: "campaign-456",
});
// 返回：{
//   creative_status: "不及格" | "及格" | "出量好素材",
//   cpi_pass, roas_pass, cvr_excellent,
//   reason: "CPI、ROAS7、CVR全部达标，建议同步到成熟campaign"
// }

// 检查 campaign 是否需要关停
const check = await trpc.evaluation.checkCampaignClosure.mutate({
  campaignId: "campaign-456",
});
// 返回：{
//   should_close: true/false,
//   reason: "所有素材D7评价完成，无一及格",
//   total_creatives, passed_creatives, failed_creatives
// }

// 查询素材评价历史
const evaluations = await trpc.evaluation.getCreativeEvaluations.query({
  campaignId: "campaign-456",
  evaluationDay: "D7", // 可选："D3" | "D7"
});
```

**评价流程**：
1. **Day 0**：素材上线
2. **Day 3**：D3 评价（CPI + ROAS3）
   - 不及格 → 停止投放
   - 测试中 → 继续到 D7
3. **Day 7**：D7 评价（CPI + ROAS7 + CVR）
   - 不及格 → 停止投放
   - 及格 → 继续使用
   - 出量好素材 → 同步到成熟 campaign

**CPI 阈值**（按国家）：
- **US**：$7.0
- **JP**：$10.0
- **KR**：$8.0
- **其他**：$4.0

**ROAS 阈值**：
- **D3**：10%（min_roas_d3）
- **D7**：30%（min_roas_d7）

**CVR 阈值**：
- **优秀 CVR**：0.67%（3000 impressions → 20 installs）

**数据表**：`creative_evaluation`
- 存储每次评价结果
- evaluation_day：'D3' 或 'D7'
- 唯一索引：creative_id + campaign_id + evaluation_day

---

### A5: 操作评分引擎
**功能**：评价优化师操作效果（7天后评分），生成排行榜

**实现文件**：
- Python: `server/evaluation/python/operation_evaluator.py`
- TypeScript Wrapper: `server/evaluation/wrappers/operation-evaluator.ts`
- tRPC API: `server/api/routers/evaluation.ts`

**核心逻辑**：
```python
# 1. 获取操作记录（从 change_events 表）
operation = get_operation_by_id(operation_id)
evaluation_date = operation_date + 7 days

# 2. 获取7天后的 campaign 表现
performance = get_campaign_performance(campaign_id, evaluation_date)

# 3. 计算达成率
roas_achievement = (actual_roas7 / baseline_roas7) * 100
ret_achievement = (actual_ret7 / baseline_ret7) * 100
min_achievement = min(roas_achievement, ret_achievement)

# 4. 评分
if min_achievement >= 110:
    score = "优秀"
elif min_achievement >= 85:
    score = "合格"
else:
    score = "失败"

# 5. 更新排行榜
update_leaderboard(optimizer_email, score)
```

**API调用示例**：
```typescript
// 评价单个操作（7天后）
const result = await trpc.evaluation.evaluateOperation.mutate({
  operationId: 123, // change_events 表的 ID
});
// 返回：{
//   operation_score: "优秀" | "合格" | "失败",
//   roas_achievement_rate, ret_achievement_rate,
//   min_achievement_rate,
//   optimizer_email
// }

// 批量评价7天前的所有操作
await trpc.evaluation.evaluateOperations7DaysAgo.mutate();

// 获取优化师排行榜
const leaderboard = await trpc.evaluation.getOptimizerLeaderboard.query({
  limit: 10, // Top 10
});
// 返回：[{
//   optimizer_email,
//   total_operations,
//   excellent_count,
//   qualified_count,
//   failed_count,
//   success_rate
// }]

// 查询优化师操作历史
const scores = await trpc.evaluation.getOperationScores.query({
  optimizerEmail: "optimizer@example.com",
  startDate: "2025-11-01",
  endDate: "2025-11-21",
});
```

**评分标准**：
- **优秀**：min_achievement_rate ≥ 110%
- **合格**：85% ≤ min_achievement_rate < 110%
- **失败**：min_achievement_rate < 85%

**排行榜计算**：
```python
success_rate = (excellent_count + qualified_count) / total_operations * 100
```

**数据表**：
- `operation_score`：操作评分记录
- `optimizer_leaderboard`：优化师排行榜（汇总统计）

---

## Mock Data 测试系统

为了便于开发和测试，系统提供了完整的 Mock Data 生成器。

### 数据表
- `mock_campaign_performance`：模拟 campaign 性能数据
- `mock_creative_performance`：模拟素材性能数据

### 使用方法

**1. 生成并播种 Mock Data**：
```bash
npm run eval:seed
```

这将生成：
- **安全线基准**：8条（Solitaire + Poker × 多个国家）
- **素材测试基准**：8条（CPI/ROAS/CVR 阈值）
- **历史 campaign 数据**：1,240+ 条（180天前，用于计算安全线）
- **当前 campaign 数据**：232条（今天的数据，用于评价测试）
  - 20% excellent (达成率 120%+)
  - 25% healthy (达成率 100-110%)
  - 25% observation (达成率 85-100%)
  - 20% warning (达成率 60-85%)
  - 10% danger (达成率 <60%)
- **素材数据**：30+ 条（用于 D3/D7 评价测试）

**2. 运行测试**：
```bash
npm run eval:test
```

测试覆盖：
- ✅ A2: 安全线计算
- ✅ A3: Campaign 评价
- ✅ A4: 素材评价（D3 + D7）
- ✅ A5: 操作评分

**3. 清理数据**：
```sql
-- 清空 mock 数据
DELETE FROM mock_creative_performance;
DELETE FROM mock_campaign_performance;
DELETE FROM creative_test_baseline;
DELETE FROM safety_baseline;
```

---

## tRPC API 端点

所有评价系统 API 都在 `trpc.evaluation.*` 命名空间下：

### 安全线 (Baseline)
- `calculateBaseline` - 计算单个安全线
- `updateAllBaselines` - 批量更新所有安全线
- `getBaseline` - 查询安全线

### Campaign 评价
- `evaluateCampaign` - 评价单个 campaign
- `evaluateAllCampaigns` - 批量评价所有 campaigns
- `getCampaignEvaluations` - 查询历史评价

### 素材评价
- `evaluateCreativeD3` - D3 评价
- `evaluateCreativeD7` - D7 评价
- `checkCampaignClosure` - 检查 campaign 关停
- `getCreativeEvaluations` - 查询素材评价历史

### 操作评分
- `evaluateOperation` - 评价单个操作
- `evaluateOperations7DaysAgo` - 批量评价7天前操作
- `getOptimizerLeaderboard` - 获取排行榜
- `getOperationScores` - 查询操作评分历史

---

## 开发指南

### 项目结构
```
server/evaluation/
├── python/                     # Python 计算引擎
│   ├── __init__.py
│   ├── db_utils.py            # 数据库工具
│   ├── baseline_calculator.py # A2
│   ├── campaign_evaluator.py  # A3
│   ├── creative_evaluator.py  # A4
│   └── operation_evaluator.py # A5
├── wrappers/                   # TypeScript 包装器
│   ├── baseline-calculator.ts
│   ├── campaign-evaluator.ts
│   ├── creative-evaluator.ts
│   └── operation-evaluator.ts
├── mock-data/                  # Mock 数据生成器
│   ├── schemas.ts             # 数据结构定义
│   ├── generator.ts           # 数据生成逻辑
│   └── seed.ts                # 播种脚本
└── test-evaluation.ts          # 集成测试

server/api/routers/
└── evaluation.ts               # tRPC API 路由

server/db/
├── schema.ts                   # 数据库 schema
└── queries-evaluation.ts       # 评价查询函数
```

### 添加新评价逻辑

**1. Python 实现**：
```python
# server/evaluation/python/my_evaluator.py
from db_utils import Database, read_input, format_output

class MyEvaluator:
    def __init__(self):
        self.db = Database()

    def evaluate(self, param):
        with self.db:
            # 查询数据
            result = self.db.execute_query("SELECT ...")

            # 计算逻辑
            score = calculate_score(result)

            # 保存结果
            self.db.execute_update("INSERT INTO ...")

            return {"score": score}

def main():
    input_data = read_input()
    evaluator = MyEvaluator()
    result = evaluator.evaluate(input_data.get('param'))
    format_output(result)

if __name__ == "__main__":
    main()
```

**2. TypeScript Wrapper**：
```typescript
// server/evaluation/wrappers/my-evaluator.ts
import { spawn } from "child_process";
import path from "path";

async function runPythonScript<T>(input: Record<string, any>): Promise<T> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "server", "evaluation", "python", "my_evaluator.py");
    const pythonProcess = spawn("python3", [scriptPath]);

    let stdoutData = "";
    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}`));
      } else {
        resolve(JSON.parse(stdoutData));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(input));
    pythonProcess.stdin.end();
  });
}

export async function evaluate(param: string) {
  return runPythonScript({ param });
}
```

**3. tRPC API**：
```typescript
// server/api/routers/evaluation.ts
export const evaluationRouter = createTRPCRouter({
  // ... existing routes

  myEvaluate: protectedProcedure
    .input(z.object({ param: z.string() }))
    .mutation(async ({ input }) => {
      const result = await evaluate(input.param);
      return result;
    }),
});
```

### 调试技巧

**1. Python 调试**：
```bash
# 直接运行 Python 脚本
echo '{"campaignId":"campaign-123"}' | python3 server/evaluation/python/campaign_evaluator.py

# 查看详细错误
python3 -u server/evaluation/python/campaign_evaluator.py <<< '{"campaignId":"campaign-123"}'
```

**2. TypeScript 调试**：
```typescript
// 添加日志
console.log("Input:", input);
console.log("Python output:", stdoutData);
console.log("Python error:", stderrData);
```

**3. 数据库查询**：
```bash
# 直接查询数据库
docker exec monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "SELECT * FROM campaign_evaluation LIMIT 5;"
```

---

## 常见问题

### Q1: 为什么使用 Python + TypeScript 混合架构？
**A**: Python 擅长数值计算和数据处理（NumPy/Pandas），TypeScript 提供类型安全的 API 层和前端集成。两者结合最大化各自优势。

### Q2: Mock Data 的数据质量如何？
**A**: Mock Data 使用正态分布生成，模拟真实的广告数据分布：
- ROAS7: μ=45%, σ=15%
- RET7: μ=38%, σ=10%
- CPI: 3-12美元
- CVR: 0.3%-1.5%

### Q3: 如何扩展支持更多国家/产品？
**A**: 在 `server/evaluation/mock-data/schemas.ts` 中添加配置：
```typescript
export const DEFAULT_PRODUCT_CONFIGS: ProductConfig[] = [
  // ... existing
  {
    productName: "NewGame",
    countries: ["FR", "DE", "ES"],
    platform: "iOS",
    channel: "Apple",
  },
];
```

### Q4: 评价频率建议？
**A**:
- **安全线**：每月1号更新
- **Campaign 评价**：每7天一次
- **素材评价**：D3 和 D7 各一次
- **操作评分**：操作后7天评分

### Q5: 如何处理时区问题？
**A**: 所有日期使用 UTC 时间存储，前端显示时转换为本地时区。

---

## 下一步计划

根据 PLAN.md，已完成模块：
- ✅ A1: 数据表设计与迁移
- ✅ A2: 安全线计算模块
- ✅ A3: Campaign 评价引擎
- ✅ A4: 素材评价引擎
- ✅ A5: 操作评分引擎

待实现模块：
- [ ] A6: 每日评价任务调度（定时任务）
- [ ] A7: 前端可视化（评价仪表盘）
- [ ] A8: 测试与验证（集成测试）
- [ ] B1-B4: API 执行闭环（Google Ads 对接）

---

## 技术栈

- **Backend**: Next.js 16 + tRPC 11 + Drizzle ORM
- **Database**: PostgreSQL 16 (Docker)
- **Computation**: Python 3.x + NumPy
- **Validation**: Zod
- **Testing**: Mock Data + Integration Tests

---

## 参考文档

- PRD: `/PRD.md`
- 开发计划: `/PLAN.md`
- API 文档: `/server/api/routers/evaluation.ts`
- 数据库 Schema: `/server/db/schema.ts`

---

**最后更新**: 2025-11-21
**版本**: v1.0.0
**状态**: ✅ 核心模块已完成并通过测试
