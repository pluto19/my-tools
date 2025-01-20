# Postman 到 Bruno 转换器

该工具用于将Postman集合导出文件(.json)转换为Bruno格式。

## 安装

1. 确保已安装Python 3.7或更高版本
2. 克隆本仓库或下载代码
3. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

## 使用

```bash
python -m postman_to_bruno.converter path/to/postman.json -o output.bruno.json
```

参数说明：
- `path/to/postman.json`: Postman导出的JSON文件路径
- `-o output.bruno.json`: 可选，指定输出文件路径，默认为`output.bruno.json`

## 依赖

- Python 3.7+
- 标准库：`json`, `argparse`

## 注意事项

1. 目前支持Postman v2.1格式的集合
2. 转换内容包括：
   - 集合名称
   - 请求方法
   - URL
   - 请求头
   - 原始请求体
3. 暂不支持：
   - 环境变量
   - 测试脚本
   - 预请求脚本
   - 认证信息

## API 使用

1. 获取Postman API Key：
   - 登录Postman
   - 访问 https://go.postman.co/settings/me/api-keys
   - 生成新的API Key

2. 使用API导出所有集合：
   ```bash
   python -m postman_tools.postman_to_bruno.postman_api collections YOUR_API_KEY -o postman_tools/postman_exports
   ```

3. 使用API导出所有环境：
   ```bash
   python -m postman_tools.postman_to_bruno.postman_api environments YOUR_API_KEY -o postman_tools/postman_exports
   ```

## 环境变量转换

1. 转换单个环境文件：
   ```bash
   python -m postman_tools.postman_to_bruno.bruno_environment single path/to/environment.json -o postman_tools/bruno_exports/output.bruno.environment.json
   ```

2. 批量转换所有环境：
   ```bash
   python -m postman_tools.postman_to_bruno.bruno_environment batch postman_tools/postman_exports -o postman_tools/bruno_exports
   ```

## 贡献

欢迎提交Issue和PR！