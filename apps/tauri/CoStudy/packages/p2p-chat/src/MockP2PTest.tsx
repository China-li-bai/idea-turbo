import React, { useState, useEffect, useRef } from 'react'
import P2PRoomService from './services/p2pRoomService'
import MockSignalingServer from './utils/mockSignalingServer'
import './App.css'
import './PureP2PTest.css'
import './MockP2PTest.css'

const MockP2PTest: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('mock-test-room')
  const [instances, setInstances] = useState<Array<{
    id: string;
    state: any;
    logs: string[];
  }>>([])
  
  const mockServerRef = useRef<MockSignalingServer | null>(null)
  const serviceInstancesRef = useRef<Array<{
    id: string;
    service: P2PRoomService;
    logs: string[];
  }>>([])

  // 初始化模拟服务器
  useEffect(() => {
    const server = new MockSignalingServer()
    mockServerRef.current = server
    console.log('🌐 模拟信令服务器已启动')

    return () => {
      server.disconnectAll()
      serviceInstancesRef.current.forEach(instance => {
        instance.service.destroy()
      })
    }
  }, [])

  // 创建新客户端实例
  const createInstance = () => {
    if (!mockServerRef.current) return

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const service = new P2PRoomService({
      roomId: roomId,
      signalingUrl: 'mock-server', // 特殊标识，使用模拟服务器
      offerStrategy: 'A',
      maxPeers: 10
    })

    const logs: string[] = []

    // 创建模拟的 WebSocket 连接
    service.on('onPeerJoined', (peerId) => {
      logs.push(`👋 ${clientId}: 用户 ${peerId} 加入`)
      updateInstance(clientId, logs)
    })

    service.on('onPeerLeft', (peerId) => {
      logs.push(`👋 ${clientId}: 用户 ${peerId} 离开`)
      updateInstance(clientId, logs)
    })

    service.on('onConnectionEstablished', (peerId) => {
      logs.push(`✅ ${clientId}: 与 ${peerId} 连接已建立`)
      updateInstance(clientId, logs)
    })

    service.on('onConnectionClosed', (peerId) => {
      logs.push(`❌ ${clientId}: 与 ${peerId} 连接已关闭`)
      updateInstance(clientId, logs)
    })

    service.on('onMessageReceived', (message) => {
      logs.push(`💬 ${clientId}: 收到消息 ${message.from}: ${message.text}`)
      updateInstance(clientId, logs)
    })

    service.on('onStateChanged', (newState) => {
      logs.push(`🔄 ${clientId}: 状态更新 - ${Object.keys(newState.peers).length} 个用户在线`)
      updateInstance(clientId, logs)
    })

    service.on('onError', (error) => {
      logs.push(`🚨 ${clientId}: 错误 - ${error.message}`)
      updateInstance(clientId, logs)
    })

    // 连接到模拟服务器
    mockServerRef.current.connectClient(
      clientId,
      roomId,
      (msg: any) => {
        // 模拟收到信令消息
        handleSignalingMessage(service, msg)
      }
    )

    // 存储实例
    serviceInstancesRef.current.push({ id: clientId, service, logs })

    // 立即加入房间
    service.setRoomId(roomId).then(() => {
      const initialState = service.getState()
      logs.push(`🚀 ${clientId}: 实例已创建，本地 ID: ${initialState.localId}`)
      logs.push(`🏠 ${clientId}: 已加入房间 "${roomId}"，在线用户: ${Object.keys(initialState.peers).length}`)
      
      updateInstance(clientId, logs, initialState)
      
      // 延迟一点，确保所有实例都加入后再进行一次同步
      setTimeout(() => {
        console.log(`🔄 ${clientId}: 触发延迟同步`)
        const roomStatus = mockServerRef.current?.getRoomStatus()
        if (roomStatus && roomStatus[roomId]) {
          const allUsersInRoom = roomStatus[roomId].filter(id => id !== clientId)
          logs.push(`🔄 ${clientId}: 同步 ${allUsersInRoom.length} 个其他用户: [${allUsersInRoom.join(', ')}]`)
          
          allUsersInRoom.forEach(userId => {
            handleSignalingMessage(service, {
              type: "join",
              roomId: roomId,
              from: userId,
              to: clientId,
              payload: null
            })
          })
          
          updateInstance(clientId, logs)
        }
      }, 500)
    }).catch(error => {
      logs.push(`❌ ${clientId}: 加入房间失败: ${error.message}`)
      updateInstance(clientId, logs)
    })
  }

  // 处理信令消息
  const handleSignalingMessage = async (service: P2PRoomService, msg: any) => {
    console.log(`🔗 MockP2PTest: Processing message for service with localId ${service.getState().localId}:`, msg)
    try {
      await service.handleExternalSignalingMessage(msg)
    } catch (error) {
      console.error('处理信令消息失败:', error)
    }
  }

  // 更新实例状态
  const updateInstance = (clientId: string, logs: string[], state?: any) => {
    console.log(`🔄 更新实例 ${clientId} 状态`)
    setInstances(prev => {
      const updated = prev.map(instance => {
        if (instance.id === clientId) {
          const newState = state || instance.state
          console.log(`📊 ${clientId} 更新后用户数: ${newState ? Object.keys(newState.peers).length : 0}`)
          return {
            id: clientId,
            state: newState,
            logs: [...logs]
          }
        }
        return instance
      })
      
      // 打印所有实例的状态
      updated.forEach(inst => {
        console.log(`📋 ${inst.id}: 用户数=${inst.state ? Object.keys(inst.state.peers).length : 0}, 列表=${inst.state ? Object.keys(inst.state.peers).join(', ') : '[]'}`)
      })
      
      return updated
    })
  }

  // 发送消息从指定实例
  const sendMessage = (clientId: string, message: string) => {
    const instance = serviceInstancesRef.current.find(inst => inst.id === clientId)
    if (instance) {
      instance.service.sendMessage(message)
      instance.logs.push(`📤 ${clientId}: 发送消息: ${message}`)
      updateInstance(clientId, instance.logs)
    }
  }

  // 移除实例
  const removeInstance = (clientId: string) => {
    const instanceIndex = serviceInstancesRef.current.findIndex(inst => inst.id === clientId)
    if (instanceIndex !== -1) {
      const instance = serviceInstancesRef.current[instanceIndex]
      mockServerRef.current?.disconnectClient(clientId)
      instance.service.destroy()
      serviceInstancesRef.current.splice(instanceIndex, 1)
      
      setInstances(prev => prev.filter(inst => inst.id !== clientId))
    }
  }

  // 清空所有实例
  const clearAllInstances = () => {
    serviceInstancesRef.current.forEach(instance => {
      mockServerRef.current?.disconnectClient(instance.id)
      instance.service.destroy()
    })
    serviceInstancesRef.current = []
    setInstances([])
  }

  // 测试连接状态
  const testConnections = () => {
    console.log('🧪 测试连接状态:', mockServerRef.current?.getRoomStatus())
    serviceInstancesRef.current.forEach(instance => {
      const state = instance.service.getState()
      console.log(`${instance.id}: peers=${Object.keys(state.peers).length}, room=${state.roomId}, users=[${Object.keys(state.peers).join(', ')}]`)
      
      // 强制更新 UI
      updateInstance(instance.id, instance.logs, state)
    })
  }

  // 手动触发用户列表同步
  const syncAllPeers = () => {
    console.log('🔄 手动同步所有用户列表')
    const roomStatus = mockServerRef.current?.getRoomStatus()
    console.log('房间状态:', roomStatus)
    
    if (roomStatus && roomStatus[roomId]) {
      const allUsersInRoom = roomStatus[roomId]
      console.log(`房间 ${roomId} 中的所有用户:`, allUsersInRoom)
      
      serviceInstancesRef.current.forEach(instance => {
        // 为每个实例模拟接收所有用户的 join 消息
        allUsersInRoom.forEach(userId => {
          if (userId !== instance.id) {
            // 模拟接收其他用户的 join 消息
            console.log(`🔄 为 ${instance.id} 添加用户 ${userId}`)
            handleSignalingMessage(instance.service, {
              type: "join",
              roomId: roomId,
              from: userId,
              to: instance.id,
              payload: null
            })
          }
        })
        
        // 强制更新状态
        const currentState = instance.service.getState()
        console.log(`📊 ${instance.id} 最终用户列表: [${Object.keys(currentState.peers).join(', ')}]`)
        updateInstance(instance.id, instance.logs, currentState)
      })
    }
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎭 模拟 P2P 服务测试</h1>
          <div className="status">
            模拟信令服务器运行中 | 房间: {roomId} | 实例数: {instances.length}
          </div>
        </header>

        <section className="mock-controls">
          <h3>🎛️ 控制面板</h3>
          <div className="button-group">
            <button onClick={createInstance} className="btn btn-primary">
              创建新客户端实例
            </button>
            <button onClick={clearAllInstances} className="btn btn-danger">
              清空所有实例
            </button>
            <button onClick={testConnections} className="btn btn-info">
              测试连接
            </button>
            <button onClick={syncAllPeers} className="btn btn-warning">
              同步用户列表
            </button>
            <button onClick={() => setRoomId(`room-${Date.now()}`)} className="btn btn-secondary">
              切换房间
            </button>
          </div>
        </section>

        <section className="instances-grid">
          <h3>📱 客户端实例</h3>
          {instances.length === 0 && (
            <div className="empty-state">
              点击"创建新客户端实例"开始测试
            </div>
          )}
          
          <div className="instances-container">
            {instances.map(instance => (
              <div key={instance.id} className="instance-card">
                <div className="instance-header">
                  <h4>{instance.id}</h4>
                  <button 
                    onClick={() => removeInstance(instance.id)}
                    className="btn btn-small btn-danger"
                  >
                    移除
                  </button>
                </div>
                
                <div className="instance-status">
                  <div>在线用户: {instance.state ? Object.keys(instance.state.peers).length : 0}</div>
                  <div>本地 ID: {instance.state?.localId}</div>
                  <div>状态: {instance.state ? (Object.keys(instance.state.peers).filter(id => id === instance.state.localId).length > 0 ? '✅ 已加入房间' : '⏳ 未加入') : '⏳ 未加入'}</div>
                </div>

                <div className="instance-message">
                  <input
                    type="text"
                    placeholder="发送消息..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        sendMessage(instance.id, e.currentTarget.value.trim())
                        e.currentTarget.value = ''
                      }
                    }}
                  />
                </div>

                <div className="instance-logs">
                  <h5>日志:</h5>
                  <div className="log-container-small">
                    {instance.logs.slice(-5).map((log, index) => (
                      <div key={index} className="log-entry">{log}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default MockP2PTest