---
title: "Python 数据结构"
---

# 字典 dict
Python 中的 **字典（dictionary）** 是一种内置的数据结构，用于存储**键值对（key-value pairs）**。它非常适合快速查找和组织数据。

## 字典定义方式
```python
# 空字典
d = {}

# 含有数据的字典
d = {
    "name": "Alice",
    "age": 25,
    "city": "Beijing"
}

# 使用 dict() 构造函数
d = dict(name='Alice', age=25, city='Beijing')

# 使用 zip() 和两个列表创建
keys = ['name', 'age', 'city']
values = ['Alice', 25, 'Beijing']
d = dict(zip(keys, values))

# 使用可迭代对象创建
d = dict([('name', 'Alice'), ('age', 25)])
```

## 字典常用方法
| 方法/操作 | 说明 |
| ---- | ---- |
| d[key] | 获取 key 对应的值，若 key 不存在会报错 |
| d.get(key[, default]) | 获取 key 对应的值，若不存在返回默认值 |
| d[key] = value | 设置 key 的值，若 key 不存在会创建 |
| d.keys() | 返回所有键 |
| d.values() | 返回所有值 |
| d.items() | 返回键值对元组的集合 |
| d.update([other]) | 更新字典，可合并另一个字典或键值对 |
| d.pop(key[, default]) | 删除键并返回对应的值 |
| d.popitem() | 删除并返回最后一个键值对 |
| d.clear() | 清空字典 |
| key in d | 检查 key 是否在字典中 |

## 字典使用示例
```python
# 创建字典
person = {'name': 'Alice', 'age': 30}

# 添加/更新键值对
person['city'] = 'New York'
person['age'] = 31

# 访问键值
print(person['name'])          # Alice
print(person.get('gender'))    # None

# 删除键
person.pop('age')

# 遍历字典
for key, value in person.items():
    print(f'{key}: {value}')

# 合并字典
other = {'gender': 'female'}
person.update(other)

```

## 字典推导式
```python
squares = {x: x**2 for x in range(5)}
# 输出: {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

```

# 列表 list


Python 中的 **列表（list）** 是一种有序、可变的序列数据结构，可以存储任意类型的对象。它非常适合用于存储多个元素，并对其进行增删改查操作。


## 列表定义方式


```python
# 空列表
lst = []

# 含有元素的列表
lst = [1, 2, 3, 'hello', True]

# 使用 list() 构造函数
lst = list((1, 2, 3))

# 使用 range() 生成数字列表
lst = list(range(5))  # [0, 1, 2, 3, 4]

# 使用列表推导式生成
lst = [x * 2 for x in range(5)]  # [0, 2, 4, 6, 8]

```

## 列表常用方法


| 方法/操作 | 说明 |
| ---- | ---- |
| lst[i] | 获取索引 i 的元素，支持负数索引 |
| lst[i] = x | 修改索引 i 的元素为 x |
| lst.append(x) | 在列表末尾添加元素 x |
| lst.extend(iterable) | 扩展列表，添加多个元素 |
| lst.insert(i, x) | 在索引 i 处插入元素 x |
| lst.remove(x) | 删除第一个值为 x 的元素 |
| lst.pop([i]) | 弹出并返回索引 i 的元素（默认最后一个） |
| lst.clear() | 清空列表 |
| lst.index(x) | 返回值 x 第一次出现的索引 |
| lst.count(x) | 返回值 x 出现的次数 |
| lst.sort() | 就地排序列表 |
| lst.reverse() | 就地反转列表 |
| len(lst) | 获取列表长度 |
| x in lst | 检查元素 x 是否在列表中 |


## 列表使用示例


```python
# 创建列表
numbers = [10, 20, 30]

# 添加元素
numbers.append(40)
numbers.insert(1, 15)

# 修改元素
numbers[2] = 25

# 删除元素
numbers.remove(10)
last = numbers.pop()  # 删除并返回最后一个元素

# 遍历列表
for num in numbers:
    print(num)

# 合并列表
a = [1, 2]
b = [3, 4]
a.extend(b)  # [1, 2, 3, 4]

# 排序与反转
a.sort()
a.reverse()

```

## 列表推导式


