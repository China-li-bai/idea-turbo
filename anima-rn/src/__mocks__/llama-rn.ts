let mockCompletionText = '测试回复'
let mockModelDesc = 'SmolLM-360M-Instruct-Q4'

export function __setMockReply(text: string) { mockCompletionText = text }
export function __setMockModelDesc(desc: string) { mockModelDesc = desc }

export async function initLlama(_config: any, _onProgress?: (p: number) => void) {
  if (_onProgress) _onProgress(0.5)
  if (_onProgress) _onProgress(1.0)
  return {
    model: { desc: mockModelDesc },
    gpu: true,
    contextLength: 2048,
    completion: async (_params: any, _callback?: any) => {
      return { text: mockCompletionText }
    },
    release: async () => {},
  }
}

export async function loadModel() {
  return Promise.resolve({ contextLength: 2048 })
}
export async function createCompletion(_ctx: any, _params: any) {
  return Promise.resolve({ text: '测试回复' })
}
export function disposeContext() {}
export default { initLlama, loadModel, createCompletion, disposeContext }
