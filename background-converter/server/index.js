const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { convertImage } = require('./converter');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// 启用CORS
app.use(cors());

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));
console.log('静态文件目录:', path.join(__dirname, '..', 'public'));

// 处理图片上传和转换
app.post('/convert', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '未找到上传的图片' });
        }

        const backgroundColor = req.body.backgroundColor || '#ffffff';
        const originalFormat = req.body.originalFormat || 'png';

        const result = await convertImage(
            req.file.buffer,
            backgroundColor,
            originalFormat
        );

        // 设置正确的Content-Type
        const mimeType = `image/${result.format}`;
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename=converted.${result.format}`);
        
        res.send(result.buffer);
    } catch (error) {
        console.error('转换失败:', error);
        res.status(500).json({ error: '图片转换失败' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});