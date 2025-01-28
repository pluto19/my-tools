// 全局变量存储选中的文件
let selectedFiles = [];

// 初始化事件监听
document.addEventListener('DOMContentLoaded', () => {
  // 质量滑块事件
  const qualitySlider = document.getElementById('quality');
  const qualityValue = document.getElementById('qualityValue');
  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
  });

  // 文件选择事件
  const fileInput = document.getElementById('imageFiles');
  const dropZone = document.querySelector('.drop-zone');
  const selectedFilesDiv = document.querySelector('.selected-files');

  // 拖放处理
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // 文件处理函数
  function handleFiles(files) {
    selectedFiles = Array.from(files);
    selectedFilesDiv.innerHTML = '';
    
    // 更新文件选择区域的显示文本
    const dropZoneSpan = dropZone.querySelector('span');
    if (files.length > 0) {
      dropZoneSpan.innerHTML = `已选择 ${files.length} 个文件<br>点击这里或拖放文件以添加更多`;
    } else {
      dropZoneSpan.innerHTML = '选择图片文件<br>点击选择或拖放图片文件到这里<br>支持多个文件';
    }
    
    selectedFiles.forEach((file, index) => {
      const fileDiv = document.createElement('div');
      fileDiv.className = 'selected-file';
      fileDiv.innerHTML = `
        <span>${file.name}</span>
        <button onclick="removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      `;
      selectedFilesDiv.appendChild(fileDiv);
    });

    // 显示第一个文件的预览
    if (selectedFiles.length > 0) {
      showPreview(selectedFiles[0]);
    }
  }
});

// 移除文件
function removeFile(index) {
  selectedFiles.splice(index, 1);
  document.querySelector('.selected-files').children[index].remove();
  
  // 更新文件选择区域的显示文本
  const dropZoneSpan = document.querySelector('.drop-zone span');
  if (selectedFiles.length > 0) {
    dropZoneSpan.innerHTML = `已选择 ${selectedFiles.length} 个文件<br>点击这里或拖放文件以添加更多`;
  } else {
    dropZoneSpan.innerHTML = '选择图片文件<br>点击选择或拖放图片文件到这里<br>支持多个文件';
  }

  // 更新预览
  if (selectedFiles.length > 0) {
    showPreview(selectedFiles[0]);
  } else {
    document.getElementById('previewOriginal').src = '';
    document.getElementById('previewConverted').src = '';
  }
}

// 显示预览
async function showPreview(file) {
  const previewOriginal = document.getElementById('previewOriginal');
  const previewConverted = document.getElementById('previewConverted');
  
  // 显示原图
  previewOriginal.src = URL.createObjectURL(file);
  
  // 显示转换后的预览
  try {
    const converted = await convertSingleImage(file, true);
    previewConverted.src = URL.createObjectURL(converted);
  } catch (error) {
    console.error('预览生成失败:', error);
  }
}

// 转换单个图片
async function convertSingleImage(file, isPreview = false) {
  const quality = parseInt(document.getElementById('quality').value) / 100;
  const outputFormat = document.getElementById('outputFormat').value;
  
  // 如果是HEIC格式，先转换为Blob
  let imageBlob = file;
  if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
    try {
      imageBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg'
      });
    } catch (error) {
      throw new Error('HEIC转换失败: ' + error.message);
    }
  }

  // 压缩配置
  const options = {
    maxSizeMB: isPreview ? 0.3 : 10,
    maxWidthOrHeight: isPreview ? 800 : 4096,
    useWebWorker: true,
    fileType: outputFormat,
    initialQuality: quality
  };

  try {
    return await imageCompression(imageBlob, options);
  } catch (error) {
    throw new Error('图片压缩失败: ' + error.message);
  }
}

// 批量转换图片
async function convertImages() {
  if (selectedFiles.length === 0) {
    alert('请先选择图片文件');
    return;
  }

  const progressBar = document.querySelector('.progress-bar-fill');
  const progressText = document.querySelector('.progress-text');
  const convertButton = document.querySelector('button');
  
  progressBar.style.width = '0%';
  progressText.style.display = 'block';
  convertButton.disabled = true;

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      progressText.textContent = `正在处理 ${file.name} (${i + 1}/${selectedFiles.length})`;
      progressBar.style.width = `${((i + 1) / selectedFiles.length) * 100}%`;

      const convertedBlob = await convertSingleImage(file);
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = URL.createObjectURL(convertedBlob);
      link.download = `${file.name.split('.')[0]}_converted.${document.getElementById('outputFormat').value.split('/')[1]}`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    progressText.textContent = '转换完成！';
    setTimeout(() => {
      progressText.style.display = 'none';
      progressBar.style.width = '0%';
    }, 3000);
  } catch (error) {
    alert('转换过程中出错: ' + error.message);
    progressText.textContent = '转换失败';
  } finally {
    convertButton.disabled = false;
  }
}