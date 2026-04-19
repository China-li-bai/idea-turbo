import { create } from 'zustand'
import type { Pet, Message, Conversation, MemoryNode, ShareLink } from '../types'
import type { SystemStatus } from '../lib/AnimaCore'

interface AppState {
  currentPet: Pet | null
  setCurrentPet: (pet: Pet | null) => void

  messages: Message[]
  addMessage: (msg: Message) => void
  setMessages: (msgs: Message[]) => void
  clearMessages: () => void

  conversations: Conversation[]
  currentConversationId: string | null
  setConversationId: (id: string | null) => void
  addConversation: (conv: Conversation) => void

  memories: MemoryNode[]
  setMemories: (memories: MemoryNode[]) => void
  addMemory: (memory: MemoryNode) => void

  shareLinks: ShareLink[]
  setShareLinks: (links: ShareLink[]) => void

  visitorShareToken: string | null
  visitorName: string | null
  setVisitorInfo: (token: string | null, name: string | null) => void

  isPetThinking: boolean
  thinkingSteps: string[]
  isLoading: boolean
  setThinking: (thinking: boolean, steps?: string[]) => void
  setLoading: (loading: boolean) => void

  currentView: 'home' | 'chat' | 'setup' | 'memories' | 'share' | 'visitor' | 'system'
  setView: (view: AppState['currentView']) => void

  systemStatus: SystemStatus | null
  setSystemStatus: (status: SystemStatus | null) => void
  isCoreInitialized: boolean
  setCoreInitialized: (val: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentPet: null,
  setCurrentPet: (pet) => set({ currentPet: pet }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  clearMessages: () => set({ messages: [] }),

  conversations: [],
  currentConversationId: null,
  setConversationId: (id) => set({ currentConversationId: id }),
  addConversation: (conv) => set((s) => ({ conversations: [...s.conversations, conv] })),

  memories: [],
  setMemories: (memories) => set({ memories }),
  addMemory: (memory) => set((s) => ({ memories: [...s.memories, memory] })),

  shareLinks: [],
  setShareLinks: (links) => set({ shareLinks: links }),

  visitorShareToken: null,
  visitorName: null,
  setVisitorInfo: (token, name) => set({ visitorShareToken: token, visitorName: name }),

  isPetThinking: false,
  thinkingSteps: [],
  isLoading: false,
  setThinking: (thinking, steps = []) => set({ isPetThinking: thinking, thinkingSteps: steps }),
  setLoading: (loading) => set({ isLoading: loading }),

  currentView: 'home',
  setView: (view) => set({ currentView: view }),

  systemStatus: null,
  setSystemStatus: (status) => set({ systemStatus: status }),
  isCoreInitialized: false,
  setCoreInitialized: (val) => set({ isCoreInitialized: val }),
}))
