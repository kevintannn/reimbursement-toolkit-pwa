import { create } from 'zustand'

interface AppState {
  generatingBatch: boolean
  setGeneratingBatch: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  generatingBatch: false,
  setGeneratingBatch: (v) => set({ generatingBatch: v }),
}))
