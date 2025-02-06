let peer;
const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

// 初始化PeerJS
function initPeer() {
    peer = new Peer(generateRandomId(), {
        config: {
            'iceServers': STUN_SERVERS
        }
    });
}

// 生成随机ID (取件码)
function generateRandomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 创建新的发送端Peer
function createSenderPeer(peerId) {
    return new Peer(peerId, {
        config: {
            'iceServers': STUN_SERVERS
        }
    });
}

// 连接到发送端
function connectToPeer(code) {
    if (!peer) {
        console.error('Peer not initialized');
        return null;
    }
    return peer.connect(code);
}

// 监听连接
function onPeerConnection(callback) {
    if (!peer) {
        console.error('Peer not initialized');
        return;
    }
    peer.on('connection', callback);
}