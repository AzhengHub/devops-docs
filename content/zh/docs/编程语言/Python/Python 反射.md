---
title: "Python 反射"
---

# 反射概述
在 Python 中，反射机制指的是程序在运行时可以动态地获取对象的信息（如属性、方法、类名等），并能动态地操作这些信息（如调用方法、修改属性等）。总之，反射是Python中一种非常有用的元编程技术，这种机制让程序更加灵活，尤其在框架开发、动态模块加载等场景中应用广泛。但是，在使用反射时需要谨慎，避免滥用，因为反射可能会影响性能并增加代码复杂度。

---

**反射的原理**

Python 中一切皆对象（类、实例、模块、函数等），所有对象都有一个 `__dict__` 属性（字典），用于存储自身的属性和方法。反射的核心就是通过字符串操作这个字典：
- hasattr(obj, name) 本质是判断 name 是否在 `obj.__dict__ `中；
- getattr(obj, name) 本质是从 `obj.__dict__` 中获取 name 对应的值；
- setattr 和 delattr 则是对 `obj.__dict__` 进行修改或删除。

```py
class A:
    x = 10
    def foo(self):
        pass

print(A.__dict__)  # 查看类的属性字典， 返回：
# {'__module__': '__main__', 'x': 10, 'foo': <function A.foo at 0x7e4ccfe413a0>, '__dict__': <attribute '__dict__' of 'A' objects>, '__weakref__': <attribute '__weakref__' of 'A' objects>, '__doc__': None}
```

---

**注意事项**
1. 性能开销：反射是动态操作，比直接调用属性 / 方法的性能略低，需避免在高频循环中过度使用。
2. 异常处理：使用 getattr 或 delattr 时，若属性不存在可能抛出 AttributeError，建议结合 hasattr 判断或指定 default 参数。
3. 安全性：动态加载模块 / 类时，需确保输入的字符串可信，避免加载恶意模块。

# 反射核心内建函数
Python 提供了 4 个核心内置函数实现反射，它们适用于类、实例、模块等对象：
| 函数                            | 功能描述                                                     |
| ------------------------------- | ------------------------------------------------------------ |
| `getattr(obj, name[, default])` | 获取对象 `obj` 中名为 `name` 的属性或方法；若不存在，返回 `default`（若未指定则报错）。 |
| `setattr(obj, name, value)`     | 给对象 `obj` 的 `name` 属性设置值 `value`；若属性不存在则新增。 |
| `hasattr(obj, name)`            | 判断对象 `obj` 是否包含名为 `name` 的属性或方法，返回布尔值。 |
| `delattr(obj, name)`            | 删除对象 `obj` 中名为 `name` 的属性；若不存在则报错。        |

## 示例
```py
class Person:
    def __init__(self, name):
        self.name = name  # 实例属性

    def say_hello(self):  # 实例方法
        print(f"Hello, I'm {self.name}")

# 创建实例
p1 = Person("Alice")
p2 = Person("Bob")


# hasattr 判断是否存在属性/方法
print(hasattr(p1, "name"))       # True（存在实例属性）
print(hasattr(p1, "say_hello"))  # True（存在实例方法）
print(hasattr(p1, "age"))        # False（不存在实例属性或方法）

# getattr 获取属性/方法
method = getattr(p1, "say_hello")
method()  # Hello, I'm Alice（动态调用）

# setattr 设置/新增属性
setattr(p1, "age", 25)  # 新增 age 属性（如果 p 原本没有 age，这会新建一个实例属性。如果 p 已经有 age，这会修改实例的 age 值。）
print(p1.age)  # 25
print(hasattr(p2, "age"))  # False（age 只属于实例 p1，而不是类 Person 或其他实例。）

setattr(p1, "name", "Bob")  # 修改 name 属性
print(p1.name)  # Bob

# delattr 删除属性
delattr(p1, "age")
print(hasattr(p1, "age"))  # False ，表示没有这个属性了
print(p1.age)  # 报错：AttributeError，表示没有这个属性了
```

