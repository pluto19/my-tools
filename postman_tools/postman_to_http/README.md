# Postman 到 IntelliJ HTTP Client 转换器

该工具用于将Postman集合导出文件(.json)转换为IntelliJ HTTP Client格式(.http)。

## 功能特点

1. 支持将Postman v2.1格式的集合转换为.http文件
2. 保持原有的请求组织结构
3. 支持转换的内容包括:
   - 请求方法
   - URL
   - 请求头
   - 请求体
   - 请求名称和描述
4. 支持批量转换多个Postman集合

## 安装

1. 确保已安装Python 3.7或更高版本
2. 克隆本仓库或下载代码
3. 无需安装额外依赖,仅使用Python标准库

## 使用方法

### 转换单个文件

```bash
python postman_to_http.py path/to/postman.json -o output_directory
```

参数说明:
- `path/to/postman.json`: Postman导出的JSON文件路径
- `-o output_directory`: 可选,指定输出目录路径,默认为`D:/data/my/my-httpclient`

### 批量转换

使用shell命令批量转换目录下的所有Postman文件:

```bash
for file in path/to/postman/files/*.json; do
    python postman_to_http.py "$file"
done
```

## 输出格式

转换后的.http文件遵循IntelliJ HTTP Client格式规范:

```http
### 请求名称
POST https://api.example.com/endpoint
Content-Type: application/json

{
    "key": "value"
}

### 另一个请求
GET https://api.example.com/data
Authorization: Bearer token
```

## 依赖

- Python 3.7+
- 标准库:
  - json
  - os
  - argparse

## 注意事项

1. 输出文件将使用Postman集合的名称,自动添加.http扩展名
2. 如果输出目录不存在,将自动创建
3. 支持中文文件名
4. 暂不支持:
   - 环境变量
   - 测试脚本
   - 预请求脚本
   - 认证信息的自动处理

## 使用建议

1. 建议在转换前确保Postman集合已正确导出为JSON格式
2. 检查生成的.http文件是否包含所有必要的请求信息
3. 在IntelliJ IDEA中使用时,可以利用环境变量功能管理不同环境的配置

## 贡献

欢迎提交Issue和PR!