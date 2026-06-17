---
title: "Flask"
---


## Flask 基础知识结构


| 功能 | 示例 | 说明 |
| ---- | ---- | ---- |
| 路由 | `@app.route('/about')` | 定义 URL 路径 |
| 请求 | `from flask import request` | 获取表单、URL 参数等 |
| 响应 | `return 'text'` 或 `jsonify({...})` | 返回给前端的内容 |
| 模板 | `render_template('index.html')` | 使用 Jinja2 模板渲染 HTML |
| 重定向 | `redirect(url_for('func_name'))` | 页面跳转 |
| 表单 | `request.form.get('field')` | 获取表单数据 |

---

## 一个最小的 Flask 应用
```python
from flask import Flask

app = Flask(__name__)  # 创建应用实例

@app.route("/")  # 路由设置，访问根路径时执行
def hello():
    return "Hello, Flask!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80, debug=True)
```
**注意事项：**
- 在**开发环境**中使用 `debug=True` 没问题，它会自动重载代码并显示调试信息。
- 在**生产环境**中千万不要使用 `debug=True` 和 Flask 自带服务器，应该使用如 **Gunicorn** 或 **uWSGI** 搭配 **Nginx**。
---

## 路由
- 路由是 Flask 中最核心的部分之一，它用于将特定的 URL 请求映射到 Python 函数上。当用户访问某个 URL 时，Flask 会根据路由规则找到对应的视图函数并执行。
### 基本路由
- 在 Flask 中，我们使用 `@app.route()` 装饰器来定义路由。装饰器会将一个 URL 路径和对应的视图函数绑定在一起。

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")  # 定义根路径的路由
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    app.run(debug=True)

```
访问 `http://127.0.0.1:5000/` 时，浏览器会显示 `Hello, World!`。

---

### 路由变量
- 路由可以包含动态部分，也就是所谓的路由变量。我们可以在路由路径中使用尖括号`< >`来定义这些变量，并在视图函数中通过参数获取它们。
```python
@app.route("/greet/<name>")  # 路由中定义一个变量 name
def greet(name):
    return f"Hello, {name}!"
```
现在，当你访问 `http://127.0.0.1:5000/greet/John` 时，会显示 `Hello, John!`。
- `<name>` 会被 Flask 捕获，并传递给 `greet` 函数的 `name` 参数。

---

### 路由类型转换器
- Flask 提供了多种**转换器**，可以对路由变量进行类型限制。

**常用转换器：**
- `<int:variable>`：匹配整数
- `<float:variable>`：匹配浮点数
- `<path:variable>`：匹配路径（包括斜杠 `/`）
```python
@app.route("/user/<int:id>")
def show_user(id):
    return f"User ID is {id}"

@app.route("/path/<path:file>")
def show_file(file):
    return f"Requested file: {file}"
```
- `http://127.0.0.1:5000/user/123` 会返回 `User ID is 123`
- `http://127.0.0.1:5000/path/some/folder/filename.txt` 会返回 `Requested file: some/folder/filename.txt`
- **只有符合类型才会正常返回，否则报404**

---

### 多个路由
你可以为一个视图函数定义多个路由，即同一个视图函数可以响应多个不同的 URL。
```python
@app.route("/home")
@app.route("/index")
def index():
    return "Welcome to the homepage!"
```
现在，无论是访问 `http://127.0.0.1:5000/home` 还是 `http://127.0.0.1:5000/index`，都会返回 `Welcome to the homepage!`。

---

### HTTP 方法
- Flask 默认只响应 **GET** 请求，但你可以通过指定 `methods` 参数来让路由同时响应其他 HTTP 方法（如 POST、PUT、DELETE 等）。
#### GET 和 POST 路由
```python
from flask import request

@app.route("/submit", methods=["GET", "POST"])
def submit():
    if request.method == "POST":
        return "Form submitted!"
    return "Please submit the form."
```
```bash
# curl http://10.0.0.10/submit ; echo
Please submit the form.

# curl -X POST http://10.0.0.10/submit ; echo
Form submitted!
```
---

