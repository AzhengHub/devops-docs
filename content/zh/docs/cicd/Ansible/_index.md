---
title: "Ansible"
weight: 50
---

## Ansible 概述

- 模块化：调用特定的模块执行特定的任务，并且支持自定义模块 并且可以使用任何编程语言编写模块
- 基于python语言开发
- 无代理机制（被管理节点只要有ssh服务即可实现被管理）
- 安全，基于open ssl
- 幂等性：一个任务执行1遍和执行n遍效果一样，不因重复执行带来意外情况
- 支持playbook编排任务，YAML格式，编排任务，支持丰富的数据结构
- 较强大的多层解决方案 role

**参考文档**

- https://www.ansible.com/
- https://github.com/ansible/ansible
- http://galaxy.ansible.com
- https://galaxy.ansible.com/explore#/
- http://github.com/
- http://ansible.com.cn/
- https://github.com/ansible/ansible
- https://github.com/ansible/ansible-examples


## Ansible 安装

### yum/apt 安装

- 生产中主流安装方式

```bash
# CentOS 从 epel 源安装
yum -y install ansible

# Ubuntu
apt -y install ansible
```

### 编译安装

```sh
# 安装依赖
yum -y install python-jinja2 PyYAML python-paramiko python-babel python-crypto

# 下载 ansible 源码
tar xf ansible-1.5.4.tar.gz

# 编译安装
cd ansible-1.5.4
python setup.py build
python setup.py install

# 创建配置目录
mkdir /etc/ansible
cp -r examples/* /etc/ansible
```

### git 安装

```sh
git clone git://github.com/ansible/ansible.git --recursive
cd ./ansible
source ./hacking/env-setup
```

### 验证安装

```sh
# ansible --version
ansible 2.9.18
  config file = /etc/ansible/ansible.cfg
  configured module search path = ['/root/.ansible/plugins/modules', '/usr/share/ansible/plugins/modules']
  ansible python module location = /usr/lib/python3.6/site-packages/ansible
  executable location = /usr/bin/ansible
  python version = 3.6.8 (default, Aug 24 2020, 17:57:11) [GCC 8.3.1 20191121 (Red Hat 8.3.1-5)]
```



## 配置 SSH 免密登录
Ansible 默认依赖 SSH 协议，因此需要将管理机的公钥分发到所有节点上。

**生成密钥 (如果没有):**
```sh
ssh-keygen -t rsa
# 一路回车即可
```
- **.ssh/id_rsa** ：私钥文件，用于身份验证，**严禁泄露**。
- **.ssh/id_rsa.pub** ：公钥文件，用于分发到所有节点。

**执行以下脚本批量推送公钥:**
```sh {filename="copy-ssh-key.sh"}
# /bin/bash
# 替换为实际的 IP 列表
IPS="
10.0.0.1
10.0.0.2
10.0.0.3
"

for ip in $IPS; do
    echo "Copying key to $ip..."
    ssh-copy-id -o StrictHostKeyChecking=no root@$ip
done
```


#### 测试连接
- 定义简单的主机清单文件
```ini {filename="/etc/ansible/hosts"}
[servers]
10.0.0.1
10.0.0.2
10.0.0.3
```

- 测试连接
```bash
ansible all -m ping
```

如果连接成功，将返回 `pong` 字样。



## Ansible 相关文件

### 主配置文件 

- 主配置文件，配置ansible工作特性，但大多数配置无需修改

配置文件优先级：
- 主配置文件中的配置可被其他更高优先级的配置所替代
- $ANSIBLE_CONFIG环境变量 **>** 检查运行ansible命令的目录中的ansible.cfg文件  **>** 用户家目录的.ansible.cfg文件 **>** /etc/ansible/ansible.cfg文件

```sh {filename="/etc/ansible/ansible.cfg"}
[defaults]
inventory     = /etc/ansible/hosts # 主机清单文件位置
library = /usr/share/my_modules/ # 库文件存放目录
remote_tmp = $HOME/.ansible/tmp # 临时py命令文件存放在远程主机目录
local_tmp     = $HOME/.ansible/tmp # 本机的临时命令执行目录
forks         = 5   # 默认并发数
ask_pass     = True   # 每次执行ansible命令是否询问ssh密码
remote_port   = 22 # 默认远程链接主机的端口号（还可以在主机清单文件中对某主机单独指定端口）
module_name = command   # 默认模块，可以修改为shell模块
deprecation_warnings = False # 禁用弃用警告
host_key_checking = False # 检查对应服务器的host_key，建议取消注释，否则每台主机都需要按yes验证，不启用此行的话修改/etc/ssh/ssh_config文件中的StrictHostKeyChecking no也可以，效果一样，建议修改的值（ansible2.9.18已经默认取消注释，所以无需修改）
log_path=/var/log/ansible.log # 日志文件，建议启用
```

### 手动生成主配置文件 
- 有些场景下，可能需要手动生成主配置文件，可通过以下方式生成：
```sh
# 确定 ansible 配置文件路径
ansible --version
...
  config file = /etc/ansible/ansible.cfg
...

# 创建配置目录
mkdir -p /etc/ansible/

# 生成默认配置文件
cat > /etc/ansible/ansible.cfg << EOF
[defaults]
inventory     = /etc/ansible/hosts
library = /usr/share/my_modules/
remote_tmp = $HOME/.ansible/tmp
local_tmp     = $HOME/.ansible/tmp
forks         = 5
ask_pass     = True
remote_port   = 22
module_name = shell
deprecation_warnings = Fals
host_key_checking = False
log_path=/var/log/ansible.log
EOF
```



### 主机清单配置文件 

- 主机清单配置文件，遵循INI文件风格，中括号中的字符为组名。
- 可以将同一个主机同时归并到多个不同的组中 
- 此外，当如若目标主机使用了非默认的SSH端口，还可以在主机名称之后使用冒号加端口号来标明
- 如果主机名称遵循相似的命名模式，还可以使用列表的方式标识各主机

```ini
# 定义 servers 组
[servers]
192.168.100.2:3333 # 指定ssh的端口号（如若目标主机使用了非默认的SSH端口，要在主机名称之后使用冒号加端口号来标明）
10.0.0.1
10.0.0.2
# 特殊情况：如果这台机器的登录名和密码与普通用户不同，需要单独配置
10.0.0.3 ansible_ssh_pass='这里填这台机器的特殊密码' # 如果 sudo 密码也不一样，还需要追加 ansible_become_pass='...'
10.0.0.[100:200] # 指定范围，代表10.0.0.100~10.0.0.200



# 未配置 ssh 免密登录的情况下管理主机
[servers:vars]
ansible_user=普通用户登录名
ansible_ssh_pass=普通用户的SS密码
ansible_become_pass=指定 sudo 时的密码（通常同上）


[es_masters]
172.16.30.111 node_name=node-master0 # node_name 表示节点名称，可在playbook中引用
172.16.30.113 node_name=node-master1
172.16.30.112 node_name=node-master2

[es_data]
172.16.30.37  node_name=node-6
172.16.30.78  node_name=node-8
172.16.30.41  node_name=node-2
172.16.30.61  node_name=node-3
172.16.30.53  node_name=node-5
172.16.30.21  node_name=node-1
172.16.30.35  node_name=node-4
172.16.30.54  node_name=node-7

# 定义一个父组，包含所有 ES 节点，方便统一下发命令
[es_all:children]
es_masters
es_data
```



## Ansible 相关工具

```bash
/usr/bin/ansible # 主程序，临时命令执行工具

/usr/bin/ansible-doc # 查看配置文档，模块功能查看工具,相当于man 

/usr/bin/ansible-playbook # 定制自动化任务，编排剧本工具,相当于脚本

/usr/bin/ansible-pull # 远程执行命令的工具

/usr/bin/ansible-vault # 文件加密工具

/usr/bin/ansible-console # 基于Console界面与用户交互的执行工具

/usr/bin/ansible-galaxy # 下载/上传优秀代码或Roles模块的官网平台
```

### Ansible 命令行

```sh
# 让命令输出成为一行一行的
ansible servers -m ping -o

# 在特定主机上执行任务
ansible 172.16.30.112,172.16.30.113 -m ...
```

### ansible

- 此工具通过ssh协议，实现对远程主机的配置管理、应用部署、任务执行等功能

- 使用前要与对端建立ssh免密登录，否则敲密码效率太低（ansible控制端公钥 推送到 被控制端）

#### 语法

```bash
ansible <host-pattern> [-m module_name] [-a args]
```

##### host-pattern

- 正常写法

```sh
# 所有主机
all

# 指定主机组名称
host_group_name
```

- 通配符

```sh
# 通配符形式表示所有主机
"*"              

# 通配符形式指定主机IP
"192.168.1.*"   
```

- `:` 或关系（两个组的并集）

```sh
"websrvs:appsrvs"


"192.168.1.10:192.168.1.20"
```

- `:&` 逻辑与（并且的关系，即取交集）

```sh
# 在 websrvs 组，并且在 dbsrvs 组中的主机，即取交集
"websrvs:&dbsrvs"
```

- `:!` 逻辑非
- 注意：使用逻辑非时，必须用单引号，否则双引号会将!作为命令来执行

```bash
# 在websrvs组，但不在dbsrvs组中的主机，即表示属于websrvs组中的主机刨去属于dbsrvs组的主机
'websrvs:!dbsrvs'

# office开头的主机组，但排除.206 即ansible自身
'office*:!172.16.66.206'

# 逻辑非范例1：属于webs组中的主机列表中刨去同时属于dbsrvs组的主机
[root@ansible ~]# ansible webs --list
  hosts (2):
    10.0.0.18
    10.0.0.28
[root@ansible ~]# ansible dbs --list
  hosts (4):
    10.0.0.18
    10.0.0.7
    10.0.0.17
    10.0.0.27
[root@ansible ~]# ansible 'webs:!dbs' --list
  hosts (1):
    10.0.0.28

# 组合逻辑
ansible 'websrvs:dbsrvs:&appsrvs:!ftpsrvs' –m ping

# 正则表达式
ansible "websrvs:dbsrvs" –m ping
ansible "~(web|db).*\.magedu\.com" –m ping
```

##### options

```sh
--version              # 显示版本
-m module              # 指定模块，默认为command
-a                     # 给模块传递参数
-v                     # 详细过程 –vv -vvv更详细
--list                 # 显示主机列表
-k, --ask-pass         # 提示输入ssh连接密码，默认Key验证 
-C, --check            # 检查，并不执行
-T, --timeout=TIMEOUT  # 执行命令的超时时间，默认10s
-u, --user=REMOTE_USER # 执行远程执行的用户
-b, --become           # 代替旧版的sudo 切换
--become-user=USERNAME # 指定sudo的runas用户，默认为root
-K, --ask-become-pass  # 提示输入sudo时的口令
```

#### 范例

```sh
# 列出所有的主机列表
ansible all --list

# 列出指定分组的主机列表
ansible dbs --list

# 在 dbs 主机组中执行 ping 来测试主机的连通性
ansible dbs -m ping

# 除了自己以外，其他主机都重启（10.0.0.8是本主机）
ansible 'all:!10.0.0.8' -a reboot

# 在kube开头组名和etcd组中除了10.0.0.101主机以外全部重启
ansible 'kube*:etcd:!10.0.0.101' -a reboot

# 以wang用户执行ping存活检测
ansible all -m ping -u wang  -k

# 以wang sudo至root执行ping存活检测
ansible all -m ping -u wang -k -b

# 以wang sudo至mage用户执行ping存活检测
ansible all -m ping -u wang -k -b --become-user=mage

# 以wang sudo至root用户执行ls 
ansible all -m command  -u wang -a 'ls /root' -b --become-user=root -k -K
```

