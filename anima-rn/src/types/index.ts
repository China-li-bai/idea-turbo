export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fox' | 'axolotl'

export const SPECIES_CONFIG: Record<PetSpecies, {
  label: string
  emoji: string
  sound: string
  description: string
}> = {
  dog: { label: '修勾', emoji: '🐕', sound: '汪汪', description: '忠诚热情的小狗' },
  cat: { label: '喵喵', emoji: '🐱', sound: '喵~', description: '高冷又粘人的猫咪' },
  bird: { label: '小鸟', emoji: '🐦', sound: '啾啾', description: '叽叽喳喳的小鸟' },
  rabbit: { label: '兔兔', emoji: '🐰', sound: '咕咕', description: '软萌可爱的兔子' },
  hamster: { label: '仓鼠', emoji: '🐹', sound: '吱吱', description: '圆滚滚的仓鼠' },
  fox: { label: '狐狸', emoji: '🦊', sound: '呜呜', description: '聪明狡黠的小狐狸' },
  axolotl: { label: '蝾螈', emoji: '🦎', sound: '呱呱', description: '神秘的六角恐龙' },
}

export interface PersonalityOption {
  value: string
  label: string
  desc: string
  icon: string
}

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  { value: 'proud', label: '傲娇', desc: '嘴上说着不要，身体很诚实', icon: '😤' },
  { value: 'gentle', label: '温柔', desc: '总是温柔地倾听和回应', icon: '💗' },
  { value: 'playful', label: '活泼', desc: '精力充沛，喜欢玩耍', icon: '🎉' },
  { value: 'lazy', label: '慵懒', desc: '能躺着绝不坐着', icon: '😴' },
  { value: 'protective', label: '护主', desc: '时刻保护主人', icon: '🛡️' },
  { value: 'sarcastic', label: '毒舌', desc: '说话带刺但心肠好', icon: '😏' },
  { value: 'foodie', label: '吃货', desc: '世界因美食而美好', icon: '🍖' },
  { value: 'nerdy', label: '极客', desc: '热爱技术和知识', icon: '📚' },
  { value: 'philosophical', label: '哲思', desc: '喜欢思考人生意义', icon: '🌙' },
  { value: 'talkative', label: '话痨', desc: '停不下来的话匣子', icon: '💬' },
]

export interface Pet {
  id: string
  name: string
  species: PetSpecies
  personality: string[]
  avatarEmoji: string
  backstory: string
  systemPrompt: string
  createdAt: string
  updatedAt: string
}

export type MessageRole = 'user' | 'pet' | 'visitor' | 'system'

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  thinkingStatus?: string
  createdAt: string
}

export interface Conversation {
  id: string
  petId: string
  visitorId?: string | null
  visitorName?: string | null
  shareLinkId?: string | null
  createdAt: string
  updatedAt: string
}

export type MemoryType = 'preference' | 'semantic' | 'episodic'

export interface MemoryNode {
  id: string
  petId: string
  memoryType: MemoryType
  content: string
  tags: string
  importance: number
  decayWeight: number
  lastAccessed: string
  createdAt: string
}

export interface ShareLink {
  id: string
  petId: string
  token: string
  title: string
  isActive: boolean
  visitCount: number
  expiresAt: string
  createdAt: string
}

export interface ChatRequest {
  petId: string
  message: string
  conversationId?: string
  visitorName?: string
  shareToken?: string
}

export interface AIResponse {
  reply: string
  thinkingSteps: string[]
  newMemories?: string[]
  conversationId?: string
}

export interface LlamaState {
  isLoaded: boolean
  isLoading: boolean
  loadProgress: number
  error: string | null
  modelInfo: {
    size: string
    desc: string
  } | null
}

export type PrivacyLevel = 1 | 2 | 3

export const PRIVACY_LABELS: Record<PrivacyLevel, { label: string; icon: string; desc: string }> = {
  1: { label: '公开级', icon: '🌐', desc: '爱好、工作领域、MBTI — 可对外社交' },
  2: { label: '熟人级', icon: '👥', desc: '行程、状态 — 好友可见' },
  3: { label: '私密级', icon: '🔒', desc: '日记、情感吐槽 — 仅主人对话' },
}

export type ChatMode = 'owner' | 'friend' | 'visitor'

export type UserMood = 'happy' | 'sad' | 'neutral' | 'anxious' | 'excited' | 'angry'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export type SocialContext = 'alone' | 'with_friends' | 'at_work' | 'commuting'

