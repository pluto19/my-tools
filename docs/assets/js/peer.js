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

// 诊断信息
let diagnosticInfo = {
    browserSupport: {},
    networkInfo: {},
    connectionAttempts: [],
    iceGatheringState: '',
    iceConnectionState: '',
    signalingState: '',
    lastError: null
};

// 检查浏览器支持
function checkBrowserSupport() {
    diagnosticInfo.browserSupport = {
        webrtc: !!window.RTCPeerConnection,
        websocket: !!window.WebSocket,
        userAgent: navigator.userAgent,
        platform: navigator.platform
    };
    return diagnosticInfo.browserSupport.webrtc && diagnosticInfo.browserSupport.websocket;
}

// 检查网络状态
async function checkNetworkStatus() {
    try {
        // 检查网络连接类型
        diagnosticInfo.networkInfo.online = navigator.onLine;
        
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            diagnosticInfo.networkInfo = {
                ...diagnosticInfo.networkInfo,
                type: connection.type || '未知',
                effectiveType: connection.effectiveType || '未知',
                downlink: connection.downlink || '未知',
                rtt: connection.rtt || '未知'
            };
        }

        // 测试STUN服务器连通性
        const stunTests = ICE_SERVERS.filter(server => 
            typeof server.urls === 'string' && server.urls.startsWith('stun:')
        ).map(async server => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [server] });
                const dc = pc.createDataChannel('test');
                await pc.createOffer();
                diagnosticInfo.networkInfo[server.urls] = '可用';
                pc.close();
                return true;
            } catch (e) {
                diagnosticInfo.networkInfo[server.urls] = '不可用';
                return false;
            }
        });

        await Promise.all(stunTests);
    } catch (e) {
        console.error('网络状态检查部分失败:', e);
        diagnosticInfo.networkInfo.error = e.message;
    } finally {
        showDiagnosticInfo();
    }
}

// 初始化PeerJS
async function initPeer() {
    // 运行诊断
    if (!checkBrowserSupport()) {
        showError('您的浏览器不支持WebRTC,请使用Chrome/Firefox/Edge等现代浏览器');
        return;
    }
    
    // 异步检查网络,不阻塞初始化
    checkNetworkStatus().catch(console.error);

    peer = new Peer(generateRandomId(), {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        config: {
            'iceServers': ICE_SERVERS,
            'iceTransportPolicy': 'all',
            'bundlePolicy': 'max-bundle',
            'rtcpMuxPolicy': 'require',
            'iceCandidatePoolSize': 10
        },
        debug: 2
    });

    peer.on('error', handlePeerError);
    
    peer.on('open', (id) => {
        console.log('已连接到PeerJS服务器, ID:', id);
        showStatus('准备就绪', 'success');
        diagnosticInfo.connectionAttempts.push({
            timestamp: new Date().toISOString(),
            event: 'connected',
            peerId: id
        });
        showDiagnosticInfo();
    });

    // 监控连接状态
    peer.on('disconnected', () => {
        diagnosticInfo.connectionAttempts.push({
            timestamp: new Date().toISOString(),
            event: 'disconnected'
        });
        showDiagnosticInfo();
    });
}

// 生成随机ID (取件码)
function generateRandomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// 连接到发送端
function connectToPeer(code) {
    if (!peer) {
        showError('连接未初始化');
        return null;
    }

    showStatus('正在尝试连接...', 'info');
    diagnosticInfo.connectionAttempts.push({
        timestamp: new Date().toISOString(),
        event: 'connecting',
        targetPeerId: code
    });
    
    if (connectionTimer) {
        clearTimeout(connectionTimer);
    }

    connectionTimer = setTimeout(() => {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            showStatus(`连接超时,正在重试(${retryCount}/${MAX_RETRIES})...`, 'info');
            diagnosticInfo.connectionAttempts.push({
                timestamp: new Date().toISOString(),
                event: 'timeout_retry',
                attempt: retryCount
            });
            if (peer) {
                peer.destroy();
            }
            initPeer();
            setTimeout(() => {
                connectToPeer(code);
            }, 1000);
        } else {
            showError('多次连接失败,请查看诊断信息');
            retryCount = 0;
            if (peer) {
                peer.destroy();
                initPeer();
            }
        }
        showDiagnosticInfo();
    }, CONNECTION_TIMEOUT);

    const conn = peer.connect(code, {
        reliable: true,
        serialization: 'binary'
    });

    // 监控连接状态
    if (conn._pc) {
        conn._pc.oniceconnectionstatechange = () => {
            diagnosticInfo.iceConnectionState = conn._pc.iceConnectionState;
            diagnosticInfo.iceGatheringState = conn._pc.iceGatheringState;
            diagnosticInfo.signalingState = conn._pc.signalingState;
            
            diagnosticInfo.connectionAttempts.push({
                timestamp: new Date().toISOString(),
                event: 'ice_state_change',
                state: conn._pc.iceConnectionState
            });
            
            showDiagnosticInfo();
        };
    }

    conn.on('open', () => {
        clearTimeout(connectionTimer);
        retryCount = 0;
        showStatus('连接成功', 'success');
        diagnosticInfo.connectionAttempts.push({
            timestamp: new Date().toISOString(),
            event: 'connection_established'
        });
        showDiagnosticInfo();
    });

    conn.on('error', (err) => {
        clearTimeout(connectionTimer);
        diagnosticInfo.lastError = err;
        diagnosticInfo.connectionAttempts.push({
            timestamp: new Date().toISOString(),
            event: 'error',
            error: err.message
        });
        showDiagnosticInfo();
        showError('连接错误: ' + err.message);
    });

    return conn;
}

// 显示诊断信息
function showDiagnosticInfo() {
    const diagnosticOutput = document.getElementById('diagnosticOutput');
    if (!diagnosticOutput) return;

    const info = `
        <div class="diagnostic-info">
            <h3>连接诊断信息</h3>
            <p><strong>网络状态:</strong> ${diagnosticInfo.networkInfo.online ? '在线' : '离线'}</p>
            <p><strong>网络类型:</strong> ${diagnosticInfo.networkInfo.type || '未知'}</p>
            <p><strong>网络质量:</strong> ${diagnosticInfo.networkInfo.effectiveType || '未知'}</p>
            <p><strong>浏览器:</strong> ${diagnosticInfo.browserSupport.userAgent}</p>
            <p><strong>WebRTC支持:</strong> ${diagnosticInfo.browserSupport.webrtc ? '✓' : '✗'}</p>
            <p><strong>ICE连接状态:</strong> ${diagnosticInfo.iceConnectionState || '未连接'}</p>
            <p><strong>ICE收集状态:</strong> ${diagnosticInfo.iceGatheringState || '未开始'}</p>
            ${diagnosticInfo.lastError ? `<p><strong>最后错误:</strong> ${diagnosticInfo.lastError.message}</p>` : ''}
            <div class="connection-log">
                <strong>最近连接日志:</strong>
                <pre>${JSON.stringify(diagnosticInfo.connectionAttempts.slice(-5), null, 2)}</pre>
            </div>
        </div>
    `;
    
    diagnosticOutput.innerHTML = info;
}

// 处理PeerJS错误
function handlePeerError(err) {
    console.error('PeerJS错误:', err);
    clearTimeout(connectionTimer);
    
    diagnosticInfo.lastError = err;
    diagnosticInfo.connectionAttempts.push({
        timestamp: new Date().toISOString(),
        event: 'peer_error',
        type: err.type,
        message: err.message
    });
    
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
    showDiagnosticInfo();
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