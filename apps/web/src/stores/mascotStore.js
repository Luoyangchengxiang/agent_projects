/**
 * 看板娘状态管理
 * 管理形象选择、位置、交互状态
 */
import create from 'zustand'

const MODEL_LIST = [
  { id: 'cat-black', name: '黑猫咪', emoji: '🐱', color: '#1f1f1f' },
  { id: 'cat-white', name: '白猫咪', emoji: '😺', color: '#f5f5f5' },
  { id: 'cat-orange', name: '橘猫咪', emoji: '🐈', color: '#ff9b6b' },
  { id: 'cat-gray', name: '灰猫咪', emoji: '😸', color: '#8b949e' },
  { id: 'cat-pink', name: '粉猫咪', emoji: '😻', color: '#ff6b9d' },
]

const MASCOT_KEY = 'mascot_model_id'

const useMascotStore = create((set, get) => ({
  // 状态
  modelId: localStorage.getItem(MASCOT_KEY) || null,
  isMenuOpen: false,
  menuPosition: { x: 0, y: 0 },
  isChatOpen: false,
  isHovering: false,
  isLoading: false,
  // 互动模式：默认 false，点击菜单"互动"后激活
  interactMode: false,
  // 设置面板
  isSettingsOpen: false,

  // 模型列表
  models: MODEL_LIST,

  // 获取当前模型信息
  getCurrentModel: () => {
    const { modelId } = get()
    return MODEL_LIST.find((m) => m.id === modelId) || null
  },

  // 选择模型（首次绑定）
  selectModel: (modelId) => {
    localStorage.setItem(MASCOT_KEY, modelId)
    set({ modelId })
  },

  // 检查是否已选择模型
  hasSelectedModel: () => {
    return !!localStorage.getItem(MASCOT_KEY)
  },

  // 菜单控制
  openMenu: (x, y) => set({ isMenuOpen: true, menuPosition: { x, y } }),
  closeMenu: () => set({ isMenuOpen: false }),

  // 客服控制
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),

  // 悬停控制
  setHovering: (v) => set({ isHovering: v }),

  // 加载控制
  setLoading: (v) => set({ isLoading: v }),

  // 互动模式切换
  toggleInteractMode: () => set((state) => ({ interactMode: !state.interactMode })),

  // 设置面板
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  // 重置（退出登录时）
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

export default useMascotStore
