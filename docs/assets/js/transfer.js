const CHUNK_SIZE = 16384; // 16KB chunks

// 发送文件
async function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        showError('请选择文件');
        return;
    }

    // 重新初始化peer连接以生成新的取件码
    if (peer) {
        peer.destroy();
    }
    
    const output = document.getElementById('codeOutput');
    output.innerHTML = '<div class="status-message info"><p>正在生成取件码...</p></div>';
    
    initPeer();
    await new Promise((resolve) => {
        peer.on('open', () => {
            output.innerHTML = `
                <div class="file-info">
                    <p>取件码: <span class="code">${peer.id}</span></p>
                    <p>文件名: ${file.name}</p>
                    <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div class="status-message info">
                    <p>等待接收方连接...</p>
                </div>
            `;
            resolve();
        });
    });

    peer.on('connection', (conn) => {
        // 只更新状态消息
        const statusDiv = output.querySelector('.status-message');
        statusDiv.className = 'status-message success';
        statusDiv.innerHTML = '<p>接收方已连接,开始传输...</p>';

        conn.on('open', async () => {
            // 发送文件信息
            conn.send(JSON.stringify({
                type: 'file-info',
                name: file.name,
                size: file.size
            }));

            // 准备进度条
            const uploadProgress = document.querySelector('#uploadProgress');
            const progressBar = uploadProgress.querySelector('.progress-bar');
            uploadProgress.style.display = 'block';

            try {
                let offset = 0;
                while (offset < file.size) {
                    const slice = file.slice(offset, offset + CHUNK_SIZE);
                    const buffer = await slice.arrayBuffer();
                    
                    // 检查连接状态
                    if (!conn.open) {
                        throw new Error('连接已断开');
                    }
                    
                    conn.send(buffer);
                    offset += buffer.byteLength;
                    const progress = (offset / file.size) * 100;
                    progressBar.style.width = progress + '%';
                }

                // 只更新状态消息
                const statusDiv = output.querySelector('.status-message');
                statusDiv.className = 'status-message success';
                statusDiv.innerHTML = '<p>文件发送完成!</p>';
            } catch (err) {
                showError('发送文件时出错: ' + err.message);
            }
        });

        conn.on('close', () => {
            showError('接收方已断开连接');
        });

        conn.on('error', (err) => {
            showError('传输错误: ' + err.message);
        });
    });
}

// 接收文件
async function receiveFile() {
    const code = document.getElementById('codeInput').value.trim().toUpperCase();
    if (!code) {
        showError('请输入取件码');
        return;
    }

    if (!peer || !peer.id) {
        showError('连接未就绪,请刷新页面重试');
        return;
    }

    const output = document.getElementById('downloadOutput');
    output.innerHTML = '<div class="status-message info"><p>正在连接发送方...</p></div>';
    
    const conn = connectToPeer(code);
    if (!conn) return;

    const downloadProgress = document.querySelector('#downloadProgress');
    const progressBar = downloadProgress.querySelector('.progress-bar');
    let fileInfo = null;
    let receivedSize = 0;
    let chunks = [];

    conn.on('open', () => {
        downloadProgress.style.display = 'block';
        output.querySelector('.status-message').innerHTML = '<p>已连接到发送方,等待接收文件...</p>';
    });

    conn.on('data', (data) => {
        try {
            if (typeof data === 'string') {
                fileInfo = JSON.parse(data);
                chunks = [];
                receivedSize = 0;
                
                // 显示文件信息和状态
                output.innerHTML = `
                    <div class="file-info">
                        <p>文件名: ${fileInfo.name}</p>
                        <p>文件大小: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div class="status-message info">
                        <p>正在接收文件...</p>
                    </div>
                `;
            } else {
                chunks.push(data);
                receivedSize += data.byteLength;
                const progress = (receivedSize / fileInfo.size) * 100;
                progressBar.style.width = progress + '%';

                if (receivedSize === fileInfo.size) {
                    const blob = new Blob(chunks);
                    
                    // 更新状态信息
                    const statusDiv = output.querySelector('.status-message');
                    statusDiv.className = 'status-message success';
                    statusDiv.innerHTML = `
                        <p>文件接收完成!</p>
                        <p>正在开始下载...</p>
                    `;

                    try {
                        // 使用 FileSaver.js 的 saveAs 函数触发下载
                        saveAs(blob, fileInfo.name);
                        
                        // 保存 URL 用于备份下载链接
                        const url = URL.createObjectURL(blob);
                        setTimeout(() => {
                            statusDiv.innerHTML = `
                                <p>文件接收完成!</p>
                                <p>如果下载没有开始,请<a href="${url}" download="${fileInfo.name}" class="download-link">点击这里重新下载</a></p>
                            `;
                        }, 1000);
                    } catch (err) {
                        console.error('下载失败:', err);
                        showError('文件下载失败: ' + err.message);
                    }

                    chunks = [];
                }
            }
        } catch (err) {
            showError('接收文件时出错: ' + err.message);
        }
    });

    conn.on('close', () => {
        if (!fileInfo || receivedSize < fileInfo.size) {
            showError('发送方已断开连接');
        }
    });

    conn.on('error', (err) => {
        showError('传输错误: ' + err.message);
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initPeer();
});