---
title: "kibana"
---

# Kibana 概述

Kibana 为 Elasticsearch 提供一个查看数据的 web 界面，其主要是通过 Elasticsearch 的 API 接口进行数据查找，并进行前端数据可视化的展现，另外还可以针对特定格式的数据生成相应的表格、柱状、饼状图等，不需要安装JDK





# Kibana 部署

## dpkg & rpm

- 可以和Elasticsearch安装在一起，也可以不安装在一起
- **但通常Kibana是和Elasticsearch安装在一起，Kibana绑定再本机的127.0.0.1端口，然后再安装一个nginx 和Kibana做代理密码验证，最后前面会加一个负载均衡，Kibana再通过负载均衡来访问Elasticsearch**
- https://mirrors.tuna.tsinghua.edu.cn/elasticstack/apt/7.x/pool/main/k/kibana/

```bash
#无需安装JDK，直接安装就可以
dpkg -i kibana-7.15.0-amd64.deb 

#启动服务并设为开机启动，一般都要先修改配置文件再启动
#注意：启动后要等一会 待数据初始化完毕才能访问
systemctl enable --now kibana.service

#浏览器访问5601端口测试
```



## helm

- 下面使用Elasticsearch官方提供的仓库进行部署，也可以使用信任的第三方仓库，比如：bitnami
- https://artifacthub.io/packages/helm/elastic/kibana

```sh
# 安装elastic官方chart仓库
# helm repo add elastic https://helm.elastic.co


# 验证仓库
# helm repo list
NAME                	URL                                               
...              
elastic             	https://helm.elastic.co


# 打印安装的readme，此信息从chart官方仓库也可以查看
# helm show readme elastic/kibana --version 7.17.3


# 获取values文件，values文件还可以从chart官方仓库下载
# helm show values elastic/kibana --version 7.17.3 > values-kibana.yaml


# 按需修改values文件，具体如何修改参阅chart官方仓库，或readme的提示信息
# vim values-kibana.yaml
...


# 指定chart版本安装，如未指定，则使用最新版本，最后指定按需修改后的values文件部署
# kubectl create ns logs
# helm install kibana --version 7.17.3 elastic/kibana -n logs -f values-kibana.yaml


# 后期升级
# helm upgrade kibana elastic/kibana -n logs -f /helm/values-kibana.yaml
```





# Kibana conf

https://www.elastic.co/guide/en/kibana/current/index.html

- /etc/kibana/kibana.yml


```bash
server.port: 5601 # kibana的监听端口，默认为5601

server.host: "0.0.0.0" # 服务主机，要修改为0.0.0.0，否则无法远程访问
                       # 注意：如果通过nginx代理进行验证访问需修改成127.0.0.1

elasticsearch.hosts: ["http://10.0.0.100:9200"] # elasticsearch服务器的地址
                                                # 注意：如果通过nginx代理进行访问 需要将此地址指向代理的地址，如：10.0.0.8

i18n.locale: "zh-CN"  #语言要改为中文
...
```







## 
