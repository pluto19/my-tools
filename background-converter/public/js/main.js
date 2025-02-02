// 全局变量
let currentImage = null;
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
    const backgroundColor = document.getElementById('backgroundColor').value;

    try {
        // 创建FormData对象
        const formData = new FormData();
        
        // 从canvas获取当前图片数据
        canvas.toBlob(async (blob) => {
            formData.append('image', blob);
            formData.append('backgroundColor', backgroundColor);
            formData.append('originalFormat', 'ico'); // 强制转换为ICO格式

            try {
                const response = await fetch('http://localhost:3000/convert', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('转换失败');
                }

                // 获取blob数据
                const resultBlob = await response.blob();
                
                // 创建下载链接
                const url = window.URL.createObjectURL(resultBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${originalFileName.split('.')[0]}-with-background.ico`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('下载失败:', error);
                alert('下载失败,请重试');
            }
        }, 'image/png');
    } catch (error) {
        console.error('保存文件失败:', error);
        alert('保存文件失败,请重试');
    }
}