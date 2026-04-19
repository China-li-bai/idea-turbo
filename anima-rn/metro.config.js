const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('gguf')
config.resolver.sourceExts.push('gguf')
config.transformer.minifierConfig.compress.drop_console = false
config.serializer.maxWorkers = 2

module.exports = config
