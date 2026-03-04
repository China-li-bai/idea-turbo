/**
 * 浏览器版本 - Kokoro TTS
 * 
 * 使用 Vite 构建，支持 WebAssembly 后端
 */

// ============ 浏览器端代码 ============

/**
 * 初始化 TTS
 * 在浏览器中运行
 */
async function initBrowserTTS() {
  // 动态导入 kokoro-js
  const { KokoroTTS } = await import('kokoro-js');
  
  console.log('📦 加载模型...');
  
  const tts = await KokoroTTS.from_pretrained(
    'onnx-community/Kokoro-82M-v1.0-ONNX',
    {
      dtype: 'q8',
      device: 'wasm',  // 使用 WebAssembly
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          updateProgress(progress.file, progress.progress);
        }
      }
    }
  );
  
  console.log('✅ 模型加载完成!');
  return tts;
}

/**
 * 生成语音并播放
 */
async function speak(tts, text, voice = 'af_sky') {
  const audio = await tts.generate(text, { voice });
  
  // 创建 AudioContext
  const audioContext = new AudioContext();
  const sampleRate = audio.sample_rate || 24000;
  
  // 创建 AudioBuffer
  const audioBuffer = audioContext.createBuffer(
    1,
    audio.audio.length,
    sampleRate
  );
  
  audioBuffer.getChannelData(0).set(audio.audio);
  
  // 播放
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
  
  return audioBuffer.duration;
}

/**
 * 下载为 WAV 文件
 */
async function downloadWav(tts, text, voice = 'af_sky', filename = 'output.wav') {
  const audio = await tts.generate(text, { voice });
  const wav = audioToWav(audio);
  
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Audio 转 WAV
 */
function audioToWav(audio) {
  const samples = audio.audio;
  const sampleRate = audio.sample_rate || 24000;
  
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  
  const write = (off, str) => str.split('').forEach((c, i) => 
    view.setUint8(off + i, c.charCodeAt(0)));
  
  write(0, 'RIFF');
  view.setUint32(4, buffer.byteLength - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return buffer;
}

/**
 * 更新进度条
 */
function updateProgress(file, progress) {
  const progressBar = document.getElementById('progress');
  const progressText = document.getElementById('progress-text');
  
  if (progressBar && progress) {
    progressBar.style.width = `${progress * 100}%`;
  }
  if (progressText) {
    progressText.textContent = `${file}: ${(progress * 100).toFixed(0)}%`;
  }
}

// ============ UI 示例 ============

/*
HTML 结构示例:

<!DOCTYPE html>
<html>
<head>
  <title>Kokoro TTS Browser Demo</title>
</head>
<body>
  <div id="app">
    <h1>🎤 Kokoro TTS 浏览器演示</h1>
    
    <div id="progress-container" style="width: 100%; background: #eee;">
      <div id="progress" style="width: 0%; height: 20px; background: #4CAF50;"></div>
    </div>
    <div id="progress-text"></div>
    
    <textarea id="text-input" rows="4" cols="50">
Hello! This is a browser-based text to speech demo using Kokoro.
    </textarea>
    
    <select id="voice-select">
      <option value="af_sky">Sky (Female)</option>
      <option value="af_bella">Bella (Female)</option>
      <option value="am_michael">Michael (Male)</option>
    </select>
    
    <button id="speak-btn" onclick="handleSpeak()">🔊 播放</button>
    <button id="download-btn" onclick="handleDownload()">💾 下载</button>
  </div>
  
  <script type="module" src="./browser-tts.js"></script>
</body>
</html>
*/

// 导出给全局使用
if (typeof window !== 'undefined') {
  window.KokoroBrowser = {
    init: initBrowserTTS,
    speak,
    downloadWav
  };
}

export { initBrowserTTS, speak, downloadWav };
