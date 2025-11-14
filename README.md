# MonitorSysUA - Google Ads 优化师操作监控系统

## 📋 项目简介

实时监控和展示Google Ads账户中所有优化师的操作记录,包括预算调整、目标修改、地区变更、素材管理等,以类Notion多维表格的形式呈现。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────┐
│    前端 (React + Ant Design Pro)       │  [待实现]
│    - ProTable看板                       │
│    - 筛选/搜索/分页                     │
│    - 详情抽屉展示                       │
└─────────────┬───────────────────────────┘
              │ HTTP/REST API
┌─────────────▼───────────────────────────┐
│    后端 (FastAPI + Python 3.12)        │  [✅ 已完成]
│    - Google Ads API集成                 │
│    - RESTful API                        │
│    - APScheduler定时同步                │
└─────────────┬───────────────────────────┘
              │ SQL
┌─────────────▼───────────────────────────┐
│    数据库 (PostgreSQL 16)              │  [✅ 已完成]
│    - change_logs: 操作记录主表          │
│    - field_changes: 字段变更明细表      │
└─────────────────────────────────────────┘
```

## ✅ 已完成功能

### 后端 API (FastAPI)

- ✅ **数据库设计**
  - 操作记录表 (`change_logs`)
  - 字段变更明细表 (`field_changes`)
  - 完整的索引和关系设计

- ✅ **Google Ads API集成**
  - 从Google Ads API获取change_event数据
  - 解析20+种资源类型的变更
  - 提取字段级别的变更信息
  - 错误处理和重试机制

- ✅ **RESTful API端点**
  ```
  GET  /api/changes              # 获取变更列表(支持筛选/分页/排序)
  GET  /api/changes/{id}         # 获取单条变更详情
  GET  /api/changes/stats/summary  # 统计数据
  GET  /api/changes/users/list   # 操作人列表
  POST /api/sync/trigger         # 手动触发同步
  GET  /api/sync/status          # 同步状态
  GET  /api/sync/stats           # 同步统计
  ```

- ✅ **定时任务**
  - APScheduler自动每10分钟同步一次
  - 增量拉取,避免重复数据
  - 后台异步执行,不阻塞API

- ✅ **字段人类化**
  - 预算金额转换(micros → USD)
  - 状态翻译(ENABLED → 启用)
  - 百分比变化计算

- ✅ **本地开发环境**
  - 一键启动脚本(start.sh)
  - PostgreSQL + FastAPI
  - 自动环境检查和配置

## 📦 项目结构

```
MonitorSysUA/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── api/               # API路由
│   │   │   ├── changes.py    # 变更记录API
│   │   │   └── sync.py       # 数据同步API
│   │   ├── models/            # 数据库模型
│   │   │   ├── change_log.py
│   │   │   └── field_change.py
│   │   ├── schemas/           # Pydantic数据验证
│   │   │   └── change_log.py
│   │   ├── services/          # 业务逻辑
│   │   │   ├── google_ads_service.py  # Google Ads API
│   │   │   ├── sync_service.py        # 数据同步
│   │   │   └── field_humanizer.py     # 字段人类化
│   │   ├── tasks/             # 定时任务
│   │   │   └── scheduler.py
│   │   ├── config.py          # 配置管理
│   │   ├── database.py        # 数据库连接
│   │   └── main.py            # FastAPI入口
│   ├── requirements.txt       # Python依赖
│   └── .env.example           # 环境变量模板
├── frontend/                   # 前端项目 [待实现]
├── googletest/                 # Google Ads测试脚本
│   ├── google-ads.yaml        # API配置
│   └── apitest-*.json         # 服务账号密钥
├── start.sh                    # 一键启动脚本
├── .env                        # 环境变量
├── .gitignore                  # Git忽略文件
└── README.md                   # 本文档
```

## 🚀 快速开始

### 方式1: 一键启动脚本 (推荐)

```bash
# 1. 克隆项目
cd /Users/samwong/Desktop/1Project/MonitorSysUA

