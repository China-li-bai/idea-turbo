import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StyleSheet } from 'react-native'
import { ChatScreen, SystemScreen, MemoriesScreen } from '../screens'
import { HomeScreen } from '../components/HomeScreen'
import { theme, dark } from '../theme'

export type RootStackParamList = {
  Home: undefined
  Chat: undefined
  Memories: undefined
  System: undefined
  Map: { scale: number }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: dark.bg.primary },
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreenWrapper}
          options={{
            gestureEnabled: false,
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
            gestureDirection: 'vertical',
            contentStyle: {
              backgroundColor: 'transparent',
            },
          }}
        />
        <Stack.Screen
          name="Map"
          component={MapPlaceholder}
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Memories"
          component={MemoriesScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="System"
          component={SystemScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

function HomeScreenWrapper({ navigation }: any) {
  return (
    <HomeScreen
      onNavigateToChat={() => navigation.navigate('Chat')}
      onNavigateToMap={(scale) => navigation.navigate('Map', { scale })}
    />
  )
}

function MapPlaceholder() {
  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.bg.primary,
  },
})
