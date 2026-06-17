---
title: "Bash Shell 语法大全"
---



# 注意事项

- **第一行shebang机制**：#!/bin/bash  （注意！不要写成 "#!/bin/bash/"，这是一个文件而不是文件夹）
  - **\#!/usr/bin/env bash 和 #!/bin/bash 有什么区别**
    - `#!/usr/bin/env bash` 和 `#!/bin/bash` 都是在 Linux 和 Unix 系统中用于指定脚本解释器的特殊注释。
    - `#!/usr/bin/env bash` 表示使用环境变量中的 bash 解释器来执行脚本。也就是说，它会在 PATH 环境变量中查找名为 "bash" 的解释器，并使用第一个找到的解释器来执行脚本。这种方式的好处是不需要指定具体的解释器路径，因为它会在 PATH 中查找，从而使脚本更具可移植性。
    - 而 `#!/bin/bash` 则直接指定了 bash 解释器的绝对路径为 /bin/bash 来执行脚本。这种方式较为明确，但可能在某些系统中找不到该路径，因此可移植性较差。
    - 综上所述，如果您希望编写可移植的脚本，并且不希望受到特定解释器路径的限制，那么使用 `#!/usr/bin/env bash` 是更好的选择。而如果您知道您的脚本将在特定的系统中运行，并且该系统上有 bash 解释器的确切路径，则可以使用 `#!/bin/bash`。

- **变量引用时加{}**，以防和其他字符串混淆：${var}
- 别名在脚本中无效
- 脚本名通常以.sh为结尾后缀
- 条件判断中，变量建议用引号引起来：[ "$VAR_NAME" ]



Shebang 机制（也称为 hashbang、sharpbang 或者 poundbang）是一种用于在类 Unix 操作系统中指定脚本解释器的方法。它使用 `#!` 符号作为特殊字符序列来告诉操作系统应该使用哪个解释器来解释脚本。

