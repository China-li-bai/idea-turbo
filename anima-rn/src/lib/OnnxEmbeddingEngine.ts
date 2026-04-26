let ONNXModule: any = null

async function getONNX() {
  if (!ONNXModule) {
    ONNXModule = await import('onnxruntime-react-native')
  }
  return ONNXModule
}

import type { IEmbeddingEngine } from './EmbeddingEngine'
import { ensureDocumentDirectory, getDocumentDirectory, getFileInfo, readAsStringAsync, makeDirectoryAsync, copyFile } from './fs-utils'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'

const EMBEDDING_MODEL_DIR = 'models/embedding/'
const ONNX_SUBDIR = 'onnx/'
const HF_BASE = 'https://hf-mirror.com/BAAI/bge-small-en-v1.5/resolve/main/'

let _modelDir = ''
let _onnxModelPath = ''
let _vocabPath = ''

const MIN_MODEL_SIZE = 10 * 1024 * 1024
const MIN_VOCAB_SIZE = 1000

async function ensureEmbeddingModelExists(): Promise<string> {
  const docDir = await ensureDocumentDirectory()
  _modelDir = docDir + EMBEDDING_MODEL_DIR
  _onnxModelPath = _modelDir + ONNX_SUBDIR + 'model_quantized.onnx'
  _vocabPath = _modelDir + 'vocab.txt'

  const modelInfo = await getFileInfo(_onnxModelPath)
  const vocabInfo = await getFileInfo(_vocabPath)

  const modelValid = modelInfo.exists && (modelInfo.size || 0) > MIN_MODEL_SIZE
  const vocabValid = vocabInfo.exists && (vocabInfo.size || 0) > MIN_VOCAB_SIZE

  if (modelValid && vocabValid) {
    console.log('[OnnxEmbedding] 📁 Model files already exist at:', _modelDir)
    return _modelDir
  }

  if (modelInfo.exists && !modelValid) {
    console.warn('[OnnxEmbedding] ⚠️ Model file corrupted (' + modelInfo.size + ' bytes), deleting...')
    try { await FileSystem.deleteAsync(_onnxModelPath) } catch (_) {}
  }
  if (vocabInfo.exists && !vocabValid) {
    console.warn('[OnnxEmbedding] ⚠️ Vocab file corrupted, deleting...')
    try { await FileSystem.deleteAsync(_vocabPath) } catch (_) {}
  }

  console.log('[OnnxEmbedding] 📥 Downloading embedding model from HuggingFace...')

  try {
    await makeDirectoryAsync(_modelDir + ONNX_SUBDIR, { intermediates: true })
  } catch (e: any) {
    if (!e.message?.includes('already exists')) {
      console.warn('[OnnxEmbedding] ⚠️ mkdir failed:', e.message)
    }
  }

  try {
    if (!modelValid) {
      console.log('[OnnxEmbedding]   Downloading ONNX model (~127MB)...')
      const dlResult = await FileSystem.downloadAsync(
        HF_BASE + 'onnx/model.onnx',
        _onnxModelPath
      )
      if (!dlResult) throw new Error('ONNX download returned null')
      console.log('[OnnxEmbedding]   ✅ ONNX model downloaded, status:', dlResult.status, 'size:', dlResult.headers?.['Content-Length'] || 'unknown')
    }

    if (!vocabValid) {
      console.log('[OnnxEmbedding]   Downloading vocab...')
      const dlResult = await FileSystem.downloadAsync(
        HF_BASE + 'vocab.txt',
        _vocabPath
      )
      if (!dlResult) throw new Error('Vocab download returned null')
      console.log('[OnnxEmbedding]   ✅ Vocab downloaded, status:', dlResult.status)
    }

    const verifyModel = await getFileInfo(_onnxModelPath)
    const verifyVocab = await getFileInfo(_vocabPath)
    if (!verifyModel.exists || (verifyModel.size || 0) < MIN_MODEL_SIZE) {
      throw new Error('Model file invalid after download: ' + (verifyModel.size || 0) + ' bytes')
    }
    if (!verifyVocab.exists || (verifyVocab.size || 0) < MIN_VOCAB_SIZE) {
      throw new Error('Vocab file invalid after download: ' + (verifyVocab.size || 0) + ' bytes')
    }

    console.log('[OnnxEmbedding] ✅ All embedding model files verified')
    return _modelDir
  } catch (dlErr: any) {
    console.error('[OnnxEmbedding] ❌ Download failed:', dlErr.message)
    throw new Error(`Embedding model download failed: ${dlErr.message}`)
  }
}

