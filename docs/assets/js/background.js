let currentImage = null;
let originalFileData = null;
let canvas = document.getElementById('previewCanvas');
let ctx = canvas.getContext('2d');

// 文件选择处理
document.getElementById('imageFile').addEventListener('change', handleImageSelect);
document.getElementById('backgroundColor').addEventListener('input', updateBackgroundColor);

// 拖放处理
const dropZone = document.querySelector('.drop-zone');
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    document.getElementById('imageFile').files = e.dataTransfer.files;
    handleImageSelect(e);
  }
});

// 处理图片选择
function handleImageSelect(e) {
  const file = e.target.files[0] || e.dataTransfer.files[0];
  if (!file) return;

  // 显示选中的文件名
  const selectedFile = document.querySelector('.selected-file');
  selectedFile.textContent = file.name;
  selectedFile.style.display = 'block';

  // 如果是ico文件,保存原始文件数据
  if (file.name.toLowerCase().endsWith('.ico')) {
    const reader = new FileReader();
    reader.onload = function(event) {
      originalFileData = event.target.result;
      // 仍然需要加载图片用于预览
      const img = new Image();
      img.onload = function() {
        currentImage = img;
        updateCanvas();
      };
      img.src = originalFileData;
    };
    reader.readAsDataURL(file);
  } else {
    // 非ico文件的处理
    originalFileData = null;
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        currentImage = img;
        updateCanvas();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
}

// 更新背景色
function updateBackgroundColor(e) {
  const colorInput = document.getElementById('backgroundColor');
  const colorValue = document.getElementById('colorValue');
  colorValue.textContent = colorInput.value.toUpperCase();
  updateCanvas();
}

// 更新画布
function updateCanvas() {
  if (!currentImage) return;

  // 设置画布大小
  canvas.width = currentImage.width;
  canvas.height = currentImage.height;

  // 设置背景色
  const backgroundColor = document.getElementById('backgroundColor').value;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制图片
  ctx.drawImage(currentImage, 0, 0);

  // 调整预览容器大小
  const container = document.querySelector('.preview-container');
  const maxWidth = container.clientWidth;
  const maxHeight = 400;
  
  if (canvas.width > maxWidth || canvas.height > maxHeight) {
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    canvas.style.width = canvas.width * scale + 'px';
    canvas.style.height = canvas.height * scale + 'px';
  } else {
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
  }
}

// 下载处理后的图片
async function downloadImage() {
  if (!currentImage) {
    alert('请先选择图片');
    return;
  }

  const originalFileName = document.querySelector('.selected-file').textContent;
  const fileExtension = originalFileName.split('.').pop().toLowerCase();
  const baseName = originalFileName.split('.')[0];

  // 先将图片转为PNG格式(带背景色)
  const pngDataUrl = canvas.toDataURL('image/png');

  try {
    // 如果是ico文件,提示用户将使用PNG格式
    if (fileExtension === 'ico') {
      alert('ICO格式将转换为PNG格式保存,以确保最佳的背景色效果');
      const link = document.createElement('a');
      link.href = pngDataUrl;
      link.download = `${baseName}-with-background.png`;
      link.click();
    } else {
      // 其他格式直接使用对应的MIME类型
      const link = document.createElement('a');
      try {
        const mimeType = `image/${fileExtension}`;
        link.href = canvas.toDataURL(mimeType);
      } catch (e) {
        console.warn(`不支持导出为${fileExtension}格式,使用PNG格式`);
        link.href = pngDataUrl;
      }
      link.download = `${baseName}-with-background.${fileExtension}`;
      link.click();
    }
  } catch (e) {
    console.error('保存文件失败:', e);
    alert('保存文件失败,请重试');
  }
}