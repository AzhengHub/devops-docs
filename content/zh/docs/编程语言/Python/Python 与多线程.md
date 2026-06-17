---
title: "Python 与多线程"
---

在 Python 中，多线程（`threading`）主要用于 **I/O 密集型任务**（例如网络请求、文件读写），因为 Python 的 **GIL（全局解释器锁）** 限制了多个线程不能同时执行 CPU 密集型的 Python 字节码。

下面我一步步教你怎么用多线程 👇

------

## 🧩 一、基本用法：`threading.Thread`

```
import threading
import time

def worker(name):
    print(f"{name} 开始工作")
    time.sleep(2)
    print(f"{name} 工作结束")

# 创建线程
t1 = threading.Thread(target=worker, args=("线程1",))
t2 = threading.Thread(target=worker, args=("线程2",))

# 启动线程
t1.start()
t2.start()

# 等待线程结束
t1.join()
t2.join()

print("所有线程结束")
```

### 输出（大致）：

```
线程1 开始工作
线程2 开始工作
线程1 工作结束
线程2 工作结束
所有线程结束
```

> ✅ `start()` 启动线程
>  ✅ `join()` 等待线程执行结束

------

## 🧵 二、使用 `for` 创建多个线程

```
import threading
import time

def download_file(n):
    print(f"开始下载第 {n} 个文件...")
    time.sleep(1)
    print(f"第 {n} 个文件下载完成")

threads = []
for i in range(5):
    t = threading.Thread(target=download_file, args=(i,))
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print("全部下载完成！")
```

------

## ⚙️ 三、使用锁（Lock）避免资源竞争

多线程访问共享资源（如全局变量）时，必须加锁。

```
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

> 如果不加锁，`num` 可能小于 500000，因为多个线程会同时修改它。

------

## 🧠 四、使用 `ThreadPoolExecutor`（更简单）

Python 3 推荐使用 `concurrent.futures.ThreadPoolExecutor`，更方便。

```
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

------

## 📊 五、总结对比

| 方法                 | 适用场景           | 优点               |
| -------------------- | ------------------ | ------------------ |
| `threading.Thread`   | 简单的多线程任务   | 灵活，但写法略麻烦 |
| `Lock`               | 多线程修改共享数据 | 避免竞争           |
| `ThreadPoolExecutor` | 批量并发任务       | 最推荐，代码简洁   |