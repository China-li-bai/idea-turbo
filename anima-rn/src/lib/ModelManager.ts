import * as FileSystem from 'expo-file-system/legacy'

export type ModelQuality = 'lite' | 'standard' | 'full'
export type ModelLanguage = 'zh' | 'en' | 'zh_en'

const DOWNLOAD_TIMEOUT_MS = 300000
const MAX_RETRIES_PER_URL = 3

export interface ModelInfo {
  id: string
  name: string
  filename: string
  quality: ModelQuality
  language: ModelLanguage
  sizeMB: number
  downloadUrl: string
  mirrorUrl?: string
  architecture: string
  description: string
}

export interface InstalledModel {
  id: string
  path: string
  sizeMB: number
  quality: ModelQuality
  language: ModelLanguage
}

const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: 'qwen3-0.6b-q4km',
    name: 'Qwen3-0.6B-Q4',
    filename: 'Qwen3-0.6B-Q4_K_M.gguf',
    quality: 'lite',
    language: 'zh_en',
    sizeMB: 378,
    downloadUrl: 'https://hf-mirror.com/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf',
    mirrorUrl: 'https://modelscope.cn/models/unsloth/Qwen3-0.6B-GGUF/resolve/master/Qwen3-0.6B-Q4_K_M.gguf',
    architecture: 'qwen3',
    description: '中文轻量模型，手机端首选，流畅运行',
  },
  {
    id: 'qwen3-0.6b-q8',
    name: 'Qwen3-0.6B-Q8',
    filename: 'Qwen3-0.6B-Q8_0.gguf',
    quality: 'standard',
    language: 'zh_en',
    sizeMB: 610,
    downloadUrl: 'https://hf-mirror.com/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf',
    mirrorUrl: 'https://modelscope.cn/models/Qwen/Qwen3-0.6B-GGUF/resolve/master/Qwen3-0.6B-Q8_0.gguf',
    architecture: 'qwen3',
    description: '中文标准模型，回复质量更好',
  },
  {
    id: 'smollm-360m-q8',
    name: 'SmolLM2-360M',
    filename: 'smollm2-360m-instruct-q8_0.gguf',
    quality: 'lite',
    language: 'en',
    sizeMB: 386,
    downloadUrl: 'https://hf-mirror.com/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf',
    mirrorUrl: 'https://modelscope.cn/models/unsloth/SmolLM2-360M-Instruct-GGUF/resolve/master/smollm2-360m-instruct-q8_0.gguf',
    architecture: 'llama',
    description: '英文基础模型(仅英文)，备用',
  },
]

let _activeModelId: string | null = null
let _installedModels: Map<string, InstalledModel> = new Map()
let _downloadCallbacks: Map<string, (progress: number) => void> = new Map()

function getModelsDir(): string {
  return `${FileSystem.documentDirectory}models/`
}

export async function verifyGgufHeader(filePath: string): Promise<boolean> {
  try {
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 4,
    })
    if (!content) return false
    const bytes = atob(content)
    return bytes === 'GGUF'
  } catch {
    return false
  }
}

export function getModelRegistry(): ModelInfo[] {
  return [...MODEL_REGISTRY]
}

export function getModelInfo(id: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id)
}

export function getActiveModelId(): string | null {
  return _activeModelId
}

export function getActiveModelInfo(): ModelInfo | undefined {
  return _activeModelId ? getModelInfo(_activeModelId) : undefined
}

export function getInstalledModels(): InstalledModel[] {
  return Array.from(_installedModels.values())
}

export async function scanInstalledModels(): Promise<InstalledModel[]> {
  _installedModels.clear()
  const dir = getModelsDir()

  const dirInfo = await FileSystem.getInfoAsync(dir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
    return []
  }

  for (const model of MODEL_REGISTRY) {
    const path = `${dir}${model.filename}`
    const info = await FileSystem.getInfoAsync(path) as any
    if (info.exists && info.size > 0) {
      const sizeMB = Math.round(info.size / 1024 / 1024)
      _installedModels.set(model.id, {
        id: model.id,
        path,
        sizeMB,
        quality: model.quality,
        language: model.language,
      })
    }
  }

  return getInstalledModels()
}

function findInstalledZhModel(): InstalledModel | undefined {
  return getInstalledModels().find((m) => m.language === 'zh_en' || m.language === 'zh')
}

function findRegistryZhModel(excludeIds?: string[]): ModelInfo | undefined {
  return MODEL_REGISTRY.find(
    (m) => (m.language === 'zh_en' || m.language === 'zh') && !excludeIds?.includes(m.id)
  )
}

function findRegistryLiteModel(excludeIds?: string[]): ModelInfo | undefined {
  return MODEL_REGISTRY.find((m) => m.quality === 'lite' && !excludeIds?.includes(m.id))
}

