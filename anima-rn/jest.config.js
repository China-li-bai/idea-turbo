/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^expo-file-system/legacy$': '<rootDir>/src/__mocks__/expo-file-system.ts',
    '^expo-file-system$': '<rootDir>/src/__mocks__/expo-file-system.ts',
    '^expo-asset$': '<rootDir>/src/__mocks__/expo-asset.ts',
    '^expo-sqlite$': '<rootDir>/src/__mocks__/expo-sqlite.ts',
    '^llama\\.rn$': '<rootDir>/src/__mocks__/llama-rn.ts',
    '^onnxruntime-react-native$': '<rootDir>/src/__mocks__/onnxruntime-react-native.ts',
    '^expo-vector-search$': '<rootDir>/src/__mocks__/expo-vector-search.ts',
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^expo-status-bar$': '<rootDir>/src/__mocks__/expo-status-bar.ts',
    '\\.(onnx|vocab|gguf)$': '<rootDir>/src/__mocks__/file-asset.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        strict: false,
        skipLibCheck: true,
      },
    }],
  },
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/lib/**/*.d.ts',
    '!src/lib/OnnxEmbeddingEngine.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
}