```python
# 创建一个平方列表
squares = [x**2 for x in range(5)]
# 输出: [0, 1, 4, 9, 16]

# 使用条件过滤
evens = [x for x in range(10) if x % 2 == 0]
# 输出: [0, 2, 4, 6, 8]

```


# 元组 tuple


Python 中的 **元组（tuple）** 是一种**有序且不可变**的序列数据结构，常用于存储不可修改的数据。与列表类似，但元组一旦创建，其元素不能被修改。


## 元组定义方式


```python
# 空元组
t = ()

# 含有元素的元组
t = (1, 2, 3)

# 没有括号也可以创建元组（不推荐）
t = 1, 2, 3

# 单个元素的元组（必须加逗号）
t = (1,)  

# 使用 tuple() 构造函数
t = tuple([1, 2, 3])  # 由列表转为元组

```

## 元组常用操作


| 方法/操作 | 说明 |
| ---- | ---- |
| t[i] | 获取索引 i 的元素 |
| t.count(x) | 返回值 x 出现的次数 |
| t.index(x) | 返回值 x 第一次出现的索引 |
| len(t) | 返回元组长度 |
| x in t | 检查元素 x 是否在元组中 |
| t1 + t2 | 连接两个元组，返回新元组 |
| t * n | 将元组重复 n 次 |


⚠️ 元组是不可变的，因此**不支持添加、删除、修改元素**的方法，如 `append()`、`remove()`、`pop()` 等。


## 元组使用示例


```python
# 创建元组
person = ('Alice', 30, 'New York')

# 访问元素
name = person[0]
city = person[-1]

# 遍历元组
for item in person:
    print(item)

# 解包
name, age, city = person

# 嵌套元组
nested = (1, (2, 3), 4)

# 连接元组
t1 = (1, 2)
t2 = (3, 4)
t3 = t1 + t2  # (1, 2, 3, 4)

```

## 元组的使用场景


- 函数返回多个值
- 作为字典的键（列表不可以）
- 保证数据不被意外修改
- 可用于 `set()`、`dict` 中的键或集合操作（因为元组是可哈希的）

## 使用示例：函数返回值


```python
def min_max(values):
    return min(values), max(values)

result = min_max([1, 5, 3])
# result 是一个元组: (1, 5)

```


# 集合 set


Python 中的 **集合（set）** 是一种**无序、元素唯一**的可变数据结构，适合用于去重、集合运算（交集、并集、差集等）以及成员检测等场景。


## 集合定义方式


```python
# 空集合（必须用 set()，不能用 {}）
s = set()

# 含有元素的集合
s = {1, 2, 3}

# 使用 set() 构造函数
s = set([1, 2, 3, 2])  # 自动去重

# 使用集合推导式
squares = {x**2 for x in range(5)}  # {0, 1, 4, 9, 16}

```

## 集合常用方法


| 方法/操作 | 说明 |
| ---- | ---- |
| s.add(x) | 添加元素 x |
| s.update(iterable) | 添加多个元素 |
| s.remove(x) | 删除元素 x，不存在时报错 |
| s.discard(x) | 删除元素 x，不存在时不报错 |
| s.pop() | 随机删除一个元素并返回 |
| s.clear() | 清空集合 |
| x in s | 判断 x 是否是集合的成员 |
| len(s) | 返回集合元素个数 |


## 集合运算方法


| 方法/操作 | 说明 |
| ---- | ---- |
| s1.union(s2) 或 s1 | s2 | 并集 |
| s1.intersection(s2) 或 s1 & s2 | 交集 |
| s1.difference(s2) 或 s1 - s2 | 差集 |
| s1.symmetric_difference(s2) 或 s1 ^ s2 | 对称差集 |
| s1.issubset(s2) | s1 是否是 s2 的子集 |
| s1.issuperset(s2) | s1 是否是 s2 的超集 |
| s1.isdisjoint(s2) | 两集合是否无交集 |


## 集合使用示例


```python
# 创建集合
fruits = {'apple', 'banana', 'orange'}

# 添加和删除
fruits.add('grape')
fruits.discard('banana')

# 判断成员
if 'apple' in fruits:
    print('有苹果')

# 遍历集合
for item in fruits:
    print(item)

# 集合运算
a = {1, 2, 3}
b = {3, 4, 5}

print(a | b)  # 并集: {1, 2, 3, 4, 5}
print(a & b)  # 交集: {3}
print(a - b)  # 差集: {1, 2}
print(a ^ b)  # 对称差集: {1, 2, 4, 5}

```