具体来说，shebang 机制指定了脚本文件的第一行，该行以 `#!` 开头，后面紧跟[Ma1着解释器的路径。例如，以下是一个 Bash 脚本的 shebang 行：

```
#!/bin/bash
```

这个 shebang 行告诉操作系统使用 `/bin/bash` 解释器来解释这个脚本文件。当你在终端上执行这个脚本时，操作系统会自动找到该解释器并使用它来执行脚本。

除了指定解释器之外，shebang 机制还可以用于传递参数给解释器。例如，以下是一个 Python 脚本的 shebang 行：

```
#!/usr/bin/env python3
```

这个 shebang 行告诉操作系统使用 `python3` 解释器来解释这个脚本文件，并通过 `env` 命令告诉解释器在环境中查找 Python 解释器。这个机制使得在不同的操作系统上运行脚本更加方便，因为你不需要知道 Python 解释器的确切路径。

总之，shebang 机制是一种非常有用的机制，它可以使脚本更加易于使用和移植。





# 脚本的执行方法

```bash
[root@centos ~]# vim test.sh
#!/bin/bash
echo "hello world"

#bash命令执行法，不需要执行权限（执行时会开启子进程）
[root@centos ~]# bash test.sh 
hello world

#绝对路径法，需要加执行权限
[root@centos ~]# chmod +x test.sh
[root@centos ~]# /root/test.sh
hello world

#相对路径，需要加执行权限
[root@centos ~]# chmod +x test.sh
[root@centos ~]# ./test.sh 
hello world

#加到PATH变量中直接执行
[root@centos ~]# echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/root/bin
[root@centos ~]# mv test.sh /usr/local/sbin
[root@centos ~]# test.sh
hello world

#source执行
#和bash命令执行脚本的方式不同的是source不会开启子进程，也就会影响当前shell环境，所以source多用于设置配置文件
[root@centos ~]# source test.sh 
hello world

#在互联网调用脚本：
wget -qO - http://10.0.0.8/test.sh | bash
或
curl -s http://10.0.0.8/test.sh | bash

#将文本的输出来当作脚本来执行：
[root@centos ~]# cat test.sh | bash
hello world
```

## bash执行和source执行的进程对比

```bash
[root@centos ~]# cat test.sh 
#!/bin/bash
echo "hello world"
sleep 10000

#bash执行法
[root@centos ~]# bash test.sh 
hello world
[root@centos ~]# pstree -p
─sshd(2670)───sshd(2672)───bash(2673)───bash(2738)───sleep(2739) #2738是开启的子进程

#source执行法
[root@centos ~]# source test.sh 
hello world
[root@centos ~]# pstree -p
sshd(2670)───sshd(2672)───bash(2673)───sleep(2799) #2673是当前进程，当前进程下面直接就是命令，而非开启子进程
```







# 脚本检查

```bash
#不真正执行脚本，只检测脚本中的语法错误，但无法检查出命令错误
bash -n 

#调试并执行(会导致脚本中的命令生效！)
bash -x
```

## 脚本的三种常见错误

1. **语法错误**：会导致**后续的命令不继续执行**，可以用bash -n 检查错误，（提示的出错行数不一定是准确的）
2. **命令错误**：会导致**后续的命令会继续执行**，用bash -n 无法检查出来 ，可以使用 bash -x 进行观察
3. **逻辑错误**：只能使用 bash -x 进行观察









# 关于 () 和 {}

- () 和 {} 都是让命令成为一个独立的个体
- **但：**
- **()**  会开启子进程，不会影响当前环境
- **{ }** 不会开启自进程，会影响当前环境

**范例：**

```bash
#()
[root@centos ~]# name=azheng;(echo $name;name=xiangzheng;echo $name);echo $name
azheng
xiangzheng
azheng

#{}，注意格式}前也要加;，{ 后还需有空格
[root@centos ~]# name=azheng;{ echo $name;name=xiangzheng;echo $name; } ;echo $name
azheng
xiangzheng
xiangzheng
```





# true和false

## true

$?返回的值永远为真，true和":"等价

```bash
[root@centos ~]# :
[root@centos ~]# echo $?
0
[root@centos ~]# true 
[root@centos ~]# echo $?
0
```

## false

$?返回的值永远为假

```bash
[root@centos ~]# false
[root@centos ~]# echo $?
1
```





# 算术运算

**只支持整数，不支持浮点数（小数）**

**bash中的算术运算符号**

```bash
+ #加

- #减

* #乘，乘法符号有些场景需转义

/ #除

% #取模，即取余数，示例：9%4=1，5%3=2

** #乘方，乘法符号有些场景需转义
```



## 实现算数运算：

```bash
x=10
y=20
z=30

#let var=算术表达式，
[root@aliyun ~]# let sum=${x}*${y}
[root@aliyun ~]# echo ${sum}
200
#let命令可以识别算术运算中的变量，所以可以不用加$
[root@aliyun ~]# let sum=x*y
[root@aliyun ~]# echo ${sum}
200



#((var=算术表达式)) 
[root@aliyun ~]# ((sum=${x}+${y}))
[root@aliyun ~]# echo ${sum}
30
#(())可以识别算术运算中的变量，所以可以不用加$
[root@centos ~]# ((sum=x*z))
[root@centos ~]# echo $sum
300


#var=$[算术表达式]
[root@aliyun ~]# sum=$[y-x]
[root@aliyun ~]# echo $sum
10




#var=$((算术表达式))
[root@aliyun ~]# sum=$((y/x))
[root@aliyun ~]# echo $sum
2



#var=$((expr arg1 arg2 arg3 ...))
[root@aliyun ~]# sum=$((x+y+z))
[root@aliyun ~]# echo $sum
60




#declare –i var = 数值 #i表示声明为整数
[root@aliyun ~]# declare -i sum=x*y
[root@aliyun ~]# echo $sum
200





#echo '算术表达式' | bc
[root@aliyun ~]# echo '30/10'|bc
3
[root@aliyun ~]# echo '2/3'|bc
0
[root@aliyun ~]# echo 'scale=3;2/3'|bc   #scale=3表示取小数点后三位
.666




#expr
[root@aliyun ~]# expr 6 + 6 
12
[root@aliyun ~]# expr 8 * 8
expr: syntax error: unexpected argument ‘123.sh’
[root@aliyun ~]# expr 8 \* 8
64
```

## 其他细节

```bash
#let i++ 等于 i=i+1
[root@aliyun ~]# i=10
[root@aliyun ~]# let i++
[root@aliyun ~]# echo $i
11
[root@aliyun ~]# let i--
[root@aliyun ~]# echo $i
10
[root@aliyun ~]# let i++
[root@aliyun ~]# echo $i
11
[root@aliyun ~]# let ++i
[root@aliyun ~]# echo $i
12

#i++和++i的区别
#i++是先值赋再加
[root@aliyun ~]# i=10;((j=i++));echo j=$j i=$i
j=10 i=11
#++i是先加再赋值
[root@aliyun ~]# i=10;((j=++i));echo j=$j i=$i
j=11 i=11

#自加3后自赋值
let count+=3
[root@centos8 ~]#i=10
[root@centos8 ~]#let i+=20 #相当于let i=i+20
[root@centos8 ~]#echo $i
30
[root@centos8 ~]#j=20
[root@centos8 ~]#let i*=j 
[root@centos8 ~]#echo $i
600
```



# 逻辑运算

- true：1
- false：0

**与：&**：和0相与，结果为0，和1相与，结果保留原值

 1 与 1 = 1

 1 与 0 = 0

 0 与 1 = 0

 0 与 0 = 0

**或：|**：和1相或结果为1，和0相或，结果保留原值

 1 或 1 = 1

 1 或 0 = 1

 0 或 1 = 1

 0 或 0 = 0 

**非：！**：取反

 ! 1 = 0    ! true

 ! 0 = 1    ! false

**异或：^**

异或的两个值，相同为假，不同为真。两个数字X,Y异或得到结果Z，Z再和任意两者之一X异或，将得出另一个值Y

```bash
1 ^ 1 = 0
1 ^ 0 = 1
0 ^ 1 = 1
0 ^ 0 = 0

#范例
[root@centos8 ~]#true 
[root@centos8 ~]#echo $?
0
[root@centos8 ~]#false
[root@centos8 ~]#echo $?
1
[root@centos8 ~]#! true
[root@centos8 ~]#echo $?
1
[root@centos8 ~]#! false
[root@centos8 ~]#echo $?
0

#范例2
[root@centos8 ~]#x=10;y=20;temp=$x;x=$y;y=$temp;echo x=$x,y=$y
x=20,y=10
[root@centos8 ~]#x=10;y=20;x=$[x^y];y=$[x^y];x=$[x^y];echo x=$x,y=$y
x=20,y=10
```



# 短路运算

```bash
#短路或，cmd1执行失败(cmd1 $?结果为1的情况下)则执行cmd2
cmd1 || cmd2

#短路与，cmd1执行成功(cmd1 $?结果为0的情况下)则执行cmd2
cmd1 && cmd2
```









# read接受输入

常见选项：

```bash
-p        #指定要显示的提示
-s        #静默输入，一般用于密码
-n N      #指定输入的字符长度N
-d '字符'  #输入结束符
-t N      #TIMEOUT为N秒
```

范例1：

```bash
[root@centos8 ~]#read -p "Please input your name: " NAME
Please input your name: xiang
[root@centos8 ~]#echo $NAME
xiang
```

范例2：

```bash
#标准输入重定向赋值
[root@centos8 ~]#read x y z <<< "I love you"
[root@centos8 ~]#echo $x
I
[root@centos8 ~]#echo $y
love
[root@centos8 ~]#echo $z
you
```





# bash的配置文件

bash运行时会读取这些配置文件

## 按生效范围划分两类

### 全局配置

```bash
/etc/profile
/etc/profile.d/*.sh #系统环境变量存放位置
/etc/bashrc
```

### 个人配置

```bash
~/.bash_profile
~/.bashrc
```

## 配置文件执行顺序

仅供参考，不同发行版、不同用户登录执行顺序都有可能不通

```bash
#从上到下执行：
/etc/profile.d/*.sh
/etc/bashrc
/etc/profile
/etc/bashrc    #此文件执行两次
.bashrc
.bash_profile
```

## 按功能划分

### Profifile类

用于定义环境变量、运行命令或脚本

```bash
#全局：
/etc/profile, /etc/profile.d/*.sh

#个人：
~/.bash_profile
```

### Bashrc类

用于定义命令别名和函数、定义本地变量

```bash
#全局：
/etc/bashrc

#个人：
~/.bashrc
```

## 编辑配置文件后生效

修改profifile和bashrc文件后需生效两种方法:

1. 重新启动shell进程
2. source或. 配置文件

**范例：**

```bash
#退出终端重新登陆（重新启动shell进程）
[root@centos ~]# exit

#source或. 配置文件
[root@centos ~]# . ~/.bashrc
或
[root@centos ~]# source ~/.bashrc
```







# 函数

函数和shell程序比较相似，区别在于

Shell程序在子Shell中运行，而Shell函数在当前Shell中运行。因此在当前Shell中，函数可对shell中变量

进行修改

## 定义函数

```bash
#语法一(推荐使用)：
func_name(){
 ...函数体...
}

#语法二：
function func_name {
 ...函数体...
} 

#语法三：
function func_name(){
 ...函数体...
}
```

## 查看函数

```bash
#查看当前已定义的函数名
declare -F
#查看当前已定义的函数定义
declare -f
#查看指定当前已定义的函数名
declare -f func_name 
#查看当前已定义的函数名定义
declare -F func_name
```

## 删除函数

```bash
unset func_name
```



#设定函数时在变量名称前声明local，将只会在本函数体内生效，不会影响外部的环境

#子进程不能继承父进程的函数，如要继承，需定义环境函数：export -f function_name | declare -xf function_name

#查看环境函数：export -f | declare -xf







# 数组