# 反射其他内建函数/模块
| 函数 / 模块                     | 类型       | 作用说明                                        | 示例                                                    |
| ------------------------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------- |
| `dir(obj)`                      | 内置函数   | 列出对象的所有属性和方法（包括魔术方法）        | `dir(str)`                                              |
| `type(obj)`                     | 内置函数   | 返回对象的类型，也可用于动态创建类              | `type(123) → <class 'int'>` 或 `type("A", (Base,), {})` |
| `isinstance(obj, cls)`          | 内置函数   | 判断对象是否为某个类的实例（反射判断类型）      | `isinstance(p, Person)`                                 |
| `issubclass(sub, super)`        | 内置函数   | 判断类是否为另一个类的子类                      | `issubclass(Student, Person)`                           |
| `id(obj)`                       | 内置函数   | 返回对象的内存地址（可用于对象标识）            | `id(obj)`                                               |
| `callable(obj)`                 | 内置函数   | 判断对象是否可调用（函数、方法、类等）          | `callable(func)`                                        |
| `vars(obj)`                     | 内置函数   | 返回对象的 `__dict__` 属性（动态属性字典）      | `vars(obj)`                                             |
| `globals()` / `locals()`        | 内置函数   | 获取当前全局/局部命名空间字典（可配合反射使用） | `cls = globals()["User"]`                               |
| `importlib.import_module(name)` | 模块函数   | 按字符串动态导入模块                            | `mod = importlib.import_module("math")`                 |
| `inspect` 模块                  | 标准库模块 | 获取对象的详细信息（源码、参数、类继承结构等）  | `inspect.getmembers(obj)`、`inspect.signature(func)`    |


# 类反射与常见应用场景
类的反射 是指在程序运行时，通过字符串动态地访问、创建、修改类或调用其方法。也就是说 不直接写类名，而是通过字符串或配置动态操作类。

例如，在普通业务代码中，我们通常写：
```py
user = User("Tom")
user.login()
```

但有些场景下，你的程序 在运行时才知道要操作哪个类，
比如类名来自：
- 配置文件
- 数据库
- 用户输入
- 路由规则
- 插件系统

这时，你不能提前写死 User，只能“动态加载”它。
这就是类反射的典型应用场景。

## 通过配置动态实例化类（常见于框架）
- 程序可以根据配置动态决定创建 User 或 Admin 对象，不用写死类名。
```py
# config.json
{
    "model": "User"
}


# test.py
class User:
    def __init__(self, name): self.name = name
    def show(self): print(f"User: {self.name}")

class Admin:
    def __init__(self, name): self.name = name
    def show(self): print(f"Admin: {self.name}")

import json

conf = json.load(open("config.json"))
cls_name = conf["model"]   # "User"

# 类反射
cls = globals()[cls_name]
obj = cls("Alice")
obj.show()  # User: Alice
```

## 工厂模式（Factory Pattern）
反射让工厂更灵活：
```py
class Car: pass
class Truck: pass
class Bike: pass

def factory(cls_name):
    cls = globals()[cls_name]
    return cls()

obj = factory("Truck")  # 动态实例化
print(type(obj))        # <class '__main__.Truck'>
```
✅ 不用写一堆 if/elif 判断，只要知道类名字符串即可创建对象。

## 框架内部自动注册与加载类（如 Django、Flask）
框架经常在运行时扫描模块、自动加载类。比如 Django ORM 会通过反射加载模型类、视图类：
```py
# views.py
class HomeView:
    def get(self): return "home"

# 框架代码
view_class_name = "HomeView"
module = __import__("views")  # 导入模块
cls = getattr(module, view_class_name)
view = cls()
print(view.get())
```
✅ Django、Flask、FastAPI 内部大量用这种机制实现“自动发现与绑定”。

## 命令执行器 / 路由分发器
假设我们有一堆命令类：
```py
class Start:
    def run(self): print("启动中...")

class Stop:
    def run(self): print("停止中...")

cmd = input("请输入命令: ")  # 例如 "Start"
cls = globals().get(cmd)
if cls:
    obj = cls()
    obj.run()
else:
    print("未知命令")
```
✅ 用户输入决定实例化哪个类。
类名可以用字符串动态决定。

