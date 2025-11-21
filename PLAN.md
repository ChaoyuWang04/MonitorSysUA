# MonitorSysUA 评价与建议系统开发计划

## 项目目标

在已有的Google Ads操作监控基础上，构建完整的**监控 → 评价 → 建议 → 执行**闭环系统。

## 核心功能

### 三层评价体系
1. **素材评价**（测试campaign）→ CPI + ROAS + CVR
2. **Campaign评价**（所有campaign）→ ROAS7 + RET7 达成率
3. **操作评价**（优化师调整）→ 调整后效果评分

### 关键指标
- **安全线**：基于180天前（6个月前）的ROAS7和RET7
- **测试campaign**：总消耗 < $1,000
- **成熟campaign**：总消耗 >= $1,000

---

## 阶段A：评价系统核心（不含API执行）

### 目标
建立完整的评价逻辑，生成建议，前端可视化展示。**优化师手动执行调整。**

### A1. 数据表设计与迁移

#### 新增表结构

```sql
-- 1. 安全线表
CREATE TABLE safety_baseline (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    platform VARCHAR(20) DEFAULT 'Android',
    channel VARCHAR(20) DEFAULT 'Google',
    baseline_roas7 DECIMAL(10,4),
    baseline_ret7 DECIMAL(10,4),
    reference_period VARCHAR(20),  -- 例如：2024-06
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_name, country_code, platform, channel)
);

-- 2. 素材测试标准表
CREATE TABLE creative_test_baseline (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    platform VARCHAR(20) DEFAULT 'Android',
    channel VARCHAR(20) DEFAULT 'Google',
    max_cpi DECIMAL(10,2),  -- 最高CPI阈值
    min_roas_d3 DECIMAL(10,4),  -- D3最低ROAS
    min_roas_d7 DECIMAL(10,4),  -- D7最低ROAS
    excellent_cvr DECIMAL(10,6),  -- 出量素材CVR标准（例如0.0067）
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_name, country_code, platform, channel)
);

-- 3. Campaign评价记录
CREATE TABLE campaign_evaluation (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100) NOT NULL,
    campaign_name VARCHAR(200),
    evaluation_date DATE NOT NULL,
    campaign_type VARCHAR(20),  -- 'test' or 'mature'
    total_spend DECIMAL(15,2),
    actual_roas7 DECIMAL(10,4),
    actual_ret7 DECIMAL(10,4),
    baseline_roas7 DECIMAL(10,4),
    baseline_ret7 DECIMAL(10,4),
    roas_achievement_rate DECIMAL(10,2),  -- 达成率%
    ret_achievement_rate DECIMAL(10,2),
    min_achievement_rate DECIMAL(10,2),  -- 两者最小值
    recommendation_type VARCHAR(50),  -- 观察/保守扩量/激进扩量/保守缩量/激进缩量/关停
    status VARCHAR(20),  -- 正常/预警/危险
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_campaign_date (campaign_id, evaluation_date)
);

-- 4. 素材评价记录（仅测试campaign）
CREATE TABLE creative_evaluation (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100) NOT NULL,
    creative_id VARCHAR(100),
    creative_name VARCHAR(200),
    evaluation_day VARCHAR(10),  -- 'D3' or 'D7'
    evaluation_date DATE NOT NULL,
    impressions INT,
    installs INT,
    cvr DECIMAL(10,6),
    actual_cpi DECIMAL(10,2),
    actual_roas DECIMAL(10,4),
    max_cpi_threshold DECIMAL(10,2),
    min_roas_threshold DECIMAL(10,4),
    creative_status VARCHAR(30),  -- 测试中/不及格/及格/出量好素材/待确认/已同步
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_creative (campaign_id, creative_id, evaluation_day)
);

-- 5. 操作评分记录
CREATE TABLE operation_score (
    id SERIAL PRIMARY KEY,
    operation_id INT REFERENCES change_events(id),
    campaign_id VARCHAR(100) NOT NULL,
    optimizer_email VARCHAR(100),
    operation_type VARCHAR(50),  -- BUDGET_UPDATE/TROAS_UPDATE
    operation_date DATE NOT NULL,
    evaluation_date DATE NOT NULL,  -- 操作后7天
    actual_roas7 DECIMAL(10,4),
    actual_ret7 DECIMAL(10,4),
    baseline_roas7 DECIMAL(10,4),
    baseline_ret7 DECIMAL(10,4),
    roas_achievement_rate DECIMAL(10,2),
    ret_achievement_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_operation (operation_id, evaluation_date)
);

-- 6. 建议动作表
CREATE TABLE action_recommendation (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100) NOT NULL,
    evaluation_id INT REFERENCES campaign_evaluation(id),
    recommendation_date DATE NOT NULL,
    recommendation_type VARCHAR(50),  -- 扩量/缩量/关停/换素材
    action_options JSON,  -- 存储可选动作：[{type: 'budget', change: '+3%'}, ...]
    selected_action JSON,  -- 优化师选择的动作
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recommendation (campaign_id, recommendation_date)
);
```

