'use client';

import { useState } from 'react';
import type { DiagnosticsResult } from '../types';

export function DiagnosticsPanel() {
  const [results, setResults] = useState<DiagnosticsResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticsResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (name: string, updates: Partial<DiagnosticsResult>) => {
    setResults(prev => prev.map(r => 
      r.name === name ? { ...r, ...updates } : r
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const tests = [
      {
        name: '浏览器环境',
        test: async () => {
          const hasWebAssembly = typeof WebAssembly !== 'undefined';
          const hasWorker = typeof Worker !== 'undefined';
          const hasIndexedDB = typeof indexedDB !== 'undefined';
          const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
          
          if (!hasWebAssembly) throw new Error('不支持 WebAssembly');
          if (!hasWorker) throw new Error('不支持 Web Worker');
          if (!hasIndexedDB) throw new Error('不支持 IndexedDB');
          if (!hasMediaDevices) throw new Error('不支持麦克风访问');
          
          return '浏览器环境正常';
        }
      },
      {
        name: 'CDN 连接测试',
        test: async () => {
          const cdnUrl = 'https://sherpa-onnx-cdn.1272679088.workers.dev';
          const start = Date.now();
          
          try {
            const response = await fetch(cdnUrl, { 
              method: 'HEAD',
              mode: 'cors'
            });
            const duration = Date.now() - start;
            
            if (!response.ok) {
              throw new Error(`CDN 返回错误: ${response.status}`);
            }
            
            return `CDN 连接正常 (${duration}ms)`;
          } catch (err) {
            throw new Error(`CDN 无法访问: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      },
      {
        name: '模型文件检查',
        test: async () => {
          const modelUrl = 'https://sherpa-onnx-cdn.1272679088.workers.dev/sherpa-onnx-wasm-main-asr.data';
          const start = Date.now();
          
          try {
            const response = await fetch(modelUrl, { 
              method: 'HEAD',
              mode: 'cors'
            });
            const duration = Date.now() - start;
            
            if (!response.ok) {
              throw new Error(`模型文件返回错误: ${response.status}`);
            }
            
            const contentLength = response.headers.get('content-length');
            const size = contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) : '未知';
            
            return `模型文件可访问 (${size}MB, ${duration}ms)`;
          } catch (err) {
            throw new Error(`模型文件无法访问: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      },
      {
        name: '本地 WASM 文件',
        test: async () => {
          const wasmUrl = '/sherpa-onnx-wasm-main-asr.wasm';
          const start = Date.now();
          
          try {
            const response = await fetch(wasmUrl, { method: 'HEAD' });
            const duration = Date.now() - start;
            
            if (!response.ok) {
              throw new Error(`WASM 文件返回错误: ${response.status}`);
            }
            
            return `WASM 文件存在 (${duration}ms)`;
          } catch (err) {
            throw new Error(`WASM 文件不存在: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      },
      {
        name: 'Worker 文件',
        test: async () => {
          const workerUrl = '/sherpa-worker.js';
          const start = Date.now();
          
          try {
            const response = await fetch(workerUrl, { method: 'HEAD' });
            const duration = Date.now() - start;
            
            if (!response.ok) {
              throw new Error(`Worker 文件返回错误: ${response.status}`);
            }
            
            return `Worker 文件存在 (${duration}ms)`;
          } catch (err) {
            throw new Error(`Worker 文件不存在: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      },
      {
        name: 'IndexedDB 存储',
        test: async () => {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open('TestDB', 1);
            
            request.onerror = () => reject(new Error('无法打开 IndexedDB'));
            
            request.onsuccess = () => {
              request.result.close();
              indexedDB.deleteDatabase('TestDB');
              resolve('IndexedDB 工作正常');
            };
            
            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              db.createObjectStore('test');
            };
          });
        }
      },
      {
        name: '麦克风权限',
        test: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return '麦克风权限已授予';
          } catch (err) {
            throw new Error(`麦克风权限被拒绝: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    ];

    for (const test of tests) {
      addResult({
        name: test.name,
        status: 'pending',
        message: '测试中...'
      });

      const start = Date.now();
      
      try {
        const message = await test.test();
        const duration = Date.now() - start;
        
        updateResult(test.name, {
          status: 'success',
          message: message as string,
          duration
        });
      } catch (err) {
        const duration = Date.now() - start;
        
        updateResult(test.name, {
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
          duration
        });
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticsResult['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  const getStatusColor = (status: DiagnosticsResult['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔍 语音识别诊断工具</h1>
            <p className="text-gray-600">检查语音识别所需的所有环境和依赖</p>
          </div>

          <div className="mb-6">
            <button
              onClick={runDiagnostics}
              disabled={isRunning}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all
                ${isRunning 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }
              `}
            >
              {isRunning ? '诊断中...' : '开始诊断'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${result.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : ''}
                    ${result.status === 'success' ? 'border-green-300 bg-green-50' : ''}
                    ${result.status === 'error' ? 'border-red-300 bg-red-50' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getStatusIcon(result.status)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-semibold ${getStatusColor(result.status)}`}>
                          {result.name}
                        </h3>
                        {result.duration && (
                          <span className="text-xs text-gray-500">
                            {result.duration}ms
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && !isRunning && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">💡 建议</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                {results.some(r => r.status === 'error') ? (
                  <>
                    <li>• 如果 CDN 无法访问，请检查网络连接或使用 VPN</li>
                    <li>• 如果麦克风权限被拒绝，请在浏览器设置中允许访问</li>
                    <li>• 如果 IndexedDB 失败，请清除浏览器缓存后重试</li>
                  </>
                ) : (
                  <li>• 所有检查通过！语音识别应该可以正常工作</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