## 集合的使用场景


- 数据去重：`set([1, 2, 2, 3])` → `{1, 2, 3}`
- 判断交集：如检查两个标签集合是否有重叠
- 快速成员判断：比列表更快的 `in` 操作
- 执行数学集合运算

# 字符串 str


Python 中的 **字符串（string）** 是一种**不可变**的文本序列，用于表示字符、文本数据。字符串是最常用的数据结构之一，支持丰富的操作和方法。


## 字符串定义方式


```python
# 使用单引号或双引号
s = 'hello'
s = "world"

# 使用三引号定义多行字符串
s = '''Hello,
This is a multi-line string.'''

# 字符串中包含引号
s = "I'm Alice"
s = 'He said "Hi"'

# 使用 str() 构造函数
s = str(123)  # '123'

```

## 字符串常用方法


| 方法 | 说明 |
| ---- | ---- |
| s.lower() | 转小写 |
| s.upper() | 转大写 |
| s.title() | 每个单词首字母大写 |
| s.strip() | 去除首尾空白字符 |
| s.lstrip() / s.rstrip() | 去除左/右空白字符 |
| s.replace(old, new) | 替换子串 |
| s.split(sep) | 按分隔符切割为列表 |
| s.join(iterable) | 用字符串连接可迭代对象 |
| s.find(sub) | 查找子串位置，找不到返回 -1 |
| s.index(sub) | 查找子串位置，找不到报错 |
| s.startswith(prefix) | 是否以某字符串开头 |
| s.endswith(suffix) | 是否以某字符串结尾 |
| len(s) | 字符串长度 |
| 'x' in s | 判断子串是否存在 |
| s.count(sub) | 统计子串出现次数 |


## 字符串格式化


```python
name = 'Alice'
age = 30

# f-string (推荐)
greeting = f'My name is {name}, I am {age} years old.'

# format 方法
greeting = 'My name is {}, I am {} years old.'.format(name, age)

# 百分号格式化
greeting = 'My name is %s, I am %d years old.' % (name, age)

```

## 字符串使用示例


```python
text = "  Hello World!  "

# 清理空格
cleaned = text.strip()

# 大小写转换
print(text.lower())   # "  hello world!  "
print(text.upper())   # "  HELLO WORLD!  "

# 查找与替换
print(text.find("World"))       # 返回索引位置
print(text.replace("World", "Python"))

# 拆分与连接
words = text.split()            # ['Hello', 'World!']
joined = "-".join(words)        # 'Hello-World!'

# 判断前后缀
print(text.startswith("  He"))  # True
print(text.endswith("!  "))     # True

```

## 字符串切片（索引）


```python
s = "abcdefg"

print(s[0])     # 'a'
print(s[-1])    # 'g'
print(s[1:4])   # 'bcd'
print(s[:3])    # 'abc'
print(s[::2])   # 'ace'

```

## 字符串的不可变性


字符串是不可变的，所有操作都**返回新字符串**，原字符串不变。


```python
s = "hello"
s.upper()      # 返回 'HELLO'
print(s)       # 原 s 仍为 'hello'

```


# 整数 int


Python 中的 **整数（int）** 是一种基础的数字类型，表示没有小数部分的数字。整数类型具有任意精度，可以进行各种算术和位运算。


## 整数定义方式


```python
# 直接赋值
a = 123

# 十六进制（以 0x 开头）
b = 0x1A  # 26

# 八进制（以 0o 开头）
c = 0o17  # 15

# 二进制（以 0b 开头）
d = 0b1010  # 10

# 使用 int() 转换
e = int("42")          # 字符串转整数
f = int("1010", 2)     # 将二进制字符串转为十进制

```

## 常用运算符


