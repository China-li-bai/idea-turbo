import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { AppNavigator } from './src/navigation'
import 'react-native-reanimated'

if (__DEV__) {
  try {
    const { configureReanimatedLogger, ReanimatedLogLevel } = require('react-native-reanimated')
    configureReanimatedLogger({
      level: ReanimatedLogLevel.warn,
      strict: false,
    })
  } catch {}
}

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  )
}