#### 其他说明

**ansible命令执行过程：**

1. 加载自己的配置文件 默认/etc/ansible/ansible.cfg
2. 加载自己对应的模块文件，如：command
3. 通过ansible将模块或命令生成对应的临时py文件，并将该文件传输至远程服务器的对应执行用户 $HOME/.ansible/tmp/ansible-tmp-数字/XXX.PY文件
4. 给文件+x执行
5. 执行并返回结果
6. 删除临时py文件，退出



**ansible 命令执行结果说明**

- 绿色：执行成功并且不需要做改变的操作
- 黄色：执行成功并且对目标主机做变更
- 红色：执行失败
- 紫色：报警

````bash
# 颜色配置文件：
[root@ansible ~]# grep -A13 "\[colors\]" /etc/ansible/ansible.cfg 
[colors]
#highlight = white
#verbose = blue
#warn = bright purple
#error = red
#debug = dark gray
#deprecate = purple
#skip = cyan
#unreachable = red
#ok = green
#changed = yellow
#diff_add = green
#diff_remove = red
#diff_lines = cyan
```
[root@ansible ~]# grep -A13 "\[colors\]" /etc/ansible/ansible.cfg 
[colors]
#highlight = white
#verbose = blue
#warn = bright purple
#error = red
#debug = dark gray
#deprecate = purple
#skip = cyan
#unreachable = red
#ok = green
#changed = yellow
#diff_add = green
#diff_remove = red
#diff_lines = cyan
````


### ansible-doc

- ansible-doc 命令可以查看模块的帮助信息等
- `ansible-doc [options] [module...]`

```sh
# 列出所有模块
ansible-doc -l  

# 查看指定模块详细说明
ansible-doc ping  

# 查看指定模块简要说明
ansible-doc -s  ping
```



### ansible-playbook

- 此工具用于执行编写好的 playbook 任务

语法

```sh
ansible-playbook <filename.yml> ... [options]
```

options

```sh
-C --check   # 只检测可能会发生的改变，但不真正执行操作
--list-hosts # 列出运行任务的主机
--list-tags  # 列出tag
--list-tasks # 列出task
--limit 主机列表 # 只针对主机列表中的特定主机执行
-v -vv -vvv  # 显示过程
--syntax-check # 检查剧本的YAML语法
```

范例

```yaml
# cat hello.yaml
---
- hosts: webservers
  remote_user: root # 默认就是以root的身份在远程主机指向
  tasks:
    - name: hello world
      command: /usr/bin/wall hello world # wall命令用于向系统当前所有打开的终端上输出信息。通过wall命令可将信息发送给每位同意接收公众信息的终端机用户


# ansible-playbook hello.yaml
...
```



### ansible-vault

- 此工具可以用于加密解密yml文件
- 多用于yaml清单中包含不便于明文展示数据的场景

语法

```sh
ansible-vault [create|decrypt|edit|encrypt|rekey|view] hello.yml

encrypt # 加密
decrypt # 解密
view # 查看
edit  # 编辑加密文件
rekey # 修改口令
create # 创建新文件
```

范例

```sh
# 加密前
# cat hello.yaml
---
- hosts: webservers
  remote_user: root
  tasks:
    - name: hello world
      command: /usr/bin/wall hello world


# 加密
# ansible-vault encrypt hello.yaml
New Vault password: 
Confirm New Vault password: 
Encryption successful


# 加密后
# cat hello.yaml 
$ANSIBLE_VAULT;1.1;AES256
62396235313164353163396433633930373934303432343062333835393130666338363035666231
39643735643766...


# 解密
# ansible-vault decrypt hello.yaml
Vault password: 
Decryption successful
# cat hello.yaml
---
- hosts: webservers
  remote_user: root
  tasks:
    - name: hello world
      command: /usr/bin/wall hello world
```



### ansible-console

- 此工具可交互执行命令，支持tab

语法

- 提示符格式：

```
执行用户@当前操作的主机组 (当前组的主机数量)[f:并发数]$
```

- 常用子命令：

```
设置并发数： forks n 例如： forks 10
切换组： cd 主机组 例如： cd web
列出当前组主机列表： list
列出所有的内置命令： ?或help
```

范例

```sh
[root@ansible ~]#ansible-console
Welcome to the ansible console.
Type help or ? to list commands.

root@all (3)[f:5]$ list
10.0.0.8
10.0.0.7
10.0.0.6

root@all (3)[f:5]$ cd websrvs
root@websrvs (2)[f:5]$ list
10.0.0.7
10.0.0.8

root@websrvs (2)[f:5]$ forks 10

root@websrvs (2)[f:10]$ cd appsrvs

root@appsrvs (2)[f:5]$ yum name=httpd state=present

root@appsrvs (2)[f:5]$ service name=httpd state=started
```



### ansible-galaxy

- 此工具会连接 https://galaxy.ansible.com 下载相应的roles

范例

```sh
# 列出所有已安装的galaxy
ansible-galaxy list

# 安装galaxy
ansible-galaxy install geerlingguy.mysql
ansible-galaxy install geerlingguy.redis

# 删除galaxy
ansible-galaxy remove geerlingguy.redis
```



## Ansible 常用模块
- 常用模块帮助文档参考： https://docs.ansible.com/ansible/latest/modules/modules_by_category.html
- 注意：能用专用模块就用专用模块，因为专用模块具有幂等性。例如：虽然使用linux命令同样也可以实现对文件的管理，但如果多次执行可能带来意外的效果。而使用Copy模块就不会存在这个问题，因为幂等性可以实现执行1次和执行N次的效果是一样的

### ping

- 测试与远程主机的连通性

```sh
[root@ansible ~]# ansible dbs -m ping
10.0.0.27 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python"
    },
    "changed": false,
    "ping": "pong"
}
10.0.0.7 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python"
    },
    "changed": false,
    "ping": "pong"
}
10.0.0.17 | SUCCESS => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/bin/python"
    },
    "changed": false,
    "ping": "pong"
}
```

### command

- **注意：**此模块有很多缺陷，如：此命令不支持 $VARNAME < > | ; & 等，**可以用shell模块实现**

```bash
[root@ansible ~]# ansible all -a hostname
10.0.0.27 | CHANGED | rc=0 >>
27
10.0.0.17 | CHANGED | rc=0 >>
17
10.0.0.7 | CHANGED | rc=0 >>
localhost.localdomain

[root@ansible ~]# ansible all -m command -a hostname
10.0.0.27 | CHANGED | rc=0 >>
27
10.0.0.17 | CHANGED | rc=0 >>
17
10.0.0.7 | CHANGED | rc=0 >>
localhost.localdomain
```



### shell

- 比command模块更好用，对shell命令的支持更好

- **建议将此模块通过修改配置文件设为生产中的默认模块**

- **注意：**调用bash执行命令 类似 cat /tmp/test.md | awk -F'|' '{print $1,$2}' &> /tmp/example.txt 这些

  复杂命令，即使使用shell也可能会失败

  - **解决办法：**写到脚本时，copy到远程，执行，再把需要的结果拉回执行命令的机器

```bash
# command删除不了的 shell命令可以删除
[root@ansible ~]# ansible all -m shell -a 'rm -fr  /data/*'

[root@ansible ~]# ansible all -m shell -a 'hostname'
10.0.0.17 | CHANGED | rc=0 >>
17
10.0.0.7 | CHANGED | rc=0 >>
localhost.localdomain
10.0.0.27 | CHANGED | rc=0 >>
27
```



### script

- 在远程主机上运行ansible主机本地的脚本（本地的脚本无需添加执行权限）


```sh
[root@ansible ~]# cat test.sh 
#!/bin/bash
echo "hello world"


[root@ansible ~]# ansible all -m script -a ~/test.sh 
10.0.0.17 | CHANGED => {
    "changed": true,
    "rc": 0,
    "stderr": "Shared connection to 10.0.0.17 closed.\r\n",
    "stderr_lines": [
        "Shared connection to 10.0.0.17 closed."
    ],
    "stdout": "hello world\r\n",
    "stdout_lines": [
        "hello world"
    ]
}
10.0.0.7 | CHANGED => {
    "changed": true,
    "rc": 0,
    "stderr": "Shared connection to 10.0.0.7 closed.\r\n",
    "stderr_lines": [
        "Shared connection to 10.0.0.7 closed."
    ],
    "stdout": "hello world\r\n",
    "stdout_lines": [
        "hello world"
    ]
}
10.0.0.27 | CHANGED => {
    "changed": true,
    "rc": 0,
    "stderr": "Shared connection to 10.0.0.27 closed.\r\n",
    "stderr_lines": [
        "Shared connection to 10.0.0.27 closed."
    ],
    "stdout": "hello world\r\n",
    "stdout_lines": [
        "hello world"
    ]
}
```



### copy

- 从ansible服务器主控端复制文件到远程主机

```sh
src  # 指定源，如果目录末尾加了/，则只复制目录内的内容。如果目录末尾未加/，则将目录自身也进行复制。
dest # 指定目标，目标不存在的话会自动创建
backup # 如果目标事先存在，则先对其进行备份后再拷贝
owner # 设置所有者
mode # 设置权限
content # 直接生成文件内容
```

```sh
# 如目标存在，默认覆盖，此处指定先备份
ansible websrvs -m copy -a "src=/root/test1.sh dest=/tmp/test2.sh   owner=wang 
mode=600 backup=yes"

# 指定内容，直接生成目标文件    
ansible websrvs -m copy -a "content='test line1\ntest line2' dest=/tmp/test.txt"

# 包括/etc目录自身一并复制（注意/etc/后面没有/）
ansible websrvs -m copy -a "src=/etc dest=/backup"

# 仅负责复制/etc/目录下的文件，不包括/etc/目录自身（注意/etc/后面有/）
ansible websrvs -m copy -a "src=/etc/ dest=/backup"
```



### fetch

- 从远程主机提取文件至ansible的主控端，与 copy 模块的功能恰好相反，**目前不支持目录**

```sh
src # 远程主机的文件
dest # 本地的目录
```


```sh
[root@ansible ~]# ansible dbs -m fetch -a 'src=/opt/test.txt dest=./'

# 会在本地创建远程主机所对应的目录，以防止数据冲突
[root@ansible ~]# tree 
.
├── 10.0.0.17
│   └── opt
│       └── test.txt
├── 10.0.0.27
│   └── opt
│       └── test.txt
└── 10.0.0.7
    └── opt
        └── test.txt
        
# 拷贝目录会报错
[root@ansible ~]# ansible dbs -m fetch -a 'src=/opt/ dest=./'
10.0.0.7 | FAILED! => {
    "changed": false,
    "file": "/opt/",
    "msg": "remote file is a directory, fetch cannot work on directories"
}
10.0.0.27 | FAILED! => {
    "changed": false,
    "file": "/opt/",
    "msg": "remote file is a directory, fetch cannot work on directories"
}
10.0.0.17 | FAILED! => {
    "changed": false,
    "file": "/opt/",
    "msg": "remote file is a directory, fetch cannot work on directories"
}
```





### file

- 管理远程主机的文件或目录（创建、删除、属性修改）

```sh
path # 
state # 要执行的操作，touch创建文件，directory创建目录，absent删除文件，link创建软链接，
owner # 
group # 
src #
dest # 
```

```bash
#创建文件
ansible dbs -m file -a 'path=/opt/test.txt state=touch'

