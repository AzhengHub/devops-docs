---
title: "ORM 框架之 SQLAlchemy"
---

---

## SQLAlchemy 基础知识
| 功能 | 示例 | 说明 |
| ---- | ---- | ---- |
| 创建引擎 | `engine = create_engine('sqlite:///example.db') `| 创建数据库连接引擎 |
| 会话 | `Session = sessionmaker(bind=engine)` | 用于和数据库交互的会话 |
| 数据模型 | `class User(Base):` | 定义数据库模型 |
| 查询 | `session.query(User).filter(User.name == 'John').all()` | 执行查询操作 |
| 插入 | `session.add(new_user)` | 向数据库插入数据 |
| 更新 | `session.query(User).filter(User.id == 1).update({'name': 'Azheng'})` | 更新数据库中的记录 |
| 删除 | `session.query(User).filter(User.id == 1).delete()` | 删除数据库中的记录 |



## 一个最小的 SQLAlchemy 应用


```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 创建数据库引擎
engine = create_engine('sqlite:///example.db', echo=True)

# 创建一个基本类
Base = declarative_base()

# 创建会话
Session = sessionmaker(bind=engine)
session = Session()

# 定义一个模型类
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

# 创建数据库表
Base.metadata.create_all(engine)

# 插入数据
new_user = User(name="Azheng")
session.add(new_user)
session.commit()

# 查询数据
user = session.query(User).filter(User.name == 'Azheng').first()
print(user.name)

session.close()

```

---
## SQLAlchemy 基础操作
```python
from sqlalchemy import create_engine, Column, Integer, String, DECIMAL, Date, ForeignKey
from sqlalchemy.orm import sessionmaker, relationship, declarative_base

# 使用 create_engine() 来创建数据库引擎。
# SQLAlchemy 中的引擎是连接数据库的核心对象，负责与数据库的通信。
# 'sqlite:///example.db'，三个斜杠表示 SQLite 数据库文件是相对路径（如果是绝对路径，应该是两个斜杠）。
#  echo=True，这个参数控制 SQLAlchemy 的日志记录功能。当设置为 True 时，SQLAlchemy 会输出所有生成的 SQL 语句到标准输出（例如命令行）。这对于调试和查看 SQL 查询非常有用。
engine = create_engine('sqlite:///example.db', echo=True)

# 使用 sessionmaker() 创建会话。
# 通过会话对象与数据库进行交互（添加、查询、删除等操作）。
Session = sessionmaker(bind=engine) # 定义会话类 Session，它与指定的数据库引擎（engine）绑定。
session = Session() # 通过会话类 Session，实例化一个会话对象 session，用于与数据库进行交互。通过这个会话对象，可以执行查询、插入、更新、删除等操作。
# 注意：SQLAlchemy 会自动创建数据库文件，但只有第一次操作数据库时（比如创建表），SQLAlchemy 才会实际创建文件。仅仅创建引擎和会话不会立即创建文件。


# 定义模型基类
# declarative_base() 是 SQLAlchemy 的声明式基类，用于创建数据模型类的基类。
# 所有继承自 Base 的类都会被 SQLAlchemy 自动识别为数据库表模型。
# 相当于 Django 的 models.Model，Flask-SQLAlchemy 的 db.Model。
Base = declarative_base()

# 创建部门表
class Department(Base):
    __tablename__ = 'departments' # 指定该模型对应的数据库表名
    
    # 定义一个名为 department_id 的列，类型是 Integer（整数），并设为主键（primary_key=True）
    # 主键是表的唯一标识符，通常自动递增（SQLite/SQLAlchemy 默认行为）
    department_id = Column(Integer, primary_key=True)

    # 定义一个名为 department_name 的列，类型是 String（字符串）
    # String(100) 表示的是一个 长度为 100 的字符串字段，也就是这个字段最多可以存储 100 个字符。
    # nullable=False 表示这个字段不能为空，必须有值。
    department_name = Column(String(100), nullable=False)

# 创建员工表
class Employee(Base):
    __tablename__ = 'employees'
    
    employee_id = Column(Integer, primary_key=True)
    first_name = Column(String(50))
    last_name = Column(String(50))
    gender = Column(String(1))
    hire_date = Column(Date)
    department_id = Column(Integer, ForeignKey('departments.department_id'))
    
    # 设置与部门表的关系
    department = relationship("Department")

# 创建薪资表
class Salary(Base):
    __tablename__ = 'salaries'
    
    salary_id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.employee_id'))
    salary = Column(DECIMAL(10, 2))
    from_date = Column(Date)
    to_date = Column(Date)
    
    # 设置与员工表的关系
    employee = relationship("Employee")

# 创建项目表
class Project(Base):
    __tablename__ = 'projects'
    
    project_id = Column(Integer, primary_key=True)
    project_name = Column(String(100))
    start_date = Column(Date) # 定义为日期类型
    end_date = Column(Date)

# 创建员工-项目关系表（多对多）
class EmployeeProject(Base):
    __tablename__ = 'employee_projects'
    
    employee_id = Column(Integer, ForeignKey('employees.employee_id'), primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.project_id'), primary_key=True)
    role = Column(String(50))
    
    # 设置与员工表和项目表的关系
    employee = relationship("Employee")
    project = relationship("Project")

# 创建所有表
Base.metadata.create_all(engine)
```

