import P2PRoomService from './p2pRoomService';

// 使用示例
async function exampleUsage() {
  // 创建 P2P 服务实例
  const p2pService = new P2PRoomService({
    roomId: 'my-room-123',
    signalingUrl: 'wss://your-signaling-server.com/ws',
    offerStrategy: 'A',
    maxPeers: 5
  });

  // 设置事件监听器
  p2pService
    .on('onPeerJoined', (peerId) => {
      console.log(`新用户加入: ${peerId}`);
    })
    .on('onPeerLeft', (peerId) => {
      console.log(`用户离开: ${peerId}`);
    })
    .on('onConnectionEstablished', (peerId) => {
      console.log(`与 ${peerId} 的连接已建立`);
      // 可以开始发送消息
      p2pService.sendMessage('Hello!', 'chat');
    })
    .on('onConnectionClosed', (peerId) => {
      console.log(`与 ${peerId} 的连接已关闭`);
    })
    .on('onMessageReceived', (message) => {
      console.log('收到消息:', message);
    })
    .on('onStateChanged', (state) => {
      console.log('状态更新:', state);
      // 可以在这里更新 UI
      updateUI(state);
    })
    .on('onError', (error) => {
      console.error('P2P 服务错误:', error);
    });

  // 更换房间
  await p2pService.setRoomId('new-room-456');

  // 发送消息
  p2pService.sendMessage('大家好！');
  p2pService.sendMessage('系统通知', 'sys');

  // 获取当前状态
  const currentState = p2pService.getState();
  console.log('当前状态:', currentState);

  // 清理
  setTimeout(() => {
    p2pService.destroy();
    console.log('服务已销毁');
  }, 60000); // 60秒后销毁
}

// UI 更新函数示例
function updateUI(state: any) {
  // 更新在线用户列表
  const onlineUsers = Object.values(state.peers)
    .filter(peer => peer.status === 'connected')
    .map(peer => peer.id);
  
  console.log('在线用户:', onlineUsers);
  
  // 更新聊天记录
  console.log('聊天记录:', state.chatLog);
  
  // 更新连接状态
  console.log('连接状态:', Object.keys(state.connections));
}

// 手动信令模式示例
function manualSignalingExample() {
  const p2pService = new P2PRoomService({
    roomId: 'manual-room',
    signalingUrl: null // 不使用信令服务器
  });

  // 手动导出 offer
  const offer = p2pService.exportOffer();
  if (offer) {
    console.log('请将以下信息发送给对方:');
    console.log(JSON.stringify(offer));
  }

  // 手动导入对方发来的 offer
  const remoteOffer = JSON.parse(prompt('请输入对方的 offer:') || '{}');
  p2pService.importOffer(remoteOffer);
}

export { exampleUsage, manualSignalingExample };