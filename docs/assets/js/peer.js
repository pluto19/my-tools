let peer;

// 初始化PeerJS
function initPeer() {
    if (!window.RTCPeerConnection || !window.WebSocket) {
        showError('您的浏览器不支持WebRTC,请使用Chrome/Firefox/Edge等现代浏览器');
        return;
    }

    peer = new Peer(generateRandomId(), {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        config: {
            'iceServers': [], // 仅支持局域网连接
            'iceTransportPolicy': 'all'
        },
        debug: 1
    });

    peer.on('error', handlePeerError);
    peer.on('open', (id) => {
        console.log('已连接到PeerJS服务器, ID:', id);
        showStatus('准备就绪', 'success');
    });
}

// 生成随机ID (取件码)
function generateRandomId() {
    return Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

// 连接到发送端
function connectToPeer(code) {
    if (!peer) {
        showError('连接未初始化');
        return null;
    }

    showStatus('正在连接...', 'info');
    const conn = peer.connect(code, {
        reliable: true,
        serialization: 'binary'
    });

    return conn;
}

// 处理PeerJS错误
function handlePeerError(err) {
    console.error('PeerJS错误:', err);
    let errorMsg = '连接错误';
    
    switch(err.type) {
        case 'peer-unavailable':
            errorMsg = '取件码无效或发送方已离线';
            break;
        case 'disconnected':
            errorMsg = '连接已断开';
            peer.reconnect();
            break;
        case 'network':
            errorMsg = '网络连接错误,请检查网络设置';
            break;
        case 'server-error':
            errorMsg = '服务器错误,请稍后重试';
            break;
        case 'browser-incompatible':
            errorMsg = '浏览器不支持WebRTC,请使用Chrome/Firefox/Edge等现代浏览器';
            break;
    }
    
    showError(errorMsg);
}

// 显示错误信息
function showError(message) {
    showStatus(message, 'error');
}

// 显示状态信息
function showStatus(message, type = 'info') {
    const downloadOutput = document.getElementById('downloadOutput');
    if (downloadOutput) {
        downloadOutput.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
    const uploadOutput = document.getElementById('codeOutput');
    if (uploadOutput) {
        uploadOutput.innerHTML = `<div class="status ${type}">${message}</div>`;
    }
}