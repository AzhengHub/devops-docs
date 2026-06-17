---
title: "mysql命令"
---

# 使用 `mysql_config_editor` 进行密码管理

MySQL 提供了一个工具 `mysql_config_editor`，你可以使用它保存用户名和密码，这样你就不需要每次都输入密码。

**设置用户凭据**

```bash
mysql_config_editor set --login-path=local --host=localhost --user=用户名 --password
```

会提示你输入密码，密码会加密保存。

**使用保存的配置执行 SQL**

```bash
mysql --login-path=local -e "SELECT * FROM 数据库名.表名;"
```

这时候就不需要每次输入密码了，系统会自动使用你保存的凭据登录 MySQL。

**执行后忘加端口了，如何修改？**

```sh
# 查看当前的登录路径配置
mysql_config_editor print --login-path=local

# 修改登录路径示例：
mysql_config_editor set --login-path=local --host=localhost --user=用户名 --password --port=端口号
```



###### 