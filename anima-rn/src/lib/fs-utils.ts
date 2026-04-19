import { Platform, NativeModules } from 'react-native'

const { ExpoFileSystem: FSModule } = (NativeModules as any)

function getDocumentDirectory(): string {
  if (Platform.OS === 'android') {
    return '/data/user/0/com.weigh.animarn/files/'
  }
  return ''
}

async function fileExists(path: string): Promise<boolean> {
  try {
    if (FSModule?.getInfoAsync) {
      const info = await FSModule.getInfoAsync(path)
      return info?.exists || false
    }
    
    if ((global as any).ExponentFileSystem) {
      const info = await (global as any).ExponentFileSystem.getInfoAsync(path)
      return info?.exists || false
    }
    
    return false
  } catch {
    return false
  }
}

async function copyFile(from: string, to: string): Promise<void> {
  try {
    if (FSModule?.copyAsync) {
      await FSModule.copyAsync({ from, to })
      return
    }
    
    if ((global as any).ExponentFileSystem) {
      await (global as any).ExponentFileSystem.copyAsync({ from, to })
      return
    }
    
    throw new Error('No filesystem module available')
  } catch (e: any) {
    throw new Error(`Copy failed: ${e.message}`)
  }
}

export async function getFileInfo(path: string): Promise<{ exists: boolean; size?: number }> {
  try {
    if (FSModule?.getInfoAsync) {
      const info = await FSModule.getInfoAsync(path)
      return { exists: info?.exists || false, size: info?.size }
    }
    
    if ((global as any).ExponentFileSystem) {
      const info = await (global as any).ExponentFileSystem.getInfoAsync(path)
      return { exists: info?.exists || false, size: info?.size }
    }
    
    return { exists: false }
  } catch {
    return { exists: false }
  }
}

export async function readAsStringAsync(path: string): Promise<string> {
  try {
    if (FSModule?.readAsStringAsync) {
      return await FSModule.readAsStringAsync(path)
    }
    
    if ((global as any).ExponentFileSystem) {
      return await (global as any).ExponentFileSystem.readAsStringAsync(path)
    }
    
    throw new Error('No filesystem module available')
  } catch (e: any) {
    throw new Error(`Read failed: ${e.message}`)
  }
}

export async function downloadFile(url: string, to: string): Promise<{ uri: string; status: number }> {
  try {
    if (FSModule?.downloadAsync) {
      const result = await FSModule.downloadAsync(url, to)
      return { uri: result?.uri || to, status: result?.status || 200 }
    }
    
    if ((global as any).ExponentFileSystem) {
      const result = await (global as any).ExponentFileSystem.downloadAsync(url, to)
      return { uri: result?.uri || to, status: result?.status || 200 }
    }
    
    throw new Error('No filesystem module available')
  } catch (e: any) {
    throw new Error(`Download failed: ${e.message}`)
  }
}

export { getDocumentDirectory, fileExists, copyFile }
