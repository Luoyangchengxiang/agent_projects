/**
 * 看板娘状态管理
 * 管理形象选择、位置、交互状态
 */
import create from 'zustand'

const MODEL_LIST = [
  { id: 'hijiki', name: '黑猫咪', url: 'https://unpkg.com/live2d-widget-model-hijiki@1.0.5/assets/hijiki.model.json', emoji: '🐱' },
  { id: 'tororo', name: '白猫咪', url: 'https://unpkg.com/live2d-widget-model-tororo@1.0.5/assets/tororo.model.json', emoji: '😺' },
  { id: 'shizuku', name: '萌娘', url: 'https://unpkg.com/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json', emoji: '👧' },
  { id: 'wanko', name: '狗狗', url: 'https://unpkg.com/live2d-widget-model-wanko@1.0.5/assets/wanko.model.json', emoji: '🐶' },
  { id: 'z16', name: '萌妹1号', url: 'https://unpkg.com/live2d-widget-model-z16@1.0.5/assets/z16.model.json', emoji: '👩' },
  { id: 'koharu', name: '萌妹2号', url: 'https://unpkg.com/live2d-widget-model-koharu@1.0.5/assets/koharu.model.json', emoji: '👱‍♀️' },
  { id: 'hibiki', name: '萌妹3号', url: 'https://unpkg.com/live2d-widget-model-hibiki@1.0.5/assets/hibiki.model.json', emoji: '🎶' },
  { id: 'izumi', name: '妹子4号', url: 'https://unpkg.com/live2d-widget-model-izumi@1.0.5/assets/izumi.model.json', emoji: '💫' },
  { id: 'miku', name: '初音', url: 'https://unpkg.com/live2d-widget-model-miku@1.0.5/assets/miku.model.json', emoji: '🎵' },
  { id: 'nico', name: 'Nico', url: 'https://unpkg.com/live2d-widget-model-nico@1.0.5/assets/nico.model.json', emoji: '✨' },
  { id: 'ni-j', name: 'Ni-J', url: 'https://unpkg.com/live2d-widget-model-ni-j@1.0.5/assets/ni-j.model.json', emoji: '🌸' },
  { id: 'nipsilon', name: 'Nipsilon', url: 'https://unpkg.com/live2d-widget-model-nipsilon@1.0.5/assets/nipsilon.model.json', emoji: '🎀' },
  { id: 'nito', name: 'Nito', url: 'https://unpkg.com/live2d-widget-model-nito@1.0.5/assets/nito.model.json', emoji: '🌟' },
  { id: 'tsumiki', name: 'Tsumiki', url: 'https://unpkg.com/live2d-widget-model-tsumiki@1.0.5/assets/tsumiki.model.json', emoji: '🎯' },
  { id: 'unitychan', name: 'Unity酱', url: 'https://unpkg.com/live2d-widget-model-unitychan@1.0.5/assets/unitychan.model.json', emoji: '🎮' },
  { id: 'chitose', name: '帅哥1号', url: 'https://unpkg.com/live2d-widget-model-chitose@1.0.5/assets/chitose.model.json', emoji: '👦' },
  { id: 'haruto', name: '帅哥2号', url: 'https://unpkg.com/live2d-widget-model-haruto@1.0.5/assets/haruto.model.json', emoji: '🧑' },
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

  // 是否已选择模型
  hasSelectedModel: () => {
    return !!localStorage.getItem(MASCOT_KEY)
  },

  // Hover 状态
  setHovering: (isHovering) => set({ isHovering }),

  // 菜单开关
  openMenu: (x, y) => {
    // 边界检测：确保菜单不超出屏幕
    const menuRadius = 120
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    // 右边界
    if (x + menuRadius > screenWidth) adjustedX = screenWidth - menuRadius - 20
    // 左边界
    if (x - menuRadius < 0) adjustedX = menuRadius + 20
    // 下边界
    if (y + menuRadius > screenHeight) adjustedY = screenHeight - menuRadius - 20
    // 上边界
    if (y - menuRadius < 0) adjustedY = menuRadius + 20

    set({ isMenuOpen: true, menuPosition: { x: adjustedX, y: adjustedY } })
  },

  closeMenu: () => set({ isMenuOpen: false }),

  // 聊天面板
  openChat: () => set({ isChatOpen: true, isMenuOpen: false }),
  closeChat: () => set({ isChatOpen: false }),

  // 加载状态
  setLoading: (isLoading) => set({ isLoading }),
}))

export default useMascotStore