# 2. 确保Google Ads配置文件存在
ls googletest/google-ads.yaml

# 3. 使用启动脚本(自动检查环境、创建数据库、安装依赖、启动服务)
./start.sh

# 4. 访问API文档
open http://localhost:8000/docs

# 5. 停止服务
# 按 Ctrl+C 停止服务
```

**start.sh脚本会自动完成以下任务:**
- ✅ 检查PostgreSQL安装状态并自动启动
- ✅ 创建数据库(如果不存在)
- ✅ 检查/创建Python虚拟环境
- ✅ 安装/更新Python依赖
- ✅ 检查Google Ads配置文件
- ✅ 启动FastAPI服务(带热重载)

---

### 方式2: 手动安装步骤

如果希望手动配置环境,请按照以下步骤:

#### Step 1: 安装PostgreSQL 16

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-16
sudo systemctl start postgresql
```

**Windows:**
从[官网](https://www.postgresql.org/download/windows/)下载安装程序

#### Step 2: 创建数据库

```bash
psql -U postgres -c "CREATE DATABASE monitorua;"
```

#### Step 3: 配置Python环境

```bash
# 创建虚拟环境
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
cd ..
```

#### Step 4: 配置环境变量

```bash
# 复制环境变量模板
cp backend/.env.example .env

# 编辑.env文件,确认以下配置正确:
# - DATABASE_URL: PostgreSQL连接字符串
# - GOOGLE_ADS_CONFIG_PATH: Google Ads配置文件路径
# - GOOGLE_ADS_CUSTOMER_ID: 客户账户ID
```

#### Step 5: 启动服务

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 📡 API使用示例

### 1. 获取变更记录列表

```bash
# 基础查询
curl http://localhost:8000/api/changes

# 筛选特定用户
curl "http://localhost:8000/api/changes?user_email=optimizer@example.com"

# 筛选资源类型和日期范围
curl "http://localhost:8000/api/changes?resource_type=CAMPAIGN_BUDGET&start_date=2025-11-01&page=1&page_size=20"
```

### 2. 获取变更详情

```bash
curl http://localhost:8000/api/changes/{change_id}
```

### 3. 获取统计数据

```bash
curl http://localhost:8000/api/changes/stats/summary
```

### 4. 手动触发同步

```bash
curl -X POST http://localhost:8000/api/sync/trigger

# 指定同步时间范围(分钟)
curl -X POST "http://localhost:8000/api/sync/trigger?minutes=30"
```

### 5. 查询同步状态

```bash
curl http://localhost:8000/api/sync/status
```

## 🔧 配置说明

### 环境变量 (.env)

```bash
# 数据库连接
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/monitorua

# Google Ads API
GOOGLE_ADS_CONFIG_PATH=googletest/google-ads.yaml
GOOGLE_ADS_CUSTOMER_ID=2766411035

# API服务
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true  # 开发模式启用热重载

# 定时同步间隔(分钟)
SYNC_INTERVAL_MINUTES=10

# 日志级别
LOG_LEVEL=INFO  # DEBUG/INFO/WARNING/ERROR
```

### Google Ads API配置

确保 `googletest/google-ads.yaml` 文件包含正确的凭据:

```yaml
developer_token: YOUR_DEV_TOKEN
client_id: YOUR_CLIENT_ID
client_secret: YOUR_CLIENT_SECRET
refresh_token: YOUR_REFRESH_TOKEN
login_customer_id: YOUR_MCC_ID
use_proto_plus: True
```

## 📊 数据库Schema

### change_logs (操作记录主表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| timestamp | TIMESTAMP | 操作时间 |
| user_email | VARCHAR(255) | 操作人邮箱 |
| operation_type | VARCHAR(50) | CREATE/UPDATE/REMOVE |
| resource_type | VARCHAR(100) | CAMPAIGN/AD/ASSET等 |
| resource_name | VARCHAR(500) | Google Ads资源标识符 |
| client_type | VARCHAR(50) | WEB/API/EDITOR |
| customer_id | VARCHAR(50) | Google Ads客户ID |
| created_at | TIMESTAMP | 记录创建时间 |

### field_changes (字段变更明细表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| change_log_id | UUID | 外键(change_logs.id) |
| field_path | VARCHAR(255) | 字段路径(如budget.amount_micros) |
| old_value | JSONB | 旧值 |
| new_value | JSONB | 新值 |
| human_description | TEXT | 人类可读描述 |

## 🔍 监控的操作类型

系统可以追踪以下Google Ads操作:

- ✅ **预算管理**: 调整预算金额、启用/暂停预算
- ✅ **竞价策略**: 修改竞价方式、调整目标CPA/ROAS
- ✅ **定位设置**: 地理位置、语言、受众列表变更
- ✅ **关键词管理**: 添加/删除/修改关键词和出价
- ✅ **素材管理**: 上传新素材、删除素材、关联素材
- ✅ **广告操作**: 创建/修改/暂停广告
- ✅ **广告组操作**: 调整广告组出价和状态

## 🛠️ 开发计划

### Phase 1: 后端开发 (✅ 已完成)
- [x] 数据库设计和模型
- [x] Google Ads API集成
- [x] RESTful API实现
- [x] 定时任务调度
- [x] 本地开发环境配置

### Phase 2: 前端开发 (⏳ 进行中)
- [ ] React项目搭建
- [ ] Ant Design ProTable看板
- [ ] 筛选/搜索/分页功能
- [ ] 详情抽屉和字段对比
- [ ] 统计看板和图表

### Phase 3: 优化与部署 (⏰ 待开始)
- [ ] 性能优化和缓存
- [ ] 单元测试和集成测试
- [ ] CI/CD流程
- [ ] 生产环境部署
- [ ] 监控和告警

## 📝 API文档

启动服务后,访问自动生成的API文档:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🐛 故障排除

### 问题1: 数据库连接失败

```bash
# 检查PostgreSQL是否运行
# macOS:
brew services list | grep postgresql

# Linux:
sudo systemctl status postgresql

# 手动启动PostgreSQL
# macOS:
brew services start postgresql@16

# Linux:
sudo systemctl start postgresql

# 测试数据库连接
psql -U postgres -d monitorua -c "SELECT 1;"
```

### 问题2: Google Ads API认证失败

```bash
# 检查配置文件是否存在
ls -la googletest/google-ads.yaml

# 检查凭据是否正确
cat googletest/google-ads.yaml

# 测试API连接
cd googletest
python googlemvptest.py
```

### 问题3: 定时任务未执行

```bash
# 查看后端控制台输出(如果通过start.sh启动)
# 日志会直接输出到终端

# 手动触发同步测试
curl -X POST http://localhost:8000/api/sync/trigger

# 检查同步状态
curl http://localhost:8000/api/sync/status
```

### 问题4: Python依赖安装失败

```bash
# 确保使用正确的Python版本
python3 --version  # 应该是3.12+

# 升级pip
pip install --upgrade pip

# 重新安装依赖
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 问题5: 端口被占用

```bash
# 检查8000端口是否被占用
lsof -i :8000

# 杀死占用进程
kill -9 <PID>

# 或使用不同端口启动
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 📞 技术支持

如有问题,请查看:
1. **API文档**: http://localhost:8000/docs
2. **后端日志**: 查看终端输出或backend/logs/目录(如果配置了日志文件)
3. **数据库状态**: `psql -U postgres -d monitorua`
4. **详细开发指南**: 参考`docs/local-development-setup.md`

## 📄 许可证

本项目为内部使用项目。

---

**当前版本**: v0.1.0 (后端MVP)
**最后更新**: 2025-11-13
**开发状态**: Phase 1 完成 ✅ | Phase 2 进行中 ⏳
