export const documentDirectory = '/tmp/anima-test/'
export async function getInfoAsync(_path: string) {
  return { exists: true, isDirectory: false, uri: _path, size: 0, modificationTime: 0 }
}
export async function readAsStringAsync(_path: string) {
  return ''
}
export async function writeAsStringAsync(_path: string, _content: string) {}
export async function makeDirAsync(_path: string, _options?: any) {}
export const EncodingType = { UTF8: 'utf8' }
export default { documentDirectory, getInfoAsync, readAsStringAsync, writeAsStringAsync, makeDirAsync, EncodingType }
