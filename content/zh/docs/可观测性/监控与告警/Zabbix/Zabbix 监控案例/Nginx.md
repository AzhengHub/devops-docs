---
title: "Nginx"
---


# Nginx核心监控项

- 端口是否存活、进程是否存在
- 总访问量
- 并发访问量
- 访问的响应时间
- 300、400、500系列状态码的出现次数







# 在nginx主机上部署agent

- 参考上面的 部署agent实现流程
- 过程省略...



# 在web界面添加nginx主机

- 参考上面的 添加主机流程



# 在web界面添加监控模板

- 参考上面的 添加模板流程



# 在web界面准备通知媒介

- **可选**，如果实现存在通知媒介则无需添加
- 参考上面的 添加通知媒介流程



# 在web界面添加动作

- 参考上面的 添加动作流程



# nginx故障恢复脚本参考

```bash
[root@nginx-web1 ~]# vim /data/scripts/nginx_check.sh
#!/bin/bash
killall -0 nginx &> /dev/null
if [ ${?} -ne 0 ];then
     systemctl restart nginx.service
        elif [ ! $(systemctl is-active nginx.service) == active ];then
            kill -9 nginx
            systemctl restart nginx.service
fi

[root@nginx-web1 ~]# chmod +x /data/scripts/nginx_check.sh
```

