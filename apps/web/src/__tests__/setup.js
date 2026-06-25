/**
 * Vitest 测试环境配置
 */
import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/',
    href: 'http://localhost:3000',
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
})

// 每个测试前重置mock
beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})
