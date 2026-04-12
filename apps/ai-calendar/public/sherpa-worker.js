var recognizer = null;
var stream = null;
var lastResult = '';
var resultList = [];
var Module = null;
var db = null;
var blobUrls = {};
var MODEL_VERSION = '1.0.0';
var DB_NAME = 'SherpaOnnxModelCache';
var STORE_NAME = 'models';
var DB_VERSION = 1;
var initConfig = null;

self.onerror = function(e) {
  self.postMessage({ type: 'error', error: e.message || 'Unknown worker error' });
};

self.onmessage = function(e) {
  var msg = e.data;
  switch (msg.type) {
    case 'init':
      handleInit(msg.config);
      break;
    case 'audio':
      handleAudio(msg.samples, msg.sampleRate);
      break;
    case 'reset':
      handleReset();
      break;
    case 'destroy':
      handleDestroy();
      break;
    case 'forceUpdateModel':
      handleForceUpdateModel();
      break;
    case 'clearModelCache':
      handleClearModelCache();
      break;
    case 'getModelVersion':
      self.postMessage({ type: 'modelVersion', version: MODEL_VERSION });
      break;
    default:
      console.warn('[SherpaWorker] Unknown message type:', msg.type);
  }
};

function postStatus(message) {
  self.postMessage({ type: 'status', message: message });
}

function postError(error) {
  self.postMessage({ type: 'error', error: error });
}

