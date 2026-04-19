import { Platform } from 'react-native'

let FileSystem: any = null

async function getFS(): Promise<any> {
  if (FileSystem) return FileSystem

  try {
    const fs = await import('expo-file-system/legacy')
    FileSystem = fs.default || fs
    return FileSystem
  } catch {
    try {
      const fs = await import('expo-file-system')
      FileSystem = fs.default || fs
      return FileSystem
    } catch {
      throw new Error('expo-file-system not available')
    }
  }
}

function getDocumentDirectory(): string {
  if (Platform.OS === 'android') {
    return '/data/user/0/com.weigh.animarn/files/'
  }
  return ''
}

export async function getFileInfo(path: string): Promise<{ exists: boolean; size?: number }> {
  try {
    const FS = await getFS()
    const info = await FS.getInfoAsync(path)
    return { exists: info?.exists || false, size: info?.size }
  } catch (e: any) {
    console.warn('[fs-utils] getFileInfo error:', e.message)
    return { exists: false }
  }
}

export async function copyFile(from: string, to: string): Promise<void> {
  try {
    const FS = await getFS()
    await FS.copyAsync({ from, to })
    console.log('[fs-utils] ✅ Copy success:', from, '→', to)
  } catch (e: any) {
    console.error('[fs-utils] copyFile error:', e.message, { from, to })
    throw new Error(`Copy failed: ${e.message}`)
  }
}

export async function moveFile(from: string, to: string): Promise<void> {
  try {
    const FS = await getFS()
    await FS.moveAsync({ from, to })
  } catch (e: any) {
    throw new Error(`Move failed: ${e.message}`)
  }
}

export async function readAsStringAsync(path: string, options?: any): Promise<string> {
  try {
    const FS = await getFS()
    return await FS.readAsStringAsync(path, options)
  } catch (e: any) {
    throw new Error(`Read failed: ${e.message}`)
  }
}

export async function writeAsStringAsync(path: string, content: string, options?: any): Promise<void> {
  try {
    const FS = await getFS()
    await FS.writeAsStringAsync(path, content, options)
  } catch (e: any) {
    throw new Error(`Write failed: ${e.message}`)
  }
}

export async function deleteAsync(path: string, options?: any): Promise<void> {
  try {
    const FS = await getFS()
    await FS.deleteAsync(path, options)
  } catch (e: any) {
    throw new Error(`Delete failed: ${e.message}`)
  }
}

export async function makeDirectoryAsync(path: string, options?: any): Promise<void> {
  try {
    const FS = await getFS()
    await FS.makeDirectoryAsync(path, options)
  } catch (e: any) {
    throw new Error(`MakeDir failed: ${e.message}`)
  }
}

export async function downloadFile(url: string, to: string, options?: any): Promise<{ uri: string; status: number }> {
  try {
    const FS = await getFS()
    const result = await FS.downloadAsync(url, to, options)
    return { uri: result?.uri || to, status: result?.status || 200 }
  } catch (e: any) {
    throw new Error(`Download failed: ${e.message}`)
  }
}

export function documentDirectory(): string {
  if (typeof require !== 'undefined') {
    try {
      const FS = require('expo-file-system/legacy').default || require('expo-file-system/legacy')
      return FS.documentDirectory || ''
    } catch {
      try {
        const FS = require('expo-file-system').default || require('expo-file-system')
        return FS.documentDirectory || ''
      } catch {
        return ''
      }
    }
  }
  return ''
}

export { getDocumentDirectory }