const MAX_SEQ_LENGTH = 512
const HIDDEN_SIZE = 384
const PAD_TOKEN_ID = 0
const CLS_TOKEN_ID = 101
const SEP_TOKEN_ID = 102
const UNK_TOKEN_ID = 100
const CLS_TOKEN = '[CLS]'
const SEP_TOKEN = '[SEP]'
const UNK_TOKEN = '[UNK]'

interface TokenizerResult {
  inputIds: BigInt64Array
  attentionMask: BigInt64Array
  tokenCount: number
}

class BertWordPieceTokenizer {
  private vocab: Map<string, number> = new Map()
  private _ready = false

  async init(vocabPath: string): Promise<void> {
    try {
      const content = await readAsStringAsync(vocabPath)
      const lines = content.split('\n')
      this.vocab.clear()
      for (let i = 0; i < lines.length; i++) {
        const token = lines[i].trim()
        if (token) {
          this.vocab.set(token, i)
        }
      }
      this._ready = this.vocab.size > 0
      console.log(`[BertTokenizer] ✅ Vocab loaded: ${this.vocab.size} tokens`)
    } catch (e: any) {
      console.error('[BertTokenizer] ❌ Load failed:', e.message)
      this._ready = false
    }
  }

  isReady(): boolean {
    return this._ready
  }

  basicTokenize(text: string): string[] {
    const tokens: string[] = []
    const cleaned = text.toLowerCase().trim()

    let i = 0
    while (i < cleaned.length) {
      const ch = cleaned[i]

      if (this.isChinese(ch)) {
        tokens.push(ch)
        i++
      } else if (this.isLetter(ch)) {
        let word = ''
        while (i < cleaned.length && this.isLetter(cleaned[i])) {
          word += cleaned[i]
          i++
        }
        tokens.push(word.toLowerCase())
      } else if (this.isDigit(ch)) {
        let num = ''
        while (i < cleaned.length && this.isDigit(cleaned[i])) {
          num += cleaned[i]
          i++
        }
        tokens.push(num)
      } else if (this.isWhitespace(ch)) {
        i++
      } else {
        tokens.push(ch)
        i++
      }
    }

    return tokens
  }

  private isChinese(ch: string): boolean {
    const code = ch.charCodeAt(0)
    return code >= 0x4e00 && code <= 0x9fff || code >= 0x3000 && code <= 0x303f
  }

  private isLetter(ch: string): boolean {
    const code = ch.charCodeAt(0)
    return (code >= 97 && code <= 122) || (code >= 65 && code <= 90)
  }

  private isDigit(ch: string): boolean {
    const code = ch.charCodeAt(0)
    return code >= 48 && code <= 57
  }

