import React, { useState } from 'react'
import App from './App'
import PureP2PTest from './PureP2PTest'
import MockP2PTest from './MockP2PTest'
import './App.css'

const MainRouter: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'original' | 'pure-test' | 'mock-test'>('original')

  return (
    <div>
      <nav style={{
        background: '#2c3e50',
        color: 'white',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>P2P Chat - 测试页面选择</h3>
        <button
          onClick={() => setCurrentPage('original')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentPage === 'original' ? '#3498db' : '#7f8c8d',
            color: 'white'
          }}
        >
          React Hook 版本
        </button>
        <button
          onClick={() => setCurrentPage('pure-test')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentPage === 'pure-test' ? '#27ae60' : '#7f8c8d',
            color: 'white'
          }}
        >
          纯 P2P 服务测试
        </button>
        <button
          onClick={() => setCurrentPage('mock-test')}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            background: currentPage === 'mock-test' ? '#8e44ad' : '#7f8c8d',
            color: 'white'
          }}
        >
          🎭 模拟信令测试
        </button>
        <div style={{ marginLeft: 'auto', fontSize: '0.9rem', opacity: 0.8 }}>
          当前: {
            currentPage === 'original' ? '⚛️ React Hook (useP2PRoom)' :
            currentPage === 'pure-test' ? '🧪 纯服务测试 (P2PRoomService)' :
            '🎭 模拟信令测试'
          }
        </div>
      </nav>

      {currentPage === 'original' && <App />}
      {currentPage === 'pure-test' && <PureP2PTest />}
      {currentPage === 'mock-test' && <MockP2PTest />}
    </div>
  )
}

export default MainRouter