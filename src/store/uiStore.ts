import { create } from 'zustand'

type DisplayElements = {
  scorebug: boolean
  playerCard: boolean
  wicketAlert: boolean
  partnership: boolean
  ticker: boolean
}

// null teamId = add-new mode not yet targeted; set teamId before opening
export type PlayerEditCtx = {
  playerId: number | null  // null = add new player
  teamId: number
}

type UIStore = {
  display: DisplayElements
  activePlayerId: number | null
  isWicketModalOpen: boolean
  isBowlerSelectOpen: boolean
  isSquadPanelOpen: boolean
  isPlayerEditOpen: boolean
  editingPlayerCtx: PlayerEditCtx | null
  toggleDisplay: (element: keyof DisplayElements) => void
  setDisplay: (element: keyof DisplayElements, visible: boolean) => void
  setActivePlayer: (id: number | null) => void
  openWicketModal: () => void
  closeWicketModal: () => void
  openBowlerSelect: () => void
  closeBowlerSelect: () => void
  openSquadPanel: () => void
  closeSquadPanel: () => void
  openPlayerEdit: (playerId: number, teamId: number) => void
  openPlayerAdd: (teamId: number) => void
  closePlayerEdit: () => void
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
  isSquadPanelOpen: false,
  isPlayerEditOpen: false,
  editingPlayerCtx: null,

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

  openSquadPanel() {
    set({ isSquadPanelOpen: true })
  },

  closeSquadPanel() {
    set({ isSquadPanelOpen: false })
  },

  openPlayerEdit(playerId, teamId) {
    set({ isPlayerEditOpen: true, editingPlayerCtx: { playerId, teamId } })
  },

  openPlayerAdd(teamId) {
    set({ isPlayerEditOpen: true, editingPlayerCtx: { playerId: null, teamId } })
  },

  closePlayerEdit() {
    set({ isPlayerEditOpen: false, editingPlayerCtx: null })
  },
}))