#删除文件
ansible dbs -m file -a 'path=/opt/test.txt state=absent'

#设置文件的用户为 james 组为 azheng
ansible dbs -m file -a 'path=/opt/test.txt owner=james group=azheng'

#创建目录，并将目录的所有者设为James，权限设为755
ansible dbs -m file -a 'path=/opt/testdir state=directory owner=james mode=755'

#删除目录
ansible dbs -m file -a 'path=/opt/testdir state=absent'

#创建软连接
ansible dbs -m file -a 'src=/etc/passwd dest=/opt/passwd-link state=link'
```



### archive

- 打包压缩，结果会保存在被管理节点

```sh
format # 压缩格式，支持bz2, gz, tar, xz, zip，默认gz
```

- 将远程主机的/var/log目录压缩到/opt/log.tar.gz，压缩格式为gz，并将压缩后的文件所有者设为nobody，权限设为000

```sh
# ansible webs -m archive -a 'path=/var/log dest=/opt/log.tar.gz format=gz owner=nobody mode=000'

# ansible webs -a 'ls -l /opt '
10.0.0.28 | CHANGED | rc=0 >>
total 812
---------- 1 nobody root 830804 Mar 31 18:15 log.tar.gz
10.0.0.18 | CHANGED | rc=0 >>
total 1236
---------- 1 nobody root 1265292 Mar 31 18:15 log.tar.gz

# ansible webs -a 'file /opt/log.tar.gz '
10.0.0.18 | CHANGED | rc=0 >>
/opt/log.tar.gz: gzip compressed data, was "/opt/log.tar", last modified: Fri Mar 31 10:15:47 2023, max compression, original size 15749120
10.0.0.28 | CHANGED | rc=0 >>
/opt/log.tar.gz: gzip compressed data, was "/opt/log.tar", last modified: Fri Mar 31 10:15:47 2023, max compression, original size 11489280
```

- 压缩成bz2格式

```sh
# ansible webs -m archive -a 'path=/var/log/ dest=/data/log.tar.bz2 format=bz2 mode=0600'


# ansible webs -a 'ls -l /data/log.tar.bz2 ; file /data/log.tar.bz2'
10.0.0.18 | CHANGED | rc=0 >>
-rw------- 1 root root 793523 Mar 31 18:19 /data/log.tar.bz2
/data/log.tar.bz2: bzip2 compressed data, block size = 900k
10.0.0.28 | CHANGED | rc=0 >>
-rw------- 1 root root 586244 Mar 31 18:19 /data/log.tar.bz2
/data/log.tar.bz2: bzip2 compressed data, block size = 900k
```



### unarchive

- 解包、解压缩

- 两种工作模式：

  - 将ansible主机上的压缩包传到远程主机后解压缩至特定目录，设置copy=yes

  - 将远程主机上的某个压缩包解压缩到指定路径下，设置copy=no 


```sh
copy # 默认为yes，当copy=yes，拷贝的文件是从ansible主机复制到远程主机上，如果设置为copy=no，会在远程主机上寻找src源文件

remote_src # 和copy功能恰好相反，因此一般使用copy；和copy功能一样且互斥，yes表示在远程主机，不在ansible主机，no表示文件在ansible主机上

src # 源路径，可以是：ansible主机上的路径（需copy=yes），远程主机上的路径（需copy=no），远程URL的路径（需copy=no）

dest # 远程主机上的目标路径

mode # 设置解压缩后的文件权限

owner # 设置解压后的文件所有者

group # 设置解压后的文件所属组
```


- 将远程主机中的/opt/etc.gz压缩文件解压到~/家目录中，并设置权限为400

```sh
ansible dbs -m unarchive -a 'src=/opt/etc.gz dest=~/ copy=no mode=400'
```

- 将ansible主机中的/opt/etc.gz压缩文件解压到远程主机的家目录中，并设置权限为400
- 因为copy=yes是默认值，所以不用写

```sh
[root@ansible opt]# pwd
/opt

[root@ansible opt]# ls
etc.gz

[root@ansible opt]# ansible 10.0.0.27 -m unarchive -a 'src=/opt/etc.gz dest=~/ mode=400'

[root@ansible opt]# ansible 10.0.0.27 -a 'ls -l ~/'
10.0.0.27 | CHANGED | rc=0 >>
total 12
dr-------- 84 root root 8192 Dec 11 21:25 etc
```

- 将网络上的压缩包下载并解压到 data 目录中

```sh
ansible all -m unarchive -a 'src=https://example.com/example.zip dest=/data copy=no'
```





### hostname

- 管理主机名，通常都是**针对某一台机器来设置，以免所有机器都改成相同的主机名**

```sh
[root@ansible ~]# ansible dbs -a 'hostname'
10.0.0.17 | CHANGED | rc=0 >>
17
10.0.0.27 | CHANGED | rc=0 >>
27
10.0.0.7 | CHANGED | rc=0 >>
localhost.localdomain

[root@ansible ~]# ansible dbs -m hostname -a 'name=dbserver'
...

[root@ansible ~]# ansible dbs -a 'hostname'
10.0.0.7 | CHANGED | rc=0 >>
dbserver
10.0.0.17 | CHANGED | rc=0 >>
dbserver
10.0.0.27 | CHANGED | rc=0 >>
dbserver

```



### cron

- 定义计划任务

```sh
minute # 分钟
hour # 小时
day # 日
month # 月
weekday # 星期

job # 执行的命令

name # 计划任务的名字（体现在计划任务的备注上）

state=absent # 删除
```


- 每周一至周五的凌晨2点30分执行备份脚本

```sh
# ansible 10.0.0.18 -m cron -a 'hour=2 minute=30 weekday=1-5 name="backup mysql" job=/root/mysql_backup.sh'
...


# ansible 10.0.0.18 -a 'crontab -l'
10.0.0.18 | CHANGED | rc=0 >>
#Ansible: backup mysql
30 2 * * 1-5 /root/mysql_backup.sh


# ansible 10.0.0.18 -a 'cat /var/spool/cron/root'
10.0.0.18 | CHANGED | rc=0 >>
#Ansible: backup mysql
30 2 * * 1-5 /root/mysql_backup.sh
```

- 每5分钟执行一次时间同步

```sh
ansible websrvs -m cron -a "minute=*/5 job='/usr/sbin/ntpdate ntp.aliyun.com &>/dev/null' name=Synctime"
```

- 禁用计划任务

```sh
ansible websrvs -m cron -a "minute=*/5 job='/usr/sbin/ntpdate 172.20.0.1 &>/dev/null' name=Synctime disabled=yes"
```

- 启用计划任务

```sh
ansible websrvs -m cron -a "minute=*/5 job='/usr/sbin/ntpdate 172.20.0.1 &>/dev/null' name=Synctime disabled=no"
```

- 删除任务

```sh
ansible websrvs -m cron -a "name='backup mysql' state=absent"

ansible websrvs -m cron -a 'state=absent name=Synctime'
```



### yum

- 管理软件包，只支持RHEL，CentOS，fedora，不支持Ubuntu其它版本


- 安装包

```sh
ansible websrvs -m yum -a 'name=httpd state=present'
```

- 同时安装两个包

```sh
ansible dbs -m yum -a 'name=tcpdump,iotop'
```

- 卸载包

```sh
ansible websrvs -m yum -a 'name=httpd state=absent'
```



### apt

- 管理软件包，只支持Ubuntu等相关分支版本



### service

- 管理服务



- 启动 httpd 服务，并将其设为开机自启动

```sh
ansible all -m service -a 'name=httpd state=started enabled=yes'
```

- 停止 httpd 服务

```sh
ansible all -m service -a 'name=httpd state=stopped'
```

- 重新 httpd 加载服务

```sh
ansible all -m service -a 'name=httpd state=reloaded'
```

- 使用 shell 模块修改 httpd 配置文件，然后使用 service 模块重新加载服务使其生效

```sh
ansible all -m shell -a "sed -i 's/^Listen 80/Listen 8080/' /etc/httpd/conf/httpd.conf"

ansible all -m service -a 'name=httpd state=restarted'
```



### user

- 管理用户

```sh
name=mysql 
shell=/sbin/nologin
system=yes
group=mysql
uid=306
home=/data/mysql
create_home=no  
```



- 创建用户

```sh
ansible all -m user -a 'name=user1 comment="test user" uid=2048 home=/app/user1  group=root'
```

- 创建用户

```sh
ansible all -m user -a 'name=nginx comment=nginx uid=88 group=nginx  groups="root,daemon" shell=/sbin/nologin system=yes create_home=no home=/data/nginx non_unique=yes'
```

- 删除用户

```sh
# remove=yes表示删除用户及家目录等数据,默认remove=no
ansible all -m user -a 'name=nginx state=absent remove=yes'
```



### group

- 管理组



- 创建组

```sh
ansible websrvs -m group  -a 'name=nginx gid=88 system=yes'
```

- 删除组

```sh
ansible websrvs -m group  -a 'name=nginx state=absent'
```



### lineinfile

- 相当于sed，可以修改文件内容

- ansible在使用sed进行替换时，经常会遇到需要转义的问题，而且ansible在遇到特殊符号进行替换时，存在问题，无法正常进行替换 。其实在ansible自身提供了两个模块：lineinfile模块和replace模块，可以方便的进行替换


- 1

```sh
# ansible 10.0.0.18 -a 'cat /opt/config'
10.0.0.18 | CHANGED | rc=0 >>
SELINUX=disabled


