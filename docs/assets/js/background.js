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

// 创建ICO文件
async function createIcoFile(pngBlob) {
  // 获取PNG数据
  const pngArrayBuffer = await pngBlob.arrayBuffer();
  const pngData = new Uint8Array(pngArrayBuffer);

  // 创建ICO文件头
  const header = new Uint8Array(6);
  header.set([0, 0]); // 保留字段,必须为0
  header.set([1, 0], 2); // 图像类型,1表示ICO
  header.set([1, 0], 4); // 图像数量

  // 创建目录条目
  const entry = new Uint8Array(16);
  const width = canvas.width > 255 ? 0 : canvas.width;
  const height = canvas.height > 255 ? 0 : canvas.height;
  
  entry[0] = width; // 宽度
  entry[1] = height; // 高度
  entry[2] = 0; // 调色板颜色数
  entry[3] = 0; // 保留字段
  entry[4] = 1; // 色彩平面数
  entry[5] = 0;
  entry[6] = 32; // 位深度
  entry[7] = 0;
  
  // 图像大小(4字节)
  const size = pngData.length;
  entry[8] = size & 0xFF;
  entry[9] = (size >> 8) & 0xFF;
  entry[10] = (size >> 16) & 0xFF;
  entry[11] = (size >> 24) & 0xFF;
  
  // 图像数据偏移量(4字节)
  const offset = header.length + entry.length;
  entry[12] = offset & 0xFF;
  entry[13] = (offset >> 8) & 0xFF;
  entry[14] = (offset >> 16) & 0xFF;
  entry[15] = (offset >> 24) & 0xFF;

  // 合并所有部分
  const icoData = new Uint8Array(header.length + entry.length + pngData.length);
  icoData.set(header, 0);
  icoData.set(entry, header.length);
  icoData.set(pngData, header.length + entry.length);

  return new Blob([icoData], { type: 'image/x-icon' });
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

  try {
    // 显示进度条
    document.querySelector('.progress').style.display = 'block';

    // 先将图片转为PNG格式(带背景色)
    const pngBlob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    let finalBlob;
    let finalExtension;

    // 如果原始文件是ICO或目标格式是ICO
    if (fileExtension === 'ico' || confirm('是否需要转换为ICO格式?')) {
      try {
        finalBlob = await createIcoFile(pngBlob);
        finalExtension = 'ico';
      } catch (error) {
        console.error('ICO转换失败:', error);
        alert('ICO转换失败,将使用PNG格式');
        finalBlob = pngBlob;
        finalExtension = 'png';
      }
    } else {
      finalBlob = pngBlob;
      finalExtension = fileExtension === 'ico' ? 'png' : fileExtension;
    }

    // 创建下载链接
    const url = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-with-background.${finalExtension}`;
    link.click();

    // 清理
    URL.revokeObjectURL(url);
    document.querySelector('.progress').style.display = 'none';
  } catch (e) {
    console.error('保存文件失败:', e);
    alert('保存文件失败,请重试');
    document.querySelector('.progress').style.display = 'none';
  }
}