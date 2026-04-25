export const cut = (text: string): string[] => text.split('')
export const extract = (text: string, _topN: number): string[] => []
export const load = () => Promise.resolve()
export default { cut, extract, load }
