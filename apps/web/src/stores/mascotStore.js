/**
 * 看板娘状态管理
 * 管理形象选择、位置、交互状态
 */
import create from 'zustand'

const MODEL_LIST = [
  // Live2D 模型（真实动画形象）
  { id: 'shizuku', name: 'Shizuku', emoji: '👧', live2d: true, modelPath: '/live2d/models/shizuku/assets/shizuku.model.json', desc: '温柔少女，经典看板娘' },
  { id: 'miku', name: 'Miku', emoji: '🎤', live2d: true, modelPath: '/live2d/models/miku/assets/miku.model.json', desc: '初音未来，元气满满' },
  { id: 'haru', name: 'Haru', emoji: '🌸', live2d: true, modelPath: '/live2d/models/haru/01/assets/haru01.model.json', desc: '春日少女，活泼可爱' },
  { id: 'haru-02', name: 'Haru (礼服)', emoji: '🎀', live2d: true, modelPath: '/live2d/models/haru/02/assets/haru02.model.json', desc: '春日少女，优雅礼服版' },
  { id: 'koharu', name: 'Koharu', emoji: '☀️', live2d: true, modelPath: '/live2d/models/koharu/assets/koharu.model.json', desc: '阳光少女，温暖治愈' },
  { id: 'izumi', name: 'Izumi', emoji: '🌊', live2d: true, modelPath: '/live2d/models/izumi/assets/izumi.model.json', desc: '知性学姐，温柔大方' },
  { id: 'chitose', name: 'Chitose', emoji: '🍀', live2d: true, modelPath: '/live2d/models/chitose/assets/chitose.model.json', desc: '元气少女，清新自然' },
  { id: 'wanko', name: 'Wanko', emoji: '🐶', live2d: true, modelPath: '/live2d/models/wanko/assets/wanko.model.json', desc: '可爱小狗娘，忠诚陪伴' },
  { id: 'z16', name: 'Z16', emoji: '🤖', live2d: true, modelPath: '/live2d/models/z16/assets/z16.model.json', desc: '机械少女，科技感十足' },
  { id: 'blanc', name: 'Blanc', emoji: '🤍', live2d: true, modelPath: '/live2d/models/blanc_normal/blanc_normal/blanc_normal.model.json', desc: '纯白少女，优雅冷静' },
  { id: 'vert', name: 'Vert', emoji: '💚', live2d: true, modelPath: '/live2d/models/vert/vert_classic/vert_classic.model.json', desc: '绿荫女神，成熟魅力' },
  { id: 'haruto', name: 'Haruto', emoji: '👦', live2d: true, modelPath: '/live2d/models/haruto/assets/haruto.model.json', desc: '阳光少年，帅气活力' },
  { id: 'histoire', name: 'Histoire', emoji: '📖', live2d: true, modelPath: '/live2d/models/histoire/histoire/histoire.model.json', desc: '知识之书，智慧化身' },
  { id: 'nepgear', name: 'Nepgear', emoji: '⚙️', live2d: true, modelPath: '/live2d/models/nepgear_extra/nepgear_extra/nepgear_extra.model.json', desc: '机甲少女，未来战士' },
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
