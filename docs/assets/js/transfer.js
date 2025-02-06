const CHUNK_SIZE = 16384; // 16KB chunks
const TRANSFER_TIMEOUT = 30000; // 30秒传输超时

// 发送文件
async function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        showError('请选择文件');
        return;
    }

    const peerId = generateRandomId();
    showStatus(`
        <p>取件码: <span class="code">${peerId}</span></p>
        <p>文件名: ${file.name}</p>
        <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        <p>等待接收方连接...</p>
    `, 'info');

    peer = createSenderPeer(peerId);
    let transferTimer = null;

    onPeerConnection((conn) => {
        showStatus(`
            <p>取件码: <span class="code">${peerId}</span></p>
            <p>文件名: ${file.name}</p>
            <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>接收方已连接,开始传输...</p>
        `, 'success');

        conn.on('open', () => {
            // 发送文件信息
            conn.send(JSON.stringify({
                type: 'file-info',
                name: file.name,
                size: file.size
            }));

            // 开始分片传输
            let offset = 0;
            const reader = new FileReader();
            const uploadProgress = document.querySelector('#uploadProgress');
            const progressBar = uploadProgress.querySelector('.progress-bar');
            uploadProgress.style.display = 'block';

            // 设置传输超时
            transferTimer = setTimeout(() => {
                showError('文件传输超时,请重试');
                conn.close();
            }, TRANSFER_TIMEOUT);

            reader.onload = (e) => {
                try {
                    conn.send(e.target.result);
                    offset += e.target.result.byteLength;
                    const progress = (offset / file.size) * 100;
                    progressBar.style.width = progress + '%';

                    if (offset < file.size) {
                        readNextChunk();
                    } else {
                        clearTimeout(transferTimer);
                        showStatus(`
                            <p>取件码: <span class="code">${peerId}</span></p>
                            <p>文件名: ${file.name}</p>
                            <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <p>文件发送完成!</p>
                        `, 'success');
                    }
                } catch (err) {
                    clearTimeout(transferTimer);
                    showError('发送文件时出错: ' + err.message);
                }
            };

            reader.onerror = () => {
                clearTimeout(transferTimer);
                showError('读取文件时出错');
            };

            function readNextChunk() {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            }

            readNextChunk();
        });

        conn.on('close', () => {
            clearTimeout(transferTimer);
            showError('接收方已断开连接');
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

    showStatus('正在连接发送方...', 'info');
    const conn = connectToPeer(code);
    if (!conn) return;

    const downloadProgress = document.querySelector('#downloadProgress');
    const progressBar = downloadProgress.querySelector('.progress-bar');
    let fileInfo = null;
    let receivedSize = 0;
    let currentFileChunks = [];
    let transferTimer = null;

    conn.on('open', () => {
        downloadProgress.style.display = 'block';
        showStatus('已连接到发送方,等待接收文件...', 'success');
    });

    conn.on('data', (data) => {
        try {
            if (typeof data === 'string') {
                // 接收文件信息
                fileInfo = JSON.parse(data);
                currentFileChunks = [];
                receivedSize = 0;
                showStatus(`
                    <p>文件名: ${fileInfo.name}</p>
                    <p>文件大小: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p>正在接收文件...</p>
                `, 'info');

                // 设置传输超时
                if (transferTimer) clearTimeout(transferTimer);
                transferTimer = setTimeout(() => {
                    showError('文件接收超时,请重试');
                    conn.close();
                }, TRANSFER_TIMEOUT);
            } else {
                // 接收文件分片
                currentFileChunks.push(data);
                receivedSize += data.byteLength;
                const progress = (receivedSize / fileInfo.size) * 100;
                progressBar.style.width = progress + '%';

                if (receivedSize === fileInfo.size) {
                    clearTimeout(transferTimer);
                    // 文件接收完成,合并分片
                    const blob = new Blob(currentFileChunks);
                    const url = URL.createObjectURL(blob);
                    showStatus(`
                        <p>文件接收完成!</p>
                        <p><a href="${url}" download="${fileInfo.name}" class="download-link">下载 ${fileInfo.name}</a></p>
                    `, 'success');
                    currentFileChunks = [];
                }
            }
        } catch (err) {
            clearTimeout(transferTimer);
            showError('接收文件时出错: ' + err.message);
        }
    });

    conn.on('close', () => {
        clearTimeout(transferTimer);
        if (!fileInfo || receivedSize < fileInfo.size) {
            showError('发送方已断开连接');
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initPeer();
});