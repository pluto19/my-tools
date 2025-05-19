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

// 发送文本
async function sendText() {
    const textContent = document.getElementById('textInput').value.trim();
    if (!textContent) {
        showError('请输入要发送的文本');
        return;
    }

    // 重新初始化peer连接以生成新的取件码
    if (peer) {
        peer.destroy();
    }
    
    const output = document.getElementById('textCodeOutput');
    output.innerHTML = '<div class="status-message info"><p>正在生成取件码...</p></div>';
    
    initPeer();
    await new Promise((resolve) => {
        peer.on('open', () => {
            // 获取文本字符数
            const textLength = textContent.length;
            
            output.innerHTML = `
                <div class="text-info">
                    <p>取件码: <span class="code">${peer.id}</span></p>
                    <p>文本长度: ${textLength} 字符</p>
                </div>
                <div class="status-message info">
                    <p>等待接收方连接...</p>
                </div>
            `;
            resolve();
        });
    });

    peer.on('connection', (conn) => {
        // 更新状态消息
        const statusDiv = output.querySelector('.status-message');
        statusDiv.className = 'status-message success';
        statusDiv.innerHTML = '<p>接收方已连接,开始传输...</p>';

        conn.on('open', () => {
            // 发送文本信息
            conn.send(JSON.stringify({
                type: 'text-info',
                length: textContent.length,
                time: new Date().toISOString()
            }));

            // 发送实际文本内容
            conn.send(textContent);
            
            // 更新状态消息
            statusDiv.innerHTML = '<p>文本发送完成!</p>';
        });

        conn.on('close', () => {
            showError('接收方已断开连接');
        });

        conn.on('error', (err) => {
            showError('传输错误: ' + err.message);
        });
    });
}

// 接收文本
async function receiveText() {
    const code = document.getElementById('textCodeInput').value.trim().toUpperCase();
    if (!code) {
        showError('请输入取件码');
        return;
    }

    if (!peer || !peer.id) {
        showError('连接未就绪,请刷新页面重试');
        return;
    }

    const output = document.getElementById('textDisplay');
    output.innerHTML = '<div class="status-message info"><p>正在连接发送方...</p></div>';
    
    const conn = connectToPeer(code);
    if (!conn) return;

    let textInfo = null;
    let receivedText = null;

    conn.on('open', () => {
        output.innerHTML = '<div class="status-message info"><p>已连接到发送方,等待接收文本...</p></div>';
    });

    conn.on('data', (data) => {
        try {
            if (typeof data === 'string' && data.startsWith('{')) {
                // 这是文本信息JSON对象
                textInfo = JSON.parse(data);
                
                if (textInfo.type === 'text-info') {
                    // 显示文本信息
                    const date = new Date(textInfo.time);
                    const formattedTime = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                    
                    output.innerHTML = `
                        <div class="text-info">
                            <p>文本长度: ${textInfo.length} 字符</p>
                            <p>发送时间: ${formattedTime}</p>
                        </div>
                        <div class="status-message info">
                            <p>正在接收文本...</p>
                        </div>
                    `;
                }
            } else if (typeof data === 'string') {
                // 这是实际文本内容
                receivedText = data;
                
                // 更新状态信息并显示文本
                output.innerHTML = `
                    <div class="status-message success">
                        <p>文本接收完成!</p>
                    </div>
                    <div class="text-content">${escapeHtml(receivedText)}</div>
                `;
            }
        } catch (err) {
            showError('接收文本时出错: ' + err.message);
        }
    });

    conn.on('close', () => {
        if (!receivedText) {
            showError('发送方已断开连接');
        }
    });

    conn.on('error', (err) => {
        showError('传输错误: ' + err.message);
    });
}

// HTML转义函数
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}