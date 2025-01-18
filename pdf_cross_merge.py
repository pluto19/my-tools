import sys
from PyPDF2 import PdfReader, PdfWriter

def merge_pdfs(a_path, b_path, output_path, reverse_b=False):
    """
    交叉合并两个PDF文件
    
    参数:
        a_path (str): 第一个PDF文件路径
        b_path (str): 第二个PDF文件路径
        output_path (str): 输出文件路径
        reverse_b (bool): 是否反向合并第二个PDF
    """
    writer = PdfWriter()
    a_pdf = PdfReader(a_path)
    b_pdf = PdfReader(b_path)

    # 获取两个PDF的页数
    a_pages = len(a_pdf.pages)
    b_pages = len(b_pdf.pages)
    max_pages = max(a_pages, b_pages)

    # 交叉合并页面
    for i in range(max_pages):
        if i < a_pages:
            writer.add_page(a_pdf.pages[i])
        if i < b_pages:
            # 根据reverse_b参数决定b的页面顺序
            b_page_index = -1 - i if reverse_b else i
            writer.add_page(b_pdf.pages[b_page_index])

    # 写入输出文件
    with open(output_path, "wb") as output_pdf:
        writer.write(output_pdf)

if __name__ == "__main__":
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print("Usage: python pdf_cross_merge.py a.pdf b.pdf output.pdf [--reverse-b]")
        sys.exit(1)

    a_path = sys.argv[1]
    b_path = sys.argv[2]
    output_path = sys.argv[3]
    reverse_b = len(sys.argv) == 5 and sys.argv[4] == "--reverse-b"

    merge_pdfs(a_path, b_path, output_path, reverse_b)
    print(f"PDFs merged successfully! Output saved to {output_path}")
    if reverse_b:
        print("Second PDF was merged in reverse order")