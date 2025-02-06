let peer;
const ICE_SERVERS = [
    // STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // 免费的TURN服务器
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    }
];

// 初始化PeerJS
function initPeer() {
    peer = new Peer(generateRandomId(), {
        config: {
            'iceServers': ICE_SERVERS
        },
        debug: 2
    });

    peer.on('error', handlePeerError);
}

// 生成随机ID (取件码)
function generateRandomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 创建新的发送端Peer
function createSenderPeer(peerId) {
    const newPeer = new Peer(peerId, {
        config: {
            'iceServers': ICE_SERVERS
        },
        debug: 2
    });

    newPeer.on('error', handlePeerError);
    return newPeer;
}

// 连接到发送端
function connectToPeer(code) {
    if (!peer) {
        showError('连接未初始化');
        return null;
    }

    const conn = peer.connect(code, {
        reliable: true
    });

    conn.on('error', (err) => {
        showError('连接错误: ' + err.message);
    });

    return conn;
}

// 监听连接
function onPeerConnection(callback) {
    if (!peer) {
        showError('连接未初始化');
        return;
    }
    peer.on('connection', callback);
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
            break;
        case 'network':
            errorMsg = '网络连接错误';
            break;
        case 'server-error':
            errorMsg = '服务器错误';
            break;
        case 'browser-incompatible':
            errorMsg = '浏览器不支持WebRTC';
            break;
    }
    
    showError(errorMsg);
}

// 显示错误信息
function showError(message) {
    const downloadOutput = document.getElementById('downloadOutput');
    if (downloadOutput) {
        downloadOutput.innerHTML = `<p style="color: red;">错误: ${message}</p>`;
    }
    const uploadOutput = document.getElementById('codeOutput');
    if (uploadOutput) {
        uploadOutput.innerHTML = `<p style="color: red;">错误: ${message}</p>`;
    }
}