function initDB() {
  return new Promise(function(resolve, reject) {
    if (db) {
      resolve();
      return;
    }

    var request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function() {
      reject(new Error('Failed to open IndexedDB: ' + request.error));
    };

    request.onsuccess = function() {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = function(event) {
      var database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        var store = database.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function getCachedModel(url) {
  return new Promise(function(resolve, reject) {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    var transaction = db.transaction([STORE_NAME], 'readonly');
    var store = transaction.objectStore(STORE_NAME);
    var request = store.get(url);

    request.onsuccess = function() {
      var cached = request.result;
      if (!cached) {
        resolve(null);
        return;
      }
      resolve(cached.data);
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function cacheModel(url, data) {
  return new Promise(function(resolve, reject) {
    if (!db) {
      reject(new Error('DB not initialized'));
      return;
    }

    var transaction = db.transaction([STORE_NAME], 'readwrite');
    var store = transaction.objectStore(STORE_NAME);

    var cachedModel = {
      url: url,
      data: data,
      version: MODEL_VERSION,
      timestamp: Date.now(),
      size: data.byteLength
    };

    var request = store.put(cachedModel);

    request.onsuccess = function() {
      resolve();
    };

    request.onerror = function() {
      reject(request.error);
    };
  });
}

function getOrCreateBlobUrl(url, data) {
  if (blobUrls[url]) {
    return blobUrls[url];
  }

  var blob = new Blob([data], {
    type: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
  });
  var blobUrl = URL.createObjectURL(blob);
  blobUrls[url] = blobUrl;
  return blobUrl;
}

async function preloadModel(cdnBaseUrl, dataFile) {
  var dataUrl = cdnBaseUrl + '/' + dataFile;

  var cached = await getCachedModel(dataUrl);
  if (cached) {
    postStatus('从缓存加载模型...');
    getOrCreateBlobUrl(dataUrl, cached);
    return;
  }

  postStatus('下载模型中...');
  var response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error('Failed to download model: ' + response.status);
  }

  var data = await response.arrayBuffer();
  await cacheModel(dataUrl, data);
  getOrCreateBlobUrl(dataUrl, data);
  postStatus('模型下载完成 (' + (data.byteLength / 1024 / 1024).toFixed(2) + 'MB)');
}

async function handleInit(config) {
  initConfig = config;

  try {
    postStatus('初始化模型缓存...');

    await initDB();

    postStatus('预加载模型...');
    await preloadModel(config.cdnBaseUrl, config.dataFile);

    postStatus('加载 WASM 模块...');
    await loadWasmModule(config);

  } catch (error) {
    postError('初始化失败: ' + String(error));
    console.error('[SherpaWorker] Init error:', error);
  }
}

function loadWasmModule(config) {
  return new Promise(function(resolve, reject) {
    var moduleReady = false;
    var initTimeout = null;
    var checkInterval = null;

    function cleanup() {
      if (initTimeout) clearTimeout(initTimeout);
      if (checkInterval) clearInterval(checkInterval);
    }

    function checkReady() {
      if (moduleReady) return;

      var mod = self.Module;
      if (mod && typeof mod._malloc === 'function' && typeof mod._free === 'function') {
        moduleReady = true;
        cleanup();

        try {
          console.log('[SherpaWorker] Module exports ready, creating recognizer...');
          recognizer = self.createOnlineRecognizer(self.Module);
          stream = recognizer.createStream();
          postStatus('Ready');
          self.postMessage({ type: 'initialized' });
          resolve();
        } catch (error) {
          console.error('[SherpaWorker] Failed to create recognizer:', error);
          postError('创建识别器失败');
          reject(error);
        }
      }
    }

    var dataUrl = config.cdnBaseUrl + '/' + config.dataFile;

    self.Module = {
      locateFile: function(path, scriptDirectory) {
        if (path.endsWith('.data')) {
          if (blobUrls[dataUrl]) {
            console.log('[SherpaWorker] Using cached blob URL for:', path);
            return blobUrls[dataUrl];
          }
          console.log('[SherpaWorker] Using CDN URL for:', path);
          return dataUrl;
        }

        if (path.endsWith('.wasm')) {
          return path;
        }

        return scriptDirectory + path;
      },
      setStatus: function(status) {
        if (!status || !status.trim()) return;

        if (status === 'Running...') {
          postStatus('模型加载完成，初始化识别器...');
          return;
        }

        if (status.includes('from cache') || status.includes('Using cached')) {
          postStatus('从缓存加载模型...');
          return;
        }

        var downloadMatch = status.match(/Downloading data... \((\d+)\/(\d+)\)/);
        if (downloadMatch) {
          var downloaded = parseInt(downloadMatch[1], 10);
          var total = parseInt(downloadMatch[2], 10);
          var percent = total === 0 ? 0 : (downloaded * 10000 / total) / 100;
          var sizeMB = (total / 1024 / 1024).toFixed(1);
          postStatus('下载模型中... ' + sizeMB + 'MB ' + percent.toFixed(1) + '%');
          return;
        }

        postStatus(status);
      },
      onRuntimeInitialized: function() {
        console.log('[SherpaWorker] onRuntimeInitialized called');
        checkInterval = setInterval(checkReady, 100);
      }
    };

    initTimeout = setTimeout(function() {
      cleanup();
      if (!moduleReady) {
        var error = new Error('WASM module initialization timeout');
        console.error('[SherpaWorker]', error);
        postError('WASM 模块初始化超时');
        reject(error);
      }
    }, 60000);

    try {
      var baseUrl = config.wasmScriptsBaseUrl || '';
      importScripts(baseUrl + '/sherpa-onnx-asr.js');
      importScripts(baseUrl + '/sherpa-onnx-wasm-main-asr.js');
    } catch (error) {
      cleanup();
      postError('加载 WASM 脚本失败');
      reject(error);
    }
  });
}

function handleAudio(samplesBuffer, sampleRate) {
  if (!recognizer || !stream) {
    return;
  }

  try {
    var samples = new Float32Array(samplesBuffer);

    stream.acceptWaveform(sampleRate, samples);

    while (recognizer.isReady(stream)) {
      recognizer.decode(stream);
    }

    var isEndpoint = recognizer.isEndpoint(stream);

    if (isEndpoint) {
      if (lastResult.trim()) {
        resultList.push(lastResult);
      }
      lastResult = '';
      recognizer.reset(stream);
    }

    var result = recognizer.getResult(stream);

    if (result.text && result.text !== lastResult) {
      lastResult = result.text;
      self.postMessage({
        type: 'result',
        text: result.text,
        isEndpoint: isEndpoint
      });
    }
  } catch (error) {
    console.error('[SherpaWorker] Audio processing error:', error);
    postError('音频处理错误: ' + String(error));
  }
}

function handleReset() {
  if (recognizer) {
    if (stream) {
      var result = recognizer.getResult(stream);
      if (result.text) {
        resultList.push(result.text);
      }
    }
    stream = recognizer.createStream();
    lastResult = '';
    self.postMessage({ type: 'reset' });
  }
}

function handleDestroy() {
  if (stream) {
    stream.free();
    stream = null;
  }
  if (recognizer) {
    recognizer.free();
    recognizer = null;
  }
  lastResult = '';
  resultList = [];
  self.postMessage({ type: 'destroyed' });
}

async function handleForceUpdateModel() {
  try {
    postStatus('强制更新模型...');

    if (!initConfig) {
      postError('未初始化，无法更新模型');
      return;
    }

    var dataUrl = initConfig.cdnBaseUrl + '/' + initConfig.dataFile;

    await initDB();

    var tx = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    await new Promise(function(resolve, reject) {
      var request = store.delete(dataUrl);
      request.onsuccess = resolve;
      request.onerror = function() { reject(request.error); };
    });

    if (blobUrls[dataUrl]) {
      URL.revokeObjectURL(blobUrls[dataUrl]);
      delete blobUrls[dataUrl];
    }

    var response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error('Failed to download model: ' + response.status);
    }

    var data = await response.arrayBuffer();
    await cacheModel(dataUrl, data);
    getOrCreateBlobUrl(dataUrl, data);

    postStatus('模型更新完成，请刷新页面');
    self.postMessage({ type: 'forceUpdateComplete' });
  } catch (error) {
    postError('模型更新失败: ' + String(error));
  }
}

async function handleClearModelCache() {
  try {
    postStatus('清除模型缓存...');

    await initDB();

    var tx = db.transaction(STORE_NAME, 'readwrite');
    var store = tx.objectStore(STORE_NAME);
    await new Promise(function(resolve, reject) {
      var request = store.clear();
      request.onsuccess = resolve;
      request.onerror = function() { reject(request.error); };
    });

    var urls = Object.keys(blobUrls);
    for (var i = 0; i < urls.length; i++) {
      URL.revokeObjectURL(blobUrls[urls[i]]);
    }
    blobUrls = {};

    postStatus('缓存已清除，请刷新页面');
    self.postMessage({ type: 'clearCacheComplete' });
  } catch (error) {
    postError('清除缓存失败: ' + String(error));
  }
}
