import { create } from 'zustand';
import type { UserSettings } from '@/types';

interface UIState {
  currentView: 'day' | 'week' | 'month' | 'agenda';
  selectedDate: Date;
  viewMode: 'boss' | 'assistant' | 'personal';

  selectedEventId: string | null;
  isModalOpen: boolean;
  modalType: 'createEvent' | 'editEvent' | 'createTask' | 'editTask' | 'captureInspiration' | null;

  isLoading: boolean;

  filters: {
    showCompleted: boolean;
    priorityFilter: 'all' | 'high' | 'medium' | 'low';
    searchQuery: string;
  };

  settings: Partial<UserSettings>;

  setCurrentView: (view: UIState['currentView']) => void;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: UIState['viewMode']) => void;
  selectEvent: (id: string | null) => void;
  openModal: (type: UIState['modalType']) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<UIState['filters']>) => void;
  setSettings: (settings: Partial<UserSettings>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'week',
  selectedDate: new Date(),
  viewMode: 'personal',

  selectedEventId: null,
  isModalOpen: false,
  modalType: null,

  isLoading: false,

  filters: {
    showCompleted: true,
    priorityFilter: 'all',
    searchQuery: '',
  },

  settings: {
    theme: 'system',
    language: 'zh-CN',
    vectorSearchEnabled: true,
    autoSyncEmbeddings: true,
    embeddingModel: 'Xenova/multilingual-e5-small',
    aiMode: 'hybrid',
    autoBackup: false,
    backupFrequency: 'weekly',
  },

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  selectEvent: (id) => set({ selectedEventId: id }),
  openModal: (type) => set({ isModalOpen: true, modalType: type }),
  closeModal: () => set({ isModalOpen: false, modalType: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  setSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings },
  })),
}));