---

## 增（插入数据）
使用 `session.add()` 将对象添加到会话中，并使用 `session.commit()` 提交事务到数据库。
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String

engine = create_engine('sqlite:///example.db', echo=True)

Session = sessionmaker(bind=engine)
session = Session()

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

Base.metadata.create_all(engine)

new_user = User(name="Azheng")
session.add(new_user) # 将对象添加到会话中
session.commit() # 提交事务到数据库
```
```sql
sqlite> .headers on
sqlite> .mode column
sqlite> select * from users;
id  name  
--  ------
1   Azheng
```
---

## 删（删除数据）
通过 `session.query()` 和 `.delete()` 删除记录。
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String

engine = create_engine('sqlite:///example.db', echo=True)

Session = sessionmaker(bind=engine)
session = Session()

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

Base.metadata.create_all(engine)

# 查询 User 模型（对应 'users' 表），
# 过滤出 id 为 1 的记录，并将其删除。
session.query(User).filter(User.id == 1).delete() 

# 提交事务，保存删除操作到数据库。
session.commit()
```
---

## 改（更新数据）
通过 `session.query()` 和 `.update()` 方法可以更新现有数据。
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String

engine = create_engine('sqlite:///example.db', echo=True)

Session = sessionmaker(bind=engine)
session = Session()

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

Base.metadata.create_all(engine)

# 查询 User 模型（对应 'users' 表），
# 过滤出 id 为 1 的记录，并将该记录的 'name' 字段更新为 'James'。
session.query(User).filter(User.id == 1).update({'name': 'James'})

# 提交事务，保存对数据库的更改。
session.commit()
```

---

## 查（查询数据）
使用 `session.query()` 可以执行各种查询。可以使用 `.filter()` 来过滤条件，使用 `.all()` 返回所有结果，或 `.first()` 返回第一个匹配的结果。
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String

engine = create_engine('sqlite:///example.db', echo=True)

Session = sessionmaker(bind=engine)
session = Session()

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)

Base.metadata.create_all(engine)

new_user = User(name="Azheng")
session.add(new_user)
session.commit()

user = session.query(User).filter(User.name == 'Azheng').first()  # 第一个匹配的结果
user_all = session.query(User).filter(User.name == 'Azheng').all()  # 所有匹配的结果

print("第一个匹配的结果: ", user.name)

print("所有匹配的结果: ")
for user in user_all:
    print(user.name)
```
- 注意：`.all()` 方法查询到的所有匹配的 `User` 对象的列表，所以你需要迭代这个列表来访问每个 `User` 的 `name` 属性。

---
### 基本查询
```python
session.query(User).all()  # 查询所有用户
session.query(User).filter(User.name == 'Azheng').all()  # 条件查询
```

---

### 聚合函数
SQLAlchemy 支持使用 SQL 函数进行聚合操作，例如 `count()`, `sum()`, `avg()` 等。
```python
from sqlalchemy import func

session.query(func.count(User.id)).scalar()  # 计算用户数量
```

---

### 关联查询


使用 `join()` 进行关联查询：


```python
session.query(User, Address).join(Address).filter(User.id == Address.user_id).all()

```


## 事务管理


- SQLAlchemy 支持事务管理。当你进行多个数据库操作时，可以选择提交或回滚事务。
- 每次数据库操作都需要提交事务，除非你希望取消这些操作。

```python
session.begin()  # 开始事务
# 执行操作
session.commit()  # 提交事务

# 如果出现异常
session.rollback()  # 回滚事务

```


## 自定义模型方法


在模型类中，你可以定义自定义方法，以封装常用的数据库操作。


```python
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    
    def __repr__(self):
        return f""

    @classmethod
    def get_by_name(cls, name):
        return session.query(cls).filter(cls.name == name).first()

```

---

