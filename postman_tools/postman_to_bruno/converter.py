import json
import argparse
from typing import Dict, Any

class PostmanToBrunoConverter:
    def __init__(self, postman_file: str):
        self.postman_file = postman_file
        self.bruno_data = {
            "version": "1",
            "collections": []
        }

    def load_postman(self) -> Dict[str, Any]:
        """加载Postman JSON文件"""
        try:
            with open(self.postman_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise ValueError(f"无法加载Postman文件: {str(e)}")

    def convert_collection(self, collection: Dict[str, Any]) -> Dict[str, Any]:
        """转换单个Postman集合"""
        bruno_collection = {
            "name": collection.get("info", {}).get("name", "未命名集合"),
            "items": []
        }

        for item in collection.get("item", []):
            bruno_item = self.convert_item(item)
            bruno_collection["items"].append(bruno_item)

        return bruno_collection

    def convert_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """转换单个请求项"""
        return {
            "name": item.get("name", "未命名请求"),
            "request": {
                "method": item.get("request", {}).get("method", "GET"),
                "url": item.get("request", {}).get("url", {}).get("raw", ""),
                "headers": self.convert_headers(item.get("request", {}).get("header", [])),
                "body": self.convert_body(item.get("request", {}).get("body", {}))
            }
        }

    def convert_headers(self, headers: list) -> Dict[str, str]:
        """转换请求头"""
        return {h["key"]: h["value"] for h in headers}

    def convert_body(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """转换请求体"""
        if body.get("mode") == "raw":
            return {
                "mode": "raw",
                "raw": body.get("raw", "")
            }
        return {}

    def convert(self) -> Dict[str, Any]:
        """执行转换"""
        postman_data = self.load_postman()
        if isinstance(postman_data, list):
            for collection in postman_data:
                self.bruno_data["collections"].append(self.convert_collection(collection))
        else:
            self.bruno_data["collections"].append(self.convert_collection(postman_data))
        return self.bruno_data

def main():
    parser = argparse.ArgumentParser(description='将Postman集合转换为Bruno格式')
    parser.add_argument('input', help='Postman JSON文件路径')
    parser.add_argument('-o', '--output', help='输出文件路径', default='output.bruno.json')
    
    args = parser.parse_args()
    
    try:
        converter = PostmanToBrunoConverter(args.input)
        result = converter.convert()
        
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2)
        
        print(f"转换成功！结果已保存至 {args.output}")
    except Exception as e:
        print(f"转换失败: {str(e)}")

if __name__ == "__main__":
    main()