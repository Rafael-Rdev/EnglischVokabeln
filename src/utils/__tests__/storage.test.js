import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getItem,
  setItem,
  removeItem,
  getWordProgress,
  setWordProgress,
  getCustomWords,
  setCustomWords,
  getStats,
  setStats,
  getSettings,
  setSettings,
  getApiKey,
  clearAll,
  getTopicStats,
  getOverallStats,
  getPerfectRoundFlag,
  setPerfectRoundFlag,
  removePerfectRoundFlag,
  resetProgress
} from '../storage.js'

// We import vocabulary for topic/overall stats tests
import { vocabulary } from '../../data/vocabulary.js'

const PREFIX = 'vocabboost_'

describe('storage – core localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getItem', () => {
    it('returns fallback when key does not exist', () => {
      expect(getItem('nonexistent', 'default')).toBe('default')
    })

    it('returns null fallback by default', () => {
      expect(getItem('nonexistent')).toBeNull()
    })

    it('returns parsed JSON when key exists', () => {
      localStorage.setItem(PREFIX + 'test', JSON.stringify({ a: 1 }))
      expect(getItem('test')).toEqual({ a: 1 })
    })

    it('returns fallback on malformed JSON', () => {
      localStorage.setItem(PREFIX + 'test', '{not-json')
      expect(getItem('test', 'fallback')).toBe('fallback')
    })
  })

  describe('setItem', () => {
    it('stores value as JSON with prefix', () => {
      setItem('foo', { x: 42 })
      const raw = localStorage.getItem(PREFIX + 'foo')
      expect(JSON.parse(raw)).toEqual({ x: 42 })
    })

    it('does not throw when localStorage.setItem throws (quota exceeded)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      // Simulate quota: JSON.stringify succeeds, but setItem throws
      const originalSetItem = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => { throw new DOMException('QuotaExceededError') })
      expect(() => setItem('key', 'value')).not.toThrow()
      expect(warnSpy).toHaveBeenCalled()
      Storage.prototype.setItem = originalSetItem
      warnSpy.mockRestore()
    })
  })

  describe('removeItem', () => {
    it('removes prefixed key', () => {
      localStorage.setItem(PREFIX + 'bar', 'data')
      removeItem('bar')
      expect(localStorage.getItem(PREFIX + 'bar')).toBeNull()
    })
  })
})

describe('storage – word progress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getWordProgress returns empty object by default', () => {
    expect(getWordProgress()).toEqual({})
  })

  it('setWordProgress / getWordProgress round-trip', () => {
    const progress = { 1: { status: 2, correct: 3, wrong: 1 } }
    setWordProgress(progress)
    expect(getWordProgress()).toEqual(progress)
  })
})

describe('storage – custom words', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getCustomWords returns empty array by default', () => {
    expect(getCustomWords()).toEqual([])
  })

  it('setCustomWords / getCustomWords round-trip', () => {
    const words = [{ id: 999, en: 'test', de: 'Test' }]
    setCustomWords(words)
    expect(getCustomWords()).toEqual(words)
  })

  it('setCustomWords dispatches vocabboost_customWordsChanged event', () => {
    const handler = vi.fn()
    window.addEventListener('vocabboost_customWordsChanged', handler)
    const words = [{ id: 998 }]
    setCustomWords(words)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0].detail).toEqual(words)
    window.removeEventListener('vocabboost_customWordsChanged', handler)
  })
})

describe('storage – stats', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getStats returns default stats object', () => {
    const stats = getStats()
    expect(stats.xp).toBe(0)
    expect(stats.lastStudiedDate).toBeNull()
    expect(stats.streak).toBe(0)
    expect(stats.dailyGoal).toBe(20)
    expect(stats.achievements).toEqual([])
    expect(stats.todayAnswers).toBe(0)
    expect(stats.todayDate).toBeNull()
  })

  it('setStats / getStats round-trip', () => {
    const stats = { xp: 500, streak: 7, dailyGoal: 30, achievements: ['first_steps'] }
    setStats(stats)
    expect(getStats()).toMatchObject(stats)
  })
})