  private isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
  }

  wordPieceTokenize(token: string): string[] {
    if (token.length === 0) return []

    if (this.vocab.has(token)) {
      return [token]
    }

    const subTokens: string[] = []
    let start = 0
    let end = token.length

    while (start < end && end > start) {
      let substr = token.substring(start, end)
      if (start > 0) {
        substr = '##' + substr
      }

      if (this.vocab.has(substr)) {
        subTokens.push(substr)
        start = subTokens[subTokens.length - 1].startsWith('##')
          ? start + subTokens[subTokens.length - 1].length - 2
          : start + subTokens[subTokens.length - 1].length
        end = token.length
      } else {
        end--
      }
    }

    if (start < end && subTokens.length === 0) {
      return [UNK_TOKEN]
    }

    return subTokens
  }

  encode(text: string, maxLength: number = MAX_SEQ_LENGTH): TokenizerResult {
    const basicTokens = this.basicTokenize(text)
    const wordPieceTokens: string[] = [CLS_TOKEN]

    for (const token of basicTokens) {
      const subTokens = this.wordPieceTokenize(token)
      for (const st of subTokens) {
        wordPieceTokens.push(st)
      }
    }

    wordPieceTokens.push(SEP_TOKEN)

    const truncated = wordPieceTokens.slice(0, maxLength)
    const seqLen = truncated.length

    const inputIds = new BigInt64Array(maxLength)
    const attentionMask = new BigInt64Array(maxLength)

    for (let i = 0; i < maxLength; i++) {
      if (i < seqLen) {
        const tokenId = this.vocab.get(truncated[i]) ?? UNK_TOKEN_ID
        inputIds[i] = BigInt(tokenId)
        attentionMask[i] = BigInt(1)
      } else {
        inputIds[i] = BigInt(PAD_TOKEN_ID)
        attentionMask[i] = BigInt(0)
      }
    }

    return {
      inputIds,
      attentionMask,
      tokenCount: Math.min(seqLen, maxLength),
    }
  }
}

export class OnnxEmbeddingEngine implements IEmbeddingEngine {
  readonly name = 'bge-micro-v2-onnx'
  readonly dimensions = HIDDEN_SIZE

  private session: any = null
  private tokenizer: BertWordPieceTokenizer | null = null
  private _ready = false
  private _loading = false
  private _error: string | null = null

  get error(): string | null {
    return this._error
  }

  get isLoading(): boolean {
    return this._loading
  }

  isReady(): boolean {
    return this._ready && this.session !== null && this.tokenizer?.isReady() === true
  }

  async init(modelDir?: string): Promise<boolean> {
    if (this._ready) return true
    if (this._loading) return false

    this._loading = true
    this._error = null

    try {
      if (!modelDir) {
        await ensureEmbeddingModelExists()
      }

      const onnxPath = modelDir ? modelDir + '/onnx/model_quantized.onnx' : _onnxModelPath
      const vocabPath = modelDir ? modelDir + '/vocab.txt' : _vocabPath

      console.log('[OnnxEmbedding] 🔄 Loading BGE-Micro-v2...')
      console.log(`[OnnxEmbedding]   Model: ${onnxPath}`)

      const modelExists = await getFileInfo(onnxPath)
      if (!modelExists.exists) {
        throw new Error('ONNX model file not found: ' + onnxPath)
      }

      const vocabExists = await getFileInfo(vocabPath)
      if (!vocabExists.exists) {
        throw new Error('Vocab file not found: ' + vocabPath)
      }

      this.tokenizer = new BertWordPieceTokenizer()
      await this.tokenizer.init(vocabPath)

      if (!this.tokenizer.isReady()) {
        throw new Error('Tokenizer initialization failed')
      }

      console.log('[OnnxEmbedding]   Creating ONNX session...')
      const ONNX = await getONNX()
      this.session = await ONNX.InferenceSession.create(onnxPath)

      const inputNames = this.session.inputNames
      console.log(`[OnnxEmbedding]   Inputs: [${inputNames.join(', ')}]`)

      this._ready = true
      this._loading = false
      console.log('[OnnxEmbedding] ✅ BGE-Micro-v2 ready! (' + HIDDEN_SIZE + 'd)')
      return true
    } catch (e: any) {
      this._error = e.message || String(e)
      this._ready = false
      this._loading = false
      console.error('[OnnxEmbedding] ❌ Init failed:', e.message)
      return false
    }
  }

