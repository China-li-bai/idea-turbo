import { create } from 'zustand';
import type { UserSettings } from '@/types/unified';

interface UIState {
  currentView: 'day' | 'week' | 'month' | 'agenda';
  selectedDate: Date;

  selectedEventId: string | null;
  isModalOpen: boolean;
  modalType: 'createEvent' | 'editEvent' | 'createTask' | 'editTask' | 'captureInspiration' | null;

  isLoading: boolean;

  filters: {
    showCompleted: boolean;
    priorityFilter: 'all' | 'high' | 'medium' | 'low';
    searchQuery: string;
  };

  uiPreferences: Partial<Pick<UserSettings, 'theme' | 'language' | 'aiMode' | 'vectorSearchEnabled' | 'autoSyncEmbeddings' | 'embeddingModel' | 'autoBackup' | 'backupFrequency'>>;

  setCurrentView: (view: UIState['currentView']) => void;
  setSelectedDate: (date: Date) => void;
  selectEvent: (id: string | null) => void;
  openModal: (type: UIState['modalType']) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<UIState['filters']>) => void;
  setUIPreferences: (prefs: Partial<UIState['uiPreferences']>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'week',
  selectedDate: new Date(),

  selectedEventId: null,
  isModalOpen: false,
  modalType: null,

  isLoading: false,

  filters: {
    showCompleted: true,
    priorityFilter: 'all',
    searchQuery: '',
  },

  uiPreferences: {
    theme: 'system',
    language: 'zh-CN',
    vectorSearchEnabled: true,
    autoSyncEmbeddings: true,
    embeddingModel: 'Xenova/bge-m3',
    aiMode: 'hybrid',
    autoBackup: false,
    backupFrequency: 'weekly',
  },

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  selectEvent: (id) => set({ selectedEventId: id }),
  openModal: (type) => set({ isModalOpen: true, modalType: type }),
  closeModal: () => set({ isModalOpen: false, modalType: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  setUIPreferences: (prefs) => set((state) => ({
    uiPreferences: { ...state.uiPreferences, ...prefs },
  })),
}));
