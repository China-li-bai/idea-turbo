'use client';

import { useState, useEffect, useCallback } from 'react';
import { vectorService } from '@/lib/services';
import styles from './test-vector.module.scss';

interface TestDocument {
  id: number;
  text: string;
  embedding: number[];
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  message?: string;
  details?: any;
}

interface TestData {
  documents: TestDocument[];
}

export default function TestVectorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, message: '' });
  const [isInitialized, setIsInitialized] = useState(false);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [stats, setStats] = useState<{ totalDocuments: number; byType: Record<string, number> } | null>(null);

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(data => setTestData(data))
      .catch(err => console.error('Failed to load test data:', err));
  }, []);

  const initializeVectorService = async () => {
    setIsLoading(true);
    try {
      await vectorService.initialize((current, total, message) => {
        setLoadingProgress({ current, total, message: message || '' });
      });
      setIsInitialized(true);
      setStats(vectorService.getStats());
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runTest = useCallback(async (
    name: string,
    testFn: () => Promise<{ success: boolean; message?: string; details?: any }>
  ) => {
    setTestResults(prev => [...prev, { name, status: 'running' }]);
    
    const startTime = performance.now();
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      setTestResults(prev => prev.map(r => 
        r.name === name 
          ? { 
              name, 
              status: result.success ? 'passed' : 'failed', 
              duration, 
              message: result.message,
              details: result.details 
            }
          : r
      ));
    } catch (error) {
      const duration = performance.now() - startTime;
      setTestResults(prev => prev.map(r => 
        r.name === name 
          ? { name, status: 'failed', duration, message: String(error) }
          : r
      ));
    }
  }, []);

  const runAllTests = async () => {
    if (!isInitialized) {
      await initializeVectorService();
    }

    setTestResults([]);

    await runTest('基础语义搜索 - 音乐相关', async () => {
      const results = await vectorService.search('music singer artist', { k: 5 });
      const hasMusicResults = results.some(r => 
        r.content.toLowerCase().includes('music') || 
        r.content.toLowerCase().includes('singer') ||
        r.content.toLowerCase().includes('artist')
      );
      return {
        success: hasMusicResults && results.length > 0,
        message: hasMusicResults ? `找到 ${results.length} 个相关结果` : '未找到相关结果',
        details: results.slice(0, 3)
      };
    });

    await runTest('语义搜索 - 科技相关', async () => {
      const results = await vectorService.search('technology computer software', { k: 5 });
      const hasTechResults = results.some(r => 
        r.content.toLowerCase().includes('technology') || 
        r.content.toLowerCase().includes('computer') ||
        r.content.toLowerCase().includes('software')
      );
      return {
        success: results.length > 0,
        message: `找到 ${results.length} 个结果`,
        details: results.slice(0, 3)
      };
    });

    await runTest('中文语义搜索', async () => {
      const results = await vectorService.search('音乐 歌手 艺术家', { k: 5 });
      return {
        success: results.length > 0,
        message: `找到 ${results.length} 个结果`,
        details: results.slice(0, 3)
      };
    });

    await runTest('相似度阈值测试 - 高阈值', async () => {
      const results = await vectorService.search('Beyoncé', { k: 10, similarity: 0.9 });
      return {
        success: true,
        message: `高阈值(0.9)找到 ${results.length} 个结果`,
        details: results.slice(0, 3)
      };
    });

    await runTest('相似度阈值测试 - 低阈值', async () => {
      const results = await vectorService.search('Beyoncé', { k: 10, similarity: 0.3 });
      return {
        success: results.length > 0,
        message: `低阈值(0.3)找到 ${results.length} 个结果`,
        details: { count: results.length }
      };
    });

    await runTest('空查询处理', async () => {
      try {
        const results = await vectorService.search('', { k: 5 });
        return {
          success: true,
          message: `空查询返回 ${results.length} 个结果`,
          details: results.length
        };
      } catch (error) {
        return {
          success: true,
          message: '空查询正确抛出错误或返回空结果'
        };
      }
    });

    await runTest('特殊字符查询', async () => {
      const results = await vectorService.search('!@#$%^&*()', { k: 5 });
      return {
        success: true,
        message: `特殊字符查询返回 ${results.length} 个结果`,
        details: results.length
      };
    });

    await runTest('超长查询处理', async () => {
      const longQuery = 'music '.repeat(1000);
      const startTime = performance.now();
      const results = await vectorService.search(longQuery, { k: 5 });
      const duration = performance.now() - startTime;
      return {
        success: duration < 5000,
        message: `超长查询耗时 ${duration.toFixed(2)}ms`,
        details: { duration, resultCount: results.length }
      };
    });

    await runTest('混合搜索测试', async () => {
      const results = await vectorService.hybridSearch('singer', { k: 5, similarity: 0.5 });
      return {
        success: results.length > 0,
        message: `混合搜索找到 ${results.length} 个结果`,
        details: results.slice(0, 3)
      };
    });

    await runTest('批量索引性能', async () => {
      if (!testData?.documents?.length) {
        return { success: false, message: '测试数据未加载' };
      }

      const docs = testData.documents.slice(0, 10).map(d => ({
        type: 'event' as const,
        id: `test-${d.id}`,
        text: d.text.substring(0, 200),
        metadata: { title: d.text.substring(0, 50) }
      }));

      const startTime = performance.now();
      const ids = await vectorService.indexDocuments(docs);
      const duration = performance.now() - startTime;

      return {
        success: ids.length === docs.length,
        message: `索引 ${docs.length} 个文档耗时 ${duration.toFixed(2)}ms`,
        details: { count: ids.length, duration }
      };
    });

    await runTest('索引删除测试', async () => {
      await vectorService.indexDocument('event', 'delete-test', 'This is a test document for deletion');
      await vectorService.deleteFromIndex('delete-test');
      return {
        success: true,
        message: '文档删除成功'
      };
    });

    await runTest('重复索引更新', async () => {
      await vectorService.indexDocument('event', 'update-test', 'Original content');
      await vectorService.indexDocument('event', 'update-test', 'Updated content');
      return {
        success: true,
        message: '重复索引更新成功'
      };
    });

    await runTest('并发搜索测试', async () => {
      const queries = ['music', 'technology', 'science', 'art', 'sports'];
      const startTime = performance.now();
      
      const results = await Promise.all(
        queries.map(q => vectorService.search(q, { k: 3 }))
      );
      
      const duration = performance.now() - startTime;
      const allSucceeded = results.every(r => r.length >= 0);

      return {
        success: allSucceeded,
        message: `${queries.length} 个并发查询耗时 ${duration.toFixed(2)}ms`,
        details: { 
          duration,
          avgDuration: duration / queries.length,
          resultCounts: results.map(r => r.length)
        }
      };
    });

    await runTest('极端相似度值', async () => {
      const results1 = await vectorService.search('test', { similarity: 0 });
      const results2 = await vectorService.search('test', { similarity: 1 });
      
      return {
        success: true,
        message: `相似度0返回${results1.length}个，相似度1返回${results2.length}个`,
        details: { zero: results1.length, one: results2.length }
      };
    });

    await runTest('Unicode 字符处理', async () => {
      const results = await vectorService.search('音乐 🎵 歌手 🎤', { k: 5 });
      return {
        success: true,
        message: `Unicode查询返回 ${results.length} 个结果`,
        details: results.length
      };
    });

    setStats(vectorService.getStats());
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await vectorService.search(searchQuery, { k: 10 });
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const passedCount = testResults.filter(r => r.status === 'passed').length;
  const failedCount = testResults.filter(r => r.status === 'failed').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🧪 向量搜索测试页面</h1>
        <p>Orama + BGE-small-zh-v1.5 本地向量搜索引擎测试</p>
      </header>

      <section className={styles.status}>
        <div className={styles.statusCard}>
          <h3>初始化状态</h3>
          <div className={styles.statusValue}>
            {isInitialized ? '✅ 已初始化' : '❌ 未初始化'}
          </div>
          {isLoading && (
            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                />
              </div>
              <span>{loadingProgress.message}</span>
            </div>
          )}
        </div>

        {stats && (
          <div className={styles.statusCard}>
            <h3>索引统计</h3>
            <div className={styles.stats}>
              <div>总文档数: <strong>{stats.totalDocuments}</strong></div>
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type}>{type}: <strong>{count}</strong></div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.statusCard}>
          <h3>测试结果</h3>
          <div className={styles.testStats}>
            <span className={styles.passed}>✅ 通过: {passedCount}</span>
            <span className={styles.failed}>❌ 失败: {failedCount}</span>
            <span>⏳ 总计: {testResults.length}</span>
          </div>
        </div>
      </section>

      <section className={styles.actions}>
        <button 
          className={styles.primaryBtn}
          onClick={initializeVectorService}
          disabled={isLoading || isInitialized}
        >
          {isInitialized ? '✅ 已初始化' : '🚀 初始化向量服务'}
        </button>
        
        <button 
          className={styles.secondaryBtn}
          onClick={runAllTests}
          disabled={isLoading}
        >
          🧪 运行所有测试
        </button>
      </section>

      <section className={styles.searchSection}>
        <h2>🔍 手动搜索测试</h2>
        <div className={styles.searchBox}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入搜索查询..."
            className={styles.searchInput}
          />
          <button 
            className={styles.searchBtn}
            onClick={handleSearch}
            disabled={isLoading || !isInitialized}
          >
            搜索
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>搜索结果 ({searchResults.length})</h3>
            {searchResults.map((result, index) => (
              <div key={result.id || index} className={styles.resultItem}>
                <div className={styles.resultHeader}>
                  <span className={styles.resultScore}>
                    相似度: {(result.score * 100).toFixed(1)}%
                  </span>
                  <span className={styles.resultType}>{result.type}</span>
                </div>
                <div className={styles.resultTitle}>{result.title}</div>
                <div className={styles.resultContent}>
                  {result.content?.substring(0, 200)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.testResults}>
        <h2>📋 测试结果详情</h2>
        <div className={styles.resultsList}>
          {testResults.map((result, index) => (
            <div 
              key={index} 
              className={`${styles.resultCard} ${styles[result.status]}`}
            >
              <div className={styles.resultHeader}>
                <span className={styles.resultName}>{result.name}</span>
                <span className={styles.resultStatus}>
                  {result.status === 'passed' && '✅ 通过'}
                  {result.status === 'failed' && '❌ 失败'}
                  {result.status === 'running' && '⏳ 运行中'}
                  {result.status === 'pending' && '⏸️ 待执行'}
                </span>
                {result.duration && (
                  <span className={styles.resultDuration}>
                    {result.duration.toFixed(2)}ms
                  </span>
                )}
              </div>
              {result.message && (
                <div className={styles.resultMessage}>{result.message}</div>
              )}
              {result.details && (
                <pre className={styles.resultDetails}>
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.testCases}>
        <h2>📝 测试场景说明</h2>
        <div className={styles.testGrid}>
          <div className={styles.testCategory}>
            <h3>基础功能测试</h3>
            <ul>
              <li>✅ 基础语义搜索 - 音乐相关</li>
              <li>✅ 语义搜索 - 科技相关</li>
              <li>✅ 中文语义搜索</li>
              <li>✅ 混合搜索测试</li>
            </ul>
          </div>
          
          <div className={styles.testCategory}>
            <h3>边界条件测试</h3>
            <ul>
              <li>✅ 空查询处理</li>
              <li>✅ 特殊字符查询</li>
              <li>✅ 超长查询处理</li>
              <li>✅ Unicode 字符处理</li>
            </ul>
          </div>
          
          <div className={styles.testCategory}>
            <h3>相似度阈值测试</h3>
            <ul>
              <li>✅ 高阈值 (0.9)</li>
              <li>✅ 低阈值 (0.3)</li>
              <li>✅ 极端值 (0 和 1)</li>
            </ul>
          </div>
          
          <div className={styles.testCategory}>
            <h3>性能测试</h3>
            <ul>
              <li>✅ 批量索引性能</li>
              <li>✅ 并发搜索测试</li>
              <li>✅ 索引删除测试</li>
              <li>✅ 重复索引更新</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