# ansible 10.0.0.18 -m lineinfile -a "path=/opt/config regexp='^SELINUX=' line='SELINUX=enable'"
10.0.0.18 | CHANGED => {
    "ansible_facts": {
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "backup": "",
    "changed": true,
    "msg": "line replaced"
}


# ansible 10.0.0.18 -a 'cat /opt/config'
10.0.0.18 | CHANGED | rc=0 >>
SELINUX=enable
```

- 2

```sh
ansible all -m lineinfile -a "path=/etc/selinux/config regexp='^SELINUX='  line='SELINUX=disabled'"
```

- 删除\#开头的行

```sh
ansible all -m lineinfile  -a 'dest=/etc/fstab state=absent regexp="^#"'
```

- 4

```sh
ansible websrvs -m lineinfile -a "path=/etc/httpd/conf/httpd.conf regexp='^Listen' line='Listen 80'"
```



### replace

- **建议使用**，该模块有点类似于sed命令，主要也是基于正则进行匹配和替换

```sh
path # 远程文件路径
regexp # 匹配的正则表达式
replace # 替代的值
```



- 1

```sh
# ansible 10.0.0.18 -a 'cat /opt/config'
10.0.0.18 | CHANGED | rc=0 >>
SELINUX=enable

# ansible 10.0.0.18 -m replace -a "path=/opt/config regexp='^(SELINUX=).*' replace='\1disable'"
...

# ansible 10.0.0.18 -a 'cat /opt/config'
10.0.0.18 | CHANGED | rc=0 >>
SELINUX=disable
```

- 2

```sh
# ansible 10.0.0.18 -a 'cat /opt/config'
10.0.0.18 | CHANGED | rc=0 >>
SELINUX=disable

# ansible 10.0.0.18 -m replace -a "path=/opt/config regexp='^(SELINUX=.*)' replace='#\1'"
...

# ansible 10.0.0.18 -a 'cat /opt/config'
10.0.0.18 | CHANGED | rc=0 >>
#SELINUX=disable
```

- 3

```sh
ansible all -m replace -a "path=/etc/fstab regexp='^(UUID.*)' replace='#\1'"  
```

- 4

```sh

ansible all -m replace -a "path=/etc/fstab regexp='^#(.*)' replace='\1'"
```



### setup

- setup 模块来收集主机的系统信息，这些 facts 信息可以直接以变量的形式使用



- 显示主机的所有信息

```sh
ansible all -m setup
```

- 显示独立的信息

```sh
ansible all -m setup -a "filter=ansible_nodename"
ansible all -m setup -a "filter=ansible_hostname"
ansible all -m setup -a "filter=ansible_domain"
ansible all -m setup -a "filter=ansible_memtotal_mb"
ansible all -m setup -a "filter=ansible_memory_mb"
ansible all -m setup -a "filter=ansible_memfree_mb"
ansible all -m setup -a "filter=ansible_os_family"
ansible all -m setup -a "filter=ansible_distribution_major_version"
ansible all -m setup -a "filter=ansible_distribution_version"
ansible all -m setup -a "filter=ansible_processor_vcpus"
ansible all -m setup -a "filter=ansible_all_ipv4_addresses"
ansible all -m setup -a "filter=ansible_architecture"
ansible all -m setup -a "filter=ansible_processor*"
```

- 取python版本

```sh
[root@ansible ~]# ansible all -m setup -a 'filter=ansible_python_version'
10.0.0.7 | SUCCESS => {
    "ansible_facts": {
        "ansible_python_version": "2.7.5",
        "discovered_interpreter_python": "/usr/bin/python"
   },
    "changed": false
}
10.0.0.6 | SUCCESS => {
    "ansible_facts": {
        "ansible_python_version": "2.6.6",
        "discovered_interpreter_python": "/usr/bin/python"
   },
    "changed": false
}
10.0.0.8 | SUCCESS => {
    "ansible_facts": {
        "ansible_python_version": "3.6.8",
        "discovered_interpreter_python": "/usr/libexec/platform-python"
   },
    "changed": false
}
```

- 取所有IP

```sh
# ansible 10.0.0.18 -a 'ip a'
10.0.0.18 | CHANGED | rc=0 >>
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:cc:e7:b6 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.18/24 brd 10.0.0.255 scope global noprefixroute eth0
       valid_lft forever preferred_lft forever
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:cc:e7:c0 brd ff:ff:ff:ff:ff:ff
    inet 10.0.0.214/24 brd 10.0.0.255 scope global dynamic noprefixroute eth1
       valid_lft 720sec preferred_lft 720sec
    inet6 fe80::5d55:6ec0:b164:d5d1/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever


# ansible 10.0.0.18 -m setup -a 'filter=ansible_all_ipv4_addresses'
10.0.0.18 | SUCCESS => {
    "ansible_facts": {
        "ansible_all_ipv4_addresses": [
            "10.0.0.214",
            "10.0.0.18"
        ],
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false
}
```

- 取默认IP地址等信息

```sh
# ansible webs --list
  hosts (2):
    10.0.0.18
    10.0.0.28


# ansible 10.0.0.18 -m setup -a 'filter="ansible_default_ipv4"'
10.0.0.18 | SUCCESS => {
    "ansible_facts": {
        "ansible_default_ipv4": {
            "address": "10.0.0.18",
            "alias": "eth0",
            "broadcast": "10.0.0.255",
            "gateway": "10.0.0.2",
            "interface": "eth0",
            "macaddress": "00:0c:29:cc:e7:b6",
            "mtu": 1500,
            "netmask": "255.255.255.0",
            "network": "10.0.0.0",
            "type": "ether"
        },
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false
}



# ansible webs -m setup -a 'filter="ansible_default_ipv4"'
10.0.0.28 | SUCCESS => {
    "ansible_facts": {
        "ansible_default_ipv4": {
            "address": "10.0.0.28",
            "alias": "eth0",
            "broadcast": "10.0.255.255",
            "gateway": "10.0.0.2",
            "interface": "eth0",
            "macaddress": "00:0c:29:92:17:a7",
            "mtu": 1500,
            "netmask": "255.255.0.0",
            "network": "10.0.0.0",
            "type": "ether"
        },
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false
}
10.0.0.18 | SUCCESS => {
    "ansible_facts": {
        "ansible_default_ipv4": {
            "address": "10.0.0.18",
            "alias": "eth0",
            "broadcast": "10.0.0.255",
            "gateway": "10.0.0.2",
            "interface": "eth0",
            "macaddress": "00:0c:29:cc:e7:b6",
            "mtu": 1500,
            "netmask": "255.255.255.0",
            "network": "10.0.0.0",
            "type": "ether"
        },
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false
}

```



# Ansible Playbook

- Ansible 的 playbook 基于 YAML 语言编写
- 一个 playbook 中至少需包括 hosts 和 tasks，而 tasks 中至少包含一个 name 和所调用的模块

**ShellScripts VS Playbook**

- SHELL脚本实现

```yaml
#!/bin/bash
# 安装Apache
yum install --quiet -y httpd 
# 复制配置文件
cp /tmp/httpd.conf /etc/httpd/conf/httpd.conf
cp/tmp/vhosts.conf /etc/httpd/conf.d/
# 启动Apache，并设置开机启动
systemctl enable --now httpd 
```

- Playbook实现

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: "安装Apache"
      yum: name=httpd
    - name: "复制配置文件"
      copy: src=/tmp/httpd.conf dest=/etc/httpd/conf/
    - name: "复制配置文件"
      copy: src=/tmp/vhosts.conf dest=/etc/httpd/conf.d/
    - name: "启动Apache，并设置开机启动"
      service: name=httpd state=started enabled=yes
```



## hosts

- hosts 用于指定要执行指定任务的主机，须事先定义在主机清单中
- 与 ansible 命令中 host-pattern 定义的方式一致

### 范例

```yaml
- hosts: websrvs:appsrvs
```



## remote_user

- remote_user 用于指定执行 tasks 时所使用的用户，可用于 hosts 和 tasks 中

### 范例

- 全局指定以 root 身份在远程主机执行任务（但默认就是以 root，所以可以不写）

```yaml
- hosts: websrvs
  remote_user: root

  tasks:
    - name: test connection
      ping:
```

- 在某个 task 中以 azheng 身份执行任务

```yaml
- hosts: websrvs
  remote_user: root

  tasks:
    - name: test connection
      ping:
      remote_user: azheng # 在某个 task 中以 azheng 身份执行任务
```

- 也可以通过指定其通过 sudo 的方式在远程主机上执行任务
  - 其可用于全局或某任务
- 此外，甚至可以在 sudo 时使用 sudo_user 指定 sudo 时切换的用户

```yaml
- hosts: websrvs
  remote_user: root

  tasks:
    - name: test connection
      ping:
      remote_user: james
      sudo: yes # 默认sudo为root
      sudo_user: azheng    # sudo为azheng
```



## gather_facts

- playbook 默认会使用 setup 模块收集主机信息，但是如果主机较多，会影响执行速度

```sh
# vim test.yml
- hosts: webs
  remote_user: root
  tasks:
    - name: 测试主机连通性
      ping:


# ansible-playbook test.yaml 
...
TASK [Gathering Facts] # 默认会开启 gather_facts 来收集系统信息
ok: [10.0.0.28]
ok: [10.0.0.18]
...
```

- 可以使用 gather_facts: no 来禁止 Ansible 收集 facts 信息，前提是没有使用到 setup 模块

```yaml
# vim test.yml
- hosts: webs
  remote_user: root
  gather_facts: no
  tasks:
    - name: 测试主机连通性
      ping:
```



## tasks & action

- play 的主体部分是 task list，task list 中有一个或多个 task，各个 task 按次序逐个在 hosts 中指定的所有主机上执行，即在所有主机上完成第一个 task 后，再开始第二个task。
- task 的目的是使用指定的参数执行模块，而在模块参数中可以使用变量。
  - 模块执行是幂等的，这意味着多次执行是安全的，因为其结果均一致
- 每个 task 都应该有其 name，用于 playbook 的执行结果输出，建议其内容能清晰地描述任务执行步骤。
  - name 可以使用中文
  - 如果未提供 name，则 action 的结果将用于输出

- tasks两种格式：

  - ```yaml
    action: module arguments
    module: arguments   #建议使用
    ```

### 范例

- 1

```yaml
---
- hosts: websrvs
  remote_user: root
  tasks:
    - name: install httpd
      yum: name=httpd 
    - name: start httpd
      service: name=httpd state=started enabled=yes
```

- shell和command模块后面跟命令，而非key=value

```yaml
# vim test.yaml
- hosts: webs
  remote_user: root
  tasks:
    - name: 打印当前所在目录和系统运行时间
      shell: pwd;uptime



# 但结果不会再屏幕上输出
# ansible-playbook test.yaml 

PLAY [webs] ***********************************

TASK [Gathering Facts] ************************
ok: [10.0.0.28]
ok: [10.0.0.18]

TASK [打印当前所在目录和系统运行时间] ***********
changed: [10.0.0.28]
changed: [10.0.0.18]

PLAY RECAP ************************************
10.0.0.18                  : ok=2    changed=1 
10.0.0.28                  : ok=2    changed=1  。。。。。
```



## handlers & notify

- handlers 与 notify 结合使用，由特定条件触发的操作，满足条件方才执行，否则不执行
- **handlers：**
  - Handlers 本质是 task list ，类似于 MySQL 中的触发器触发的行为；
  - 其中的 task 与前述的 task 并没有本质上的不同，主要用于当关注的资源发生变化时，才会采取一定的操作

- **notify：**
  - 而 Notify 对应的 action 可用于在每个 play 的最后被触发，这样可避免多次有改变发生时每次都执行指定的操作，仅在所有的变化发生完成后一次性地执行指定操作

- **handlers & notify 流程说明：**
  - 某任务的状态在运行后为 changed 时，可通过 notify 通知给相应的 handlers，最后 handlers 执行对应的操作

- **handlers & notify 常用场景：**
  - handlers 与 notify 一般用于重复修改配置文件后， 因为 ansible 的幂等性的原因，而导致后面的重载配置文件等操作无法生效的问题
  - 通常，handler 多用于重新启动主机和重新启动服务。

- **handlers & notify 注意事项：**
  - 如果一个或多个任务都调用同一个 handler 程序，它将在剧中的所有其他任务完成后**仅运行一次**。



### 范例

- 如果nginx.conf发生修改，则执行重启Nginx的handlers

```yaml
# vim test.yaml
- hosts: webs
  remote_user: root
  gather_facts: no
  tasks:
    - name: 安装Nginx
      yum: name=nginx state=present
    - name: 拷贝配置文件
      copy: src="files/nginx.conf" dest="/etc/nginx/"
      notify: 重启Nginx # 如果nginx.conf发生修改，则执行重启Nginx的handlers
    - name: 启动Nginx
      service: name=nginx state=started enabled=yes
  handlers:
    - name: 重启Nginx
      service: name=nginx state=restarted


# 列出playbook中执行的主机
# ansible-playbook --list-hosts test.yaml 

playbook: test.yaml

  play #1 (webs): webs	TAGS: []
    pattern: ['webs']
    hosts (2):
      10.0.0.18
      10.0.0.28


# 只针对某个主机执行
# ansible-playbook --limit 10.0.0.18 test.yaml
...


# 测试
# curl 10.0.0.18
...
        <h1>Welcome to <strong>nginx</strong> on Red Hat Enterprise Linux!</h1>
...



# 修改本地的配置文件后，再次执行会调用handlers来重启nginx使配置文件生效
# grep listen files/nginx.conf
        listen       80 default_server;
...
# sed -ri "s/( +listen +)80( default_server;)/\18080\2/" files/nginx.conf
# grep listen files/nginx.conf
        listen       8080 default_server;
...


# 只针对某个主机执行
# ansible-playbook --limit 10.0.0.18 test.yaml
...
RUNNING HANDLER [重启Nginx] ***... # 触发了handlers
changed: [10.0.0.18]


# 再次测试
# curl 10.0.0.18:8080
...
        <h1>Welcome to <strong>nginx</strong> on Red Hat Enterprise Linux!</h1>
...
```

- 拷贝完nginx配置文件后对nginx执行handlers中定义的重启以及检查nginx进程操作

```yaml
- hosts: websrvs
  remote_user: root
  gather_facts: no 
  tasks:
    - name: add group nginx
      user: name=nginx state=present
    - name: add user nginx
      user: name=nginx state=present group=nginx
    - name: Install Nginx
      yum: name=nginx state=present
    - name: config 
      copy: src=/root/config.txt dest=/etc/nginx/nginx.conf
      notify:
        - Restart Nginx
        - Check Nginx Process
   handlers:
     - name: Restart Nginx
       service: name=nginx state=restarted enabled=yes
     - name: Check Nginx process
       shell: killall -0 nginx &> /tmp/nginx.log
```



## tags

- 在 playbook 文件中，可以利用 tags 组件，为特定 task 指定标签
- 当在执行 playbook 时，可以只执行特定 tags 的 task，而非整个 playbook 文件
  - `ansible-playbook -t`

- ansible具有幂等性，因此会自动跳过没有变化的部分，即便如此，有些代码为测试其确实没有发生变化的时间依然会非常地长。此时，如果确信其没有变化，就可以通过tags跳过此些代码片断

### 范例

```yaml
# vim httpd.yml
- hosts: websrvs
  remote_user: root
  gather_facts: no
  tasks:
    - name: Install httpd
      yum: name=httpd state=present
    - name: Install configure file
      copy: src=files/httpd.conf dest=/etc/httpd/conf/
      tags: conf
    - name: start httpd service
      tags: service
      service: name=httpd state=started enabled=yes


# 只执行conf和service标签中的tasks
# ansible-playbook –t conf,service httpd.yml
```



## variables

- 在 playbook 中可以使用内置变量或自定义变量

- 变量定义：（变量名仅能由字母、数字和下划线组成，且只能以字母开头）

  - ```sh
    variable=value
    
    # 范例
    http_port=80
    ```


- 变量引用：
  - 通过{{ variable_name }} 调用变量，且变量名前后建议加空格，有时用"{{ variable_name }}"才生效



### playbook 文件中定义变量

```yaml
vars:
  - var1: value1
  - var2: value2
```

#### 范例

- 范例一

```yaml
# vim test.yaml
- hosts: webs
  remote_user: root
  vars: # 定义变量
    collect_info: "/data/test/{{ansible_default_ipv4['address']}}/"
  tasks:
    - name: create IP directory
      file: name="{{collect_info}}" state=directory


# ansible 10.0.0.18 -a 'ls /data/test/ -l'
10.0.0.18 | CHANGED | rc=0 >>
total 0
drwxr-xr-x 2 root root 6 Apr  1 19:03 10.0.0.214
```

- 范例二

```sh
# vim var3.yml 
- hosts: all
  vars:
    - var1: value1
    - var2: value2
  tasks:
    - name: 创建日志文件1
      file: path=/opt/{{ var1 }}.log state=touch mode=000 
    - name: 创建日志文件2
      file: path=/opt/{{ var2 }}.log state=touch mode=000


# ansible-playbook var3.yml 


# ansible webs -a 'ls -l /opt/'
10.0.0.17 | CHANGED | rc=0 >>
total 0
---------- 1 root root 0 Dec 12 18:59 value1.log
---------- 1 root root 0 Dec 12 18:59 value2.log
...
```



### 定义独立的变量文件

- 可以在一个独立的 playbook 文件中定义变量，在另一个 playbook 文件中引用变量文件中的变量，比playbook 中定义的变量优化级高

```yaml
- hosts: all
  vars_files:
    - vars.yml
```

#### 范例

- 将变量文件单独存放

```yaml
# 定义变量文件
# vim vars.yml
# variables file
package_name: mariadb-server
service_name: mariadb


# 引用变量文件
# vim var5.yml
# install package and start service
- hosts: dbsrvs
  remote_user: root
  vars_files: # 引用变量文件
    - vars.yml
  tasks:
    - name: install package
      yum: name={{ package_name }}
      tags: install
    - name: start service
      service: name={{ service_name }} state=started enabled=yes
```

- 将变量也存放在同一个文件，但需要使用\---进行分割

```yaml
# vim vars2.yml
var1: httpd
var2: nginx


# var6.yml
- hosts: web
  remote_user: root
  vars_files:
    - vars2.yml
  tasks:
    - name: create httpd log
      file: name=/app/{{ var1 }}.log state=touch
    - name: create nginx log
      file: name=/app/{{ var2 }}.log state=touch
```

- 将变量也存放在同一个文件，但需要使用\---进行分割（这种方法行吗？？）

```yaml
# vim vars2.yml
var1: httpd
var2: nginx

---

- hosts: web
  remote_user: root
  vars_files:
    - vars2.yml
  tasks:
    - name: create httpd log
      file: name=/app/{{ var1 }}.log state=touch
    - name: create nginx log
      file: name=/app/{{ var2 }}.log state=touch
```



### 从 setup 模块中获取变量

- setup 模块中的值可以通过 {{ }} 直接调用，不需要额外指定 setup 模块

#### 范例

- 变量输出单一的情况

```yaml
# ansible 10.0.0.18 -m setup -a 'filter="ansible_nodename"'
10.0.0.18 | SUCCESS => {
    "ansible_facts": {
        "ansible_nodename": "18",
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false
}


# vim test.yml
- hosts: webs
  remote_user: root
  gather_facts: yes # 需开启此选项才能从 setup 模块中获取值，此选项默认就是yes
  tasks:
    - name: 创建日志文件
      file: name=/data/{{ ansible_nodename }}.log state=touch owner=nobody mode=600


# ansible-playbook --limit 10.0.0.18 test.yaml
...


# ansible 'webs:!10.0.0.28' -a 'ls -l /data/*.log'
10.0.0.18 | CHANGED | rc=0 >>
-rw------- 1 nobody root 0 Apr  1 18:47 /data/18.log
```

- 变量输出多个指标时，取单一指标；
- 并且 setup 变量的值还可以被其他变量所引用

```yaml
# ansible 10.0.0.18 -m setup -a 'filter="ansible_default_ipv4"'
10.0.0.18 | SUCCESS => {
    "ansible_facts": {
        "ansible_default_ipv4": {
            "address": "10.0.0.214",
            "alias": "eth1",
            "broadcast": "10.0.0.255",
            "gateway": "10.0.0.2",
            "interface": "eth1",
            "macaddress": "00:0c:29:cc:e7:c0",
            "mtu": 1500,
            "netmask": "255.255.255.0",
            "network": "10.0.0.0",
            "type": "ether"
        },
        "discovered_interpreter_python": "/usr/libexec/platform-python"
    },
    "changed": false
}


# 不进行过滤的话，会将全部输出结果定向到文件当中
# ansible 'webs:!10.0.0.28' -a 'ls -l /data/'
10.0.0.18 | CHANGED | rc=0 >>
total 784
-rw------- 1 nobody root      0 Apr  1 18:50 {'gateway': '10.0.0.2', 'interface': 'eth1', 'address': '10.0.0.214', 'broadcast': '10.0.0.255', 'netmask': '255.255.255.0', 'network': '10.0.0.0', 'macaddress': '00:0c:29:cc:e7:c0', 'mtu': 1500, 'type': 'ether', 'alias': 'eth1'}.txt


# 使用 [' '] 进行过滤
# vim test.yaml
- hosts: webs
  remote_user: root
  vars:
    collect_info: "/data/test/{{ansible_default_ipv4['address']}}/"
  tasks:
    - name: create IP directory
      file: name="{{collect_info}}" state=directory


# ansible 10.0.0.18 -a 'ls /data/test/ -l'
10.0.0.18 | CHANGED | rc=0 >>
total 0
drwxr-xr-x 2 root root 6 Apr  1 19:03 10.0.0.214
```











### 通过命令行指定变量

- 通过命令行指定变量，优先级最高

```sh
ansible-playbook -e varname=value test.yml
```

#### 范例

```sh
# vim var2.yml
---
- hosts: all
  tasks:
    - name: 创建日志文件
      file: path=/opt/{{ logname }}.log state=touch mode=000


# ansible-playbook -e logname=testlog var2.yml 


# ansible webs -a 'ls -l /opt/'
10.0.0.7 | CHANGED | rc=0 >>
total 0
---------- 1 root root 0 Dec 13 01:18 testlog.log
...
```







### 主机清单文件中定义变量

- 在 /etc/ansible/hosts 中定义

- 变量类型：

  - 主机变量：主机组中主机单独定义，优先级高于公共变量

    - ```sh
      [websrvs]
      www1.magedu.com http_port=80 maxRequestsPerChild=808
      www2.magedu.com http_port=8080 maxRequestsPerChild=909
      ```

  - 公共变量：针对主机组中所有主机定义统一变量

    - ```sh
      [websrvs]
      www1.magedu.com http_port=8080 # 更优先
      www2.magedu.com
      
      [websrvs:vars] # 针对websrvs主机组设置公共变量
      http_port=80
      ntp_server=ntp.magedu.com
      nfs_server=nfs.magedu.com
      ```


#### 范例

```sh
# vim /etc/ansible/hosts
[webs]
10.0.0.18 hname=www1 domain=azheng.io
10.0.0.28 hname=www2

[webs:vars]
mark="-"
domain=azheng.org


# ansible webs -m hostname -a 'name={{ hname }}{{ mark }}{{ domain }}'
...
# ansible webs -a 'hostname'
10.0.0.18 | CHANGED | rc=0 >>
www1-azheng.io
10.0.0.28 | CHANGED | rc=0 >>
www2-azheng.org


# 命令行指定变量最优先
# ansible webs -e domain=azheng.cn -m hostname -a 'name={{ hname }}{{ mark }}{{ domain }}'
# ansible webs -a 'hostname'
10.0.0.28 | CHANGED | rc=0 >>
www2-azheng.cn
10.0.0.18 | CHANGED | rc=0 >>
www1-azheng.cn
```



### 在role中定义



## templates

- Templates 模板是一个文本文件，可以做为生成文件的模版，并且**模板文件中还可嵌套jinja语法**

  - Templates 本身是由 Templates  模块提供的功能

- template 文件必须存放于 templates 目录下，且命名为 .j2 结尾，并且 yaml/yml 文件需和 templates 目录平级，目录结构如下示例：

  - ```sh
    ./
    ├── temnginx.yml
    └── templates
           └── nginx.conf.j2           
    ```


### 范例：模板初步使用

- 利用 template 同步 nginx 配置文件

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# vim templates/nginx.conf.j2 
server {
  listen  80;
}


# vim test.yaml
- hosts: webs
  remote_user: root
  tasks:
    - name: template config to remote hosts
      template: src=nginx.conf.j2 dest=/data/nginx.conf # dest中的目录不会自动创建，因此需事先创建


# ansible-playbook test.yaml
...


# ansible webs -a 'cat /data/nginx.conf'
10.0.0.28 | CHANGED | rc=0 >>
server {
  listen  80;
}
...
```

### 范例：变量替换

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# vim templates/nginx.conf.j2 
worker_processes {{ ansible_processor_vcpus }}; # 模板文件中调用变量，实现自动生成


# vim test.yaml
- hosts: webs
  remote_user: root
  tasks:
    - name: install nginx
      yum: name=nginx
    - name: template config to remote hosts
      template: src=nginx.conf.j2 dest=/etc/nginx/nginx.conf 
    - name: start service
      service: name=nginx state=started enabled=yes
```

### 范例：算数运算

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# vim templates/nginx.conf.j2 
worker_processes {{ ansible_processor_vcpus**3 }}; # 模板文件中调用变量，再利用算术运算
worker_processes {{ ansible_processor_vcpus**2 }};    
worker_processes {{ ansible_processor_vcpus+2 }};


# vim test.yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: install nginx
      yum: name=nginx
    - name: template config to remote hosts
      template: src=nginx.conf.j2 dest=/etc/nginx/nginx.conf
      notify: restart nginx
    - name: start service
      service: name=nginx state=started enabled=yes
  handlers:
    - name: restart nginx
      service: name=nginx state=restarted
```

### 范例：for 循环

#### 范例1：正常循环

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# vim test.yaml
---
- hosts: websrvs
  remote_user: root
  vars:
    nginx_vhosts:
      - 81
      - 82
      - 83
  tasks:
   - name: template config
     template: src=nginx.conf.j2 dest=/data/nginx.conf


# 和shell中的for循环非常类似
# vim templates/nginx.conf.j2 
{% for vhost in nginx_vhosts %} # 循环定义
server {
    listen {{ vhost }}
}
{% endfor %} # 循环结束


# 生成的结果
server {
    listen 81   
}
server {
    listen 82   
}
server {
    listen 83   
}
```

#### 范例2：选择某个变量

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# vim test.yaml
- hosts: websrvs
  remote_user: root
  vars:
    nginx_vhosts:
      - listen: 8080
  tasks:
    - name: config file
      template: src=nginx.conf3.j2 dest=/data/nginx3.conf


# templates/nginx.conf.j2
{% for vhost in nginx_vhosts %}   
server {
 listen {{ vhost.listen }} # 选择变量中某个键的值
}
{% endfor %}


# templates/nginx.conf.j2 其实就相当于
server {
 listen {{ listen }}
}


#生成的结果
server {
 listen 8080
}
```



#### 范例3：选择某些变量

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# vim test.yaml
- hosts: websrvs
  remote_user: root
  vars:
    nginx_vhosts:
      - listen: 8080
        server_name: "web1.magedu.com"
        root: "/var/www/nginx/web1/"
      - listen: 8081
        server_name: "web2.magedu.com"
        root: "/var/www/nginx/web2/"
      - {listen: 8082, server_name: "web3.magedu.com", root: "/var/www/nginx/web3/"}
  tasks:
    - name: template config
      template: src=nginx.conf4.j2 dest=/data/nginx4.conf


# templates/nginx.conf.j2
{% for vhost in nginx_vhosts %}
server {
   listen {{ vhost.listen }}
   server_name {{ vhost.server_name }}
   root {{ vhost.root }}  
}
{% endfor %}


# 生成的结果
server {
   listen 8080
   server_name web1.magedu.com
   root /var/www/nginx/web1/  
}
server {
   listen 8081
   server_name web2.magedu.com
   root /var/www/nginx/web2/  
}
server {
   listen 8082
   server_name web3.magedu.com
   root /var/www/nginx/web3/  
}
```



### 范例：if 条件判断

- 在模版文件中还可以使用 if条件判断，决定是否生成相关的配置信息

```yaml
# tree
.
├── templates
│   └── nginx.conf.j2
└── test.yaml


# test.yaml
- hosts: websrvs
  remote_user: root
  vars:
    nginx_vhosts:
      - web1:
        listen: 8080
        root: "/var/www/nginx/web1/"
      - web2:
        listen: 8080
        server_name: "web2.magedu.com"
        root: "/var/www/nginx/web2/"
      - web3:
        listen: 8080
        server_name: "web3.magedu.com"
        root: "/var/www/nginx/web3/"
  tasks:
    - name: template config to 
      template: src=nginx.conf.j2 dest=/data/nginx.conf


# templates/nginx.conf5.j2
{% for vhost in nginx_vhosts %}
server {
   listen {{ vhost.listen }}
   {% if vhost.server_name is defined %} # 如果server_name定义了则生成对应的配置
   server_name {{ vhost.server_name }}
   {% endif %}
   root  {{ vhost.root }}
}
{% endfor %}


# 生成的结果
server {
   listen 8080
   root /var/www/nginx/web1/
}
server {
   listen 8080
   server_name web2.magedu.com
   root /var/www/nginx/web2/
}
server {
   listen 8080
   server_name web3.magedu.com
   root /var/www/nginx/web3/
}
```



## when

- when 定义的条件成立才执行元素中的内容
- 如果需要根据变量、facts或此前任务的执行结果来做为某task执行与否的前提时要用到条件测试，通过在task后添加when子句即可使用条件测试，

### 范例1

- 当操作系统家族为RedHat才执行重启

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: "shutdown RedHat flavored systems"
      command: /sbin/shutdown -h now
      when: ansible_os_family == "RedHat" # 当操作系统家族为RedHat时
```

### 范例2

- 创建nginx组和账号、安装ningx、但系统版本为6才执行重启nginx操作

```yaml
- hosts: websrvs
  remote_user: root  
  tasks:
    - name: add group nginx
      tags: user
      user: name=nginx state=present
    - name: add user nginx
      user: name=nginx state=present group=nginx
    - name: Install Nginx
      yum: name=nginx state=present
    - name: restart Nginx
      service: name=nginx state=restarted
      when: ansible_distribution_major_version == "6" # 当系统版本为6时
```

### 范例3

- 7的模板拷贝到7，6的模板拷贝到6

```yaml
- hosts: websrvs
  remote_user: root
  tasks: 
    - name: install conf file to centos7
      template: src=nginx.conf.c7.j2 dest=/etc/nginx/nginx.conf
      when: ansible_distribution_major_version == "7"
    - name: install conf file to centos6
      template: src=nginx.conf.c6.j2 dest=/etc/nginx/nginx.conf
      when: ansible_distribution_major_version == "6"
```



## with_items

- 当有需要重复性执行的任务时，可以使用迭代机制
- 对迭代项的引用，固定变量名为"item"
- 要在 task 中使用 with_items 给定要迭代的元素列表

### 范例：批量创建用户

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: add several users
      user: name={{ item }} state=present groups=wheel # 对迭代项的引用，固定变量名为"item"
      with_items: # 要在 task 中使用 with_items 给定要迭代的元素列表
        - testuser1
        - testuser2
        - testuser3


# 上面语句的功能等同于下面的语句
    - name: add several users
      user: name=testuser1 state=present groups=wheel
    - name: add several users
      user: name=testuser2 state=present groups=wheel
    - name: add several users
      user: name=testuser3 state=present groups=wheel
```

### 范例：卸载 mariadb 

```yaml
# remove mariadb server
- hosts: appsrvs:!10.0.0.8
  remote_user: root
  tasks:
    - name: stop service
      shell: /etc/init.d/mysqld stop
    - name: delete files and dir
      file: path={{item}} state=absent
      with_items:
        - /usr/local/mysql
        - /usr/local/mariadb-10.2.27-linux-x86_64
        - /etc/init.d/mysqld
        - /etc/profile.d/mysql.sh
        - /etc/my.cnf
        - /data/mysql
    - name: delete user
      user: name=mysql state=absent remove=yes
```

### 范例：批量安装

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: install some packages
      yum: name={{ item }} state=present
      with_items:
        - nginx
        - memcached
        - php-fpm
```

### 范例：批量拷贝文件和安装应用

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: copy file
      copy: src={{ item }} dest=/tmp/{{ item }}
      with_items:
        - file1
        - file2
        - file3
     - name: yum install httpd
       yum: name={{ item }}  state=present 
       with_items:
         - apr
         - apr-util
         - httpd
```

### 范例：嵌套子变量

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: add some groups
      group: name={{ item }} state=present
      with_items:
        - nginx
        - mysql
        - apache
    - name: add some users
      user: name={{ item.name }} group={{ item.group }}  state=present
      with_items: # 嵌套子变量
       - { name: 'nginx', group: 'nginx' }
       - { name: 'mysql', group: 'mysql' }
       - { name: 'apache', group: 'apache' }
```

### 范例：嵌套子变量2.0

```yaml
- hosts: websrvs
  remote_user: root
  tasks:
    - name: add some groups
      group: name={{ item }} state=present
      with_items:
        - g1
        - g2
        - g3
    - name: add some users
      user: name={{ item.name }} group={{ item.group }} home={{item.home }} create_home=yes state=present
      with_items:
        - { name: 'user1', group: 'g1', home: '/data/user1' }
        - { name: 'user2', group: 'g2', home: '/data/user2' }
        - { name: 'user3', group: 'g3', home: '/data/user3' }
```







## playbook 综合范例

- 利用 playbook 创建 apache 用户

```yaml
- hosts: webs
  remote_user: root
  tasks:
    - {name: 创建apache组, group: name=apache gid=80 system=yes} # 字典也可以写在一行，但不直观
    - name: 创建apache用户
      user: name=apache shell=/sbin/nologin uid=80 group=apache system=yes
```

- 利用 playbook yum安装 nginx

```yaml
- hosts: all
  remote_user: root

  tasks:
    - name: 安装httpd
      yum: name=httpd
    - name: 启动httpd服务
      service: name=httpd state=started enabled=yes
```



- 。。。





# Ansible Roles

- 角色是ansible自1.2版本引入的新特性，用于层次性、结构化地组织playbook。
- roles能够根据层次型结构自动装载变量文件、tasks以及handlers等。
- 要使用roles只需要在playbook中使用include指令即可。
- 简单来讲，roles就是通过分别将变量、文件、任务、模板及处理器放置于单独的目录中，并可以便捷地include它们的一种机制。
- 角色一般用于基于主机构建服务的场景中，但也可以是用于构建守护进程等场景中





![AnsibleRoles](/docs/cicd/ansible/AnsibleRoles.png)



## Roles 目录结构和作用

- roles 默认存放的目录为 /etc/ansible/roles/，也可以自行指定

```sh
# tree /etc/ansible/roles/
/etc/ansible/roles/
└── project # 具体的项目，例如：mysql、nginx、tomcat、redis
    ├── default # 设定默认变量时使用此目录中的main.yml文件，比vars的优先级低
    ├── files # 存放由copy或script模块等调用的文件
    ├── handlers # 至少应该包含一个名为main.yml的文件；其它的文件需要在此文件中通过include进行包含
    ├── meta # 定义当前角色的特殊设定及其依赖关系,至少应该包含一个名为main.yml的文件，其它文件需在此文件中通过include进行包含
    ├── tasks # 定义task,role的基本元素，至少应该包含一个名为main.yml的文件；其它的文件需要在此文件中通过include进行包含
    ├── templates # template模块查找所需要模板文件的目录
    └── vars # 定义变量，至少应该包含一个名为main.yml的文件；其它的文件需要在此文件中通过include进行包含
    

# tree /etc/ansible/
/etc/ansible/
├── ansible.cfg
├── hosts
├── role_nginx.yml # 调用role的文件，需要与roles目录同级
└── roles # roles存放的目录
...
```

- 范例：roles的目录结构

```sh
nginx-role.yml 
roles/
└── nginx 
     ├── files
     │   
     ├── tasks
     │   ├── groupadd.yml 
     │   ├── install.yml 
     │   ├── main.yml 
     │   ├── restart.yml 
     │   └── useradd.yml 
     └── vars 
         └── main.yml
```



## 创建 Roles 的步骤

1. 创建以roles命名的目录
2. 在roles目录中分别创建以各角色名称命名的目录，如webservers等 
3. 在每个角色命名的目录中分别创建files、handlers、meta、tasks、templates和vars目录
   - 用不到的目录可以创建为空目录，也可以不创建

4. 在playbook文件中，调用各角色



## 调用 Roles 的方法

### 方法1

```yaml
- hosts: websrvs
  remote_user: root
  roles:
    - mysql
    - memcached
    - nginx
```

### 方法2

- 键role用于指定角色名称，后续的k/v用于传递变量给角色

```yaml
- hosts: all
  remote_user: root
  roles:
    - mysql
    - { role: nginx, username: nginx }
```

### 方法3

- 还可基于条件测试实现角色调用

```yaml
- hosts: all
  remote_user: root
  roles:
   - { role: nginx, username: nginx, when: ansible_distribution_major_version 
== '7' } # 当系统版本为7时才使用此角色
```

### 方法4

- 定义角色时定义标签，执行 playbook 时调用标签来指定执行的 role

```yaml
# nginx-role.yml
- hosts: websrvs
  remote_user: root
  roles:
    - { role: nginx ,tags: [ 'nginx', 'web' ] ,when: ansible_distribution_major_version == "6" }
    - { role: httpd ,tags: [ 'httpd', 'web' ] }
    - { role: mysql ,tags: [ 'mysql', 'db' ] }
    - { role: mariadb ,tags: [ 'mariadb', 'db' ] }


# ansible-playbook --tags="nginx,httpd,mysql" nginx-role.yml
```

- 1

```yaml
# vim /data/ansible/role_httpd_nginx.yml 
- hosts: websrvs
  roles:
    - {role: httpd,tags: [httpd,web], when: ansible_distribution_major_version=="7"}
    - {role: nginx,tags: [nginx,web], when: ansible_distribution_major_version=="8"}


# ansible-playbook -t nginx /data/ansible/role_httpd_nginx.yml
```





## 范例：批量部署 nginx

### 创建 Role

```sh
# 创建角色相关的目录
# mkdir -p /etc/ansible/roles/nginx/{tasks,handlers,files}
```

#### files

- files 目录存放由 copy 或 script 模块等调用的文件

```yaml
# 准备nginx二进制安装包
# wget https://nginx.org/download/nginx-1.18.0.tar.gz -P /etc/ansible/roles/nginx/files/


# 准备service模板文件
# vim /etc/ansible/roles/nginx/files/nginx.service
[Unit]
Description=nginx - high performance web server
Documentation=http://nginx.org/en/docs/
After=network-online.target remote-fs.target nss-lookup.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/apps/nginx/run/nginx.pid
ExecStart=/apps/nginx/sbin/nginx -c /apps/nginx/conf/nginx.conf
ExecReload=/bin/sh -c "/bin/kill -s HUP $(/bin/cat /apps/nginx/run/nginx.pid)"
ExecStop=/bin/sh -c "/bin/kill -s TERM $(/bin/cat /apps/nginx/run/nginx.pid)"

[Install]
WantedBy=multi-user.target
```

#### tasks

- 定义 task，role 的基本元素，至少应该包含一个名为 main.yml 的文件；其它的文件需要在此文件中通过include 进行包含

```yaml
# 创建名为 main.yml 的 task 入口文件，记录了角色的执行顺序
# vim /etc/ansible/roles/nginx/tasks/main.yml 
- include: group.yml
- include: user.yml
- include: rely.yml
- include: copy_package.yml
- include: copy_service.yml
- include: configure.yml
- include: make_install.yml
- include: ch_cnf.yml
- include: ch_mode.yml
- include: service.yml


# 创建nginx组
# vim /etc/ansible/roles/nginx/tasks/group.yml
- name: 创建nginx组
  group: name=nginx gid=80 system=yes


# 创建nginx用户
# vim /etc/ansible/roles/nginx/tasks/user.yml
- name: 创建nginx用户
  user: name=nginx uid=80 group=nginx system=yes create_home=no shell=/sbin/nologin


# 安装依赖包
# vim /etc/ansible/roles/nginx/tasks/rely.yml
- name: 安装依赖包
  yum: name=make,gcc,pcre-devel,openssl-devel,zlib-devel


# 将nginx二进制安装包拷贝并解压到目标主机（会从files目录中寻找）
# vim /etc/ansible/roles/nginx/tasks/copy_package.yml
- name: 将nginx二进制安装包拷贝并解压到目标主机
  unarchive: src=nginx-1.18.0.tar.gz dest=/usr/local/src/


# 拷贝service模板文件（会从files目录中寻找）
# vim /etc/ansible/roles/nginx/tasks/copy_service.yml
- name: 拷贝service模板文件
  copy: src=nginx.service dest=/usr/lib/systemd/system/ owner=nginx group=nginx backup=yes


# 定义编译安装选项
# vim /etc/ansible/roles/nginx/tasks/configure.yml
- name: 定义编译安装选项
  shell: cd /usr/local/src/nginx-1.18.0/ ; ./configure --prefix=/apps/nginx --user=nginx --group=nginx --with-http_ssl_module --with-http_v2_module --with-http_realip_module --with-http_stub_status_module --with-http_gzip_static_module --with-pcre --with-stream --with-stream_ssl_module --with-stream_realip_module


# 编译安装,设置软连接,创建PID目录
# vim /etc/ansible/roles/nginx/tasks/make_install.yml
- name: 编译安装, 设置软连接, 创建PID目录
  shell: "{{ item }}"
  with_items:
  - "cd /usr/local/src/nginx-1.18.0/ ; make -j {{ ansible_processor_vcpus }} && make install;"
  - "ln -s /apps/nginx/sbin/nginx /usr/sbin/;" # 此处也可以使用file模块来处理，否则会报WARNING
  - "mkdir /apps/nginx/run" # 此处也可以使用file模块来处理，否则会报WARNING


# 修改nginx配置文件中pid的存放位置
# vim /etc/ansible/roles/nginx/tasks/ch_cnf.yml
- name: 修改nginx配置文件中pid的存放位置
  replace: "path=/apps/nginx/conf/nginx.conf regexp='^#pid.*' replace='pid /apps/nginx/run/nginx.pid;'"


# 修改nginx文件权限, 重新加载nginx服务
# vim /etc/ansible/roles/nginx/tasks/ch_mode.yml
- name: 修改nginx文件权限, 重新加载nginx服务
  shell: chown -R nginx.nginx /apps/nginx/* ; systemctl daemon-reload # 此处也可以使用chown模块来处理，否则会报WARNING


# 启动nginx并设为开机启动
# vim /etc/ansible/roles/nginx/tasks/service.yml
- name: 启动nginx并设为开机启动
  service: name=nginx state=started enabled=yes


# 文件总览
# tree /etc/ansible/roles/nginx/
/etc/ansible/roles/nginx/
├── files
│   ├── nginx-1.18.0.tar.gz
│   └── nginx.service
├── handlers
└── tasks
    ├── ch_cnf.yml
    ├── ch_mode.yml
    ├── configure.yml
    ├── copy_package.yml
    ├── copy_service.yml
    ├── group.yml
    ├── main.yml
    ├── make_install.yml
    ├── rely.yml
    ├── service.yml
    └── user.yml

3 directories, 13 files
```



### 调用 Role

- **注意：调用role的文件需要与roles目录同级**

```yaml
# 调用role的文件需要与roles目录同级
# ls /etc/ansible/roles/ -ld
drwxr-xr-x 4 root root 54 Apr  2 13:27 /etc/ansible/roles/


# playbook中调用角色
# vim /etc/ansible/role_nginx.yml
- hosts: webs
  remote_user: root
  roles:
    - nginx # roles目录下，角色根目录的名称
  
  
# 运行playbook
# ansible-playbook /etc/ansible/role_nginx.yml  
```



## 范例：安装 k8s

- https://github.com/easzlab/kubeasz



## 范例：实现 httpd 角色

### 创建 role

```sh
# 创建角色相关的目录
# mkdir -pv /data/ansible/roles/httpd/{tasks,handlers,files}
```

#### tasks

- 定义task,role的基本元素，至少应该包含一个名为main.yml的文件；
- 其它的文件需要在此文件中通过include进行包含

```yaml
# 创建角色相关的文件
# cd /data/ansible/roles/httpd/


# main.yml 是task的入口文件
# vim tasks/main.yml
- include: group.yml
- include: user.yml
- include: install.yml
- include: config.yml
- include: index.yml
- include: service.yml


# vim tasks/group.yml
- name: 创建 apache 组
  group: name=apache system=yes gid=80


# vim tasks/user.yml
- name: 创建 apache 用户
  user: name=apache system=yes shell=/sbin/nologin home=/var/www/ uid=80 group=apache


# vim tasks/install.yml
- name: 安装 httpd 包
  yum: name=httpd


# vim tasks/config.yml
- name: 拷贝配置文件
  copy: src=httpd.conf dest=/etc/httpd/conf/ backup=yes
  notify: restart # 拷贝文件后触发restart的handlers


# vim tasks/index.yml
- name: 拷贝index.html
  copy: src=index.html dest=/var/www/html/


# vim tasks/service.yml
- name: 启动httpd并设为开机自启动
  service: name=httpd state=started enabled=yes
```

#### handlers

- 至少应该包含一个名为main.yml的文件；
- 其它的文件还可以在此文件中通过include进行包含

```yaml
# cd /data/ansible/roles/httpd/

# vim handlers/main.yml
- name: restart
  service: name=httpd state=restarted
```

#### files

- 存放由copy或script模块等调用的文件

```sh
# cd /data/ansible/roles/httpd/


# 在files目录下准备两个文件
# ls files/
httpd.conf index.html


# tree /data/ansible/roles/httpd/
/data/ansible/roles/httpd/
├── files
│   ├── httpd.conf
│   └── index.html
├── handlers
│   └── main.yml
└── tasks
   ├── config.yml
   ├── group.yml
   ├── index.yml
   ├── install.yml
   ├── main.yml
   ├── service.yml
   └── user.yml
3 directories, 10 files
```



### 调用 role

```yaml
# cd /data/ansible/roles/httpd/


# 在playbook中调用角色
# vim /data/ansible/role_httpd.yml
- hosts: websrvs
  remote_user: root
  roles:
    - httpd


# 运行playbook
# ansible-playbook /data/ansible/role_httpd.yml
```



## 范例：实现 nginx 角色

### 创建 role

```sh
mkdir -pv /data/ansible/roles/nginx/{tasks,handlers,templates,vars}
```

#### tasks

- 创建task文件

```yaml
# cd /data/ansible/roles/nginx/


# vim tasks/main.yml 
- include: install.yml
- include: config.yml
- include: index.yml
- include: service.yml


# vim tasks/install.yml 
- name: 安装nginx
  yum: name=nginx 


# 根据系统的版本来判断拷贝哪个配置文件，之后触发名为restart的handler对nginx进行重启
# vim tasks/config.yml 
- name: 拷贝针对centos7的配置文件
  template: src=nginx7.conf.j2 dest=/etc/nginx/nginx.conf
  when: ansible_distribution_major_version=="7"
  notify: restart
- name: 拷贝针对centos8的配置文件
  template: src=nginx8.conf.j2 dest=/etc/nginx/nginx.conf
  when: ansible_distribution_major_version=="8"
  notify: restart


# vim tasks/index.yml 
- name: 拷贝index.html文件
  copy: src=roles/httpd/files/index.html dest=/usr/share/nginx/html/ # 这里的src写相对路径也可以吧，然后会从files目录中寻找，即相对于files目录


# vim tasks/service.yml 
- name: 启动nginx服务
  service: name=nginx state=started enabled=yes
```

#### handlers

- 创建handler文件

```yaml
# cd /data/ansible/roles/nginx/


# cat handlers/main.yml 
- name: restart
  ervice: name=nginx state=restarted
```



#### templates

- 创建两个template文件

```yaml
# cd /data/ansible/roles/nginx/


# cat templates/nginx7.conf.j2
...省略...
user {{user}};
worker_processes {{ansible_processor_vcpus+3}}; # 修改此行
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
...省略...


# cat templates/nginx8.conf.j2
...省略...
user nginx;
worker_processes {{ansible_processor_vcpus**3}}; # 修改此行
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
...省略...
```

#### vars

- 创建变量文件

```yaml
# cd /data/ansible/roles/nginx/


# vim vars/main.yml 
user: daemon
```

#### 相关文件总结

```sh
# 目录结构如下
# tree /data/ansible/roles/nginx/
/data/ansible/roles/nginx/
├── handlers
│   └── main.yml
├── tasks
│   ├── config.yml
│   ├── file.yml
│   ├── install.yml
│   ├── main.yml
│   └── service.yml
├── templates
│   ├── nginx7.conf.j2
│   └── nginx8.conf.j2
└── vars
   └── main.yml
4 directories, 9 files
```



### 调用 role

```yaml
# 在playbook中调用角色
# vim /data/ansible/role_nginx.yml 
- hosts: websrvs
  roles:
    - role: nginx


# 运行playbook
# ansible-playbook /data/ansible/role_nginx.yml
```



## 范例：实现 memcached 角色

### 创建 role

```sh
mkdir -pv /data/ansible/roles/memcached/{tasks,templates}
```

#### tasks

```yaml
# cd /data/ansible/roles/memcached

# 定义tasks执行的顺序
# vim tasks/main.yml 
- include: install.yml
- include: config.yml
- include: service.yml


# vim tasks/install.yml 
- name: 安装memcached
  yum: name=memcached


# vim tasks/config.yml 
- name: 拷贝memcached配置文件模板
  template: src=memcached.j2  dest=/etc/sysconfig/memcached


# vim tasks/service.yml 
- name: 启动memcached并设为开机自启
  service: name=memcached state=started enabled=yes
```

#### templates

```sh
# cd /data/ansible/roles/memcached


# vim templates/memcached.j2 
PORT="11211"
USER="memcached"
MAXCONN="1024"
CACHESIZE="{{ansible_memtotal_mb//4}}" # //表示对两个数做除法，返回整数商。例如：{{ 20 // 7 }} 等于 2 
OPTIONS=""
```

#### 最终文件汇总

```sh
# tree /data/ansible/roles/memcached/
/data/ansible/roles/memcached/
├── tasks
│   ├── config.yml
│   ├── install.yml
│   ├── main.yml
│   └── service.yml
└── templates
   └── memcached.j2
2 directories, 5 files
```

### 调用 role

```yaml
# cd /data/ansible/roles/memcached


# vim /data/ansible/role_memcached.yml 
- hosts: appsrvs
  roles:
    - role: memcached


# ansible-play /data/ansible/role_memcached.yml 
```



## 范例：实现 mysql 5.6 的角色

### 创建 role

#### files

```sh
# cat /data/ansible/roles/mysql/files/my.cnf 
[mysqld]
socket=/tmp/mysql.sock
user=mysql
symbolic-links=0
datadir=/data/mysql
innodb_file_per_table=1
log-bin
pid-file=/data/mysql/mysqld.pid
[client]
port=3306
socket=/tmp/mysql.sock
[mysqld_safe]
log-error=/var/log/mysqld.log


#cat /data/ansible/roles/mysql/files/secure_mysql.sh 
#!/bin/bash
/usr/local/mysql/bin/mysql_secure_installation <<EOF
y
magedu
magedu
y
y
y
y
EOF


#chmod +x /data/ansible/roles/mysql/files/secure_mysql.sh


#ls /data/ansible/roles/mysql/files/
my.cnf mysql-5.6.46-linux-glibc2.12-x86_64.tar.gz secure_mysql.sh
```

#### tasks

```yaml
# cat /data/ansible/roles/mysql/tasks/main.yml
- include: install.yml
- include: group.yml
- include: user.yml
- include: unarchive.yml
- include: link.yml
- include: data.yml
- include: config.yml
- include: service.yml
- include: path.yml
- include: secure.yml


# cat /data/ansible/roles/mysql/tasks/install.yml 
- name: 安装依赖包                                          
  yum: name=libaio,perl-Data-Dumper,perl-Getopt-Long


# cat /data/ansible/roles/mysql/tasks/group.yml 
- name: 创建mysql组
 group: name=mysql gid=306


# cat /data/ansible/roles/mysql/tasks/user.yml 
- name: 创建mysql用户
  user: name=mysql uid=306 group=mysql shell=/sbin/nologin system=yes create_home=no home=/data/mysql


# 解压的包来自于相对于files目录中的相对路径
#  cat /data/ansible/roles/mysql/tasks/unarchive.yml 
- name: 拷贝mysql5.6二进制包到/usr/local/并设置权限
  unarchive: src=mysql-5.6.46-linux-glibc2.12-x86_64.tar.gz dest=/usr/local/ owner=root group=root


# cat /data/ansible/roles/mysql/tasks/link.yml 
- name: 创建mysql软链接
  file: src=/usr/local/mysql-5.6.46-linux-glibc2.12-x86_64 dest=/usr/local/mysql state=link


# cat /data/ansible/roles/mysql/tasks/data.yml 
- name: data dir
  shell: chdir=/usr/local/mysql/ ./scripts/mysql_install_db --datadir=/data/mysql --user=mysql


# cat /data/ansible/roles/mysql/tasks/config.yml 
- name: 拷贝mysql配置文件
  copy: src=my.cnf  dest=/etc/my.cnf 


# cat /data/ansible/roles/mysql/tasks/service.yml 
- name: service script
  shell: /bin/cp /usr/local/mysql/support-files/mysql.server /etc/init.d/mysqld;chkconfig --add mysqld;chkconfig mysqld on;/etc/init.d/mysqld start


# cat /data/ansible/roles/mysql/tasks/path.yml 
- name: PATH variable
  copy: content='PATH=/usr/local/mysql/bin:$PATH' dest=/etc/profile.d/mysql.sh  


# cat /data/ansible/roles/mysql/tasks/secure.yml 
- name: secure script
 script: secure_mysql.sh
```

#### 最终文件汇总

```sh
# tree /data/ansible/roles/mysql/
/data/ansible/roles/mysql/
├── files
│   ├── my.cnf
│   ├── mysql-5.6.46-linux-glibc2.12-x86_64.tar.gz
│   └── secure_mysql.sh
└── tasks
   ├── config.yml
   ├── data.yml
   ├── group.yml
   ├── install.yml
   ├── link.yml
   ├── main.yml
   ├── path.yml
   ├── secure.yml
   ├── service.yml
   ├── unarchive.yml
   └── user.yml
2 directories, 14 files
```

### 调用 role

```sh
# cat /data/ansible/mysql_roles.yml
- hosts: dbsrvs
 remote_user: root
 roles:
    - {role: mysql,tags: ["mysql","db"]}
    - {role: nginx,tage: ["nginx","web"]}
    
# ansible-playbook -t mysql /data/ansible/mysql_roles.yml
```





# Ansible 问题汇总

**管理节点过多导致的超时问题解决方法**

- 默认情况下，Ansible将尝试并行管理 playbook 中所有的机器，在管理主机过多时有可能出现超时等情况

- 可以使用 serial 关键字定义 Ansible 一次应管理多少主机，serial 可以按照处理主机数量或百分比来设定

  - 按照处理主机数量定义：

    - ```yaml
      #vim test_serial.yml
      ---
      - hosts: all
        serial: 2 #每次只同时处理2个主机
        gather_facts: False
       
        tasks:
          - name: task one
            comand: hostname
          - name: task two
            command: hostname
      ```

  - 按照处理主机百分比定义：

    - ```yaml
      - name: test serail
        hosts: all
        serial: "20%"   #每次只同时处理20%的主机
      ```



## playbook 示例
Ansible 设置密码需要使用加密后的哈希值，不能直接写明文。在管理机上运行以下 Python 命令生成哈希（将 YourNewRootPassword 替换为想要的统一密码）：
```sh
# 生成 SHA-512 哈希
python3 -c 'import crypt; print(crypt.crypt("YourNewRootPassword", crypt.mksalt(crypt.METHOD_SHA512)))'
```
- 会得到一串类似 $6$randomsalt$encryptedhash... 的长字符串，复制它。

### 允许root远程登录并重置root密码
```yaml {filename="enable_root.yml"}
---
- hosts: servers
  become: yes  # 开启 sudo 提权
  tasks:
    - name: 1. 修改 SSH 配置允许 Root 登录
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitRootLogin'
        line: 'PermitRootLogin yes'
        state: present

    - name: 2. 确保 SSH 允许密码验证 (如果是云主机默认可能关闭)
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PasswordAuthentication'
        line: 'PasswordAuthentication yes'
        state: present

    - name: 3. 重启 SSH 服务以生效
      service:
        name: sshd  # 某些系统可能是 ssh
        state: restarted

    - name: 4. 修改 Root 用户的密码
      user:
        name: root
        password: '$6$fJ...'  # <--- 粘贴刚才生成的哈希值放在这里
```





