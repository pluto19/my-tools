const CHUNK_SIZE = 16384; // 16KB chunks

// 发送文件
async function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        showError('请选择文件');
        return;
    }

    const peerId = generateRandomId();
    document.getElementById('codeOutput').innerHTML = `
        <p>取件码: <span class="code">${peerId}</span></p>
        <p>文件名: ${file.name}</p>
        <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        <p style="color: #4CAF50;">等待接收方连接...</p>
    `;

    peer = createSenderPeer(peerId);
    onPeerConnection((conn) => {
        document.getElementById('codeOutput').innerHTML = `
            <p>取件码: <span class="code">${peerId}</span></p>
            <p>文件名: ${file.name}</p>
            <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <p style="color: #4CAF50;">接收方已连接</p>
        `;

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

            reader.onload = (e) => {
                try {
                    conn.send(e.target.result);
                    offset += e.target.result.byteLength;
                    const progress = (offset / file.size) * 100;
                    progressBar.style.width = progress + '%';

                    if (offset < file.size) {
                        readNextChunk();
                    } else {
                        document.getElementById('codeOutput').innerHTML += `
                            <p style="color: #4CAF50;">文件发送完成!</p>
                        `;
                    }
                } catch (err) {
                    showError('发送文件时出错: ' + err.message);
                }
            };

            reader.onerror = () => {
                showError('读取文件时出错');
            };

            function readNextChunk() {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            }

            readNextChunk();
        });

        conn.on('close', () => {
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

    document.getElementById('downloadOutput').innerHTML = `
        <p style="color: #2196F3;">正在连接发送方...</p>
    `;

    const conn = connectToPeer(code);
    if (!conn) return;

    const downloadProgress = document.querySelector('#downloadProgress');
    const progressBar = downloadProgress.querySelector('.progress-bar');
    let fileInfo = null;
    let receivedSize = 0;
    let currentFileChunks = [];

    conn.on('open', () => {
        downloadProgress.style.display = 'block';
        document.getElementById('downloadOutput').innerHTML = `
            <p style="color: #4CAF50;">已连接到发送方</p>
        `;
    });

    conn.on('data', (data) => {
        try {
            if (typeof data === 'string') {
                // 接收文件信息
                fileInfo = JSON.parse(data);
                currentFileChunks = [];
                receivedSize = 0;
                document.getElementById('downloadOutput').innerHTML = `
                    <p>文件名: ${fileInfo.name}</p>
                    <p>文件大小: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p style="color: #2196F3;">正在接收文件...</p>
                `;
            } else {
                // 接收文件分片
                currentFileChunks.push(data);
                receivedSize += data.byteLength;
                const progress = (receivedSize / fileInfo.size) * 100;
                progressBar.style.width = progress + '%';

                if (receivedSize === fileInfo.size) {
                    // 文件接收完成,合并分片
                    const blob = new Blob(currentFileChunks);
                    const url = URL.createObjectURL(blob);
                    document.getElementById('downloadOutput').innerHTML = `
                        <p style="color: #4CAF50;">文件接收完成!</p>
                        <p><a href="${url}" download="${fileInfo.name}" class="download-link">下载 ${fileInfo.name}</a></p>
                    `;
                    currentFileChunks = [];
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
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initPeer();
});