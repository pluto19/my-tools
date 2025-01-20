import json
import argparse
from typing import Dict, Any

class PostmanToBrunoEnvironment:
    def __init__(self, postman_file: str):
        self.postman_file = postman_file
        self.bruno_data = {
            "type": "environment",
            "name": "",
            "data": {}
        }

    def load_postman(self) -> Dict[str, Any]:
        """加载Postman环境文件"""
        try:
            with open(self.postman_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            raise ValueError(f"无法加载Postman环境文件: {str(e)}")

    def convert(self) -> Dict[str, Any]:
        """执行转换"""
        postman_data = self.load_postman()
        
        # 设置环境名称
        self.bruno_data["name"] = postman_data.get("name", "未命名环境")
        
        # 转换变量
        for value in postman_data.get("values", []):
            key = value.get("key", "")
            val = value.get("value", "")
            enabled = value.get("enabled", True)
            
            if enabled and key:
                self.bruno_data["data"][key] = val
        
        return self.bruno_data

def main():
    parser = argparse.ArgumentParser(description='将Postman环境转换为Bruno格式')
    subparsers = parser.add_subparsers(dest='command', required=True)

    # 单个文件转换
    single_parser = subparsers.add_parser('single', help='转换单个环境文件')
    single_parser.add_argument('input', help='Postman环境文件路径')
    single_parser.add_argument('-o', '--output', help='输出文件路径', default='output.bruno.environment.json')

    # 批量转换
    batch_parser = subparsers.add_parser('batch', help='批量转换环境文件')
    batch_parser.add_argument('input_dir', help='包含Postman环境文件的目录')
    batch_parser.add_argument('-o', '--output_dir', help='输出目录', default='bruno_exports')
    
    args = parser.parse_args()
    
    try:
        if args.command == 'single':
            converter = PostmanToBrunoEnvironment(args.input)
            result = converter.convert()
            
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
            
            print(f"转换成功！结果已保存至 {args.output}")
        elif args.command == 'batch':
            import os
            import glob
            
            # 创建输出目录
            os.makedirs(args.output_dir, exist_ok=True)
            
            # 遍历输入目录
            for file in glob.glob(os.path.join(args.input_dir, '*.environment.json')):
                try:
                    converter = PostmanToBrunoEnvironment(file)
                    result = converter.convert()
                    
                    # 生成输出文件名
                    base_name = os.path.basename(file).replace('.environment.json', '.bruno.environment.json')
                    output_file = os.path.join(args.output_dir, base_name)
                    
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(result, f, indent=2)
                    
                    print(f"转换成功：{file} -> {output_file}")
                except Exception as e:
                    print(f"转换失败 {file}: {str(e)}")
            
            print("批量转换完成！")
            
    except Exception as e:
        print(f"转换失败: {str(e)}")

if __name__ == "__main__":
    main()