let peer;
const ICE_SERVERS = [
    // 中国的STUN服务器
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.chat.bilibili.com:3478' },
    // Google的STUN服务器
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun2.l.google.com:19302' },
    // TURN服务器
    {
        urls: [
            'turn:relay.metered.ca:80?transport=tcp',
            'turn:relay.metered.ca:443?transport=tcp',
            'turn:relay.metered.ca:80?transport=udp',
            'turn:relay.metered.ca:443?transport=udp'
        ],
        username: 'e8c7d8a48cf60f9066d4a17e',
        credential: 'wZWTcesH0L0kGkKh'
    }
];

const CONNECTION_TIMEOUT = 20000; // 20秒
let connectionTimer = null;
let retryCount = 0;
const MAX_RETRIES = 3;

// PeerJS服务器配置
const PEER_SERVER_CONFIG = {
    // 使用0.peerjs.com服务器
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    path: '/',
    // 备用服务器列表
    alternateHosts: [
        '0.peerjs.com',
        'peer.metered.ca',
        'peer.nodewebkit.org'
    ],
    currentHostIndex: 0
};

// 切换到下一个服务器
function switchToNextHost() {
    PEER_SERVER_CONFIG.currentHostIndex = 
        (PEER_SERVER_CONFIG.currentHostIndex + 1) % PEER_SERVER_CONFIG.alternateHosts.length;
    PEER_SERVER_CONFIG.host = PEER_SERVER_CONFIG.alternateHosts[PEER_SERVER_CONFIG.currentHostIndex];
    console.log('切换到服务器:', PEER_SERVER_CONFIG.host);
}

// 初始化PeerJS
function initPeer() {
    peer = new Peer(generateRandomId(), {
        host: PEER_SERVER_CONFIG.host,
        port: PEER_SERVER_CONFIG.port,
        path: PEER_SERVER_CONFIG.path,
        secure: PEER_SERVER_CONFIG.secure,
        config: {
            'iceServers': ICE_SERVERS,
            'iceTransportPolicy': 'all',
            'bundlePolicy': 'max-bundle',
            'rtcpMuxPolicy': 'require',
            'iceCandidatePoolSize': 10
        },
        debug: 2,
        pingInterval: 2000,
        // 重试配置
        retries: 3,
        retryDelay: 1000,
        // 连接配置
        connectionTimeout: 10000,
        requestTimeout: 10000
    });

    peer.on('error', handlePeerError);
    
    peer.on('open', (id) => {
        console.log('已连接到PeerJS服务器, ID:', id);
        showStatus('准备就绪', 'success');
        retryCount = 0; // 重置重试计数
    });

    peer.on('disconnected', () => {
        console.log('与PeerJS服务器断开连接');
        showStatus('连接断开,正在重连...', 'info');
        setTimeout(() => {
            peer.reconnect();
        }, 1000);
    });

    peer.on('close', () => {
        console.log('连接已关闭');
        showStatus('连接已关闭', 'error');
    });
}

// 生成随机ID (取件码)
function generateRandomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 创建新的发送端Peer
function createSenderPeer(peerId) {
    const newPeer = new Peer(peerId, {
        host: PEER_SERVER_CONFIG.host,
        port: PEER_SERVER_CONFIG.port,
        path: PEER_SERVER_CONFIG.path,
        secure: PEER_SERVER_CONFIG.secure,
        config: {
            'iceServers': ICE_SERVERS,
            'iceTransportPolicy': 'all',
            'bundlePolicy': 'max-bundle',
            'rtcpMuxPolicy': 'require',
            'iceCandidatePoolSize': 10
        },
        debug: 2,
        pingInterval: 2000,
        retries: 3,
        retryDelay: 1000,
        connectionTimeout: 10000,
        requestTimeout: 10000
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

    showStatus('正在尝试连接...', 'info');
    
    if (connectionTimer) {
        clearTimeout(connectionTimer);
    }

    connectionTimer = setTimeout(() => {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            showStatus(`连接超时,正在切换服务器重试(${retryCount}/${MAX_RETRIES})...`, 'info');
            if (peer) {
                peer.destroy();
            }
            switchToNextHost();
            initPeer();
            setTimeout(() => {
                connectToPeer(code);
            }, 1000);
        } else {
            showError('多次连接失败,请检查网络设置或稍后重试');
            retryCount = 0;
            if (peer) {
                peer.destroy();
                initPeer();
            }
        }
    }, CONNECTION_TIMEOUT);

    const conn = peer.connect(code, {
        reliable: true,
        serialization: 'binary',
        metadata: {
            retry: retryCount
        }
    });

    conn.on('open', () => {
        clearTimeout(connectionTimer);
        retryCount = 0;
        showStatus('连接成功', 'success');
    });

    conn.on('error', (err) => {
        clearTimeout(connectionTimer);
        console.error('连接错误:', err);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            showStatus(`连接错误,正在重试(${retryCount}/${MAX_RETRIES})...`, 'info');
            setTimeout(() => {
                connectToPeer(code);
            }, 1000);
        } else {
            showError('连接失败: ' + err.message);
        }
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
            errorMsg = '连接已断开,正在重新连接...';
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                peer.reconnect();
            } else {
                errorMsg = '连接已断开,请刷新页面重试';
                retryCount = 0;
            }
            break;
        case 'network':
            errorMsg = '网络连接错误,正在切换服务器...';
            if (retryCount < MAX_RETRIES) {
                switchToNextHost();
                initPeer();
            }
            break;
        case 'server-error':
            errorMsg = '服务器错误,正在切换备用服务器...';
            switchToNextHost();
            initPeer();
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