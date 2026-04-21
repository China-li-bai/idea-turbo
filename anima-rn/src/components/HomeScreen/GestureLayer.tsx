import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated'
import {
  GestureDetector,
  GestureHandlerRootView,
  Gesture,
} from 'react-native-gesture-handler'
import { triggerHaptic } from '../LivingUI/HapticEngine'
import type { PetMood } from '../LivingUI'

interface GestureLayerProps {
  onPetTap?: () => void
  onSwipeUp?: () => void
  onPinchOut?: (scale: number) => void
  onMoodChange?: (mood: PetMood) => void
  children: React.ReactNode
}

const HAPPY_EMOJIS = ['💕', '✨', '💖', '🌟', '💗', '⭐', '💫', '❤️']

export function GestureLayer({
  onPetTap,
  onSwipeUp,
  onPinchOut,
  onMoodChange,
  children,
}: GestureLayerProps) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const scaleX = useSharedValue(1)
  const pinchScale = useSharedValue(1)

  const bubbleOpacitys = React.useRef([
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ]).current
  const bubbleTranslates = React.useRef([
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ]).current
  const bubbleScales = React.useRef([
    useSharedValue(0.3),
    useSharedValue(0.3),
    useSharedValue(0.3),
    useSharedValue(0.3),
    useSharedValue(0.3),
  ]).current
  const [showBubbles, setShowBubbles] = React.useState(false)

  function handlePetTap() {
    if (onPetTap) runOnJS(onPetTap)()
    runOnJS(triggerHaptic)('petTap')
    if (onMoodChange) runOnJS(onMoodChange)('love')

    runOnJS(setShowBubbles)(true)

    bubbleOpacitys.forEach((opacity, index) => {
      opacity.value = withTiming(1, { duration: 200 })
      bubbleScales[index].value = withSpring(1.2, { damping: 8 })
      bubbleTranslates[index].value = withSequence(
        withTiming(-80 - index * 20, { duration: 1200 + index * 150 }),
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 0 })
      )
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 400 })
      }, 800 + index * 100)
    })

    setTimeout(() => {
      runOnJS(setShowBubbles)(false)
    }, 2500)
  }

  function handleSwipeUp() {
    if (onSwipeUp) runOnJS(onSwipeUp)()
    runOnJS(triggerHaptic)('medium')
    translateY.value = withSpring(-500, {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    })
  }

  function handlePinch(scaleVal: number) {
    if (scaleVal < 0.7 && onPinchOut) {
      runOnJS(onPinchOut)(scaleVal)
      runOnJS(triggerHaptic)('heavy')
    }
    pinchScale.value = scaleVal
  }

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      handlePetTap()
    })

  const swipeUpGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-50, 50])
    .onUpdate((e) => {
      if (e.translationY < -80) {
        translateY.value = e.translationY * 0.5
      }
    })
    .onEnd(() => {
      if (translateY.value < -40) {
        handleSwipeUp()
      } else {
        translateY.value = withSpring(0, { damping: 15 })
      }
    })

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      handlePinch(e.scale)
    })
    .onEnd(() => {
      pinchScale.value = withSpring(1, { damping: 12 })
    })

  const dragGesture = Gesture.Pan()
    .activeOffsetY([20, 20])
    .activeOffsetX([20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.3
      translateY.value += e.translationY * 0.3
      const dist = Math.sqrt(e.translationX ** 2 + e.translationY ** 2)
      scale.value = 1 + dist * 0.001
      scaleX.value = 1 + Math.abs(e.translationX) * 0.002
    })
    .onEnd(() => {
      translateX.value = withSpring(0, { damping: 12, stiffness: 150 })
      translateY.value = withSpring(0, { damping: 12, stiffness: 150 })
      scale.value = withSpring(1, { damping: 10, stiffness: 180 })
      scaleX.value = withSpring(1, { damping: 10, stiffness: 180 })
    })

  const composedGesture = Gesture.Race(
    tapGesture,
    swipeUpGesture,
    pinchGesture,
    dragGesture
  )

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { scaleX: scaleX.value },
    ],
  }))

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.gestureArea, animatedContainerStyle]}>
          {children}

          {showBubbles && (
            <View style={styles.bubbleOverlay} pointerEvents="none">
              {HAPPY_EMOJIS.slice(0, 5).map((emoji, index) => (
                <Animated.Text
                  key={index}
                  style={[
                    styles.bubbleText,
                    {
                      left: 60 + Math.random() * 180,
                      opacity: bubbleOpacitys[index],
                      transform: [
                        { translateY: bubbleTranslates[index].value },
                        { scale: bubbleScales[index].value },
                      ],
                    },
                  ]}
                >
                  {emoji}
                </Animated.Text>
              ))}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bubbleText: {
    position: 'absolute',
    fontSize: 28,
    top: '45%',
  },
})

export default GestureLayer
