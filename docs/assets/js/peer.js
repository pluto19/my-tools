let peer;
const ICE_SERVERS = [
    // 中国的STUN服务器
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.chat.bilibili.com:3478' },
    // Google的STUN服务器
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // 免费的TURN服务器
    {
        urls: [
            'turn:cn-turn1.xirsys.com:80?transport=udp',
            'turn:cn-turn1.xirsys.com:3478?transport=udp',
            'turn:cn-turn1.xirsys.com:80?transport=tcp',
            'turn:cn-turn1.xirsys.com:3478?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
    }
];

const CONNECTION_TIMEOUT = 15000; // 15秒连接超时
let connectionTimer = null;

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

    showStatus('正在连接...', 'info');
    
    // 设置连接超时
    if (connectionTimer) {
        clearTimeout(connectionTimer);
    }
    connectionTimer = setTimeout(() => {
        showError('连接超时,请检查取件码是否正确或重试');
        if (peer) {
            peer.destroy();
            initPeer();
        }
    }, CONNECTION_TIMEOUT);

    const conn = peer.connect(code, {
        reliable: true,
        serialization: 'binary'
    });

    conn.on('open', () => {
        clearTimeout(connectionTimer);
        showStatus('连接成功', 'success');
    });

    conn.on('error', (err) => {
        clearTimeout(connectionTimer);
        showError('连接错误: ' + err.message);
    });

    conn.on('close', () => {
        clearTimeout(connectionTimer);
        showError('连接已断开');
    });

    return conn;
}

// 监听连接
function onPeerConnection(callback) {
    if (!peer) {
        showError('连接未初始化');
        return;
    }
    peer.on('connection', (conn) => {
        showStatus('接收方已连接', 'success');
        callback(conn);
    });
}

// 处理PeerJS错误
function handlePeerError(err) {
    console.error('PeerJS错误:', err);
    clearTimeout(connectionTimer);
    
    let errorMsg = '连接错误';
    switch(err.type) {
        case 'peer-unavailable':
            errorMsg = '取件码无效或发送方已离线';
            break;
        case 'disconnected':
            errorMsg = '连接已断开,请刷新页面重试';
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
    
    // 重新初始化连接
    if (peer) {
        peer.destroy();
        initPeer();
    }
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