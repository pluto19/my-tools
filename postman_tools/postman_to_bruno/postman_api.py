import requests
import json
import argparse
from typing import Dict, Any

class PostmanAPI:
    BASE_URL = "https://api.getpostman.com"
    
    def __init__(self, api_key: str):
        self.headers = {
            "X-Api-Key": api_key,
            "Content-Type": "application/json"
        }

    def get_all_collections(self) -> Dict[str, Any]:
        """获取所有集合"""
        url = f"{self.BASE_URL}/collections"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_collection(self, collection_uid: str) -> Dict[str, Any]:
        """获取指定集合"""
        url = f"{self.BASE_URL}/collections/{collection_uid}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def export_all_collections(self, output_dir: str = "postman_exports"):
        """导出所有集合"""
        collections = self.get_all_collections()
        
        for collection in collections.get("collections", []):
            uid = collection["uid"]
            name = collection["name"]
            collection_data = self.get_collection(uid)
            
            # 创建输出目录
            import os
            os.makedirs(output_dir, exist_ok=True)
            
            # 保存文件
            file_path = os.path.join(output_dir, f"{name}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(collection_data, f, indent=2)
            
            print(f"已导出集合: {name} -> {file_path}")

    def get_all_environments(self) -> Dict[str, Any]:
        """获取所有环境"""
        url = f"{self.BASE_URL}/environments"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def get_environment(self, environment_uid: str) -> Dict[str, Any]:
        """获取指定环境"""
        url = f"{self.BASE_URL}/environments/{environment_uid}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def export_all_environments(self, output_dir: str = "postman_exports"):
        """导出所有环境"""
        environments = self.get_all_environments()
        
        for environment in environments.get("environments", []):
            uid = environment["uid"]
            name = environment["name"]
            environment_data = self.get_environment(uid)
            
            # 创建输出目录
            import os
            os.makedirs(output_dir, exist_ok=True)
            
            # 保存文件
            file_path = os.path.join(output_dir, f"{name}.environment.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(environment_data, f, indent=2)
            
            print(f"已导出环境: {name} -> {file_path}")

def main():
    parser = argparse.ArgumentParser(description='通过Postman API导出数据')
    subparsers = parser.add_subparsers(dest='command', required=True)

    # 导出集合
    collections_parser = subparsers.add_parser('collections', help='导出所有集合')
    collections_parser.add_argument('api_key', help='Postman API Key')
    collections_parser.add_argument('-o', '--output', help='输出目录', default='postman_exports')

    # 导出环境
    environments_parser = subparsers.add_parser('environments', help='导出所有环境')
    environments_parser.add_argument('api_key', help='Postman API Key')
    environments_parser.add_argument('-o', '--output', help='输出目录', default='postman_exports')
    
    args = parser.parse_args()
    
    try:
        api = PostmanAPI(args.api_key)
        if args.command == 'collections':
            api.export_all_collections(args.output)
            print("所有集合导出完成！")
        elif args.command == 'environments':
            api.export_all_environments(args.output)
            print("所有环境导出完成！")
    except Exception as e:
        print(f"导出失败: {str(e)}")

if __name__ == "__main__":
    main()