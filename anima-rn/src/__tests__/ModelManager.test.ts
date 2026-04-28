import { verifyGgufHeader, getModelRegistry } from '../lib/ModelManager'
import * as FileSystem from 'expo-file-system/legacy'

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}))

describe('ModelManager — verifyGgufHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('G1. 有效的 GGUF 头返回 true', async () => {
    const ggufBase64 = btoa('GGUF')
    ;(FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(ggufBase64)

    const result = await verifyGgufHeader('/path/to/model.gguf')
    expect(result).toBe(true)
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('/path/to/model.gguf', {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 4,
    })
  })

  it('G2. 非 GGUF 头返回 false', async () => {
    const htmlBase64 = btoa('<!DO')
    ;(FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(htmlBase64)

    const result = await verifyGgufHeader('/path/to/fake.gguf')
    expect(result).toBe(false)
  })

  it('G3. 空内容返回 false', async () => {
    ;(FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('')

    const result = await verifyGgufHeader('/path/to/empty.gguf')
    expect(result).toBe(false)
  })

  it('G4. null 内容返回 false', async () => {
    ;(FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(null)

    const result = await verifyGgufHeader('/path/to/null.gguf')
    expect(result).toBe(false)
  })

  it('G5. 读取异常返回 false', async () => {
    ;(FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(new Error('file not found'))

    const result = await verifyGgufHeader('/path/to/missing.gguf')
    expect(result).toBe(false)
  })

  it('G6. 部分匹配不算有效 (如 "GGUX")', async () => {
    const partialBase64 = btoa('GGUX')
    ;(FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(partialBase64)

    const result = await verifyGgufHeader('/path/to/partial.gguf')
    expect(result).toBe(false)
  })
})

describe('ModelManager — getModelRegistry', () => {
  it('R1. 返回非空数组', () => {
    const registry = getModelRegistry()
    expect(Array.isArray(registry)).toBe(true)
    expect(registry.length).toBeGreaterThan(0)
  })

  it('R2. 每个模型都有必要字段', () => {
    const registry = getModelRegistry()
    for (const model of registry) {
      expect(model.id).toBeTruthy()
      expect(model.name).toBeTruthy()
      expect(model.downloadUrl).toBeTruthy()
      expect(model.sizeMB).toBeGreaterThan(0)
      expect(model.language).toBeTruthy()
    }
  })

  it('R3. URL 格式合法 (http/https)', () => {
    const registry = getModelRegistry()
    for (const model of registry) {
      expect(model.downloadUrl).toMatch(/^https?:\/\//)
    }
  })

  it('R4. 模型 ID 唯一', () => {
    const registry = getModelRegistry()
    const ids = registry.map((m) => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('R5. 返回的是副本，不影响原注册表', () => {
    const registry1 = getModelRegistry()
    registry1.push({
      id: 'fake',
      name: 'Fake',
      filename: 'fake.gguf',
      quality: 'standard' as any,
      downloadUrl: 'http://fake',
      sizeMB: 1,
      language: 'en',
      architecture: 'qwen3',
      description: 'fake',
    } as any)
    const registry2 = getModelRegistry()
    expect(registry2.length).toBe(registry1.length - 1)
  })
})
