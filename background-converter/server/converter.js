const sharp = require('sharp');
const Jimp = require('jimp');

async function convertImage(inputBuffer, backgroundColor, originalFormat) {
    // 首先转换为PNG并添加背景色
    const pngBuffer = await sharp(inputBuffer)
        .flatten({ background: backgroundColor })
        .png()
        .toBuffer();

    // 如果目标格式是ICO,使用Jimp进行转换
    if (originalFormat.toLowerCase() === 'ico') {
        try {
            // 读取PNG buffer
            const image = await Jimp.read(pngBuffer);
            
            // 获取原始尺寸
            const width = image.getWidth();
            const height = image.getHeight();

            // 创建ICO文件头
            const header = Buffer.alloc(6);
            header.writeUInt16LE(0, 0); // 保留字段,必须为0
            header.writeUInt16LE(1, 2); // 图像类型,1表示ICO
            header.writeUInt16LE(1, 4); // 图像数量

            // 获取PNG格式的图像数据
            const imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

            // 创建目录条目
            const entry = Buffer.alloc(16);
            const offset = header.length + 16; // 图像数据的偏移量

            // 写入目录条目
            entry.writeUInt8(width > 255 ? 0 : width, 0); // 宽度
            entry.writeUInt8(height > 255 ? 0 : height, 1); // 高度
            entry.writeUInt8(0, 2); // 调色板颜色数
            entry.writeUInt8(0, 3); // 保留字段
            entry.writeUInt16LE(1, 4); // 色彩平面数
            entry.writeUInt16LE(32, 6); // 位深度
            entry.writeUInt32LE(imageBuffer.length, 8); // 图像大小
            entry.writeUInt32LE(offset, 12); // 图像数据偏移量

            // 合并所有部分创建最终的ICO文件
            const icoBuffer = Buffer.concat([header, entry, imageBuffer]);

            return {
                buffer: icoBuffer,
                format: 'ico'
            };
        } catch (error) {
            console.error('ICO转换失败:', error);
            // 如果ICO转换失败,返回PNG格式
            return {
                buffer: pngBuffer,
                format: 'png'
            };
        }
    }

    // 对于其他格式,尝试转换回原始格式
    try {
        const outputBuffer = await sharp(pngBuffer)
            .toFormat(originalFormat)
            .toBuffer();

        return {
            buffer: outputBuffer,
            format: originalFormat
        };
    } catch (error) {
        console.warn(`无法转换为${originalFormat}格式,将使用PNG格式`, error);
        return {
            buffer: pngBuffer,
            format: 'png'
        };
    }
}

module.exports = {
    convertImage
};