#### 使用 request 对象获取数据
- 如果你需要从 POST 请求中获取表单数据，可以使用 `request.form`。
```python
from flask import request

@app.route("/submit", methods=["POST"])
def submit():
    name = request.form.get("name")
    return f"Hello, {name}!"

```
- 在这个例子中，用户提交的表单数据将通过 `request.form.get("name")` 获取。
```bash
# curl -X POST http://10.0.0.10/submit ; echo
Hello, None!

# curl http://10.0.0.10/submit -d "Azheng" ; echo
Hello, None!

# curl http://10.0.0.10/submit -d "name=Azheng" ; echo
Hello, Azheng!
```
---

### URL 构建与重定向
- Flask 提供了 `url_for()` 函数来生成 URL，并且可以根据视图函数的名称来构建 URL。它对于重定向和生成动态 URL 非常有用。
#### 使用 url_for()
```python
from flask import redirect, url_for

@app.route("/")
def index():
    return redirect(url_for('greet', name='John'))

@app.route("/greet/<name>")
def greet(name):
    return f"Hello, {name}!"
```
- 访问根路径时，会重定向到 `/greet/John`，显示 `Hello, John!`。
```bash
# curl http://10.0.0.10/ -L ; echo
Hello, John!
```

---

#### 动态 URL 生成
`url_for()` 可以根据视图函数动态生成 URL，即使路由发生了变化，你的重定向或链接也不会受到影响。
```python
url_for('greet', name='Alice')  # 会生成 /greet/Alice 的 URL

```

---

### 错误处理
- Flask 还允许你为特定的 HTTP 错误代码定义自定义错误页面（如 404 错误页面）。
```python
@app.errorhandler(404)
def page_not_found(e):
    return "Customize 404 page", 404
```
- 访问一个不存在的页面时，Flask 会返回 `Page not found!`。
```bash
# curl http://10.0.0.10/ewqeqw ; echo
Customize 404 page
```

---

### 小结


- Flask 路由通过 `@app.route()` 装饰器来定义，可以响应特定的 URL 请求。
- 支持**动态路由**和**路由变量**，让 URL 更具灵活性。
- 可以根据需求定义 **多种 HTTP 方法**（GET、POST）和 **错误处理**。
- 通过 `url_for()` 可以生成动态 URL，进行页面跳转。

你可以通过这些基础知识，进一步扩展复杂的路由系统，处理表单、API 请求等。


---

## 请求
Flask 使用 `request` 对象来访问客户端发送过来的各种数据，比如：
- URL 参数（GET 查询参数）
- 表单数据（POST 提交）
- JSON 数据（API 请求）
- 请求头、cookies、文件上传等

这些都属于 **请求对象** 的范畴。

---

### 导入 request 对象
在使用之前，需要从 Flask 中导入：
```python
from flask import request

```

---

### URL 查询参数（GET）
URL 查询参数通过 GET 提交，使用 request.args 获取。
```python
@app.route("/search")
def search():
    keyword = request.args.get("keyword")  # 从 URL 参数中获取值
    return f"You searched for: {keyword}"
```
- `request.args` 是一个字典类对象（`ImmutableMultiDict`）
- `.get("key")` 是推荐方式，可防止 key 不存在时报错

```bash
# curl http://localhost/search?keyword=flask ; echo
You searched for: flask

# curl http://localhost/search?keyword=flas ; echo
You searched for: flas

# curl http://localhost/search?keywo=flas ; echo
You searched for: None
```

---

### 表单数据（POST）
表单数据通过 POST 提交，使用 `request.form` 获取。
```python
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        return f"Welcome, {username}! Password: {password}"
    return '''
        <form method="post">
            Username: <input name="username"><br>
            Password: <input type="password" name="password"><br>
            <input type="submit">
        </form>
    '''
```
- `request.form.get("字段名")` 获取表单字段
```bash
# GET 获取登录框
$ curl http://localhost/login ; echo

        <form method="post">
            Username: <input name="username"><br>
            Password: <input type="password" name="password"><br>
            <input type="submit">
        </form>


# POST 登录成功
$ curl -X POST http://localhost/login -d 'username=azheng&password=P@ssw0rd' ; echo
Welcome, azheng! Password: P@ssw0rd

```
---

