// Sherpa-onnx Web Worker
// 处理语音识别模型加载和推理

let recognizer = null;
let stream = null;
let sampleRate = 16000;
let Module = null;

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      initSherpa(data);
      break;
    case 'audio':
      processAudio(data);
      break;
    case 'reset':
      resetStream();
      break;
    case 'destroy':
      destroyRecognizer();
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

async function initSherpa(config) {
  try {
    self.postMessage({ type: 'status', message: 'Loading Sherpa-onnx...' });
    
    // 配置 Module
    self.Module = {
      locateFile: function(path, scriptDirectory) {
        // WASM 文件应该和 JS 文件在同一目录
        if (path.endsWith('.wasm')) {
          return '/sherpa-onnx-wasm-main.wasm';
        }
        return scriptDirectory + path;
      },
      print: function(text) {
        console.log('Sherpa:', text);
      },
      printErr: function(text) {
        console.error('Sherpa Error:', text);
      },
      setStatus: function(status) {
        console.log('Sherpa Status:', status);
        self.postMessage({ type: 'status', message: status });
      }
    };

    // 加载 sherpa-onnx-wasm-main.js
    importScripts('/sherpa-onnx-wasm-main.js');
    
    // 等待 Module 初始化完成
    if (self.Module.onRuntimeInitialized) {
      await new Promise((resolve) => {
        const originalOnInit = self.Module.onRuntimeInitialized;
        self.Module.onRuntimeInitialized = function() {
          if (originalOnInit) originalOnInit();
          resolve();
        };
      });
    } else {
      // 等待初始化完成
      await new Promise((resolve) => {
        self.Module.onRuntimeInitialized = resolve;
      });
    }
    
    Module = self.Module;
    self.postMessage({ type: 'status', message: 'Module initialized, loading model...' });
    
    // 配置模型
    const modelPath = config.modelPath || '/models/sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23';

    const onlineTransducerModelConfig = {
      encoder: `${modelPath}/encoder-epoch-99-avg-1.int8.onnx`,
      decoder: `${modelPath}/decoder-epoch-99-avg-1.onnx`,
      joiner: `${modelPath}/joiner-epoch-99-avg-1.int8.onnx`,
    };

    const onlineModelConfig = {
      transducer: onlineTransducerModelConfig,
      tokens: `${modelPath}/tokens.txt`,
    };

    const recognizerConfig = {
      modelConfig: onlineModelConfig,
      featConfig: {
        sampleRate: sampleRate,
        featureDim: 80,
      },
      endpointConfig: {
        rule1MinTrailingSilence: 2.4,
        rule2MinTrailingSilence: 1.2,
        rule3MinUtteranceLength: 20,
      },
    };

    // 创建识别器
    recognizer = Module.createOnlineRecognizer(recognizerConfig);
    stream = recognizer.createStream();
    
    self.postMessage({ type: 'status', message: 'Model loaded successfully' });
    self.postMessage({ type: 'initialized' });
    
  } catch (error) {
    console.error('Failed to initialize Sherpa-onnx:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

function processAudio(audioData) {
  if (!recognizer || !stream) {
    console.warn('Recognizer not initialized');
    return;
  }

  try {
    // audioData 应该是 Float32Array
    stream.acceptWaveform(sampleRate, audioData);
    
    // 解码
    while (recognizer.isReady(stream)) {
      recognizer.decode(stream);
    }
    
    // 检查结果
    const result = recognizer.getResult(stream);
    
    if (result && result.text && result.text.length > 0) {
      self.postMessage({ 
        type: 'result', 
        text: result.text,
        isEndpoint: recognizer.isEndpoint(stream)
      });
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    self.postMessage({ type: 'error', error: error.message });
  }
}

function resetStream() {
  if (recognizer) {
    stream = recognizer.createStream();
    self.postMessage({ type: 'reset' });
  }
}

function destroyRecognizer() {
  if (stream) {
    stream.free();
    stream = null;
  }
  if (recognizer) {
    recognizer.free();
    recognizer = null;
  }
  self.postMessage({ type: 'destroyed' });
}
