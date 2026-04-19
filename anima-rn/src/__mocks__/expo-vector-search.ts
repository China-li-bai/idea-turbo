export async function initVectorSearch(_db: any) {}
export async function insertVector(_table: string, _id: string, _vec: number[]) {}
export async function searchVectors(_table: string, _queryVec: number[], _topK: number): Promise<Array<{ id: string; score: number }>> {
  return []
}
export default { initVectorSearch, insertVector, searchVectors }