### JSON 数据（API POST）


客户端发送 JSON（常用于前后端分离的接口）时，使用 `request.get_json()` 来解析：


```python
@app.route("/api/data", methods=["POST"])
def api_data():
    data = request.get_json()
    name = data.get("name")
    return {"message": f"Hello, {name}!"}
```
```bash
# curl -X POST "http://localhost/api/data" -H "Content-Type: application/json" -d '{"name": "Alice"}'
{
  "message": "Hello, Alice!"
}
```

---

### 文件上传
使用 `request.files` 获取上传的文件对象。
```python
@app.route("/upload", methods=["GET", "POST"])
def upload():
    if request.method == "POST":
        file = request.files["myfile"]
        file.save(f"./uploads/{file.filename}")
        return "File uploaded!"
    return '''
        <form method="post" enctype="multipart/form-data">
            <input type="file" name="myfile">
            <input type="submit">
        </form>
    '''
```
注意：
- 表单必须加上 `enctype="multipart/form-data"`
- `file.save()` 将上传文件保存到服务器

---

### 请求头、IP、User-Agent 等
```python
@app.route("/info")
def info():
    user_agent = request.headers.get("User-Agent")
    ip = request.remote_addr
    return f"Your IP: {ip}, Your browser: {user_agent}"
```
```bash
# curl http://localhost/info ; echo
Your IP: 127.0.0.1, Your browser: curl/8.5.0
```

#### 常用属性


| 属性 | 说明 |
| ---- | ---- |
| `request.headers` | 请求头（如 User-Agent） |
| `request.remote_addr` | 客户端 IP 地址 |
| `request.method` | 当前请求的方法（如 GET、POST） |
| `request.path` | URL 路径，不包含参数 |
| `request.url` | 完整 URL，包括参数 |

---


### 判断请求类型
- 可以用 `request.method` 判断是 GET 还是 POST：
```python
@app.route("/example", methods=["GET", "POST"])
def example():
    if request.method == "POST":
        # 处理 POST 请求
        ...
    else:
        # 处理 GET 请求
        ...

```

---

### 请求数据汇总比较表


| 类型 | 对象 | 用法 |
| ---- | ---- | ---- |
| URL 查询参数 | `request.args` | `request.args.get("key")` |
| 表单数据 | `request.form` | `request.form.get("key")` |
| JSON 数据 | `request.get_json()` | `data.get("key")` |
| 文件上传 | `request.files` | `request.files["file"]` |
| 请求头 | `request.headers` | `request.headers.get("Header-Name")` |
| 客户端 IP | `request.remote_addr` | — |
| 请求方法 | `request.method` | — |

---



## 响应
在 Flask 中，**响应**（`Response`）是指服务器返回给客户端的数据。通过 Flask，你可以非常灵活地定义响应内容，例如返回 HTML 页面、JSON 数据、重定向、文件下载等等。
Flask 使用 `return` 语句来发送响应。当你定义一个视图函数时，Flask 会根据你的返回值生成 HTTP 响应。
我们来看几个常见的 **响应类型** 和如何处理它们。

---

### 简单文本响应
最简单的响应就是直接返回一个字符串，Flask 会将这个字符串作为 HTTP 响应体返回给客户端。


```python
@app.route("/")
def hello():
    return "Hello, Flask!"  # 返回普通文本

```
- 这将返回一个 **纯文本响应**，Content-Type 默认为 `text/html`。

---

### HTML 页面响应
如果你想返回 HTML 页面，可以直接写 HTML 字符串，或者使用模板引擎。
```python
@app.route("/about")
def about():
    return "<h1>About Us</h1><p>This is a simple Flask app.</p>"
```

- 这里直接返回了 HTML 代码。

---