async function tryDownloadAndActivate(modelId: string, onProgress?: (progress: number) => void): Promise<string | null> {
  try {
    const path = await downloadModel(modelId, onProgress)
    setActiveModel(modelId)
    return path
  } catch (e: any) {
    console.warn(`[ModelManager] ⚠️ 模型下载失败 ${modelId}: ${e.message}`)
    return null
  }
}

export async function ensureAnyModel(onProgress?: (progress: number) => void): Promise<string | null> {
  const dir = getModelsDir()
  const dirInfo = await FileSystem.getInfoAsync(dir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }

  await scanInstalledModels()
  const installed = getInstalledModels()

  if (installed.length > 0) {
    const zhModel = findInstalledZhModel()
    if (zhModel) {
      setActiveModel(zhModel.id)
      console.log(`[ModelManager] 📁 已有中文模型: ${zhModel.id}`)
      return zhModel.path
    }

    const enModel = installed[0]
    const installedIds = installed.map((m) => m.id)
    const zhRegistry = findRegistryZhModel(installedIds)
    if (zhRegistry) {
      console.log(`[ModelManager] 📁 已有英文模型: ${enModel.id}, 尝试下载中文模型...`)
      const path = await tryDownloadAndActivate(zhRegistry.id, onProgress)
      if (path) {
        console.log(`[ModelManager] ✅ 中文模型下载成功: ${zhRegistry.id}`)
        return path
      }
    }
    setActiveModel(enModel.id)
    return enModel.path
  }

  const zhModel = findRegistryZhModel()
  if (zhModel) {
    console.log(`[ModelManager] 📥 首次启动，下载中文模型: ${zhModel.name} (${zhModel.sizeMB}MB)`)
    const path = await tryDownloadAndActivate(zhModel.id, onProgress)
    if (path) return path

    const liteModel = findRegistryLiteModel([zhModel.id])
    if (liteModel) {
      console.log(`[ModelManager] 📥 中文模型下载失败, 回退下载轻量模型: ${liteModel.name}`)
      const fallbackPath = await tryDownloadAndActivate(liteModel.id, onProgress)
      if (fallbackPath) return fallbackPath
    }

    console.error('[ModelManager] ❌ 所有下载尝试均失败')
    return null
  }

  const liteModel = findRegistryLiteModel()
  if (liteModel) {
    console.log(`[ModelManager] 📥 首次启动，下载轻量模型: ${liteModel.name} (${liteModel.sizeMB}MB)`)
    const path = await tryDownloadAndActivate(liteModel.id, onProgress)
    if (path) return path
  }

  console.error('[ModelManager] ❌ 没有可下载的模型')
  return null
}

export async function downloadModel(
  modelId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const model = getModelInfo(modelId)
  if (!model) throw new Error(`[ModelManager] 未知模型: ${modelId}`)

  const dir = getModelsDir()
  const dirInfo = await FileSystem.getInfoAsync(dir)
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }

  const path = `${dir}${model.filename}`
  const info = await FileSystem.getInfoAsync(path) as any
  if (info.exists && info.size > 0) {
    console.log(`[ModelManager] 📁 模型已存在: ${model.name}`)
    _installedModels.set(modelId, {
      id: modelId,
      path,
      sizeMB: Math.round(info.size / 1024 / 1024),
      quality: model.quality,
      language: model.language,
    })
    return path
  }

  if (onProgress) {
    _downloadCallbacks.set(modelId, onProgress)
  }

  console.log(`[ModelManager] 📥 下载模型: ${model.name} (${model.sizeMB}MB)`)

  try {
    const callback = _downloadCallbacks.get(modelId)

    const urlsToTry = [model.mirrorUrl, model.downloadUrl].filter(Boolean) as string[]
    let lastError: Error | null = null

    for (const url of urlsToTry) {
      for (let attempt = 1; attempt <= MAX_RETRIES_PER_URL; attempt++) {
        let timeoutId: ReturnType<typeof setTimeout> | null = null
        let pollIntervalId: ReturnType<typeof setInterval> | null = null
        try {
          console.log(`[ModelManager] 🔗 下载源: ${url.substring(0, 50)}... (尝试 ${attempt}/${MAX_RETRIES_PER_URL})`)

          const downloadPromise = FileSystem.downloadAsync(url, path)

          if (callback) {
            pollIntervalId = setInterval(async () => {
              try {
                const info = await FileSystem.getInfoAsync(path) as any
                if (info.exists && info.size > 0) {
                  const progress = Math.min(info.size / (model.sizeMB * 1024 * 1024), 1.0)
                  callback(Math.round(progress * 100) / 100)
                }
              } catch {}
            }, 2000)
          }

          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('下载超时')), DOWNLOAD_TIMEOUT_MS)
          })

          const result = await Promise.race([downloadPromise, timeoutPromise])

          if (!result) throw new Error('Download returned null')

          const verifyInfo = await FileSystem.getInfoAsync(path) as any
          if (!verifyInfo.exists || !verifyInfo.size) {
            throw new Error('下载后验证失败：文件不存在或大小为 0')
          }

          const sizeMB = Math.round(verifyInfo.size / 1024 / 1024)
          const expectedMinMB = model.sizeMB * 0.9
          if (sizeMB < expectedMinMB) {
            throw new Error(`下载后验证失败：文件大小异常 (${sizeMB}MB < 预期最小 ${Math.round(expectedMinMB)}MB)，可能下载源返回了错误页面`)
          }

          const ggufValid = await verifyGgufHeader(path)
          if (!ggufValid) {
            throw new Error('下载后验证失败：文件头不是有效的 GGUF 格式，可能下载源返回了错误页面')
          }

          console.log(`[ModelManager] ✅ 模型下载完成: ${model.name} (${sizeMB}MB)`)

          if (timeoutId) clearTimeout(timeoutId)
          if (pollIntervalId) clearInterval(pollIntervalId)
          if (callback) callback(1.0)

          _installedModels.set(modelId, {
            id: modelId,
            path,
            sizeMB,
            quality: model.quality,
            language: model.language,
          })

          return path
        } catch (e: any) {
          if (timeoutId) clearTimeout(timeoutId)
          if (pollIntervalId) clearInterval(pollIntervalId)
          const isLastAttempt = attempt === MAX_RETRIES_PER_URL
          const isTimeout = e.message?.includes('超时') || e.message?.includes('timed out')
          const warnMsg = isLastAttempt
            ? `[ModelManager] ⚠️ 下载源失败 (最终尝试): ${url.substring(0, 50)}... - ${e.message}`
            : `[ModelManager] ⚠️ 下载失败 (${attempt}/${MAX_RETRIES_PER_URL}), 1秒后重试: ${e.message}`
          console.warn(warnMsg)
          lastError = e
          await FileSystem.deleteAsync(path, { idempotent: true })
          if (!isLastAttempt && (isTimeout || e.message?.includes('返回了错误页面'))) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
    }

    throw lastError || new Error('所有下载源均失败')
  } finally {
    _downloadCallbacks.delete(modelId)
  }
}

