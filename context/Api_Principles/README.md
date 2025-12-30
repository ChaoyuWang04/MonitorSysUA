# API Principles - OpenAPI 模板库

快速创建规范化的 OpenAPI 文档和 Schema 定义的模板集合。

## 用途

为所有外部 API（Google Ads、Meta、AppsFlyer 等）提供标准化的 OpenAPI 规范模板，确保：
- ✅ 生成的客户端代码类型安全
- ✅ AI 协作时有明确的 schema 约束
- ✅ 所有项目使用统一的 API 文档格式

## 快速使用

### 1. 创建新的 API 规范

```bash
# 复制模板到你的项目
cp -r Api_Principles/schemas/common api-specs/your-api/schemas/
cp Api_Principles/schemas/common/openapi_yaml_template.md api-specs/your-api/openapi.yaml
```

### 2. 修改模板

```yaml
# 修改 openapi.yaml 中的：
info:
  title: Your API Name        # 改成你的 API 名称
servers:
  - url: https://your-api.com # 改成实际地址
```

### 3. 生成客户端代码

```bash
openapi-generator-cli generate \
  -i api-specs/your-api/openapi.yaml \
  -g typescript-axios \
  -o src/generated/your-api-client
```

## 文件说明

```
schemas/common/
├── openapi_yaml_template.md      # OpenAPI 主文件模板（导航 + 全局配置）
├── Resource_yaml_temlplate.md    # 数据模型 Schema 模板（单个资源）
└── Error_yaml_template.md        # 错误响应模板（通用错误格式）
```

### 何时使用哪个模板

| 模板 | 用途 | 使用场景 |
|------|------|---------|
| `openapi_yaml_template.md` | 创建 API 规范主文件 | 开始集成新的外部 API 时 |
| `Resource_yaml_temlplate.md` | 定义数据模型 | 添加 Campaign、AdGroup 等实体 |
| `Error_yaml_template.md` | 定义错误格式 | 所有 API 都需要（通用） |

## 核心原则

1. **DRY（Don't Repeat Yourself）** - 使用 `$ref` 引用，不重复定义
2. **类型安全** - 所有字段都有明确的类型和约束
3. **AI 友好** - Schema 即约束，AI 必须遵守
4. **简洁优先** - 只加必要的信息，不过度文档化

## 工作流程

### 标准的 API 集成流程

```
1. 阅读官方 API 文档
   ↓
2. 复制 openapi_yaml_template 创建主文件
   ↓
3. 定义 paths（API 端点）
   ↓
4. 复制 Resource_yaml_template 创建数据模型
   ↓
5. 验证 OpenAPI 规范
   ↓
6. 生成类型安全的客户端代码
   ↓
7. AI 基于生成的类型开发业务逻辑
```

### 验证和生成命令

```bash
# 安装工具
npm install -g @openapitools/openapi-generator-cli @apidevtools/swagger-cli

# 验证 OpenAPI 规范
swagger-cli validate api-specs/your-api/openapi.yaml

# 生成 TypeScript 客户端
openapi-generator-cli generate \
  -i api-specs/your-api/openapi.yaml \
  -g typescript-axios \
  -o src/generated/your-api-client \
  --additional-properties=supportsES6=true,withSeparateModelsAndApi=true
```

## 与 AI 协作

### 给 AI 的指令模板

```markdown
任务：实现 [API名称] 的 [功能] 功能

## 强制使用生成的类型
```typescript
import { [ApiClass], [TypeName] } from '@/generated/[api-name]-client';
```

## 要求
1. 必须使用生成的 API 类，不要自己写 HTTP 请求
2. 所有字段必须符合生成的类型定义
3. 代码必须通过 TypeScript 编译（npm run type-check）

## 验证
运行以下命令验证：
```bash
npm run type-check
```
```

## 常见问题

### Q: 为什么要用 OpenAPI 而不是直接写代码？
**A**: 三个核心价值：
1. 类型安全 - 编译时发现错误，不是运行时
2. AI 约束 - 强制 AI 遵守 API 规范
3. 自动生成 - 减少手写重复代码

### Q: 模板文件是 .md 还是 .yaml？
**A**: 模板用 .md 保存方便查看和复制，实际使用时改成 .yaml

### Q: 如何处理嵌套的 Schema 引用？
**A**: OpenAPI Generator 会自动解析所有 `$ref` 引用，只需保证相对路径正确

### Q: 生成的代码可以手动修改吗？
**A**: 不建议。生成的代码放在 `src/generated/` 下，任何修改都会在重新生成时丢失。业务逻辑写在 `src/services/` 中

---

**最后更新**: 2025-01-15
**维护者**: Chaoyu
**用于项目**: MonitorSysUA, PromptGen-Next
