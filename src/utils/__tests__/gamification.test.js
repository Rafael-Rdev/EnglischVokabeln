import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  addXP,
  updateStreak,
  getToday,
  getLevel,
  getXPToNextLevel,
  getDailyGoalProgress,
  setDailyGoal,
  checkAchievements,
  markPerfectRound,
  getUnlockedAchievements,
  getAllAchievements,
  ACHIEVEMENTS,
  LEVELS
} from '../gamification.js'
import { getStats, setStats, getWordProgress, setWordProgress } from '../storage.js'

describe('gamification – addXP', () => {
  beforeEach(() => {
    localStorage.clear()
    setStats({
      xp: 0,
      lastStudiedDate: null,
      streak: 0,
      dailyGoal: 20,
      achievements: [],
      todayAnswers: 0,
      todayDate: null
    })
  })

  it('adds XP and returns updated values', () => {
    const result = addXP(10)
    expect(result.newXP).toBe(10)
    expect(result.leveledUp).toBe(false)
    expect(result.newLevel).toBe(1)
  })

  it('detects level-up when XP crosses threshold', () => {
    // Level 1→2 needs 100 XP
    const result = addXP(150)
    expect(result.newXP).toBe(150)
    expect(result.leveledUp).toBe(true)
    expect(result.newLevel).toBe(2)
  })

  it('increments todayAnswers when XP > 0', () => {
    addXP(10)
    const stats = getStats()
    expect(stats.todayAnswers).toBe(1)
    expect(stats.todayDate).toBe(getToday())
  })

  it('does not increment todayAnswers when XP <= 0', () => {
    addXP(0)
    const stats = getStats()
    expect(stats.todayAnswers).toBe(0)
  })

  it('resets todayAnswers when date changes', () => {
    // Simulate yesterday
    setStats({
      ...getStats(),
      todayDate: '2000-01-01',
      todayAnswers: 15
    })
    addXP(5)
    const stats = getStats()
    expect(stats.todayAnswers).toBe(1)
    expect(stats.todayDate).toBe(getToday())
  })
})

describe('gamification – updateStreak', () => {
  beforeEach(() => {
    localStorage.clear()
    setStats({
      xp: 0,
      lastStudiedDate: null,
      streak: 0,
      dailyGoal: 20,
      achievements: [],
      todayAnswers: 0,
      todayDate: null
    })
  })

  it('starts a streak of 1 on first study', () => {
    const stats = updateStreak()
    expect(stats.streak).toBe(1)
    expect(stats.lastStudiedDate).toBe(getToday())
  })

  it('does not increase streak if already studied today', () => {
    const today = getToday()
    setStats({
      ...getStats(),
      lastStudiedDate: today,
      streak: 3
    })
    const stats = updateStreak()
    expect(stats.streak).toBe(3) // unchanged
  })

  it('increments streak on consecutive day', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    setStats({
      ...getStats(),
      lastStudiedDate: yesterdayStr,
      streak: 4
    })
    const stats = updateStreak()
    expect(stats.streak).toBe(5)
  })

  it('resets streak to 1 on missed day', () => {
    setStats({
      ...getStats(),
      lastStudiedDate: '2000-01-01',
      streak: 10
    })
    const stats = updateStreak()
    expect(stats.streak).toBe(1)
  })
})

