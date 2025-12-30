type: object
description: 资源模型描述

properties:
  # ID 字段（只读）
  id:
    type: string
    description: 唯一标识符
    readOnly: true
    example: "123"

  # 基础字段
  name:
    type: string
    description: 名称
    minLength: 1
    maxLength: 255
    example: "示例名称"

  # 枚举字段
  status:
    type: string
    description: 状态
    enum:
      - ACTIVE
      - INACTIVE
      - PENDING
    default: PENDING
    example: ACTIVE

  # 数字字段
  amount:
    type: integer
    format: int64
    description: 金额（最小单位）
    minimum: 0
    example: 1000000

  # 布尔字段
  isEnabled:
    type: boolean
    description: 是否启用
    default: true
    example: true

  # 嵌套对象
  metadata:
    type: object
    description: 元数据
    properties:
      key1:
        type: string
      key2:
        type: integer
    example:
      key1: "value1"
      key2: 100

  # 数组字段
  tags:
    type: array
    description: 标签列表
    items:
      type: string
    example: ["tag1", "tag2"]

  # 引用其他 schema
  relatedResource:
    $ref: './RelatedResource.yaml'

  # 数组引用
  items:
    type: array
    items:
      $ref: './Item.yaml'

  # 时间字段
  createdAt:
    type: string
    format: date-time
    description: 创建时间
    readOnly: true
    example: "2025-01-01T00:00:00Z"

  updatedAt:
    type: string
    format: date-time
    description: 更新时间
    readOnly: true
    example: "2025-01-15T12:30:45Z"

# 必需字段
required:
  - name
  - status

# 完整示例
example:
  id: "123"
  name: "示例名称"
  status: ACTIVE
  amount: 1000000
  isEnabled: true
  metadata:
    key1: "value1"
    key2: 100
  tags: ["tag1", "tag2"]
  createdAt: "2025-01-01T00:00:00Z"
  updatedAt: "2025-01-15T12:30:45Z"
