type: object
description: 标准错误响应

properties:
  code:
    type: integer
    description: HTTP 状态码
    example: 400

  message:
    type: string
    description: 错误信息
    example: "Invalid request"

  errors:
    type: array
    description: 详细错误列表
    items:
      type: object
      properties:
        field:
          type: string
          description: 错误字段
        message:
          type: string
          description: 错误信息

  requestId:
    type: string
    description: 请求ID
    example: "req_123"

required:
  - code
  - message

example:
  code: 400
  message: "Validation failed"
  errors:
    - field: "name"
      message: "Name is required"
  requestId: "req_123"
