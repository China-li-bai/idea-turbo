import React, { useState, useEffect, useRef } from 'react'
import P2PRoomService from './services/p2pRoomService'
import './App.css'
import './PureP2PTest.css'

const PureP2PTest: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>(`User-${Math.floor(Math.random() * 1000)}`)
  const [signalingUrl, setSignalingUrl] = useState<string>('ws://localhost:8081')
  const [useSignaling, setUseSignaling] = useState<boolean>(true)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  
  // 服务状态
  const [state, setState] = useState<any>(null)
  const [localId, setLocalId] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [sdpText, setSdpText] = useState<string>('')
  const [testPeerId, setTestPeerId] = useState<string>('')
  const [logs, setLogs] = useState<string[]>([])
  
  // P2P 服务实例
  const p2pServiceRef = useRef<P2PRoomService | null>(null)

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // 获取所有用户列表，包括当前用户
  const getAllPeers = () => {
    if (!state || !state.peers) return []
    
    return Object.entries(state.peers)
      .map(([peerId, peer]: [string, any]) => ({
        id: peerId,
        displayName: peer.displayName || peerId,
        status: peer.status || 'disconnected',
        isCurrentUser: peerId === localId
      }))
      .sort((a, b) => {
        // 当前用户排在第一位，然后按状态排序，最后按ID排序
        if (a.isCurrentUser) return -1
        if (b.isCurrentUser) return 1
        
        const statusOrder = { connected: 0, connecting: 1, disconnected: 2 }
        const aStatusOrder = statusOrder[a.status as keyof typeof statusOrder] || 3
        const bStatusOrder = statusOrder[b.status as keyof typeof statusOrder] || 3
        
        if (aStatusOrder !== bStatusOrder) {
          return aStatusOrder - bStatusOrder
        }
        
        return a.id.localeCompare(b.id)
      })
  }

  // 初始化 P2P 服务
  useEffect(() => {
    console.log('🚀 初始化 P2P 服务, useSignaling:', useSignaling, 'signalingUrl:', signalingUrl);
    const service = new P2PRoomService({
      roomId: '',
      signalingUrl: useSignaling ? signalingUrl : null,
      offerStrategy: 'A',
      maxPeers: 10
    })

    // 设置事件监听器
    service
      .on('onPeerJoined', (peerId) => {
        addLog(`👋 新用户加入: ${peerId}`)
      })
      .on('onPeerLeft', (peerId) => {
        addLog(`👋 用户离开: ${peerId}`)
      })
      .on('onConnectionEstablished', (peerId) => {
        addLog(`✅ 与 ${peerId} 的连接已建立`)
      })
      .on('onConnectionClosed', (peerId) => {
        addLog(`❌ 与 ${peerId} 的连接已关闭`)
      })
      .on('onMessageReceived', (message) => {
        addLog(`💬 收到消息: ${message.from}: ${message.text}`)
      })
      .on('onStateChanged', (newState) => {
        setState(newState)
        addLog(`🔄 状态更新: ${Object.keys(newState.peers).length} 个用户在线`)
      })
      .on('onError', (error) => {
        addLog(`🚨 错误: ${error.message}`)
      })

    // 获取本地 ID
    const currentState = service.getState()
    setLocalId(currentState.localId)
    setState(currentState)

    p2pServiceRef.current = service

    return () => {
      service.destroy()
    }
  }, [])

  // 更新信令服务器设置
  const updateSignaling = async () => {
    if (!p2pServiceRef.current) return
    
    const newUrl = useSignaling ? signalingUrl : null
    addLog(`🔗 更新信令服务器: ${newUrl || '手动模式'}`)
    
    // 重新创建服务实例以应用新的信令设置
    const oldService = p2pServiceRef.current
    const newService = new P2PRoomService({
      roomId: roomId || '',
      signalingUrl: newUrl,
      offerStrategy: 'A',
      maxPeers: 10
    })

    newService
      .on('onPeerJoined', (peerId) => {
        addLog(`👋 新用户加入: ${peerId}`)
      })
      .on('onPeerLeft', (peerId) => {
        addLog(`👋 用户离开: ${peerId}`)
      })
      .on('onConnectionEstablished', (peerId) => {
        addLog(`✅ 与 ${peerId} 的连接已建立`)
      })
      .on('onConnectionClosed', (peerId) => {
        addLog(`❌ 与 ${peerId} 的连接已关闭`)
      })
      .on('onMessageReceived', (message) => {
        addLog(`💬 收到消息: ${message.from}: ${message.text}`)
      })
      .on('onStateChanged', (newState) => {
        setState(newState)
        addLog(`🔄 状态更新: ${Object.keys(newState.peers).length} 个用户在线`)
      })
      .on('onError', (error) => {
        addLog(`🚨 错误: ${error.message}`)
      })

    const currentState = newService.getState()
    setLocalId(currentState.localId)
    setState(currentState)

    oldService.destroy()
    p2pServiceRef.current = newService
  }

  // 手动请求刷新用户列表（用于调试）
  const refreshPeerList = () => {
    if (!p2pServiceRef.current) return
    
    addLog('🔄 手动刷新用户列表')
    // 调用服务的 requestPeerListSync 方法
    p2pServiceRef.current.requestPeerListSync()
    
    // 更新UI状态
    const currentState = p2pServiceRef.current.getState()
    setState(currentState)
    addLog(`📊 当前用户列表: ${Object.keys(currentState.peers).map(id => id === localId ? `${id}(我)` : id).join(', ')}`)
  }

  // 创建房间
  const handleCreateRoom = async () => {
    if (!roomId.trim() || !p2pServiceRef.current) {
      addLog('❌ 房间 ID 不能为空')
      return
    }
    
    try {
      addLog(`🏠 创建房间: ${roomId.trim()}`)
      await p2pServiceRef.current.setRoomId(roomId.trim())
      setIsConnected(true)
      addLog('✅ 房间创建成功')
    } catch (error) {
      addLog(`❌ 创建房间失败: ${error}`)
    }
  }

  // 加入房间
  const handleJoinRoom = async () => {
    if (!roomId.trim() || !p2pServiceRef.current) {
      addLog('❌ 房间 ID 不能为空')
      return
    }
    
    try {
      addLog(`🚪 加入房间: ${roomId.trim()}`)
      await p2pServiceRef.current.setRoomId(roomId.trim())
      setIsConnected(true)
      addLog('✅ 成功加入房间')
    } catch (error) {
      addLog(`❌ 加入房间失败: ${error}`)
    }
  }

  // 发送消息
  const handleSendMessage = () => {
    if (!message.trim() || !p2pServiceRef.current) return
    
    p2pServiceRef.current.sendMessage(message.trim())
    addLog(`📤 发送消息: ${message.trim()}`)
    setMessage('')
  }

  // 离开房间
  const handleLeaveRoom = () => {
    if (!p2pServiceRef.current) return
    
    p2pServiceRef.current.destroy()
    setIsConnected(false)
    setRoomId('')
    addLog('👋 已离开房间')
    
    // 重新创建服务实例
    const newService = new P2PRoomService({
      roomId: '',
      signalingUrl: useSignaling ? signalingUrl : null,
      offerStrategy: 'A',
      maxPeers: 10
    })

    newService
      .on('onPeerJoined', (peerId) => {
        addLog(`👋 新用户加入: ${peerId}`)
      })
      .on('onPeerLeft', (peerId) => {
        addLog(`👋 用户离开: ${peerId}`)
      })
      .on('onConnectionEstablished', (peerId) => {
        addLog(`✅ 与 ${peerId} 的连接已建立`)
      })
      .on('onConnectionClosed', (peerId) => {
        addLog(`❌ 与 ${peerId} 的连接已关闭`)
      })
      .on('onMessageReceived', (message) => {
        addLog(`💬 收到消息: ${message.from}: ${message.text}`)
      })
      .on('onStateChanged', (newState) => {
        setState(newState)
        addLog(`🔄 状态更新: ${Object.keys(newState.peers).length} 个用户在线`)
      })
      .on('onError', (error) => {
        addLog(`🚨 错误: ${error.message}`)
      })

    const currentState = newService.getState()
    setLocalId(currentState.localId)
    setState(currentState)

    p2pServiceRef.current = newService
  }

  // 清空日志
  const clearLogs = () => {
    setLogs([])
  }

  // 测试手动添加用户（用于调试）
  const handleTestAddPeer = () => {
    if (!testPeerId.trim() || !p2pServiceRef.current) return
    
    // 直接调用服务的 addPeer 方法模拟用户加入
    p2pServiceRef.current.addPeer(testPeerId.trim());
    addLog(`🧪 测试添加用户: ${testPeerId.trim()}`);
    setTestPeerId('');
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    addLog('📋 已复制到剪贴板')
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🧪 纯 P2P 服务测试</h1>
          <div className="status">
            状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}
            {state?.roomId && <> | 房间: {state.roomId}</>}
            | 你的 ID: {localId}
          </div>
        </header>

        {!isConnected && (
          <section className="setup">
            <div className="form-group">
              <label>房间 ID:</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入房间 ID"
              />
            </div>

            <div className="form-group">
              <label>显示名称:</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={useSignaling}
                  onChange={(e) => setUseSignaling(e.target.checked)}
                />
                使用 WebSocket 信令服务器
              </label>
            </div>

            {useSignaling && (
              <div className="form-group">
                <label>信令服务器 URL:</label>
                <input
                  type="text"
                  value={signalingUrl}
                  onChange={(e) => setSignalingUrl(e.target.value)}
                  placeholder="ws://localhost:8081"
                />
              </div>
            )}

            <div className="button-group">
              <button onClick={handleCreateRoom} className="btn btn-primary">
                创建房间
              </button>
              <button onClick={handleJoinRoom} className="btn btn-secondary">
                加入房间
              </button>
              <button onClick={updateSignaling} className="btn btn-info">
                更新信令设置
              </button>
            </div>
          </section>
        )}

        {isConnected && (
          <>
            <section className="peers">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>👥 在线用户 ({state ? Object.keys(state.peers).length : 0})</h3>
                <button onClick={refreshPeerList} className="btn btn-small btn-info">
                  🔄 刷新
                </button>
              </div>
              <div className="peer-list">
                {state && getAllPeers().map((peer) => (
                  <div key={peer.id} className={`peer ${peer.status} ${peer.isCurrentUser ? 'current-user' : ''}`}>
                    <span>
                      {peer.isCurrentUser ? '👤 ' : '👥 '}
                      {peer.displayName}
                      {peer.isCurrentUser && ' (你)'}
                    </span>
                    <span className="status">{peer.status}</span>
                  </div>
                ))}
              </div>
              {!state && <div className="empty-state">尚未加入房间</div>}
            </section>

            <section className="chat">
              <h3>💬 聊天记录</h3>
              <div className="messages">
                {state?.chatLog?.map((msg: any) => (
                  <div key={msg.id} className={`message ${msg.type}`}>
                    <div className="message-header">
                      <span className="sender">
                        {msg.from === localId ? '你' : msg.from}
                      </span>
                      <span className="timestamp">
                        {new Date(msg.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    {msg.text && <div className="message-content">{msg.text}</div>}
                  </div>
                ))}
              </div>

              <div className="message-input">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="输入消息..."
                />
                <button onClick={handleSendMessage} className="btn btn-primary">
                  发送
                </button>
                <button onClick={handleLeaveRoom} className="btn btn-danger">
                  离开房间
                </button>
              </div>
            </section>

            <section className="logs">
              <h3>📋 服务日志</h3>
              <div className="log-container">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    {log}
                  </div>
                ))}
              </div>
              <div className="log-controls">
                <button onClick={clearLogs} className="btn btn-small">
                  清空日志
                </button>
                <button 
                  onClick={() => copyToClipboard(logs.join('\n'))} 
                  className="btn btn-small"
                >
                  复制日志
                </button>
              </div>
            </section>

            <section className="debug-tools">
              <h3>🧪 调试工具</h3>
              <div className="form-group">
                <label>测试添加用户（手动模拟）:</label>
                <input
                  type="text"
                  value={testPeerId}
                  onChange={(e) => setTestPeerId(e.target.value)}
                  placeholder="输入测试用户 ID"
                />
                <button onClick={handleTestAddPeer} className="btn btn-small btn-info">
                  添加用户
                </button>
              </div>
            </section>

            {!useSignaling && (
              <section className="manual-sdp">
                <h3>🔧 手动 SDP 交换</h3>
                <textarea
                  value={sdpText}
                  onChange={(e) => setSdpText(e.target.value)}
                  placeholder="在此粘贴 SDP 数据..."
                  rows={6}
                />
                <button className="btn btn-secondary">
                  处理 SDP
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PureP2PTest