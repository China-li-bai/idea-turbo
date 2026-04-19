import { Platform } from 'react-native'

let llamaModule: any = null

async function loadLlama() {
  if (llamaModule) return llamaModule
  
  if (Platform.OS === 'web') {
    llamaModule = {
      initLlama: async (_config: any, onProgress?: (p: number) => void) => {
        if (onProgress) onProgress(0.5)
        if (onProgress) onProgress(1.0)
        return {
          model: { desc: 'Web-Mock' },
          gpu: false,
          contextLength: 2048,
          completion: async (_params: any, _callback?: any) => ({
            text: JSON.stringify({ reply: '（眨眨眼）主人，网页版暂时还不能运行大脑哦~ 请在手机App上体验完整功能！' })
          }),
          release: async () => {}
        }
      }
    }
  } else {
    llamaModule = await import('llama.rn')
  }
  
  return llamaModule
}

export async function initLlama(...args: any[]) {
  const mod = await loadLlama()
  return mod.initLlama(...args)
}
