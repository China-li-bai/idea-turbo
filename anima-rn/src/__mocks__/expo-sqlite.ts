const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  closeAsync: jest.fn().mockResolvedValue(undefined),
}

export async function openDatabaseAsync(_name: string) {
  return mockDb
}
export const SQLITE_OK = 0
export default { openDatabaseAsync, SQLITE_OK }
