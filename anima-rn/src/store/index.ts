import { create } from 'zustand'
import type { Pet, Message, Conversation, MemoryNode, ShareLink, PetDiary, EnergyState, PersonalityAwakening, ShareSlice } from '../types'
import type { SystemStatus } from '../lib/AnimaCore'
import type { ConstellationLayout } from '../lib/ConstellationEngine'

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

  activeStreamId: string | null
  setActiveStreamId: (id: string | null) => void

  currentView: 'home' | 'chat' | 'setup' | 'memories' | 'share' | 'visitor' | 'system' | 'diary' | 'npc' | 'starmap'
  setView: (view: AppState['currentView']) => void

  systemStatus: SystemStatus | null
  setSystemStatus: (status: SystemStatus | null) => void
  isCoreInitialized: boolean
  setCoreInitialized: (val: boolean) => void

  diaries: PetDiary[]
  setDiaries: (diaries: PetDiary[]) => void
  addDiary: (diary: PetDiary) => void
  latestDiary: PetDiary | null
  setLatestDiary: (diary: PetDiary | null) => void

  energyState: EnergyState | null
  setEnergyState: (state: EnergyState | null) => void

  awakening: PersonalityAwakening | null
  setAwakening: (awakening: PersonalityAwakening | null) => void

  shareSlices: ShareSlice[]
  setShareSlices: (slices: ShareSlice[]) => void
  addShareSlice: (slice: ShareSlice) => void

  constellationLayout: ConstellationLayout | null
  setConstellationLayout: (layout: ConstellationLayout | null) => void
  userH3Cell: string | null
  setUserH3Cell: (cell: string | null) => void
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

  activeStreamId: null,
  setActiveStreamId: (id) => set({ activeStreamId: id }),

  currentView: 'home',
  setView: (view) => set({ currentView: view }),

  systemStatus: null,
  setSystemStatus: (status) => set({ systemStatus: status }),
  isCoreInitialized: false,
  setCoreInitialized: (val) => set({ isCoreInitialized: val }),

  diaries: [],
  setDiaries: (diaries) => set({ diaries }),
  addDiary: (diary) => set((s) => ({ diaries: [...s.diaries, diary] })),
  latestDiary: null,
  setLatestDiary: (diary) => set({ latestDiary: diary }),

  energyState: null,
  setEnergyState: (state) => set({ energyState: state }),

  awakening: null,
  setAwakening: (awakening) => set({ awakening }),

  shareSlices: [],
  setShareSlices: (slices) => set({ shareSlices: slices }),
  addShareSlice: (slice) => set((s) => ({ shareSlices: [...s.shareSlices, slice] })),

  constellationLayout: null,
  setConstellationLayout: (layout) => set({ constellationLayout: layout }),
  userH3Cell: null,
  setUserH3Cell: (cell) => set({ userH3Cell: cell }),
}))
