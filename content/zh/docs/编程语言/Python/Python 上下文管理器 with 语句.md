---
title: "Python 上下文管理器 with 语句"
---


# 概述
使用 Python 的 `with` 语句是为了**简化资源管理**，尤其是处理那些需要在代码执行完毕后进行**清理操作**的资源（例如文件操作、网络连接、锁等）。
它的核心优势在于确保无论代码块中是否发生异常，**清理工作都会被正确执行**。

---

# 基本语法

`with` 语句的通用语法如下：

```Python
with expression [as variable]:
    # with 语句块
    # 在这里使用资源
    pass
```

**组成部分解释：**
1. **`with` 关键字**：开始 `with` 语句。
2. **`expression` (表达式)**：
   - 这个表达式必须返回一个上下文管理器（Context Manager）对象。
   - 通常是一个实现了特殊方法 `__enter__` 和 `__exit__` 的类的实例。
3. **`[as variable]` (可选部分)**：
   - 如果提供了 `as variable`，则 `expression` 返回的上下文管理器对象的 `__enter__` 方法的**返回值**会被赋给 `variable`。
   - 这个 `variable` 可以在 `with` 代码块内部使用，通常是代表被管理的资源本身（例如，打开的文件对象）。
4. **`with` 语句块**：
   - 在这个代码块内部，你可以安全地使用资源。

---

# 工作原理

当你执行一个 `with` 语句时，Python 做了以下三件事：

1. **进入资源**：调用上下文管理器对象的 **`__enter__` 方法**。
   - 这个方法会执行设置操作（比如打开文件）。
   - 它的返回值（如果有 `as variable` 部分）会被赋给 `variable`。
2. **执行代码块**：执行 `with` 语句块中的代码。
3. **退出资源并清理**：无论代码块正常结束还是因为抛出异常而终止，都会调用上下文管理器对象的 **`__exit__` 方法**。
   - 这个方法执行必要的清理操作（比如关闭文件、释放锁）。



**`__exit__` 方法的签名：**

```Python
def __exit__(self, exc_type, exc_value, traceback):
    # ... 清理代码 ...
    # 如果处理了异常并希望它不继续传播，返回 True
    # 否则（让异常继续传播），返回 False 或 None
```

---

# 示例：文件操作
这是 `with` 语句最常见且最具说服力的应用：

**传统做法（不推荐）：**
```Python
f = open('test.txt', 'r')
try:
    data = f.read()
    print(data)
finally:
    # 必须确保 f.close() 被调用
    f.close()
```

**使用 `with` 语句（推荐）：**
```Python
with open('test.txt', 'r') as f:
    # 'f' 就是 open('test.txt', 'r').__enter__() 的返回值
    data = f.read()
    print(data)

# 代码块结束或发生异常时，f.close() 会自动被调用
# 即使代码在 f.read() 处失败，文件也会被关闭
```

# 示例：线程锁
多线程访问共享资源（如全局变量）时，必须加锁。如果不加锁，num 可能小于 500000，因为多个线程会同时修改它。

## `threading`
```py
import threading

num = 0
lock = threading.Lock()

def add():
    global num
    for _ in range(100000):
        with lock:       # 自动上锁与解锁
            num += 1

threads = [threading.Thread(target=add) for _ in range(5)]

for t in threads:
    t.start()
for t in threads:
    t.join()

print("结果：", num)
```
- lock 对象是一个上下文管理器。
- 当进入 with lock: 块时，它会自动调用 lock.acquire()（上锁）。这会阻塞其他任何想要进入这个 with 块的线程，直到当前线程释放锁。
- 当退出 with lock: 块时（无论正常退出还是发生异常），它都会自动调用 lock.release()（解锁）。

---

## `ThreadPoolExecutor`
```py
from concurrent.futures import ThreadPoolExecutor
import time

def task(n):
    print(f"任务 {n} 开始")
    time.sleep(1)
    print(f"任务 {n} 结束")
    return n * 2

# 创建线程池
with ThreadPoolExecutor(max_workers=3) as executor:
    results = executor.map(task, range(5))

print("结果：", list(results))
```