## 插件系统 / 动态注册机制
```py
# plugins/user_plugin.py
class UserPlugin:
    def run(self):
        print("User plugin running...")

# 主程序：
import importlib

plugin_module = importlib.import_module("plugins.user_plugin")
plugin_class = getattr(plugin_module, "UserPlugin")
plugin = plugin_class()
plugin.run()
```
✅ 主程序不需要提前知道插件的名字；
插件新增、修改都无需改主程序。

# 模块反射与常见应用场景
模块反射在普通业务代码中不多见，但在框架、插件系统、自动化脚本中非常常见。下面是一些真实场景👇
## 插件系统（Plugin System）
假设你写了一个可扩展系统，用户可以自己写插件。
```py
# plugins/math_plugin.py
def run(x, y):
    return x + y

# 主程序：
import importlib

plugin_name = "plugins.math_plugin"
plugin = importlib.import_module(plugin_name)

result = plugin.run(3, 4)
print(result)  # 7
```
✅ 主程序不用提前 import 所有插件，只要知道字符串模块名即可。

✅ 可以随时加载新的插件，无需改主程序。

## 根据配置文件动态加载类或模块
```py
# config.json
{
    "backend": "database.mysql_backend"
}
```
```py
import json, importlib

config = json.load(open("config.json"))
backend_module = importlib.import_module(config["backend"])

# 假设模块里有个 connect() 方法
backend_module.connect()
```
✅ 当配置变更时，程序无需改代码，自动加载不同实现。

## Web 框架中的路由分发
例如在 Django、Flask 或 FastAPI 这种框架中，框架内部会根据字符串导入视图函数：
```py
# 假设配置了路由 "myapp.views.index"
view_path = "myapp.views.index"
module_name, func_name = view_path.rsplit(".", 1)

mod = importlib.import_module(module_name)
func = getattr(mod, func_name)
response = func(request)
```
✅ 这样，路由和函数绑定可以通过字符串配置实现，而不是写死在代码里。

## 自动化测试 / 批量执行脚本
```py
scripts = ["tests.test_user", "tests.test_order", "tests.test_payment"]
for s in scripts:
    mod = importlib.import_module(s)
    mod.run_tests()
```
✅ 动态批量加载、执行多个测试模块。

# 反射与元编程
反射是元编程（动态修改代码结构）的一部分基础。
你可以通过 type() 动态创建类、修改方法、注入属性等：
```py
# 动态创建类
MyClass = type("MyClass", (object,), {"x": 10, "say": lambda self: print(self.x)})
obj = MyClass()
obj.say()  # 10
```

# 反射 FAQ
## 既然类已经实例化了，为什么不直接调用？而是使用反射
```py
class Person:
    def __init__(self, name):
        self.name = name

    def say_hello(self):
        print(f"Hello, I'm {self.name}")

p = Person("Alice")

# getattr
method = getattr(p, "say_hello")
method()  # 返回 Hello, I'm Alice（基于反射动态调用）

p.say_hello() # 返回 Hello, I'm Alice（基于类实例调用）
```

**✅ 解释对比**

| 调用方式                    | 说明                                                         | 适用场景                                                 |
| --------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| `p.say_hello()`             | **静态调用**。方法名在代码中是固定的、写死的。               | 你明确知道要调用哪个方法时。                             |
| `getattr(p, "say_hello")()` | **动态调用（反射）**。方法名通过字符串决定，可以在运行时变化。 | 当方法名在运行时才确定（如配置、用户输入、插件系统）时。 |

------

**🧩 举个简单的例子**

```py
class CommandHandler:
    def start(self): print("系统启动")
    def stop(self): print("系统停止")

cmd = input("请输入命令 (start/stop): ")
handler = CommandHandler()

# 静态方式：只能写死
# handler.start()

# 动态方式：命令由用户输入决定
if hasattr(handler, cmd):
    getattr(handler, cmd)()  # 动态反射调用
else:
    print("未知命令")
```

> 如果用户输入 `stop`，程序就执行 `handler.stop()`。
> 这在写死调用方式中是不可能做到的。

------

**🧠 总结一句话**

> 使用 `getattr()` 并不是因为我们不能直接调用，而是因为我们**希望通过字符串动态地决定要调用什么**。

> 所以它的意义在于「动态性」，不是「方便性」。