## 关系模型
SQLAlchemy 支持一对多（One-to-Many）、多对一（Many-to-One）、多对多（Many-to-Many）关系。
### 一对多关系
一对多（One-to-Many）关系是指 **一个父表中的一行** 可以与 **子表中的多行** 关联。就像在现实生活中，一个父亲可以有多个孩子，但每个孩子只有一个父亲。

在下面的例子中，`Parent` 和 `Child` 表之间的关系就是“一对多”。一个父亲（`Parent`）可以有多个孩子（`Child`），但每个孩子只有一个父亲。

```python
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

# 定义父类（Parent）模型
class Parent(Base):
    __tablename__ = 'parents'  # 这张表的名称为 'parents'
    
    id = Column(Integer, primary_key=True)  # 每个父类记录的唯一标识符
    name = Column(String)  # 父类的名字

    # 通过 relationship 函数与 Child 表建立了一对多关系（这里的 "Child" 是模型类的名称）
    # backref='parent' 是让每个 Child 也能访问到它的父亲。即可以通过 child.parent 来获取父对象
    children = relationship('Child', backref='parent')
 
# 定义子类（Child）模型
class Child(Base):
    __tablename__ = 'children'  # 这张表的名称为 'children'
    
    id = Column(Integer, primary_key=True)  # 每个孩子记录的唯一标识符
    name = Column(String)  # 孩子的名字

    # ForeignKey('parents.id') 表示 parent_id 是一个外键，它引用了父类表 parents 中的 id 字段
    parent_id = Column(Integer, ForeignKey('parents.id')) 
    
```
#### 举个例子：

假设数据库中有以下记录：

- `Parent` 表：`(1, 'John')`
- `Child` 表：`(1, 'Alice', 1)`, `(2, 'Bob', 1)`
- `Parent` 表中的记录表示有一个名为 "John" 的父亲（`id = 1`）。
- `Child` 表中的记录表示 "Alice" 和 "Bob" 都是 "John" 的孩子，他们的 `parent_id = 1`。

通过这段代码，我们可以这样操作：

- `parent.children` 将会返回所有与 "John"（`id = 1`）关联的孩子，返回的是 `['Alice', 'Bob']`。
- `child.parent` 将返回与某个孩子（如 "Alice"）关联的父亲对象（"John"）。

这样，就建立了父类与子类之间的“一对多”关系。

---

### 多对多关系
多对多关系意味着 **多个记录** 在 **一个表** 中可以关联到 **多个记录** 在另一个表中。举个简单的例子，一名学生可以选修多门课程，而一门课程也可以被多名学生选修，这就是典型的 **多对多关系**。

在 SQLAlchemy 中，我们通过建立一个 **关联表** 来实现多对多关系。关联表本质上是一个中间表，存储了两个表之间的关系信息。你通过 `relationship` 和 `secondary` 参数在模型类中创建多对多关系。

```python
from sqlalchemy import Table, ForeignKey
from sqlalchemy.orm import relationship

# 创建一个关联表（中间表），用于存储 'left' 和 'right' 表之间的多对多关系
association_table = Table('association', Base.metadata,
    # 关联表有两个外键：一个指向 'left' 表的 id，另一个指向 'right' 表的 id
    Column('left_id', Integer, ForeignKey('left.id')),  # 外键，指向 'left' 表的 id
    Column('right_id', Integer, ForeignKey('right.id'))  # 外键，指向 'right' 表的 id
)

# 定义 'Left' 表，代表多对多关系中的左侧实体
class Left(Base):
    __tablename__ = 'left'  # 表名为 'left'
    
    id = Column(Integer, primary_key=True)  # 左表的主键
    # 'rights' 属性建立与 'Right' 表的多对多关系
    # 使用 `secondary=association_table` 参数指定中间表，即 'association' 表
    # 通过 `backref='lefts'` 可以让 'Right' 表反向访问与其关联的所有 'Left' 实例
    rights = relationship('Right', secondary=association_table, backref='lefts')  
    # 通过 `rights` 可以访问所有与当前 'Left' 实例相关的 'Right' 实例

# 定义 'Right' 表，代表多对多关系中的右侧实体
class Right(Base):
    __tablename__ = 'right'  # 表名为 'right'
    
    id = Column(Integer, primary_key=True)  # 右表的主键
    # 这里没有显式声明 relationship，因为 'Left' 表已经建立了关系

```
#### 关系解释：