**任务清单：**
- [x] 创建migration脚本：`migrations/0003_concerned_bushwacker.sql` ✅ 完成于 2025-11-19
- [x] 测试本地数据库迁移 ✅ 完成于 2025-11-19
- [x] 验证表结构正确性 ✅ 完成于 2025-11-19
- [x] 创建基础查询函数：`server/db/queries-evaluation.ts` ✅ 完成于 2025-11-19

---

### A2. 安全线计算模块

**文件：** `src/evaluation/baseline_calculator.py`

```python
class BaselineCalculator:
    """计算安全线（180天前的ROAS7和RET7）"""

    def calculate_baseline(self, product_name, country_code, current_date):
        """
        计算6个月前（180天）的月度ROAS7和RET7

        逻辑：
        1. 获取6个月前的月份（例如：当前12月 → 参考6月）
        2. 查询该月份的campaign数据
        3. 计算：总收入 / 总花费 = ROAS7
        4. 计算：总留存 / 总安装 = RET7
        """
        pass

    def update_baseline_table(self):
        """批量更新所有产品+国家的安全线"""
        pass
```

**任务清单：**
- [x] 实现baseline计算逻辑 ✅ 完成于 2025-11-21
- [x] 写单元测试（模拟6个月前的数据）✅ 完成于 2025-11-21
- [x] 创建CLI命令及tRPC API接口 ✅ 完成于 2025-11-21

---

### A3. Campaign评价引擎

**文件：** `src/evaluation/campaign_evaluator.py`

```python
class CampaignEvaluator:
    """评价Campaign表现"""

    def evaluate_campaign(self, campaign_id, evaluation_date):
        """
        评价单个campaign

        步骤：
        1. 判断campaign类型（test/mature，按总消耗）
        2. 获取当前ROAS7和RET7
        3. 获取安全线
        4. 计算达成率
        5. 生成建议

        返回：CampaignEvaluation对象
        """
        pass

    def generate_recommendation(self, min_achievement_rate):
        """
        根据达成率生成建议

        < 60%: 关停
        60-85%: 保守缩量
        85-100%: 继续观察
        100-110%: 保守扩量或观察
        >= 110%: 激进扩量
        """
        pass

    def generate_action_options(self, recommendation_type):
        """
        生成可选动作

        扩量：[{type: 'budget', options: ['+1%', '+3%', '+5%']},
               {type: 'troas', options: ['-1%', '-3%', '-5%']}]
        缩量：[{type: 'budget', options: ['-1%', '-3%', '-5%']},
               {type: 'troas', options: ['+1%', '+3%', '+5%']}]
        """
        pass
```

**任务清单：**
- [x] 实现campaign评价逻辑 ✅ 完成于 2025-11-21
- [x] 写测试用例（各种达成率场景）✅ 完成于 2025-11-21
- [x] 创建tRPC API接口 ✅ 完成于 2025-11-21
- [ ] 集成到每日任务调度（阶段A6）

---

### A4. 素材评价引擎（测试campaign）

**文件：** `src/evaluation/creative_evaluator.py`