### JSON 响应
Flask 提供了一个方便的 `jsonify` 工具，可以将字典自动转换为 JSON 格式并返回。
```python
from flask import jsonify

@app.route("/api/data")
def api_data():
    data = {"name": "Flask", "type": "web framework"}
    return jsonify(data)  # 将字典转为 JSON 格式

```
- `jsonify` 会自动设置 Content-Type 为 `application/json`。
- 返回的 JSON 数据格式是标准的 JSON 格式，客户端可以方便地解析。

---

### 重定向响应
有时候，你需要将用户重定向到另一个 URL，Flask 提供了 `redirect()` 函数来实现。
```python
from flask import Flask, redirect, url_for

app = Flask(__name__)


@app.route("/about")
def about():
    return "<h1>About Us</h1><p>This is a simple Flask app.</p>"

@app.route("/home")
def home():
    return redirect(url_for('about'))  # 重定向到另一个视图

@app.route("/moved")
def moved():
    return redirect(url_for('about'), code=301)  # 自定义状态码的重定向，301 永久重定向


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80, debug=True)
```

---

### 返回 HTML 模板
Flask 支持 Jinja2 模板引擎，允许你从 HTML 模板中渲染动态内容。你可以将模板文件放在 `templates` 文件夹中，Flask 会自动查找。

**目录结构**：
```bash
# tree
.
├── app.py
└── templates
    └── index.html

# cat templates/index.html 
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Flask Example</title>
</head>
<body>
    <h1>{{ message }}</h1>  <!-- 动态内容 -->
</body>
</html>
```
在 `app.py` 中渲染这个模板：
```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html", message="Welcome to Flask!")  # 传递变量到模板

```
- `render_template()` 会将模板渲染成 HTML 页面并返回响应。
- 通过 `{{ message }}`，`message` 会从 Python 传递到 HTML 模板中进行渲染。

---

### 文件下载响应
如果你想让用户下载文件，Flask 提供了 `send_file()` 函数来返回文件响应。
```python
from flask import Flask, send_file

app = Flask(__name__)

@app.route("/download")
def download():
    return send_file("/etc/fstab", as_attachment=True, download_name="myfile.txt") # 发送文件下载，download_name为指导下载后的文件名，不加则为默认名称。


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80, debug=True)
```
- `send_file()` 允许你指定一个文件路径，`as_attachment=True` 会让文件下载，而不是在浏览器中打开。

还可以指定 MIME 类型等参数：

---

### 自定义状态码
- Flask 允许你设置响应的 HTTP 状态码。状态码用于指示请求的结果，常见的状态码有：
```python
@app.route("/error")
def error():
    return "Page not found", 404  # 返回 404 错误页面

```
你也可以使用 `abort()` 函数直接抛出错误，自动生成响应：
```python
from flask import abort

@app.route("/delete")
def delete():
    abort(404)  # 主动抛出 404 错误

```

---

### 自定义响应对象
- Flask 的 `response` 对象提供了更多的控制，你可以完全自定义响应，包括设置响应头、状态码等。
```python
from flask import Response

@app.route("/custom_response")
def custom_response():
    return Response(
        "This is a custom response",
        status=200,  # 状态码
        mimetype="text/plain",  # MIME 类型
        headers={"X-Custom-Header": "CustomValue"}  # 自定义响应头
    )

```

- `Response` 可以用来创建更复杂的响应对象，特别适合需要自定义响应头、状态码的情况。

---

### 响应总结


| 类型 | 描述 | 示例 |
| ---- | ---- | ---- |
| **简单文本响应** | 返回纯文本 | `return "Hello, World!"` |
| **HTML 响应** | 返回 HTML 页面 | `return "<h1>Page</h1>` |
| **JSON 响应** | 返回 JSON 数据 | `return jsonify({"key": "value"})` |
| **重定向** | 重定向到其他页面 | `return redirect(url_for('home'))` |
| **HTML 模板** | 渲染 HTML 模板 | `render_template("index.html", message="Hello!")` |
| **文件下载** | 返回文件供下载 | `send_file('file.txt', as_attachment=True)` |
| **设置状态码** | 设置响应的 HTTP 状态码 | `return "Error", 404` |
| **自定义响应** | 完全自定义响应 | `Response("data", status=200)` |


---