  async embed(text: string): Promise<Float32Array> {
    if (!this.isReady()) {
      throw new Error('OnnxEmbeddingEngine not initialized. Call init() first.')
    }

    if (!text || !text.trim()) {
      const zeroVec = new Float32Array(HIDDEN_SIZE)
      return zeroVec
    }

    const tokens = this.tokenizer!.encode(text)

    const inputIdsTensor = {
      dims: [1, MAX_SEQ_LENGTH],
      type: 'int64' as const,
      data: tokens.inputIds,
    }

    const attentionMaskTensor = {
      dims: [1, MAX_SEQ_LENGTH],
      type: 'int64' as const,
      data: tokens.attentionMask,
    }

    const feeds: Record<string, any> = {}
    const inputNames = this.session!.inputNames

    for (const name of inputNames) {
      if (name.includes('input') || name.includes('id')) {
        feeds[name] = inputIdsTensor
      } else if (name.includes('attention') || name.includes('mask')) {
        feeds[name] = attentionMaskTensor
      } else if (name.includes('token_type')) {
        const tokenTypeIds = new BigInt64Array(MAX_SEQ_LENGTH)
        feeds[name] = {
          dims: [1, MAX_SEQ_LENGTH],
          type: 'int64' as const,
          data: tokenTypeIds,
        }
      }
    }

    try {
      const results: Record<string, any> = await this.session!.run(feeds)

      let lastHiddenState: Float32Array | null = null

      for (const [name, tensor] of Object.entries(results)) {
        const t = tensor as any
        if (
          name.includes('last_hidden') ||
          name.includes('output') ||
          (t.dims && t.dims.length === 3 && t.dims[2] === HIDDEN_SIZE)
        ) {
          const data = t.data as Float32Array | number[]
          lastHiddenState = data instanceof Float32Array ? data : new Float32Array(data)
          break
        }
      }

      if (!lastHiddenState) {
        for (const [, tensor] of Object.entries(results)) {
          const t = tensor as any
          if (t.dims && t.dims.length === 3) {
            const data = t.data as Float32Array | number[]
            lastHiddenState = data instanceof Float32Array ? data : new Float32Array(data)
            break
          }
        }
      }

      if (!lastHiddenState) {
        const firstTensor = Object.values(results)[0] as any
        if (firstTensor) {
          const data = firstTensor.data as Float32Array | number[]
          lastHiddenState = data instanceof Float32Array ? data : new Float32Array(data)
        }
      }

      if (!lastHiddenState) {
        throw new Error('No valid output tensor found from ONNX session')
      }

      const embedding = this.meanPooling(lastHiddenState, tokens.attentionMask, tokens.tokenCount)
      return this.l2Normalize(embedding)
    } catch (e: any) {
      console.error('[OnnxEmbedding] ❌ Embed error:', e.message)
      throw e
    }
  }

  private meanPooling(
    lastHiddenState: Float32Array,
    _attentionMask: BigInt64Array,
    tokenCount: number
  ): Float32Array {
    const pooled = new Float32Array(HIDDEN_SIZE)

    if (tokenCount <= 0) return pooled

    for (let t = 1; t < tokenCount - 1; t++) {
      for (let d = 0; d < HIDDEN_SIZE; d++) {
        pooled[d] += lastHiddenState[t * HIDDEN_SIZE + d]
      }
    }

    const count = Math.max(1, tokenCount - 2)
    for (let d = 0; d < HIDDEN_SIZE; d++) {
      pooled[d] /= count
    }

    return pooled
  }

  private l2Normalize(vec: Float32Array): Float32Array {
    let norm = 0
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i]
    }
    norm = Math.sqrt(norm) || 1

    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm
    }

    return vec
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = []

    for (const text of texts) {
      const embedding = await this.embed(text)
      results.push(embedding)
    }

    return results
  }

  similarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    if (denom === 0) return 0
    return dotProduct / denom
  }

  async release(): Promise<void> {
    if (this.session) {
      try {
        await this.session.release()
      } catch (e) {
        // ignore release errors
      }
      this.session = null
    }
    this.tokenizer = null
    this._ready = false
    console.log('[OnnxEmbedding] 🔓 Released')
  }
}
