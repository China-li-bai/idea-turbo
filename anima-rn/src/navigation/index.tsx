import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, StyleSheet } from 'react-native'
import { ChatScreen, SystemScreen, MemoriesScreen } from '../screens'
import { theme } from '../theme'

export type RootStackParamList = {
  MainTabs: undefined
}

export type MainTabParamList = {
  Chat: undefined
  Memories: undefined
  System: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Chat: '💬',
    Memories: '💭',
    System: '⚙️',
  }
  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icons[name] || '●'}
    </Text>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.neutral[400],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: '聊天' }}
      />
      <Tab.Screen
        name="Memories"
        component={MemoriesScreen}
        options={{ tabBarLabel: '记忆' }}
      />
      <Tab.Screen
        name="System"
        component={SystemScreen}
        options={{ tabBarLabel: '系统' }}
      />
    </Tab.Navigator>
  )
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    height: 60,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabIconFocused: {
    opacity: 1,
  },
})
