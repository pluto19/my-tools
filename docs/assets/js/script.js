// 处理文件选择和拖放
function setupFileInput(inputId) {
  const container = document.getElementById(inputId);
  const fileInput = container.querySelector('input[type="file"]');
  const dropZone = container.querySelector('.drop-zone');
  const selectedFile = container.querySelector('.selected-file');

  async function updateFileName() {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      container.classList.add('has-file');
      
      // 添加loading状态
      container.classList.add('loading');
      selectedFile.innerHTML = `
        <div class="loading-spinner">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
          </svg>
        </div>
        <div>正在加载 ${file.name}...</div>
      `;
      
      try {
        const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
        // 移除loading状态
        container.classList.remove('loading');
        const pageCount = pdfDoc.getPageCount();
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        
        selectedFile.innerHTML = `
          <div>已选择: ${file.name}</div>
          <div class="file-info">
            <svg viewBox="0 0 384 512" width="14" height="14" style="fill: #6c757d;">
              <path d="M369.9 97.9L286 14C277 5 264.8-.1 252.1-.1H48C21.5 0 0 21.5 0 48v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48V131.9c0-12.7-5.1-25-14.1-34zM332.1 128H256V51.9l76.1 76.1zM48 464V48h160v104c0 13.3 10.7 24 24 24h104v288H48z"/>
            </svg>
            <span>${pageCount} 页</span>
            <span>|</span>
            <span>${fileSize} MB</span>
          </div>
        `;
      } catch (error) {
        container.classList.remove('loading');
        selectedFile.innerHTML = `
          <div style="color: #dc3545;">
            <i class="fas fa-exclamation-circle"></i>
            无效的PDF文件
          </div>
        `;
      }
    } else {
      container.classList.remove('has-file');
      selectedFile.textContent = '';
    }
  }

  fileInput.addEventListener('change', updateFileName);

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      container.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      container.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0 && files[0].type === 'application/pdf') {
      fileInput.files = files;
      updateFileName();
    }
  });
}

// 重置文件选择框
function resetFileInputs() {
  document.getElementById('file1').value = '';
  document.getElementById('file2').value = '';
  document.querySelectorAll('.file-input').forEach(input => {
    input.classList.remove('has-file');
    input.querySelector('.selected-file').textContent = '';
  });
}

// 初始化文件输入
setupFileInput('file-input-1');
setupFileInput('file-input-2');
resetFileInputs();

// 初始化选项状态
document.getElementById('reverseB').checked = false;
document.getElementById('rotateB').checked = false;
document.getElementById('skipLastB').checked = false;

async function mergePdfs() {
  const file1 = document.getElementById('file1').files[0];
  const file2 = document.getElementById('file2').files[0];
  const reverseB = document.getElementById('reverseB').checked;
  const rotateB = document.getElementById('rotateB').checked;
  const skipLastB = document.getElementById('skipLastB').checked;
  const progressBar = document.querySelector('.progress');
  const progressBarFill = document.querySelector('.progress-bar-fill');
  const progressText = document.querySelector('.progress-text');

  if (!file1 || !file2) {
    showAlert('error', '请选择两个PDF文件');
    return;
  }

  try {
    progressBar.style.display = 'block';
    progressBarFill.style.width = '0%';
    progressText.textContent = '正在读取PDF文件...';

    // 读取PDF文件
    const [pdf1Bytes, pdf2Bytes] = await Promise.all([
      file1.arrayBuffer(),
      file2.arrayBuffer()
    ]);

    progressBarFill.style.width = '30%';
    progressText.textContent = '正在加载PDF...';

    // 加载PDF
    const [pdf1, pdf2] = await Promise.all([
      PDFLib.PDFDocument.load(pdf1Bytes),
      PDFLib.PDFDocument.load(pdf2Bytes)
    ]);

    progressBarFill.style.width = '50%';
    progressText.textContent = '正在合并页面...';

    // 创建新PDF
    const mergedPdf = await PDFLib.PDFDocument.create();

    // 获取页面数量
    const pages1 = pdf1.getPages();
    let pages2 = pdf2.getPages();
    if (skipLastB) {
      pages2 = pages2.slice(0, -1);
    }
    const maxPages = Math.max(pages1.length, pages2.length);

    // 交叉合并页面
    for (let i = 0; i < maxPages; i++) {
      const progress = 50 + (i / maxPages) * 40;
      progressBarFill.style.width = `${progress}%`;
      progressText.textContent = `正在处理第 ${i + 1}/${maxPages} 页...`;

      if (i < pages1.length) {
        const [page] = await mergedPdf.copyPages(pdf1, [i]);
        mergedPdf.addPage(page);
      }
      if (i < pages2.length) {
        const pageIndex = reverseB ? pages2.length - 1 - i : i;
        const [page] = await mergedPdf.copyPages(pdf2, [pageIndex]);
        if (rotateB) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(PDFLib.degrees(currentRotation + 180));
        }
        mergedPdf.addPage(page);
      }
    }

    progressBarFill.style.width = '90%';
    progressText.textContent = '正在生成最终PDF...';

    // 生成并下载合并后的PDF
    const mergedPdfBytes = await mergedPdf.save({
      useObjectStreams: true,
      compressPDF: true
    });
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'merged.pdf';
    link.click();
    
    progressBarFill.style.width = '100%';
    progressText.textContent = '处理完成！';
    
    setTimeout(() => {
      progressBar.style.display = 'none';
    }, 2000);

    showAlert('success', 'PDF合并成功！文件已开始下载。');
  } catch (error) {
    console.error(error);
    progressBar.style.display = 'none';
    showAlert('error', 'PDF合并失败：' + error.message);
  }
}

function showAlert(type, message) {
  const alertBox = document.createElement('div');
  alertBox.className = `alert ${type}`;
  alertBox.innerHTML = `
    <span class="icon">${type === 'success' ? '✅' : '❌'}</span>
    <span class="message">${message}</span>
  `;
  
  document.body.appendChild(alertBox);
  
  // 自动消失
  setTimeout(() => {
    alertBox.remove();
  }, 5000);
}

// PWA支持
let deferredPrompt;

// 注册Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('ServiceWorker注册成功:', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker注册失败:', error);
      });
  });
}

// 处理PWA安装事件
window.addEventListener('beforeinstallprompt', (e) => {
  // 存储事件以便浏览器可以触发安装
  deferredPrompt = e;
});

// 监听应用安装完成事件
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  showAlert('success', '应用已成功安装！');
});