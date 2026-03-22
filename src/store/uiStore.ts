import { create } from 'zustand'

type DisplayElements = {
  scorebug: boolean
  playerCard: boolean
  wicketAlert: boolean
  partnership: boolean
  ticker: boolean
}

type UIStore = {
  display: DisplayElements
  activePlayerId: number | null
  isWicketModalOpen: boolean
  isBowlerSelectOpen: boolean
  toggleDisplay: (element: keyof DisplayElements) => void
  setDisplay: (element: keyof DisplayElements, visible: boolean) => void
  setActivePlayer: (id: number | null) => void
  openWicketModal: () => void
  closeWicketModal: () => void
  openBowlerSelect: () => void
  closeBowlerSelect: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  display: {
    scorebug: true,
    playerCard: false,
    wicketAlert: false,
    partnership: false,
    ticker: false,
  },
  activePlayerId: null,
  isWicketModalOpen: false,
  isBowlerSelectOpen: false,

  toggleDisplay(element) {
    set((s) => ({
      display: { ...s.display, [element]: !s.display[element] },
    }))
  },

  setDisplay(element, visible) {
    set((s) => ({
      display: { ...s.display, [element]: visible },
    }))
  },

  setActivePlayer(id) {
    set({ activePlayerId: id })
  },

  openWicketModal() {
    set({ isWicketModalOpen: true })
  },

  closeWicketModal() {
    set({ isWicketModalOpen: false })
  },

  openBowlerSelect() {
    set({ isBowlerSelectOpen: true })
  },

  closeBowlerSelect() {
    set({ isBowlerSelectOpen: false })
  },
}))
