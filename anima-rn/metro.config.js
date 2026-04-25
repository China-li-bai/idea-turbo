const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('gguf', 'onnx', 'vocab')
config.resolver.sourceExts.push('gguf')
config.transformer.minifierConfig.compress.drop_console = false
config.serializer.maxWorkers = 2

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'jieba-node') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('./src/lib/jieba-mock.ts'),
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
