/**
 * MascotStore 单元测试
 * 测试看板娘状态管理
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import zustand from 'zustand'
const create = zustand.create || zustand

const MODEL_LIST = [
  { id: 'cat-black', name: '黑猫咪', emoji: '🐱', color: '#1f1f1f' },
  { id: 'cat-white', name: '白猫咪', emoji: '😺', color: '#f5f5f5' },
  { id: 'cat-orange', name: '橘猫咪', emoji: '🐈', color: '#ff9b6b' },
  { id: 'cat-gray', name: '灰猫咪', emoji: '😸', color: '#8b949e' },
  { id: 'cat-pink', name: '粉猫咪', emoji: '😻', color: '#ff6b9d' },
]

const MASCOT_KEY = 'mascot_model_id'

function createTestStore() {
  return create((set, get) => ({
    modelId: localStorage.getItem(MASCOT_KEY) || null,
    isMenuOpen: false,
    menuPosition: { x: 0, y: 0 },
    isChatOpen: false,
    isHovering: false,
    isLoading: false,
    interactMode: false,
    isSettingsOpen: false,
    models: MODEL_LIST,

    getCurrentModel: () => {
      const { modelId } = get()
      return MODEL_LIST.find((m) => m.id === modelId) || null
    },

    selectModel: (modelId) => {
      localStorage.setItem(MASCOT_KEY, modelId)
      set({ modelId })
    },

    hasSelectedModel: () => {
      return !!localStorage.getItem(MASCOT_KEY)
    },

    openMenu: (x, y) => set({ isMenuOpen: true, menuPosition: { x, y } }),
    closeMenu: () => set({ isMenuOpen: false }),

    openChat: () => set({ isChatOpen: true }),
    closeChat: () => set({ isChatOpen: false }),

    setHovering: (v) => set({ isHovering: v }),
    setLoading: (v) => set({ isLoading: v }),

    toggleInteractMode: () => set((state) => ({ interactMode: !state.interactMode })),

    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),

    reset: () => {
      localStorage.removeItem(MASCOT_KEY)
      set({
        modelId: null,
        isMenuOpen: false,
        isChatOpen: false,
        isHovering: false,
        isLoading: false,
        interactMode: false,
        isSettingsOpen: false,
      })
    },
  }))
}

describe('mascotStore', () => {
  let useMascotStore

  beforeEach(() => {
    localStorage.clear()
    useMascotStore = createTestStore()
  })

  describe('模型选择', () => {
    it('初始状态没有选择模型', () => {
      expect(useMascotStore.getState().modelId).toBeNull()
    })

    it('selectModel 保存模型ID到localStorage', () => {
      useMascotStore.getState().selectModel('cat-black')

      expect(useMascotStore.getState().modelId).toBe('cat-black')
      expect(localStorage.getItem(MASCOT_KEY)).toBe('cat-black')
    })

    it('hasSelectedModel 检查是否已选择', () => {
      expect(useMascotStore.getState().hasSelectedModel()).toBe(false)

      useMascotStore.getState().selectModel('cat-white')

      expect(useMascotStore.getState().hasSelectedModel()).toBe(true)
    })

    it('getCurrentModel 返回当前模型信息', () => {
      expect(useMascotStore.getState().getCurrentModel()).toBeNull()

      useMascotStore.getState().selectModel('cat-orange')

      const model = useMascotStore.getState().getCurrentModel()
      expect(model).toEqual({ id: 'cat-orange', name: '橘猫咪', emoji: '🐈', color: '#ff9b6b' })
    })

    it('models 包含5个模型', () => {
      expect(useMascotStore.getState().models).toHaveLength(5)
    })
  })

  describe('菜单控制', () => {
    it('openMenu 打开菜单并设置位置', () => {
      useMascotStore.getState().openMenu(100, 200)

      expect(useMascotStore.getState().isMenuOpen).toBe(true)
      expect(useMascotStore.getState().menuPosition).toEqual({ x: 100, y: 200 })
    })

    it('closeMenu 关闭菜单', () => {
      useMascotStore.setState({ isMenuOpen: true })
      useMascotStore.getState().closeMenu()

      expect(useMascotStore.getState().isMenuOpen).toBe(false)
    })
  })

  describe('客服面板', () => {
    it('openChat 打开客服', () => {
      useMascotStore.getState().openChat()
      expect(useMascotStore.getState().isChatOpen).toBe(true)
    })

    it('closeChat 关闭客服', () => {
      useMascotStore.setState({ isChatOpen: true })
      useMascotStore.getState().closeChat()
      expect(useMascotStore.getState().isChatOpen).toBe(false)
    })
  })

  describe('互动模式', () => {
    it('toggleInteractMode 切换互动状态', () => {
      expect(useMascotStore.getState().interactMode).toBe(false)

      useMascotStore.getState().toggleInteractMode()
      expect(useMascotStore.getState().interactMode).toBe(true)

      useMascotStore.getState().toggleInteractMode()
      expect(useMascotStore.getState().interactMode).toBe(false)
    })
  })

  describe('设置面板', () => {
    it('openSettings 打开设置', () => {
      useMascotStore.getState().openSettings()
      expect(useMascotStore.getState().isSettingsOpen).toBe(true)
    })

    it('closeSettings 关闭设置', () => {
      useMascotStore.setState({ isSettingsOpen: true })
      useMascotStore.getState().closeSettings()
      expect(useMascotStore.getState().isSettingsOpen).toBe(false)
    })
  })

  describe('状态控制', () => {
    it('setHovering 设置悬停状态', () => {
      useMascotStore.getState().setHovering(true)
      expect(useMascotStore.getState().isHovering).toBe(true)

      useMascotStore.getState().setHovering(false)
      expect(useMascotStore.getState().isHovering).toBe(false)
    })

    it('setLoading 设置加载状态', () => {
      useMascotStore.getState().setLoading(true)
      expect(useMascotStore.getState().isLoading).toBe(true)
    })
  })

  describe('reset', () => {
    it('重置所有状态并清除localStorage', () => {
      useMascotStore.setState({
        modelId: 'cat-black',
        isMenuOpen: true,
        isChatOpen: true,
        isHovering: true,
        isLoading: true,
        interactMode: true,
        isSettingsOpen: true,
      })
      localStorage.setItem(MASCOT_KEY, 'cat-black')

      useMascotStore.getState().reset()

      const state = useMascotStore.getState()
      expect(state.modelId).toBeNull()
      expect(state.isMenuOpen).toBe(false)
      expect(state.isChatOpen).toBe(false)
      expect(state.isHovering).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.interactMode).toBe(false)
      expect(state.isSettingsOpen).toBe(false)
      expect(localStorage.getItem(MASCOT_KEY)).toBeNull()
    })
  })
})