```python
class CreativeEvaluator:
    """评价素材表现（仅测试campaign）"""

    def evaluate_creative_d3(self, creative_id, campaign_id):
        """
        D3评价：CPI + ROAS3

        不及格条件：
        - CPI > max_cpi_threshold
        - ROAS3 < min_roas_d3
        """
        pass

    def evaluate_creative_d7(self, creative_id, campaign_id):
        """
        D7评价：CPI + ROAS7 + CVR

        出量好素材：CPI及格 + ROAS7及格 + CVR >= excellent_cvr
        及格：CPI及格 + ROAS7及格
        不及格：其他
        """
        pass

    def check_campaign_closure(self, campaign_id):
        """
        检查测试campaign是否需要关停

        条件：所有D7素材评价完，无一及格
        """
        pass
```

**任务清单：**
- [x] 实现素材评价逻辑（D3 + D7 + 关停检查）✅ 完成于 2025-11-21
- [x] 写测试用例 ✅ 完成于 2025-11-21
- [x] 创建tRPC API接口 ✅ 完成于 2025-11-21
- [ ] 集成到每日任务调度（阶段A6）

---

### A5. 操作评分引擎

**文件：** `src/evaluation/operation_evaluator.py`

```python
class OperationEvaluator:
    """评价优化师操作效果"""

    def evaluate_operation(self, operation_id):
        """
        评价操作（7天后）

        1. 获取操作记录
        2. 查询操作后7天的ROAS7和RET7
        3. 计算达成率
        4. 记录到operation_score表
        """
        pass
```

**任务清单：**
- [x] 实现操作评分逻辑（7天后评分 + 排行榜）✅ 完成于 2025-11-21
- [x] 写测试用例 ✅ 完成于 2025-11-21
- [x] 创建tRPC API接口 ✅ 完成于 2025-11-21
- [ ] 集成到每日任务调度（阶段A6）

---

### A6. 每日评价任务调度

**文件：** `src/tasks/daily_evaluation_task.py`

```python
def run_daily_evaluation():
    """
    每日凌晨执行的评价任务

    执行顺序：
    1. 更新安全线（每月1号执行）
    2. 评价素材（测试campaign的D3和D7）
    3. 评价所有campaign（每7天一次）
    4. 评价操作（7天前的操作）
    5. 生成每日报告
    """

    # 1. 更新安全线
    if is_first_day_of_month():
        BaselineCalculator().update_baseline_table()

    # 2. 评价素材
    test_campaigns = get_test_campaigns()
    for campaign in test_campaigns:
        CreativeEvaluator().evaluate_all_creatives(campaign)

    # 3. 评价campaign
    all_campaigns = get_all_campaigns()
    for campaign in all_campaigns:
        if needs_evaluation(campaign):
            CampaignEvaluator().evaluate_campaign(campaign)

    # 4. 评价操作
    operations_7days_ago = get_operations_7days_ago()
    for operation in operations_7days_ago:
        OperationEvaluator().evaluate_operation(operation)

    # 5. 生成报告
    generate_daily_report()
```

**任务清单：**
- [ ] 实现任务调度逻辑
- [ ] 配置Cron或APScheduler
- [ ] 写日志记录
- [ ] 测试完整流程

---

### A7. 前端可视化

**页面1：Campaign评价仪表盘**
```
/evaluation/campaigns

显示内容：
- Campaign列表（按状态分组）
- 每个campaign的达成率（ROAS7、RET7）
- 建议动作（可多选）
- 历史评价趋势图
```

**页面2：素材评价仪表盘**
```
/evaluation/creatives

显示内容：
- 测试campaign列表
- 每个素材的状态（测试中/及格/不及格/出量好素材）
- CPI、ROAS、CVR数据
- 素材同步按钮（出量好素材 → 成熟campaign）
```

**页面3：操作评分仪表盘**
```
/evaluation/operations

显示内容：
- 优化师操作历史
- 每次操作的评分（ROAS达成率、RET达成率）
- 优化师排行榜
```

**任务清单：**
- [ ] 设计前端页面原型
- [ ] 实现API接口
- [ ] 前端开发（Vue/React）
- [ ] 集成到现有系统

---

### A8. 测试与验证

**测试场景：**

1. **安全线计算测试**
   - [ ] 模拟6个月前的数据，验证ROAS7/RET7计算正确

