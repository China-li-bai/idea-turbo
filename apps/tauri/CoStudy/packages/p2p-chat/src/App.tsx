import React, { useState, useEffect } from 'react'
import useP2PRoom from './hooks/useP2PRoom'
import './App.css'

const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>(`User-${Math.floor(Math.random() * 1000)}`)
  const [signalingUrl, setSignalingUrl] = useState<string>('ws://localhost:8081')
  const [useSignaling, setUseSignaling] = useState<boolean>(true)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [activeRoomId, setActiveRoomId] = useState<string>('')
  
  const {
    state,
    sendChat,
    updateRoomId,
    createLocalOfferForManual,
    acceptManualOfferAndCreateAnswer,
    leaveRoom,
    localId
  } = useP2PRoom({
    roomId: activeRoomId,
    signalingUrl: useSignaling ? signalingUrl : null,
    offerStrategy: "A",
    maxPeers: 10
  })

  const [message, setMessage] = useState<string>('')
  const [sdpText, setSdpText] = useState<string>('')

  const handleCreateRoom = () => {
    if (!roomId.trim()) {
      console.log('❌ Room ID is empty')
      return
    }
    console.log(`🏠 Creating room: ${roomId}`)
    updateRoomId(roomId.trim())
    setActiveRoomId(roomId.trim())
    setIsConnected(true)
  }

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      console.log('❌ Room ID is empty')
      return
    }
    console.log(`🚪 Joining room: ${roomId}`)
    updateRoomId(roomId.trim())
    setActiveRoomId(roomId.trim())
    setIsConnected(true)
  }

  const handleSendMessage = () => {
    if (!message.trim()) return
    sendChat(message)
    setMessage('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handlePasteSDP = () => {
    try {
      const data = JSON.parse(sdpText)
      // 这里需要调用相应的处理函数，暂时简化处理
      console.log('Pasted SDP data:', data)
      setSdpText('')
    } catch (err) {
      console.error('Invalid SDP data:', err)
    }
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>P2P Chat - WebRTC Full-Mesh</h1>
          <div className="status">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
            {state.roomId && <> Room: {state.roomId}</>}
            Your ID: {localId}
            <div style={{fontSize: '12px', marginTop: '5px'}}>
              Input Room: "{roomId}" | Active Room: "{state.roomId || 'none'}"
            </div>
          </div>
        </header>

        {!isConnected && (
          <section className="setup">
            <div className="form-group">
              <label>Room ID:</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
              />
            </div>

            <div className="form-group">
              <label>Display Name:</label>
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
                Use WebSocket Signaling Server
              </label>
            </div>

            {useSignaling && (
              <div className="form-group">
                <label>Signaling Server URL:</label>
                <input
                  type="text"
                  value={signalingUrl}
                  onChange={(e) => setSignalingUrl(e.target.value)}
                  placeholder="ws://localhost:8080"
                />
              </div>
            )}

            <div className="button-group">
              <button onClick={handleCreateRoom} className="btn btn-primary">
                Create Room
              </button>
              <button onClick={handleJoinRoom} className="btn btn-secondary">
                Join Room
              </button>
            </div>
          </section>
        )}

        {isConnected && (
          <>
            <section className="peers">
              <h3>Connected Peers ({Object.keys(state.peers).length})</h3>
              <div className="peer-list">
                {Object.entries(state.peers).map(([peerId, peer]) => (
                  <div key={peerId} className={`peer ${peer.status}`}>
                    <span>{peer.displayName || peerId}</span>
                    <span className="status">{peer.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="chat">
              <div className="messages">
                {state.chatLog.map((msg) => (
                  <div key={msg.id} className={`message ${msg.type}`}>
                    <div className="message-header">
                      <span className="sender">
                        {msg.from === localId ? 'You' : msg.from}
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
                  placeholder="Type a message..."
                />
                <button onClick={handleSendMessage} className="btn btn-primary">
                  Send
                </button>
              </div>
            </section>

            {!useSignaling && (
              <section className="manual-sdp">
                <h3>Manual SDP Exchange</h3>
                <textarea
                  value={sdpText}
                  onChange={(e) => setSdpText(e.target.value)}
                  placeholder="Paste SDP data here..."
                  rows={6}
                />
                <button onClick={handlePasteSDP} className="btn btn-secondary">
                  Process SDP
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App