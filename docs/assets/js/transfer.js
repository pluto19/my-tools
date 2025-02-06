const CHUNK_SIZE = 16384; // 16KB chunks

// 发送文件
async function sendFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        alert('请选择文件');
        return;
    }

    const peerId = generateRandomId();
    document.getElementById('codeOutput').innerHTML = `
        <p>取件码: <span class="code">${peerId}</span></p>
        <p>文件名: ${file.name}</p>
        <p>文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
    `;

    peer = createSenderPeer(peerId);
    onPeerConnection((conn) => {
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
                conn.send(e.target.result);
                offset += e.target.result.byteLength;
                const progress = (offset / file.size) * 100;
                progressBar.style.width = progress + '%';

                if (offset < file.size) {
                    readNextChunk();
                }
            };

            function readNextChunk() {
                const slice = file.slice(offset, offset + CHUNK_SIZE);
                reader.readAsArrayBuffer(slice);
            }

            readNextChunk();
        });
    });
}

// 接收文件
async function receiveFile() {
    const code = document.getElementById('codeInput').value.trim();
    if (!code) {
        alert('请输入取件码');
        return;
    }

    const conn = connectToPeer(code);
    if (!conn) return;

    const downloadProgress = document.querySelector('#downloadProgress');
    const progressBar = downloadProgress.querySelector('.progress-bar');
    let fileInfo = null;
    let receivedSize = 0;
    let currentFileChunks = [];

    conn.on('open', () => {
        downloadProgress.style.display = 'block';
    });

    conn.on('data', (data) => {
        if (typeof data === 'string') {
            // 接收文件信息
            fileInfo = JSON.parse(data);
            currentFileChunks = [];
            receivedSize = 0;
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
                    <p>文件接收完成!</p>
                    <p><a href="${url}" download="${fileInfo.name}">下载 ${fileInfo.name}</a></p>
                `;
                currentFileChunks = [];
            }
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initPeer();
});