1. **关联表（`association_table`）**：
    这是一个中间表，用于存储左表（`Left`）和右表（`Right`）之间的关联关系。每一行记录都会包含两个外键，一个指向左表的 `id`，另一个指向右表的 `id`。这就是多对多关系的核心。

   ```
   python复制编辑association_table = Table('association', Base.metadata,
       Column('left_id', Integer, ForeignKey('left.id')),  # 外键，指向 'left' 表的 id
       Column('right_id', Integer, ForeignKey('right.id'))  # 外键，指向 'right' 表的 id
   )
   ```

2. **`Left` 表**：
    这个表代表多对多关系中的左侧实体。在 `Left` 表中，`rights` 字段通过 `relationship` 与 `Right` 表建立了多对多关系。`secondary=association_table` 指定了关联表，使得 `Left` 和 `Right` 之间建立了多对多的映射。

   ```
   python复制编辑class Left(Base):
       __tablename__ = 'left'  # 这是左表
       rights = relationship('Right', secondary=association_table, backref='lefts')
   ```

   - **`secondary=association_table`**：表示使用 `association_table` 作为连接 `Left` 和 `Right` 的中间表。
   - **`backref='lefts'`**：让 `Right` 表的实例能够访问到它关联的 `Left` 实例。即 `right.lefts` 将返回所有与某个右表实体相关联的左表实体。

3. **`Right` 表**：
    这个表代表多对多关系中的右侧实体。由于在 `Left` 表中已经建立了多对多关系，所以 `Right` 表不需要显式声明 `relationship`，它通过 `backref` 在 `Left` 表中已经得到了反向访问的能力。

   ```
   python复制编辑class Right(Base):
       __tablename__ = 'right'  # 这是右表
   ```

#### 举个例子：

假设我们有以下的 `Left` 和 `Right` 表：

- `Left` 表：`(1, 'Left 1')`, `(2, 'Left 2')`
- `Right` 表：`(1, 'Right 1')`, `(2, 'Right 2')`

通过关联表 `association_table` 存储了以下记录：

- `(1, 1)`，表示 `Left 1` 和 `Right 1` 有关联
- `(2, 2)`，表示 `Left 2` 和 `Right 2` 有关联
- `(1, 2)`，表示 `Left 1` 和 `Right 2` 也有关联

你可以通过 SQLAlchemy 的 ORM 查询：

- 通过 `left_instance.rights` 获取与某个左表实例相关联的所有右表实例。
- 通过 `right_instance.lefts` 获取与某个右表实例相关联的所有左表实例。

例如：

```
python复制编辑# 获取 Left 表中 id 为 1 的记录，并获取它相关的所有 Right 实例
left_1 = session.query(Left).get(1)
print(left_1.rights)  # 输出与 Left 1 相关联的所有 Right 实例

# 获取 Right 表中 id 为 2 的记录，并获取它关联的所有 Left 实例
right_2 = session.query(Right).get(2)
print(right_2.lefts)  # 输出与 Right 2 相关联的所有 Left 实例
```

#### 总结：

- `association_table` 是用来存储两个表之间关系的关联表。
- `relationship('Right', secondary=association_table)` 表示通过关联表建立 `Left` 和 `Right` 之间的多对多关系。
- `backref='lefts'` 为 `Right` 表创建了反向引用，使得你可以通过 `right.lefts` 访问与某个 `Right` 实例关联的所有 `Left` 实例。

这个结构非常适合用来表示多对多关系，典型的例子有学生和课程、产品和订单等。


## SQLAlchemy 常用查询操作


| 查询操作 | 示例 | 说明 |
| ---- | ---- | ---- |
| 获取所有数据 | session.query(User).all() | 获取所有 User 表中的记录 |
| 根据条件过滤数据 | session.query(User).filter(User.name == 'Azheng').all() | 根据 name 字段过滤用户记录 |
| 获取第一条记录 | session.query(User).first() | 获取查询结果的第一条记录 |
| 聚合查询 | session.query(func.count(User.id)).scalar() | 查询 User 表的记录数 |
| 更新数据 | session.query(User).filter(User.id == 1).update({'name': 'Azheng'}) | 更新 id 为 1 的用户的 name 字段 |
| 删除数据 | session.query(User).filter(User.id == 1).delete() | 删除 id 为 1 的用户记录 |



## 小结


- SQLAlchemy 是一个强大的 ORM 库，能够将 Python 对象映射到数据库表。
- 使用 SQLAlchemy 的 **引擎** 和 **会话** 可以轻松地进行数据的 CRUD 操作。
- 支持复杂的查询操作，如聚合、关联查询、事务管理等。
- 通过定义模型类和关系，SQLAlchemy 提供了简洁的方式来处理数据库关系。

掌握了 SQLAlchemy 的基本用法后，你可以开始使用它来构建更复杂的数据库应用，处理多表关系、事务管理等。