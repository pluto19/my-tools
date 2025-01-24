'use client'

import { useState } from 'react'
import { PDFDocument, degrees } from 'pdf-lib'

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [reverse, setReverse] = useState(false)
  const [rotate, setRotate] = useState(false)
  const [skipLast, setSkipLast] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (setter: (file: File | null) => void) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        setter(e.target.files[0])
      }
    }

  const mergePDFs = async () => {
    if (!file1 || !file2) return

    setLoading(true)
    setProgress(0)

    try {
      // 读取PDF文件
      const [pdf1Bytes, pdf2Bytes] = await Promise.all([
        file1.arrayBuffer(),
        file2.arrayBuffer()
      ])
      setProgress(20)

      // 加载PDF
      const [pdf1, pdf2] = await Promise.all([
        PDFDocument.load(pdf1Bytes),
        PDFDocument.load(pdf2Bytes)
      ])
      setProgress(40)

      // 创建新PDF
      const mergedPdf = await PDFDocument.create()
      setProgress(50)

      // 获取页面
      const pages1 = pdf1.getPages()
      let pages2 = pdf2.getPages()
      if (skipLast) {
        pages2 = pages2.slice(0, -1)
      }
      const maxPages = Math.max(pages1.length, pages2.length)

      // 交叉合并页面
      for (let i = 0; i < maxPages; i++) {
        if (i < pages1.length) {
          const [page] = await mergedPdf.copyPages(pdf1, [i])
          mergedPdf.addPage(page)
        }
        if (i < pages2.length) {
          const pageIndex = reverse ? pages2.length - 1 - i : i
          const [page] = await mergedPdf.copyPages(pdf2, [pageIndex])
          if (rotate) {
            page.setRotation(degrees(page.getRotation().angle + 180))
          }
          mergedPdf.addPage(page)
        }
        setProgress(50 + (i / maxPages) * 40)
      }

      // 保存并下载
      const mergedPdfBytes = await mergedPdf.save()
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'merged.pdf'
      link.click()

      setProgress(100)
      alert('PDF合并成功！')
    } catch (error) {
      alert('PDF合并失败：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6 sm:px-8 lg:px-10 flex items-center justify-center">
        <div className="max-w-[144rem] mx-auto bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">PDF交叉合并工具</h1>
          <p className="text-sm text-gray-500 mb-4 text-center">浏览器本地运行，文件安全</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-blue-500 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange(setFile1)}
                className="hidden"
                id="file1"
              />
              <label htmlFor="file1" className="cursor-pointer">
                <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-gray-700">选择正面PDF文件</span>
                {file1 && (
                  <p className="text-sm text-gray-500 mt-2">{file1.name}</p>
                )}
              </label>
            </div>

            <div className="border-2 border-dashed border-blue-500 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange(setFile2)}
                className="hidden"
                id="file2"
              />
              <label htmlFor="file2" className="cursor-pointer">
                <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-gray-700">选择反面PDF文件</span>
                {file2 && (
                  <p className="text-sm text-gray-500 mt-2">{file2.name}</p>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reverse}
                  onChange={(e) => setReverse(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700">反向合并反面PDF</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">当反面PDF是从后向前扫描时使用</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={rotate}
                  onChange={(e) => setRotate(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700">旋转180度反面PDF的页面</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">当反面PDF页面上下颠倒时使用</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={skipLast}
                  onChange={(e) => setSkipLast(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-blue-600"
                />
                <span className="text-gray-700">跳过反面文件的最后一页</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">当反面PDF比正面多出一页时使用</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={mergePDFs}
            disabled={loading || !file1 || !file2}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '正在合并...' : '合并PDF'}
          </button>
        </div>

        {loading && (
          <div className="mt-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
