import json
import os
import argparse
from typing import Dict, Any

class PostmanToHttpConverter:
    def __init__(self, postman_file: str, output_dir: str):
        self.postman_file = postman_file
        self.output_dir = output_dir

    def load_postman(self) -> Dict[str, Any]:
        """加载Postman JSON文件"""
        try:
            with open(self.postman_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 处理包含collection字段的情况
                if "collection" in data:
                    return data["collection"]
                return data
        except Exception as e:
            raise ValueError(f"无法加载Postman文件: {str(e)}")

    def convert_headers(self, headers: list) -> str:
        """转换请求头为HTTP格式"""
        return '\n'.join(f'{h["key"]}: {h["value"]}' for h in headers)

    def convert_body(self, body: Dict[str, Any]) -> str:
        """转换请求体为HTTP格式"""
        if not body:
            return ""
        
        if body.get("mode") == "raw":
            return f"\n\n{body.get('raw', '')}"
        return ""

    def convert_request(self, item: Dict[str, Any]) -> str:
        """转换单个请求为HTTP格式"""
        request = item.get("request", {})
        method = request.get("method", "GET")
        url = request.get("url", {})
        
        # 处理url可能是字符串或对象的情况
        if isinstance(url, str):
            url_str = url
        else:
            url_str = url.get("raw", "")
            
        headers = self.convert_headers(request.get("header", []))
        body = self.convert_body(request.get("body", {}))

        http_request = [
            f"### {item.get('name', '未命名请求')}",
            f"{method} {url_str}"
        ]
        
        if headers:
            http_request.append(headers)
        
        if body:
            http_request.append(body)
        
        return '\n'.join(http_request) + "\n\n"

    def convert_folder(self, items: list, folder_name: str) -> str:
        """转换文件夹中的请求"""
        content = []
        for item in items:
            if "item" in item:  # 这是一个子文件夹
                subfolder_content = self.convert_folder(item["item"], item["name"])
                content.append(subfolder_content)
            else:  # 这是一个请求
                content.append(self.convert_request(item))
        
        return f"## {folder_name}\n\n" + ''.join(content)

    def convert(self):
        """执行转换"""
        postman_data = self.load_postman()
        
        # 确保输出目录存在
        os.makedirs(self.output_dir, exist_ok=True)
        
        # 获取集合名称
        collection_name = postman_data.get("info", {}).get("name", "未命名集合")
        output_file = os.path.join(self.output_dir, f"{collection_name}.http")
        
        content = []
        for item in postman_data.get("item", []):
            if "item" in item:  # 这是一个文件夹
                content.append(self.convert_folder(item["item"], item["name"]))
            else:  # 这是一个请求
                content.append(self.convert_request(item))
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(''.join(content))
            print(f"转换成功!结果已保存至 {output_file}")

def main():
    parser = argparse.ArgumentParser(description='将Postman集合转换为IntelliJ HTTP Client格式')
    parser.add_argument('input', help='Postman JSON文件路径')
    parser.add_argument('-o', '--output', help='输出目录路径', default='D:/data/my/my-httpclient')
    
    args = parser.parse_args()
    
    try:
        converter = PostmanToHttpConverter(args.input, args.output)
        converter.convert()
    except Exception as e:
        print(f"转换失败: {str(e)}")

if __name__ == "__main__":
    main()