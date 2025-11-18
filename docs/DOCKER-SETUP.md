# Docker 数据库设置指南

本项目使用 Docker 运行 PostgreSQL 16 数据库,与本地环境完全隔离。

## 📋 前置要求

### 1. 安装 Docker Desktop

- **macOS**: [下载 Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- **Windows**: [下载 Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- **Linux**: 使用包管理器安装 Docker Engine

### 2. 验证安装

```bash
docker --version
docker-compose --version
```

预期输出示例:
```
Docker version 24.0.0, build abc1234
Docker Compose version v2.20.0
```

---

## 🚀 快速开始

### 1. 启动数据库

```bash
npm run docker:db:up
```

该命令会:
- 拉取 PostgreSQL 16 Alpine 镜像(首次运行时)
- 创建名为 `monitorsysua-postgres` 的容器
- 在端口 `5433` 上运行数据库(映射到容器内的 5432)
- 创建持久化数据卷 `postgres_data`

### 2. 验证容器运行状态

```bash
docker ps
```

预期输出:
```
CONTAINER ID   IMAGE                COMMAND                  STATUS         PORTS                    NAMES
abc123def456   postgres:16-alpine   "docker-entrypoint.s…"   Up 2 minutes   0.0.0.0:5433->5432/tcp   monitorsysua-postgres
```

### 3. 配置环境变量

复制并配置环境变量:
```bash
cp .env.example .env
```

确认 `.env` 文件中的数据库连接字符串:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/monitor_sys_ua
```

### 4. 运行数据库迁移

```bash
npm run db:migrate
```

该命令会:
- 连接到 Docker 数据库
- 执行 `server/db/migrations/` 中的所有迁移文件
- 创建必要的表和索引

### 5. 启动应用

```bash
npm run dev
```

访问 http://localhost:4000 查看应用。

---

## ⚠️ 重要:重启 Docker Desktop 后的必要步骤

**如果你重启了 Docker Desktop 或系统,必须按以下顺序操作:**

### 为什么需要这些步骤?

重启 Docker Desktop 后,容器可能会被重新创建,数据库可能处于空白状态。即使数据卷(volume)被保留,**数据库迁移追踪状态也可能丢失**,导致应用无法正常工作。

### 正确的重启流程

```bash
# 1. 启动 Docker 数据库容器
npm run docker:db:up

# 2. 【关键步骤】重新运行数据库迁移
npm run db:migrate

# 3. 启动应用
npm run dev
```

### ⛔ 常见错误

**❌ 错误做法**: 重启后直接运行 `npm run dev`
- 结果:应用无法连接数据库或数据表不存在

**✅ 正确做法**: 按上述三步顺序操作
- 保证:数据库表结构正确,迁移状态一致

### 验证数据库状态

如果不确定数据库是否正常,可以先验证:

```bash
# 检查容器状态
docker ps | grep postgres

# 检查数据库表
docker exec monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "\dt"

# 检查迁移记录
docker exec monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "SELECT COUNT(*) FROM drizzle.__drizzle_migrations;"
```

### 完全重置(如果遇到问题)

如果数据库状态混乱或迁移出现问题:

```bash
# 完全重置数据库(会删除所有数据!)
npm run docker:db:reset

# 运行迁移
npm run db:migrate

# 启动应用
npm run dev
```

**注意**: `docker:db:reset` 会删除所有数据,包括你添加的账户信息。

---

## 📦 npm 脚本命令

| 命令 | 作用 | 使用场景 |
|------|------|----------|
| `npm run docker:db:up` | 启动数据库容器(后台运行) | 每次开发前启动数据库 |
| `npm run docker:db:down` | 停止并删除容器(保留数据卷) | 暂停开发,释放资源 |
| `npm run docker:db:logs` | 查看数据库实时日志 | 调试数据库问题 |
| `npm run docker:db:restart` | 重启数据库容器 | 应用配置更改后重启 |
| `npm run docker:db:reset` | 完全重置(删除所有数据) | 清空数据库,重新开始 |

---

## 🔧 常用 Docker 命令

### 容器管理

```bash
# 查看运行中的容器
docker ps

# 查看所有容器(包括已停止的)
docker ps -a

# 停止容器
docker stop monitorsysua-postgres

# 启动已存在的容器
docker start monitorsysua-postgres

# 删除容器(必须先停止)
docker rm monitorsysua-postgres
```

### 日志查看

```bash
# 查看实时日志
docker logs -f monitorsysua-postgres

# 查看最近 100 行日志
docker logs --tail 100 monitorsysua-postgres

# 查看带时间戳的日志
docker logs -t monitorsysua-postgres
```

### 进入容器

```bash
# 进入 PostgreSQL 容器的 bash shell
docker exec -it monitorsysua-postgres bash

# 直接连接到 psql
docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua
```

### 数据卷管理

```bash
# 查看数据卷
docker volume ls

# 查看特定数据卷信息
docker volume inspect monitorsysua_postgres_data

# 删除数据卷(会丢失所有数据!)
docker volume rm monitorsysua_postgres_data
```

---

## 🗃️ 数据库管理

### 使用 Drizzle Studio

Drizzle Studio 是一个 Web 界面的数据库管理工具:

```bash
npm run db:studio
```

访问显示的 URL(通常是 https://local.drizzle.studio),即可可视化管理数据库。

### 使用 psql 命令行

```bash
# 从宿主机连接
psql -h localhost -p 5433 -U postgres -d monitor_sys_ua

# 从容器内连接
docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua
```

常用 psql 命令:
```sql
\l              -- 列出所有数据库
\c database     -- 切换数据库
\dt             -- 列出所有表
\d table_name   -- 查看表结构
\q              -- 退出
```

### 数据备份与恢复

#### 备份数据库

```bash
# 备份到 SQL 文件
docker exec monitorsysua-postgres pg_dump -U postgres monitor_sys_ua > backup.sql

# 备份到自定义格式(压缩)
docker exec monitorsysua-postgres pg_dump -U postgres -Fc monitor_sys_ua > backup.dump
```

#### 恢复数据库

```bash
# 从 SQL 文件恢复
docker exec -i monitorsysua-postgres psql -U postgres -d monitor_sys_ua < backup.sql

# 从自定义格式恢复
docker exec -i monitorsysua-postgres pg_restore -U postgres -d monitor_sys_ua backup.dump
```

---

## 🐛 故障排查

### 问题 1: 端口 5433 已被占用

**错误信息**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:5433: bind: address already in use
```

**解决方法**:

1. 检查占用端口的进程:
   ```bash
   lsof -i :5433
   ```

2. 停止占用端口的进程或修改 `docker-compose.yml` 中的端口映射:
   ```yaml
   ports:
     - "5434:5432"  # 改为其他端口
   ```

3. 相应更新 `.env` 中的 `DATABASE_URL`

### 问题 2: 数据库连接被拒绝

**错误信息**:
```
Error: connect ECONNREFUSED 127.0.0.1:5433
```

**解决方法**:

1. 确认容器正在运行:
   ```bash
   docker ps | grep postgres
   ```

2. 检查容器健康状态:
   ```bash
   docker inspect monitorsysua-postgres | grep -A 10 Health
   ```

3. 查看容器日志:
   ```bash
   npm run docker:db:logs
   ```

4. 如果容器未启动,重新启动:
   ```bash
   npm run docker:db:up
   ```

### 问题 3: 迁移失败

**错误信息**:
```
Error: relation "accounts" already exists
```

**解决方法**:

1. 检查数据库状态:
   ```bash
   docker exec -it monitorsysua-postgres psql -U postgres -d monitor_sys_ua -c "\dt"
   ```

2. 选项 A - 删除并重建(会丢失数据):
   ```bash
   npm run docker:db:reset
   npm run db:migrate
   ```

3. 选项 B - 手动调整迁移:
   - 检查 `server/db/migrations/meta/_journal.json`
   - 手动删除已应用的迁移记录

### 问题 4: 容器启动后立即退出

**解决方法**:

1. 查看容器日志:
   ```bash
   docker logs monitorsysua-postgres
   ```

2. 检查是否有配置错误:
   ```bash
   docker-compose config
   ```

3. 尝试前台运行(查看详细输出):
   ```bash
   docker-compose up
   ```

### 问题 5: 数据卷权限问题(Linux)

**错误信息**:
```
initdb: could not change permissions of directory "/var/lib/postgresql/data": Operation not permitted
```

**解决方法**:

1. 重新创建数据卷:
   ```bash
   docker-compose down -v
   docker volume create monitorsysua_postgres_data
   docker-compose up -d
   ```

2. 或者修改 `docker-compose.yml`,添加用户映射:
   ```yaml
   user: "1000:1000"  # 使用你的用户 ID
   ```

---

## 🔄 迁移现有数据(可选)

如果你之前使用本地 PostgreSQL,现在想迁移到 Docker:

### 1. 从本地数据库导出数据

```bash
pg_dump -h localhost -p 5432 -U your_user monitor_sys_ua > local_backup.sql
```

### 2. 启动 Docker 数据库

```bash
npm run docker:db:up
npm run db:migrate
```

### 3. 导入数据到 Docker 数据库

```bash
docker exec -i monitorsysua-postgres psql -U postgres -d monitor_sys_ua < local_backup.sql
```

---

## 📊 性能优化建议

### 1. 调整 PostgreSQL 配置

如需自定义 PostgreSQL 配置,在 `docker-compose.yml` 中添加:

```yaml
services:
  postgres:
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "effective_cache_size=1GB"
```

### 2. 监控资源使用

```bash
# 查看容器资源使用情况
docker stats monitorsysua-postgres

# 限制容器资源
docker update --memory="512m" --cpus="1.0" monitorsysua-postgres
```

---

## 🧹 清理和维护

### 定期清理未使用的资源

```bash
# 删除所有未使用的容器、网络、镜像
docker system prune

# 删除所有未使用的数据卷(谨慎使用!)
docker volume prune
```

### 更新 PostgreSQL 镜像

```bash
# 拉取最新的 PostgreSQL 16 镜像
docker pull postgres:16-alpine

# 重新创建容器
docker-compose up -d --force-recreate
```

---

## 🆘 获取帮助

- **Docker 文档**: https://docs.docker.com/
- **PostgreSQL 文档**: https://www.postgresql.org/docs/16/
- **Drizzle ORM 文档**: https://orm.drizzle.team/

如遇问题,请提供以下信息:
1. 完整的错误消息
2. `docker ps -a` 的输出
3. `docker logs monitorsysua-postgres` 的相关日志
4. Docker 和 Docker Compose 的版本信息
