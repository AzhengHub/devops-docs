---
title: "FastAPI"
---

## Pydantic 模型
Pydantic 是一个用于 **数据验证** 和 **设置管理** 的 Python 库，主要用于创建具有类型提示的数据模型。它的核心思想是利用 Python 的类型注解来自动进行数据校验和转换，广泛应用于 FastAPI、Typer 等现代 Python 框架中。



## 🔹 什么是 Pydantic 模型？


Pydantic 模型是一个继承自 `BaseModel` 的类，用来表示结构化的数据对象。它会自动验证输入数据的类型、格式，并在可能的情况下进行类型转换。


### ✅ 示例：


```python
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str

# 创建实例，自动验证类型
user = User(id='1', name='Alice', email='alice@example.com')

print(user.id)       # 输出：1 （自动从字符串转为整数）
print(user.dict())   # {'id': 1, 'name': 'Alice', 'email': 'alice@example.com'}

```


## 🔍 Pydantic 的主要功能


| 功能 | 描述 |
| ---- | ---- |
| 类型检查 | 检查字段是否匹配类型，如 int、str、datetime 等 |
| 自动转换 | 字符串转为数字、日期等常见类型 |
| 校验错误报告 | 提供详细的错误信息 |
| 嵌套模型 | 支持嵌套数据结构 |
| 默认值与可选字段 | 支持 Optional 和默认值设置 |
| JSON 序列化 | .json() 方法快速转 JSON |



## 🔧 应用场景


- **API 数据校验（如 FastAPI 中的请求体）**
- **配置管理（如从 .env 加载配置）**
- **前后端数据结构同步**
- **数据解析和转换（如从数据库或外部接口返回的数据）**


## 🚫 错误处理示例：


```python
try:
    user = User(id='not-an-int', name='Bob', email='bob@example.com')
except Exception as e:
    print(e)

```

输出：


```pgsql
1 validation error for User
id
  value is not a valid integer (type=type_error.integer)

```


其他知识点还包括：字段验证器（`@validator`）、自定义字段类型、环境变量解析等。