| 运算符 | 说明 | 示例 | 结果 |
| ---- | ---- | ---- | ---- |
| + | 加法 | 3 + 2 | 5 |
| - | 减法 | 3 - 2 | 1 |
| * | 乘法 | 3 * 2 | 6 |
| // | 整除 | 7 // 2 | 3 |
| / | 真除（结果为 float） | 7 / 2 | 3.5 |
| % | 取余 | 7 % 2 | 1 |
| ** | 幂运算 | 2 ** 3 | 8 |
| -x | 取负 | -5 | -5 |
| +x | 取正 | +5 | 5 |


## 位运算符


| 运算符 | 说明 | 示例 | 结果 |
| ---- | ---- | ---- | ---- |
| & | 按位与 | 5 & 3 | 1 |
| ` | ` | 按位或 | `5 |
| ^ | 按位异或 | 5 ^ 3 | 6 |
| ~x | 按位取反 | ~5 | -6 |
| &lt;&lt; | 左移 | 5 &lt;&lt; 1 | 10 |
| &gt;&gt; | 右移 | 5 &gt;&gt; 1 | 2 |


## 常用函数与方法


| 函数 | 说明 |
| ---- | ---- |
| int(x) | 转换为整数 |
| abs(x) | 取绝对值 |
| pow(x, y) | 幂运算，等价于 x ** y |
| divmod(x, y) | 返回 (x // y, x % y) 元组 |
| bin(x) | 转换为二进制字符串 |
| oct(x) | 转换为八进制字符串 |
| hex(x) | 转换为十六进制字符串 |


## 示例代码


```python
a = 15
b = 4

# 基本运算
print(a + b)      # 19
print(a // b)     # 3
print(a % b)      # 3

# 幂运算
print(pow(a, 2))  # 225

# 位运算
print(a & b)      # 4
print(a | b)      # 15

# 类型转换
print(bin(a))     # '0b1111'
print(int("1010", 2))  # 10

# 拆分商和余数
print(divmod(15, 4))   # (3, 3)

```

## 整数的特点


- **无限精度**：Python 中整数没有固定大小，内存足够即可表示任意大整数。
- **不可变类型**：整数是不可变对象，任何修改都会返回新对象。


# 序列化与反序列化

**序列化（Serialization）** 是指将 Python 对象（如字典、列表、类实例等）转换为可存储或传输的格式（如字符串、字节流），常用于数据保存、网络传输等场景。**反序列化（Deserialization）** 则是将这些格式还原为原始的 Python 对象。

## 常用序列化模块

- `json`：适用于基本数据类型（字典、列表、字符串、数字等），格式为文本，跨语言兼容性好。
- `pickle`：支持几乎所有 Python 对象，格式为二进制，仅适用于 Python 之间的数据交换。

## JSON 序列化与反序列化
```python
import json

data = [
    {"name": "张三", "age": 18},
    {'name': 'Alice', 'age': 30, 'is_admin': False},
    [1, 2, 3],
    "hello",
    123,
    True,
    None
]

# 序列化，json.dumps()
dumped_data = json.dumps(data) # 可添加 ensure_ascii=False 保持中文字符不转义
print(dumped_data)
# [{"name": "\u5f20\u4e09", "age": 18}, {"name": "Alice", "age": 30, "is_admin": false}, [1, 2, 3], "hello", 123, true, null]


# 反序列化，json.loads()
loaded_data = json.loads(dumped_data)
print(loaded_data)
# [{'name': '张三', 'age': 18}, {'name': 'Alice', 'age': 30, 'is_admin': False}, [1, 2, 3], 'hello', 123, True, None]
```


## Pickle 序列化与反序列化

```python
import pickle

data = {'name': 'Bob', 'score': [90, 85, 88]}

# 序列化为二进制
bin_data = pickle.dumps(data)

# 反序列化为 Python 对象
data2 = pickle.loads(bin_data)
```

### 文件读写示例

```python
# 写入二进制文件
with open('data.pkl', 'wb') as f:
    pickle.dump(data, f)

# 从二进制文件读取
with open('data.pkl', 'rb') as f:
    data3 = pickle.load(f)
```

## 注意事项

- `json` 只支持基本数据类型，不支持自定义类、函数等复杂对象。
- `pickle` 支持所有 Python 对象，但序列化后的数据只能在 Python 环境下使用，且有安全隐患，不要反序列化不可信的数据。
- 序列化和反序列化常用于数据持久化、网络通信、缓存等场景