export async function deleteModel(modelId: string): Promise<boolean> {
  const installed = _installedModels.get(modelId)
  if (!installed) return false

  if (_activeModelId === modelId) {
    console.warn(`[ModelManager] ⚠️ 不能删除正在使用的模型: ${modelId}`)
    return false
  }

  await FileSystem.deleteAsync(installed.path, { idempotent: true })
  _installedModels.delete(modelId)
  console.log(`[ModelManager] 🗑️ 模型已删除: ${modelId}`)
  return true
}

export function setActiveModel(modelId: string): boolean {
  const installed = _installedModels.get(modelId)
  if (!installed) {
    console.warn(`[ModelManager] ⚠️ 模型未安装: ${modelId}`)
    return false
  }

  _activeModelId = modelId
  const model = getModelInfo(modelId)
  console.log(`[ModelManager] 🔄 活跃模型: ${model?.name || modelId}`)
  return true
}

export function getActiveModelPath(): string | null {
  if (!_activeModelId) return null
  return _installedModels.get(_activeModelId)?.path || null
}

export function selectBestModelForBattery(batteryLevel: number, isCharging: boolean): string | null {
  const installed = getInstalledModels()
  if (installed.length === 0) return null

  if (isCharging || batteryLevel > 30) {
    const standard = installed.find((m) => m.quality === 'standard')
    if (standard) return standard.id
    const lite = installed.find((m) => m.quality === 'lite')
    if (lite) return lite.id
  }

  if (batteryLevel <= 15) {
    const lite = installed.find((m) => m.quality === 'lite')
    if (lite) return lite.id
  }

  const lite = installed.find((m) => m.quality === 'lite')
  if (lite) return lite.id
  return installed[0]?.id || null
}

export function selectBestModelForLanguage(lang: 'zh' | 'en'): string | null {
  const installed = getInstalledModels()
  const preferred = installed.filter((m) => {
    if (lang === 'zh') return m.language === 'zh' || m.language === 'zh_en'
    return m.language === 'en' || m.language === 'zh_en'
  })

  const standard = preferred.find((m) => m.quality === 'standard')
  if (standard) return standard.id
  const lite = preferred.find((m) => m.quality === 'lite')
  if (lite) return lite.id
  return preferred[0]?.id || null
}

export async function autoUpgradeOnWifi(): Promise<string | null> {
  const installed = getInstalledModels()
  const hasLite = installed.some((m) => m.quality === 'lite')
  const hasStandard = installed.some((m) => m.quality === 'standard')

  if (hasLite && !hasStandard) {
    const standardModel = MODEL_REGISTRY.find((m) => m.quality === 'standard' && m.language === 'zh_en')
    if (standardModel) {
      try {
        console.log(`[ModelManager] 📶 WiFi自动升级: ${standardModel.name}`)
        await downloadModel(standardModel.id)
        return standardModel.id
      } catch (e: any) {
        console.warn(`[ModelManager] ⚠️ 自动升级失败: ${e.message}`)
        return null
      }
    }
  }

  return null
}
