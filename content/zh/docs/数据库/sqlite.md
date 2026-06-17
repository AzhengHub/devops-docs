---
title: "SQLite"
---

---

## SQLite 常用命令
- 所有以点(.)开头的命令是SQLite特有的命令，不是SQL语句
- SQL语句必须以分号(;)结尾
- 按上下箭头可以查看历史命令
- 使用Ctrl+C可以中断长时间运行的查询
### 创建/打开数据库
```bash
sqlite3 数据库文件名.db
```
- 如果数据库不存在，SQLite会自动创建它。

---

### 退出SQLite命令行
```bash
.quit
# 或
.exit
```

---

### 表操作
```bash
# 创建表
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);

# 查看所有表
.tables

# 查看表结构
.schema 表名
```

---

### 数据操作
```bash
# 插入数据
INSERT INTO users (name, age) VALUES ('Alice', 30);

# 查询数据
SELECT * FROM users;
SELECT name, age FROM users WHERE age > 25;

# 更新数据
UPDATE users SET age = 31 WHERE name = 'Alice';

# 删除数据
DELETE FROM users WHERE id = 1;
```

---

### 导入导出
```bash
# 从CSV导入数据
.mode csv
.import 文件名.csv 表名

# 导出到CSV
.headers on
.mode csv
.output 文件名.csv
SELECT * FROM 表名;
.output stdout

# 执行SQL脚本
.read 脚本文件名.sql

```
---

#### 执行 sql 脚本时的错误处理
``` bash
# 无数据
sqlite> select * from projects;

# 当 sql 语句中创建的表已存在时
sqlite> .read 1.sql
Parse error near line 2: table departments already exists
  CREATE TABLE departments (     department_id INT PRIMARY KEY,     department_n
               ^--- error here
Parse error near line 15: table employees already exists
  CREATE TABLE employees (     employee_id INT PRIMARY KEY,     first_name VARCH
               ^--- error here
Parse error near line 34: table salaries already exists
  CREATE TABLE salaries (     salary_id INT PRIMARY KEY,     employee_id INT,   
               ^--- error here
Parse error near line 53: table projects already exists
  CREATE TABLE projects (     project_id INT PRIMARY KEY,     project_name VARCH
               ^--- error here
Parse error near line 67: table employee_projects already exists
  CREATE TABLE employee_projects (     employee_id INT,     project_id INT,     
               ^--- error here

# 不影响 INSERT INTO 插入数据
sqlite> select * from projects;
1|Project Apollo|2021-01-01|2021-12-31
2|Project Zephyr|2022-03-01|
3|Project Orion|2020-06-01|2021-06-30

```
---

### 实用命令
```bash
# 显示列标题
.headers on

# 更改输出格式
.mode column
.mode list
.mode html

# 显示查询执行时间
.timer on

# 查看所有SQLite命令
.help
```

---

### 高级功能
```bash
# 事务处理
BEGIN TRANSACTION;
-- 执行多个SQL语句
COMMIT;
-- 或 ROLLBACK; 回滚

# 创建索引
CREATE INDEX idx_name ON users(name);

# 使用视图
CREATE VIEW adult_users AS SELECT * FROM users WHERE age >= 18;

# 备份数据库
.backup 备份文件名.db

# 恢复数据库
.restore 备份文件名.db
```