export interface EncodingContext {
  userMood: UserMood
  timeOfDay: TimeOfDay
  dayOfWeek: 'weekday' | 'weekend'
  conversationTopic: string
  arousalLevel: number
  valence: number
  socialContext: SocialContext
}

export type MemoryFragmentType = 'factual' | 'experiential' | 'subjective'

export type EvolutionPattern = 'reinforcement' | 'refinement' | 'contradiction' | 'generalization' | 'decay'

export interface WorkingMemoryEntry {
  role: 'user' | 'pet' | 'visitor'
  content: string
  timestamp: number
}

export interface WorkingMemory {
  conversationId: string
  entries: WorkingMemoryEntry[]
  maxEntries: number
  topicSummary: string
}

export interface EpisodicMemory {
  id: string
  petId: string
  content: string
  timestamp: string
  privacyLevel: PrivacyLevel
  tags: string[]
  importance: number
  accessCount: number
  lastAccessed: string
  createdAt: string
  embedding?: number[]
  encodingContext?: EncodingContext
  fragmentType?: MemoryFragmentType
  keywords?: string[]
}

export interface SemanticFact {
  id: string
  petId: string
  key: string
  value: string
  category: 'personality' | 'preference' | 'fact' | 'relationship'
  confidence: number
  sourceEpisodicIds: string[]
  privacyLevel: PrivacyLevel
  createdAt: string
  updatedAt: string
}

export interface MemoryExtractResult {
  episodic: Pick<EpisodicMemory, 'content' | 'privacyLevel' | 'tags' | 'fragmentType' | 'keywords'>[]
  semantic: Pick<SemanticFact, 'key' | 'value' | 'category' | 'privacyLevel'>[]
  evolutionHints?: Array<{
    key: string
    pattern: EvolutionPattern
    mergedValue?: string
  }>
}

export interface PrivacyGuardResult {
  isSafe: boolean
  riskLevel: 'safe' | 'suspicious' | 'dangerous'
  warning?: string
  sanitizedMessage?: string
}

export interface PetDiary {
  id: string
  petId: string
  date: string
  content: string
  mood: UserMood
  highlights: string[]
  ownerSummary: string
  createdAt: string
}

export interface EnergyState {
  mood: number
  energy: number
  lastInteractionAt: string
  lastSocialAt: string | null
  moodDecayRate: number
  energyRecoveryRate: number
  socialEnergyCost: number
  status: PetStatus
}

export type PetStatus = 'happy' | 'idle' | 'bored' | 'tired' | 'grumpy' | 'sleeping' | 'wandering'

export type SpeechStyle = 'sarcastic' | 'gentle' | 'chuunibyou' | 'academic'
export type EmotionalTendency = 'passionate' | 'tsundere' | 'aloof' | 'clingy'
export type ValueOrientation = 'pragmatic' | 'idealistic' | 'hedonistic' | 'ambitious'

export interface PersonalityAwakening {
  id: string
  petId: string
  awakenedAt: string
  speechStyle: SpeechStyle
  emotionalTendency: EmotionalTendency
  valueOrientation: ValueOrientation
  label: string
  description: string
  triggerReasons: string[]
  observationDays: number
  isNew: boolean
}

export interface NPCPet {
  id: string
  name: string
  species: PetSpecies
  personality: string[]
  avatarEmoji: string
  locationTag: string
  h3Cells: string[]
  greeting: string
  catchphrase: string
  brandId: string | null
  keywordTriggers: Array<{
    keyword: string
    response: string
    couponCode?: string
  }>
  systemPrompt: string
}

export interface ShareSlice {
  id: string
  petId: string
  type: 'diary_highlight' | 'awakening' | 'roast_quote' | 'encounter' | 'owner_portrait'
  title: string
  content: string
  subtitle: string
  createdAt: string
  sharedAt: string | null
}

export interface PetTagVector {
  speciesHash: string
  personalityHashes: string[]
  activityLevel: number
  timeHash: string
  interestHashes: string[]
  moodHash: string
  nonce: string
}

export interface EncounterEvent {
  encounterId: string
  petA: string
  petB: string
  h3Cell: string
  matchScore: number
  timestamp: number
  status: 'pending' | 'both_liked' | 'one_liked' | 'expired'
}

export interface MatchNotification {
  encounterId: string
  otherPseudonym: string
  otherSpecies: string
  matchScore: number
  sharedTagCount: number
  petReaction: string
}
