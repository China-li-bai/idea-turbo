---
name: chat-ui
description: Chat interface implementation using react-native-gifted-chat. Covers message state management, custom bubbles, input handling, avatar integration, and animation patterns.
version: 1.0.0
license: MIT
---

# Chat UI Implementation Guide

## Overview

This skill provides guidance for implementing chat interfaces using `react-native-gifted-chat`, the industry-standard React Native messaging library with TypeScript support.

## Core Dependencies

```bash
npx expo install react-native-gifted-chat
```

## Basic Implementation

```tsx
import React, { useState, useCallback } from 'react'
import { GiftedChat } from 'react-native-gifted-chat'
import type { IMessage } from 'react-native-gifted-chat'

interface ChatScreenProps {
  onSend: (messages: IMessage[]) => void
  messages: IMessage[]
}

export function ChatScreen({ onSend, messages }: ChatScreenProps) {
  const user = { _id: 1 }

  const handleSend = useCallback((newMessages: IMessage[] = []) => {
    onSend(GiftedChat.append(messages, newMessages))
  }, [messages, onSend])

  return (
    <GiftedChat
      messages={messages}
      onSend={handleSend}
      user={user}
      placeholder="输入消息..."
      alwaysShowSend
    />
  )
}
```

## Message State Management

```typescript
// src/stores/chat-store.ts
import { useState, useCallback } from 'react'
import type { IMessage } from 'react-native-gifted-chat'

export interface UseChatReturn {
  messages: IMessage[]
  sendMessage: (text: string) => void
  addBotMessage: (text: string) => void
  clearMessages: () => void
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<IMessage[]>([])
  
  const sendMessage = useCallback((text: string) => {
    const userMsg: IMessage = {
      _id: String(Date.now()),
      text,
      createdAt: new Date(),
      user: { _id: 1 }
    }
    
    setMessages(prev => GiftedChat.append(prev, [userMsg]))
  }, [])
  
  const addBotMessage = useCallback((text: string) => {
    const botMsg: IMessage = {
      _id: String(Date.now() + 1),
      text,
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'AI 助手',
        avatar: require('../../assets/pet-avatar.png')
      }
    }
    
    setMessages(prev => GiftedChat.append(prev, [botMsg]))
  }, [])
  
  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])
  
  return { messages, sendMessage, addBotMessage, clearMessages }
}
```

## Custom Bubble Styles

```tsx
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  bubbleContainer: {
    marginLeft: 10,
    marginRight: 10,
    marginVertical: 5
  },
  userBubble: {
    wrapper: {
      backgroundColor: '#007AFF',
      borderRadius: 20,
      padding: 12
    },
    text: {
      color: '#FFFFFF',
      fontSize: 16
    }
  },
  botBubble: {
    wrapper: {
      backgroundColor: '#F2F2F7',
      borderRadius: 20,
      padding: 12
    },
    text: {
      color: '#000000',
      fontSize: 16
    }
  }
})

// Usage in GiftedChat
<GiftedChat
  renderBubble={(props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        left: styles.botBubble.wrapper,
        right: styles.userBubble.wrapper
      }}
      textStyle={{
        left: styles.botBubble.text,
        right: styles.userBubble.text
      }}
    />
  )}
/>
```

## Avatar Integration

```tsx
// Custom avatar component for bot
function BotAvatar() {
  return (
    <Image
      source={require('../../assets/pet-avatar.png')}
      style={{ width: 40, height: 40, borderRadius: 20 }}
    />
  )
}

// Usage
<GiftedChat
  renderAvatar={(props) => {
    if (props.currentMessage?.user._id === 2) {
      return <BotAvatar />
    }
    return null  // Hide user avatar or show default
  }}
/>
```

## Input Handling

### Custom Input Toolbar

```tsx
import { InputToolbar, Send } from 'react-native-gifted-chat'

function CustomInputToolbar(props: any) {
  return (
    <InputToolbar
      {...props}
      containerStyle={{
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        paddingVertical: 8,
        paddingHorizontal: 12
      }}
    />
  )
}

function CustomSend(props: any) {
  return (
    <Send
      {...props}
      containerStyle={{
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16
      }}
    >
      <View style={{
        backgroundColor: '#007AFF',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>发送</Text>
      </View>
    </Send>
  )
}
```

## Typing Indicator

```typescript
// Show when waiting for bot response
const [isTyping, setIsTyping] = useState(false)

// When sending message:
setIsTyping(true)
const response = await generateResponse(message)
addBotMessage(response)
setIsTyping(false)

// In GiftedChat:
<GiftedChat
  isTyping={isTyping}
/>
```

## Message Actions

### Quick Reply Buttons

```tsx
interface QuickReply {
  title: string
  value: string
}

const quickReplies: QuickReply[] = [
  { title: '今天心情如何？', value: 'mood' },
  { title: '讲个笑话', value: 'joke' },
  { title: '安慰我', value: 'comfort' }
]

<GiftedChat
  quickReplies={quickReplies}
  onQuickReply={(replies) => {
    const reply = replies[0]
    sendMessage(reply.value || reply.title)
  }}
/>
```

### Swipe Actions (v3.3+)

```tsx
import { Swipeable } from 'react-native-gifted-chat'

<GiftedChat
  renderMessage={(props) => (
    <Swipeable
      {...props}
      renderLeftActions={() => (
        // Custom swipe-left action (e.g., reply, copy)
      )}
      renderRightActions={() => (
        // Custom swipe-right action (e.g., delete)
      )}
    />
  )}
/>
```

## Animation Patterns

### Message Entrance Animation

```tsx
import Animated, { 
  FadeInDown,
  Layout 
} from 'react-native-reanimated'

function AnimatedMessage(props: any) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      layout={Layout.springify()}
    >
      <Bubble {...props} />
    </Animated.View>
  )
}

<GiftedChat
  renderMessage={(props) => <AnimatedMessage {...props} />}
/>
```

## Accessibility

```tsx
<GiftedChat
  accessibilityLabel="聊天消息列表"
  accessibilityRole="list"
  messagesContainerStyle={{ paddingBottom: 20 }}
/>
```

## Performance Tips

1. **Virtualized List**: GiftedChat uses FlatList internally
2. **Limit History**: Keep last 100 messages for performance
3. **Image Caching**: Use CDN for avatar images
4. **Debounce Input**: Prevent rapid sends

## Common Patterns

### Auto-scroll to Bottom

```tsx
useEffect(() => {
  // GiftedChat auto-scrolls by default
}, [messages])
```

### Message Timestamps

```tsx
<GiftedChat
  timeFormat="HH:mm"
  dateFormat="YYYY/MM/DD"
  showUserAvatar
  showAvatarForEveryMessage={false}
/>
```
