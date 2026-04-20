export const documentDirectory = '/tmp/anima-test/'

export async function getInfoAsync(_path: string) {
  if (_path.includes('models/') && _path.endsWith('.gguf')) {
    return { exists: true, isDirectory: false, uri: _path, size: 100 * 1024 * 1024, modificationTime: 0 }
  }
  return { exists: true, isDirectory: false, uri: _path, size: 1024, modificationTime: 0 }
}

export async function readAsStringAsync(_path: string) {
  return ''
}

export async function writeAsStringAsync(_path: string, _content: string) {}

export async function makeDirAsync(_path: string, _options?: any) {}

export async function copyAsync(_opts: { from: string; to: string }) {}

export async function moveAsync(_opts: { from: string; to: string }) {}

export async function deleteAsync(_path: string, _options?: any) {}

export async function makeDirectoryAsync(_path: string, _options?: any) {}

export async function downloadAsync(_url: string, _to: string) {
  return { uri: _to, status: 200 }
}

export const EncodingType = { UTF8: 'utf8' }

export default {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
  makeDirAsync,
  copyAsync,
  moveAsync,
  deleteAsync,
  makeDirectoryAsync,
  downloadAsync,
  EncodingType,
}