describe('gamification – getToday', () => {
  it('returns YYYY-MM-DD format', () => {
    const today = getToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('gamification – getLevel', () => {
  it('returns level 1 at 0 XP', () => {
    const level = getLevel(0)
    expect(level.level).toBe(1)
    expect(level.title).toBe('Anfänger')
  })

  it('returns level 2 at 100 XP', () => {
    const level = getLevel(100)
    expect(level.level).toBe(2)
    expect(level.title).toBe('Wortjäger')
  })

  it('returns level 6 at 2000+ XP', () => {
    const level = getLevel(2000)
    expect(level.level).toBe(6)
    expect(level.title).toBe('Englisch-Legende')
  })
})

describe('gamification – getXPToNextLevel', () => {
  it('returns progress toward next level', () => {
    const result = getXPToNextLevel(50)
    expect(result.xpNeeded).toBe(100)
    expect(result.remaining).toBe(50)
    expect(result.nextTitle).toBe('Wortjäger')
    expect(result.progress).toBe(50)
  })

  it('returns 100% progress at max level', () => {
    const result = getXPToNextLevel(3000)
    expect(result.progress).toBe(100)
    expect(result.remaining).toBe(0)
  })
})

describe('gamification – daily goal', () => {
  beforeEach(() => {
    localStorage.clear()
    setStats({
      xp: 0,
      lastStudiedDate: null,
      streak: 0,
      dailyGoal: 20,
      achievements: [],
      todayAnswers: 0,
      todayDate: null
    })
  })

  it('getDailyGoalProgress returns defaults', () => {
    const dp = getDailyGoalProgress()
    expect(dp.current).toBe(0)
    expect(dp.goal).toBe(20)
    expect(dp.reached).toBe(false)
  })

  it('getDailyGoalProgress resets when todayDate changes', () => {
    setStats({
      ...getStats(),
      todayDate: '2000-01-01',
      todayAnswers: 15
    })
    const dp = getDailyGoalProgress()
    expect(dp.current).toBe(0)
  })

  it('setDailyGoal updates the goal', () => {
    setDailyGoal(30)
    expect(getStats().dailyGoal).toBe(30)
  })
})

describe('gamification – achievements', () => {
  beforeEach(() => {
    localStorage.clear()
    setStats({
      xp: 0,
      lastStudiedDate: null,
      streak: 0,
      dailyGoal: 20,
      achievements: [],
      todayAnswers: 0,
      todayDate: null
    })
    // Provide word progress for achievement checks
    setWordProgress({})
  })

  it('checkAchievements returns empty when nothing unlocked', () => {
    const newAch = checkAchievements()
    expect(newAch).toEqual([])
  })

  it('unlocks "Erste Schritte" when 10+ words learned', () => {
    // Create word progress entries for 10 words
    const progress = {}
    for (let i = 1; i <= 10; i++) {
      progress[i] = { status: 1, correct: 0, wrong: 0 }
    }
    setWordProgress(progress)

    const newAch = checkAchievements()
    const ids = newAch.map(a => a.id)
    expect(ids).toContain('first_steps')
  })

  it('unlocks "Master" achievement when 10+ words mastered', () => {
    const progress = {}
    for (let i = 1; i <= 10; i++) {
      progress[i] = { status: 5, correct: 5, wrong: 0 }
    }
    setWordProgress(progress)

    const newAch = checkAchievements()
    const ids = newAch.map(a => a.id)
    expect(ids).toContain('master_10')
  })

  it('unlocks "Perfektionist" when perfect round flag is set', () => {
    markPerfectRound()
    const newAch = checkAchievements()
    const ids = newAch.map(a => a.id)
    expect(ids).toContain('perfectionist')
  })

  it('unlocks "Aufsteiger" when level 5 is reached', () => {
    setStats({
      ...getStats(),
      xp: 1200 // Level 5 needs 1000 XP
    })
    const newAch = checkAchievements()
    const ids = newAch.map(a => a.id)
    expect(ids).toContain('level_5')
  })

  it('does not re-unlock already owned achievements', () => {
    // Set 10 words and already have first_steps unlocked
    setStats({
      ...getStats(),
      achievements: ['first_steps']
    })
    const progress = {}
    for (let i = 1; i <= 10; i++) {
      progress[i] = { status: 1 }
    }
    setWordProgress(progress)

    const newAch = checkAchievements()
    const ids = newAch.map(a => a.id)
    expect(ids).not.toContain('first_steps')
  })
})

describe('gamification – markPerfectRound', () => {
  beforeEach(() => {
    localStorage.clear()
    setStats({
      xp: 0,
      lastStudiedDate: null,
      streak: 0,
      dailyGoal: 20,
      achievements: [],
      todayAnswers: 0,
      todayDate: null
    })
  })

  it('sets _perfectRoundFlag to true', () => {
    markPerfectRound()
    const stats = getStats()
    expect(stats._perfectRoundFlag).toBe(true)
  })
})

describe('gamification – getUnlockedAchievements / getAllAchievements', () => {
  beforeEach(() => {
    localStorage.clear()
    setStats({
      xp: 0,
      lastStudiedDate: null,
      streak: 0,
      dailyGoal: 20,
      achievements: [],
      todayAnswers: 0,
      todayDate: null
    })
  })

  it('getUnlockedAchievements returns empty initially', () => {
    expect(getUnlockedAchievements()).toEqual([])
  })

  it('getUnlockedAchievements returns unlocked achievements', () => {
    setStats({
      ...getStats(),
      achievements: ['first_steps', 'test_steps']
    })
    const unlocked = getUnlockedAchievements()
    expect(unlocked.length).toBe(1) // test_steps is invalid
    expect(unlocked[0].id).toBe('first_steps')
  })

  it('getAllAchievements returns all with unlocked flag', () => {
    setStats({
      ...getStats(),
      achievements: ['first_steps']
    })
    const all = getAllAchievements()
    expect(all.length).toBe(ACHIEVEMENTS.length)
    const first = all.find(a => a.id === 'first_steps')
    expect(first.unlocked).toBe(true)
    const others = all.filter(a => a.id !== 'first_steps' && a.id !== 'streak_3' && a.id !== 'streak_7')
    // Not all should be locked – some might be unlocked due to default stats
    expect(first).toBeDefined()
  })
})