2. **Campaign评价测试**
   - [ ] 达成率 < 60% → 建议关停
   - [ ] 达成率 110%+ → 建议激进扩量
   - [ ] 测试campaign vs 成熟campaign的区分

3. **素材评价测试**
   - [ ] D3不及格 → 标记"不及格"
   - [ ] D7出量好素材 → 标记"出量好素材"
   - [ ] 所有素材不及格 → 建议关停campaign

4. **操作评分测试**
   - [ ] 操作7天后自动评分
   - [ ] 达成率正确计算

**任务清单：**
- [ ] 写集成测试
- [ ] 用真实数据验证
- [ ] 修复bug

---

## 阶段B：API执行闭环（与Google Ads对接）

### 目标
优化师在前端选择建议动作后，系统自动通过Google Ads API执行调整。

---

### B1. Google Ads API集成

**文件：** `src/google_ads/campaign_manager.py`

```python
class CampaignManager:
    """执行campaign调整操作"""

    def update_budget(self, campaign_id, change_percent):
        """
        调整预算

        例如：current_budget = $1000, change_percent = +3%
        new_budget = $1030
        """
        pass

    def update_troas(self, campaign_id, change_percent):
        """
        调整tROAS

        例如：current_troas = 200%, change_percent = -5%
        new_troas = 190%
        """
        pass

    def pause_campaign(self, campaign_id):
        """暂停campaign"""
        pass
```

**任务清单：**
- [ ] 实现预算调整API
- [ ] 实现tROAS调整API
- [ ] 实现campaign暂停API
- [ ] 错误处理和重试逻辑

---

### B2. 建议执行流程

**文件：** `src/evaluation/action_executor.py`

```python
class ActionExecutor:
    """执行优化师选择的建议动作"""

    def execute_action(self, recommendation_id, selected_action):
        """
        执行动作

        步骤：
        1. 验证action合法性
        2. 调用Google Ads API
        3. 记录到operation表（作为新的操作）
        4. 更新action_recommendation表（executed=True）
        """
        pass

    def rollback_action(self, recommendation_id):
        """
        回滚操作（如果执行失败）
        """
        pass
```

**任务清单：**
- [ ] 实现执行逻辑
- [ ] 实现回滚逻辑
- [ ] API调用日志
- [ ] 前端集成（确认执行按钮）

---

### B3. 素材同步功能

**文件：** `src/evaluation/creative_sync.py`

```python
class CreativeSync:
    """同步出量好素材到成熟campaign"""

    def sync_creative_to_mature_campaigns(self, creative_id, target_campaigns):
        """
        将素材同步到指定的成熟campaign

        步骤：
        1. 获取素材的creative_asset（图片、视频、文案）
        2. 通过Google Ads API创建新ad
        3. 添加到目标campaigns
        4. 更新creative_evaluation表（状态→已同步）
        """
        pass
```

**任务清单：**
- [ ] 实现素材同步逻辑
- [ ] 前端界面（选择目标campaign）
- [ ] 测试同步流程

---

### B4. 完整闭环测试

**场景测试：**

1. **扩量流程**
   - [ ] Campaign达成率120% → 系统建议激进扩量
   - [ ] 优化师选择"预算+5%" → 系统执行 → 记录operation
   - [ ] 7天后自动评分 → 显示在前端

2. **缩量流程**
   - [ ] Campaign达成率70% → 系统建议缩量
   - [ ] 优化师选择"tROAS+3%" → 系统执行 → 记录operation
   - [ ] 7天后评分

3. **关停流程**
   - [ ] Campaign达成率50% → 系统建议关停
   - [ ] 优化师确认 → 系统暂停campaign

4. **素材流程**
   - [ ] 测试campaign素材D7评价为"出量好素材"
   - [ ] 优化师点击同步 → 选择目标campaigns
   - [ ] 系统同步素材 → 更新状态


## 风险与应对

### 风险1：Google Ads API限流
- **应对**：实现请求队列，控制调用频率
- **应对**：缓存campaign数据，减少API调用

### 风险2：数据计算错误
- **应对**：每一步都写单元测试
- **应对**：用真实数据验证后再上线

### 风险3：前端开发延期
- **应对**：先用CLI命令验证后端逻辑
- **应对**：分阶段交付（先做核心功能）
