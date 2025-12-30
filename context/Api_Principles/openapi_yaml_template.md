openapi: 3.0.3

# ============================================
# 1. API 元信息
# ============================================
info:
  title: API 名称
  description: API 描述
  version: 1.0.0

# ============================================
# 2. 服务器地址
# ============================================
servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api-staging.example.com/v1
    description: Staging

# ============================================
# 3. 全局安全配置（可选）
# ============================================
security:
  - BearerAuth: []

# ============================================
# 4. 标签分组（可选）
# ============================================
tags:
  - name: Resources
    description: 资源管理
  - name: Analytics
    description: 数据分析

# ============================================
# 5. API 端点定义
# ============================================
paths:
  /resources:
    get:
      summary: 列出资源
      operationId: listResources
      tags:
        - Resources
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResourceList'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: 创建资源
      operationId: createResource
      tags:
        - Resources
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: './schemas/Resource.yaml'
      responses:
        '201':
          description: 创建成功
          content:
            application/json:
              schema:
                $ref: './schemas/Resource.yaml'
        '400':
          $ref: '#/components/responses/BadRequest'

  /resources/{id}:
    parameters:
      - $ref: '#/components/parameters/IdParam'

    get:
      summary: 获取单个资源
      operationId: getResource
      tags:
        - Resources
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: './schemas/Resource.yaml'
        '404':
          $ref: '#/components/responses/NotFound'

    patch:
      summary: 更新资源
      operationId: updateResource
      tags:
        - Resources
      requestBody:
        content:
          application/json:
            schema:
              $ref: './schemas/Resource.yaml'
      responses:
        '200':
          description: 更新成功
          content:
            application/json:
              schema:
                $ref: './schemas/Resource.yaml'

    delete:
      summary: 删除资源
      operationId: deleteResource
      tags:
        - Resources
      responses:
        '204':
          description: 删除成功

# ============================================
# 6. 可复用组件
# ============================================
components:
  # 认证方案
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://oauth.example.com/authorize
          tokenUrl: https://oauth.example.com/token
          scopes:
            read: 读取权限
            write: 写入权限

  # 通用参数
  parameters:
    IdParam:
      name: id
      in: path
      required: true
      description: 资源ID
      schema:
        type: string
      example: "123"

    PageParam:
      name: page
      in: query
      description: 页码
      schema:
        type: integer
        minimum: 1
        default: 1
      example: 1

    LimitParam:
      name: limit
      in: query
      description: 每页数量
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
      example: 20

  # 数据模型（引用外部文件）
  schemas:
    Resource:
      $ref: './schemas/Resource.yaml'

    ResourceList:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: './schemas/Resource.yaml'
        pagination:
          $ref: './schemas/common/Pagination.yaml'

    Error:
      $ref: './schemas/common/Error.yaml'

  # 可复用的响应
  responses:
    BadRequest:
      description: 请求参数错误
      content:
        application/json:
          schema:
            $ref: './schemas/common/Error.yaml'

    Unauthorized:
      description: 未授权
      content:
        application/json:
          schema:
            $ref: './schemas/common/Error.yaml'

    NotFound:
      description: 资源不存在
      content:
        application/json:
          schema:
            $ref: './schemas/common/Error.yaml'