describe('storage – settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getSettings returns default settings', () => {
    const s = getSettings()
    expect(s.apiKey).toBe('')
    expect(s.dailyGoal).toBe(20)
  })

  it('setSettings / getSettings round-trip', () => {
    const s = { apiKey: 'sk-test', dailyGoal: 30 }
    setSettings(s)
    expect(getSettings()).toEqual(s)
  })

  it('getApiKey returns empty string by default', () => {
    expect(getApiKey()).toBe('')
  })

  it('getApiKey returns stored key', () => {
    setSettings({ apiKey: 'my-secret-key', dailyGoal: 20 })
    expect(getApiKey()).toBe('my-secret-key')
  })
})

describe('storage – clearAll', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes wordProgress, customWords, stats and legacy keys', () => {
    setWordProgress({ 1: { status: 1 } })
    setCustomWords([{ id: 1 }])
    setStats({ xp: 100 })
    localStorage.setItem('vocabboost_progress', 'x')
    localStorage.setItem('lastStudiedDate', '2025-01-01')
    localStorage.setItem('streak', '3')

    clearAll()

    expect(getWordProgress()).toEqual({})
    expect(getCustomWords()).toEqual([])
    expect(getStats().xp).toBe(0)
    expect(localStorage.getItem('vocabboost_progress')).toBeNull()
    expect(localStorage.getItem('lastStudiedDate')).toBeNull()
    expect(localStorage.getItem('streak')).toBeNull()
  })
})

describe('storage – topic & overall stats', () => {
  beforeEach(() => {
    localStorage.clear()
    setWordProgress({})
    setCustomWords([])
  })

  it('getTopicStats returns correct counts for vocabulary items', () => {
    // Give word 1 (homework, topic School) status 2 (known)
    setWordProgress({
      1: { status: 2, correct: 5, wrong: 1 }
    })

    const topicStats = getTopicStats()
    expect(topicStats['School']).toBeDefined()
    // 'School' topic count depends on vocabulary data; just check structure
    expect(topicStats['School'].total).toBeGreaterThan(0)
    expect(topicStats['School'].known).toBeGreaterThanOrEqual(1)
    expect(topicStats['School'].quizCorrect).toBe(5)
    expect(topicStats['School'].quizTotal).toBe(6)
  })

  it('getOverallStats returns correct totals', () => {
    setWordProgress({
      1: { status: 5, correct: 10, wrong: 0 },
      2: { status: 3, correct: 6, wrong: 2 }
    })

    const overall = getOverallStats()
    expect(overall.total).toBeGreaterThan(0)
    expect(overall.known).toBeGreaterThanOrEqual(1)
    expect(overall.quizCorrect).toBe(16)
    expect(overall.quizTotal).toBe(18)
  })
})

describe('storage – perfect round legacy flags', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getPerfectRoundFlag returns false by default', () => {
    expect(getPerfectRoundFlag()).toBe(false)
  })

  it('setPerfectRoundFlag / getPerfectRoundFlag round-trip', () => {
    setPerfectRoundFlag(true)
    expect(getPerfectRoundFlag()).toBe(true)
  })

  it('removePerfectRoundFlag removes the flag (returns fallback false)', () => {
    setPerfectRoundFlag(true)
    removePerfectRoundFlag()
    // After removal, getItem returns the fallback which is false
    expect(getPerfectRoundFlag()).toBe(false)
  })
})

describe('storage – resetProgress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('clears all progress data', () => {
    setWordProgress({ 1: { status: 3 } })
    setCustomWords([{ id: 99 }])
    setStats({ xp: 500 })
    resetProgress()
    expect(getWordProgress()).toEqual({})
    expect(getCustomWords()).toEqual([])
    expect(getStats().xp).toBe(0)
  })
})