import React, { useCallback, useRef } from 'react'
import { FlatList, View, StyleSheet } from 'react-native'
import { StreamingBubble } from './StreamingBubble'
import { StaticBubble } from './StaticBubble'
import { streamEventBus } from './StreamEventBus'
import { theme } from '../../theme'
import type { Message, PetSpecies } from '../../types'

const STREAM_ITEM_ID = '__active_stream__'

interface FluidChatItem {
  id: string
  type: 'message' | 'stream'
  message?: Message
}

interface PetFluidChatProps {
  messages: Message[]
  activeStreamId: string | null
  petEmoji?: string
  species?: PetSpecies
  onStreamComplete: (messageId: string, fullText: string) => void
  ListHeaderComponent?: React.ReactElement | null
  ListFooterComponent?: React.ReactElement | null
}

export function PetFluidChat({
  messages,
  activeStreamId,
  petEmoji = '🐱',
  species = 'cat',
  onStreamComplete,
  ListHeaderComponent,
  ListFooterComponent,
}: PetFluidChatProps) {
  const flatListRef = useRef<FlatList>(null)

  const data: FluidChatItem[] = React.useMemo(() => {
    const items: FluidChatItem[] = []

    if (activeStreamId) {
      items.push({ id: STREAM_ITEM_ID, type: 'stream' })
    }

    for (const msg of messages) {
      items.push({ id: msg.id, type: 'message', message: msg })
    }

    return items
  }, [messages, activeStreamId])

  const renderItem = useCallback(
    ({ item, index }: { item: FluidChatItem; index: number }) => {
      if (item.type === 'stream' && activeStreamId) {
        return (
          <StreamingBubble
            messageId={activeStreamId}
            petEmoji={petEmoji}
            species={species}
            onComplete={(fullText) => onStreamComplete(activeStreamId, fullText)}
          />
        )
      }

      if (item.message) {
        return (
          <StaticBubble
            id={item.message.id}
            content={item.message.content}
            role={item.message.role}
            petEmoji={petEmoji}
            species={species}
            index={index}
          />
        )
      }

      return null
    },
    [activeStreamId, petEmoji, species, onStreamComplete],
  )

  const keyExtractor = useCallback((item: FluidChatItem) => item.id, [])

  const handleContentSizeChange = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [])

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        inverted
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={handleContentSizeChange}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={21}
        initialNumToRender={15}
        ListHeaderComponent={ListFooterComponent}
        ListFooterComponent={ListHeaderComponent}
      />
    </View>
  )
}

export { streamEventBus }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
})
