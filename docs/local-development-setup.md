# MonitorSysUA 本地开发环境设置指南

## 📋 目录

1. [环境要求](#环境要求)
2. [PostgreSQL安装与配置](#postgresql安装与配置)
3. [Python环境配置](#python环境配置)
4. [后端服务启动](#后端服务启动)
5. [前端环境配置](#前端环境配置)
6. [常见问题排查](#常见问题排查)
7. [开发工具推荐](#开发工具推荐)

---

## 1. 环境要求

### 最低版本要求

| 组件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| **Python** | 3.12.0 | 3.12.x | 后端运行时 |
| **PostgreSQL** | 16.0 | 16.x | 主数据库 |
| **Node.js** | 18.0.0 | 18.x | 前端开发环境 |
| **Git** | 2.30+ | 最新版 | 版本控制 |
| **操作系统** | - | macOS 12+ / Ubuntu 20.04+ / Windows 10+ | - |

### 磁盘空间要求

- **后端依赖**: ~500 MB
- **前端依赖**: ~800 MB
- **数据库**: ~100 MB (初始)
- **总计**: ~1.5 GB

---

## 2. PostgreSQL安装与配置

### 2.1 macOS安装

#### 方式1: 使用Homebrew (推荐)

```bash
# 1. 安装PostgreSQL 16
brew install postgresql@16

# 2. 启动PostgreSQL服务
brew services start postgresql@16

# 3. 验证安装
psql --version
# 输出: psql (PostgreSQL) 16.x

# 4. 检查服务状态
brew services list | grep postgresql
# 输出: postgresql@16 started
```

#### 方式2: 使用Postgres.app

1. 下载[Postgres.app](https://postgresapp.com/)
2. 拖动到Applications文件夹
3. 启动应用并初始化
4. 添加到PATH: `export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"`

### 2.2 Ubuntu/Debian安装

```bash
# 1. 添加PostgreSQL官方源
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# 2. 导入签名密钥
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# 3. 更新包列表
sudo apt update

# 4. 安装PostgreSQL 16
sudo apt install postgresql-16

# 5. 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 6. 验证安装
psql --version
```

### 2.3 Windows安装

1. 下载[PostgreSQL安装程序](https://www.postgresql.org/download/windows/)
2. 运行安装程序,按默认设置
3. 记住设置的postgres用户密码
4. 安装完成后,添加到PATH (通常自动完成):
   ```
   C:\Program Files\PostgreSQL\16\bin
   ```

### 2.4 创建数据库

```bash
# 1. 以postgres用户登录
psql -U postgres

# 2. 在psql命令行中执行:
CREATE DATABASE monitorua;

# 3. 验证数据库创建
\l
# 应该能看到 monitorua 数据库

# 4. 退出psql
\q
```

### 2.5 配置PostgreSQL (可选)

**编辑 `postgresql.conf` (提升性能)**:

```bash
# 找到配置文件位置
psql -U postgres -c "SHOW config_file;"

# macOS典型路径:
# /usr/local/var/postgresql@16/postgresql.conf

# Ubuntu典型路径:
# /etc/postgresql/16/main/postgresql.conf

# 推荐修改项:
shared_buffers = 256MB          # 提升缓存
max_connections = 100           # 连接数上限
work_mem = 4MB                  # 排序内存
maintenance_work_mem = 64MB     # 维护操作内存
```

**重启PostgreSQL使配置生效**:

```bash
# macOS
brew services restart postgresql@16

# Linux
sudo systemctl restart postgresql
```

---

## 3. Python环境配置

### 3.1 安装Python 3.12

#### macOS

```bash
# 方式1: 使用Homebrew
brew install python@3.12

# 方式2: 使用pyenv (更灵活)
brew install pyenv
pyenv install 3.12.0
pyenv global 3.12.0
```

#### Ubuntu/Debian

```bash
# 添加deadsnakes PPA
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# 安装Python 3.12
sudo apt install python3.12 python3.12-venv python3.12-dev

# 设置为默认版本
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
```

#### Windows

1. 下载[Python 3.12安装程序](https://www.python.org/downloads/)
2. 运行安装程序,**勾选** "Add Python to PATH"
3. 验证: 打开cmd,输入 `python --version`

### 3.2 创建虚拟环境

```bash
# 1. 进入项目目录
cd /path/to/MonitorSysUA

# 2. 创建虚拟环境
cd backend
python3 -m venv venv

# 3. 激活虚拟环境
# macOS/Linux:
source venv/bin/activate

# Windows (cmd):
venv\Scripts\activate.bat

# Windows (PowerShell):
venv\Scripts\Activate.ps1

# 4. 验证激活成功
which python3  # macOS/Linux
where python   # Windows
# 应该显示venv目录下的python路径

# 5. 升级pip
pip install --upgrade pip
```

### 3.3 安装Python依赖

```bash
# 确保已激活虚拟环境
cd backend
pip install -r requirements.txt

# 验证关键包安装
pip list | grep fastapi
pip list | grep sqlalchemy
pip list | grep google-ads
```

**常见依赖安装问题**:

| 问题 | 解决方案 |
|------|---------|
| `gcc: command not found` | macOS: `xcode-select --install`<br>Ubuntu: `sudo apt install build-essential` |
| `pg_config not found` | macOS: `brew install postgresql`<br>Ubuntu: `sudo apt install libpq-dev` |
| `SSL module not available` | 重新编译Python,启用SSL支持 |

---

## 4. 后端服务启动

### 4.1 配置环境变量

```bash
# 1. 复制环境变量模板
cd /path/to/MonitorSysUA
cp backend/.env.example .env

# 2. 编辑.env文件
# macOS/Linux:
nano .env
# Windows:
notepad .env

# 3. 确认以下配置:
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/monitorua
GOOGLE_ADS_CONFIG_PATH=googletest/google-ads.yaml
GOOGLE_ADS_CUSTOMER_ID=<你的客户ID>
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true
SYNC_INTERVAL_MINUTES=10
LOG_LEVEL=INFO
```

### 4.2 启动后端服务

#### 方式1: 使用start.sh脚本 (推荐)

```bash
cd /path/to/MonitorSysUA
./start.sh
```

**脚本会自动完成**:
- ✅ 检查PostgreSQL状态
- ✅ 创建数据库(如不存在)
- ✅ 检查/创建虚拟环境
- ✅ 安装依赖
- ✅ 启动服务

#### 方式2: 手动启动

```bash
# 1. 确保PostgreSQL运行
pg_isready
# 输出: /tmp:5432 - accepting connections

# 2. 激活虚拟环境
cd backend
source venv/bin/activate

# 3. 启动uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 4. 验证服务运行
curl http://localhost:8000/health
# 输出: {"status":"healthy"}
```

### 4.3 访问API文档

启动成功后,访问以下地址:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

---

## 5. 前端环境配置

### 5.1 安装Node.js

#### macOS

```bash
# 方式1: 使用Homebrew
brew install node@18

# 方式2: 使用nvm (推荐,可管理多版本)
brew install nvm
nvm install 18
nvm use 18
```

#### Ubuntu/Debian

```bash
# 使用NodeSource源
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # v18.x.x
npm --version   # 9.x.x
```

#### Windows

1. 下载[Node.js LTS安装程序](https://nodejs.org/)
2. 运行安装程序,按默认设置
3. 验证: `node --version`

### 5.2 前端项目初始化 (Phase 2待实施)

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问前端
open http://localhost:3000
```

---

## 6. 常见问题排查

### 6.1 PostgreSQL相关

#### 问题1: 端口5432被占用

```bash
# 查找占用进程
lsof -i :5432

# 杀死进程
kill -9 <PID>

# 或更换PostgreSQL端口
# 编辑 postgresql.conf: port = 5433
# 更新.env: DATABASE_URL=...@localhost:5433/monitorua
```

#### 问题2: 数据库连接被拒绝

```bash
# 1. 检查PostgreSQL是否运行
pg_isready

# 2. 检查pg_hba.conf配置
# macOS典型路径: /usr/local/var/postgresql@16/pg_hba.conf
# 确保包含:
# local   all   all   trust
# host    all   all   127.0.0.1/32   trust

# 3. 重启PostgreSQL
brew services restart postgresql@16
```

#### 问题3: 权限不足

```bash
# 赋予postgres用户权限
psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"

# 或创建新用户
createuser -U postgres -s <your_username>
```

### 6.2 Python相关

#### 问题1: 虚拟环境激活失败

```bash
# macOS/Linux:
# 确保脚本有执行权限
chmod +x backend/venv/bin/activate

# Windows PowerShell:
# 启用脚本执行
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 问题2: 依赖安装失败

```bash
# 清除pip缓存
pip cache purge

# 使用国内镜像(中国大陆用户)
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 逐个安装失败的包
pip install <package_name> --no-cache-dir
```

#### 问题3: uvicorn找不到模块

```bash
# 确保在backend目录
cd backend

# 确保虚拟环境已激活
source venv/bin/activate

# 确认Python路径正确
which python3
# 应该显示: /path/to/backend/venv/bin/python3

# 手动设置PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:/path/to/MonitorSysUA/backend"
```

### 6.3 Google Ads API相关

#### 问题1: 配置文件不存在

```bash
# 检查文件位置
ls -la googletest/google-ads.yaml

# 确保文件格式正确(YAML)
cat googletest/google-ads.yaml
```

#### 问题2: 认证失败

```bash
# 测试凭据
cd googletest
python googlemvptest.py

# 常见错误:
# - refresh_token过期: 重新获取OAuth token
# - developer_token无效: 联系Google Ads支持
# - login_customer_id错误: 检查MCC账户ID
```

### 6.4 网络与端口

#### 端口占用检查

```bash
# 检查8000端口(后端)
lsof -i :8000

# 检查3000端口(前端)
lsof -i :3000

# 杀死占用进程
kill -9 <PID>
```

#### 防火墙设置

```bash
# macOS: 允许Python访问网络
# 系统偏好设置 > 安全性与隐私 > 防火墙 > 允许Python

# Ubuntu: 开放端口
sudo ufw allow 8000/tcp
sudo ufw allow 3000/tcp
```

---

## 7. 开发工具推荐

### 7.1 数据库管理工具

| 工具 | 平台 | 特点 | 下载 |
|------|------|------|------|
| **pgAdmin 4** | 全平台 | 官方GUI工具,功能全面 | [官网](https://www.pgadmin.org/) |
| **DBeaver** | 全平台 | 支持多种数据库,免费开源 | [官网](https://dbeaver.io/) |
| **Postico** | macOS | 界面简洁,易用 | [官网](https://eggerapps.at/postico2/) |
| **TablePlus** | macOS/Windows | 现代化设计,多数据库 | [官网](https://tableplus.com/) |

### 7.2 API测试工具

| 工具 | 特点 |
|------|------|
| **Swagger UI** | 内置在项目中,http://localhost:8000/docs |
| **Postman** | 功能强大,支持团队协作 |
| **Insomnia** | 简洁易用,开源免费 |
| **curl** | 命令行工具,脚本友好 |

### 7.3 代码编辑器配置

#### VS Code推荐插件

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "cweijan.vscode-postgresql-client2"
  ]
}
```

#### PyCharm配置要点

1. **设置Python解释器**: Preferences > Project > Python Interpreter > 选择`backend/venv/bin/python`
2. **数据库连接**: Database Tool Window > Add PostgreSQL Data Source
3. **运行配置**: Edit Configurations > Add Python > Script: `uvicorn` > Parameters: `app.main:app --reload`

---

## 8. 性能优化建议

### 8.1 PostgreSQL优化

```bash
# 增大共享缓冲区
shared_buffers = 256MB

# 启用查询计划缓存
shared_preload_libraries = 'pg_stat_statements'

# 定期执行VACUUM
psql -U postgres -d monitorua -c "VACUUM ANALYZE;"
```

### 8.2 Python优化

```bash
# 使用uvloop加速异步IO
pip install uvloop

# 在app/main.py中:
import uvloop
uvloop.install()
```

### 8.3 开发流程优化

```bash
# 使用pre-commit hooks
pip install pre-commit
pre-commit install

# 使用black格式化代码
pip install black
black backend/app/

# 使用isort排序imports
pip install isort
isort backend/app/
```

---

## 9. 快速启动检查清单

在开始开发前,确保以下项目都已完成:

- [ ] PostgreSQL 16已安装并运行
- [ ] 数据库`monitorua`已创建
- [ ] Python 3.12已安装
- [ ] 后端虚拟环境已创建并激活
- [ ] 后端依赖已安装 (`pip list | grep fastapi`)
- [ ] `.env`文件已配置
- [ ] Google Ads配置文件存在 (`googletest/google-ads.yaml`)
- [ ] 后端服务可以启动 (`./start.sh`)
- [ ] API文档可访问 (http://localhost:8000/docs)
- [ ] 数据库连接成功 (`psql -U postgres -d monitorua -c "SELECT 1;"`)

---

## 10. 获取帮助

### 内部文档

- **项目README**: `/README.md`
- **架构文档**: `/CLAUDE.md`
- **前端设计**: `/docs/frontend-design.md`
- **API集成**: `/docs/api-integration.md`

### 外部资源

- **FastAPI文档**: https://fastapi.tiangolo.com/
- **PostgreSQL文档**: https://www.postgresql.org/docs/
- **Google Ads API**: https://developers.google.com/google-ads/api/docs

### 社区支持

- **FastAPI Discord**: https://discord.gg/fastapi
- **PostgreSQL邮件列表**: https://www.postgresql.org/list/
- **Stack Overflow**: 搜索相关标签

---

**文档版本**: v1.0.0
**最后更新**: 2025-11-13
**维护者**: Claude + Sam Wong
