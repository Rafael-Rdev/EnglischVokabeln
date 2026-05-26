import { getStats, setStats, getWordProgress } from './storage.js'

// Level definitions: [minXP, title, maxXP?]
const LEVELS = [
  { minXP: 0, maxXP: 99, level: 1, title: 'Anfänger' },
  { minXP: 100, maxXP: 249, level: 2, title: 'Wortjäger' },
  { minXP: 250, maxXP: 499, level: 3, title: 'Phrasen-Zauberer' },
  { minXP: 500, maxXP: 999, level: 4, title: 'Vokabel-Meister' },
  { minXP: 1000, maxXP: 1999, level: 5, title: 'Sprach-Profi' },
  { minXP: 2000, maxXP: Infinity, level: 6, title: 'Englisch-Legende' }
]

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: 'first_steps', name: 'Erste Schritte', icon: '⭐', desc: '10 Vokabeln gelernt', check: (s) => s.totalLearned >= 10 },
  { id: 'on_the_way', name: 'Auf dem Weg', icon: '🌟', desc: '50 Vokabeln gelernt', check: (s) => s.totalLearned >= 50 },
  { id: 'centurion', name: 'Centurion', icon: '💫', desc: '100 Vokabeln gelernt', check: (s) => s.totalLearned >= 100 },
  { id: 'streak_3', name: 'Feuer frei', icon: '🔥', desc: '3-Tage-Serie', check: (s) => s.streak >= 3 },
  { id: 'streak_7', name: 'Eine Woche', icon: '🔥', desc: '7-Tage-Serie', check: (s) => s.streak >= 7 },
  { id: 'master_10', name: 'Meister', icon: '🏆', desc: '10 Vokabeln gemeistert', check: (s) => s.mastered >= 10 },
  { id: 'king', name: 'Vokabel-König', icon: '👑', desc: '50 Vokabeln gemeistert', check: (s) => s.mastered >= 50 },
  { id: 'level_5', name: 'Aufsteiger', icon: '🚀', desc: 'Level 5 erreicht', check: (s) => s.level >= 5 },
  { id: 'perfectionist', name: 'Perfektionist', icon: '💎', desc: 'Runde mit 100% Quote', check: (s) => s.perfectRound }
]

/**
 * Add XP and return { newXP, leveledUp, newLevel }
 */
export function addXP(amount) {
  const stats = getStats()
  const oldLevel = getLevel(stats.xp).level
  stats.xp += amount
  const newLevel = getLevel(stats.xp).level

  // Update daily answers – NUR wenn tatsächlich XP vergeben wurden (richtige Antwort)
  if (amount > 0) {
    const today = getToday()
    if (stats.todayDate !== today) {
      stats.todayDate = today
      stats.todayAnswers = 0
    }
    stats.todayAnswers += 1
  }

  setStats(stats)

  return {
    newXP: stats.xp,
    leveledUp: newLevel > oldLevel,
    newLevel
  }
}

/**
 * Update daily streak
 */
export function updateStreak() {
  const stats = getStats()
  const today = getToday()
  const yesterday = getRelativeDate(-1)

  if (stats.lastStudiedDate === today) {
    // Already studied today
    return stats
  }

  if (stats.lastStudiedDate === yesterday) {
    stats.streak += 1
  } else if (stats.lastStudiedDate !== today) {
    stats.streak = 1
  }

  stats.lastStudiedDate = today
  setStats(stats)
  return stats
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function getRelativeDate(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Get level info for current XP
 */
export function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i]
  }
  return LEVELS[0]
}

/**
 * Get XP needed for next level
 */
export function getXPToNextLevel(xp) {
  const current = getLevel(xp)
  const next = LEVELS.find(l => l.level === current.level + 1)
  if (!next) return { xpNeeded: 0, remaining: 0, nextTitle: current.title, progress: 100 }
  const xpNeeded = next.minXP
  const currentMin = current.minXP
  const range = xpNeeded - currentMin
  const progress = Math.round(((xp - currentMin) / range) * 100)
  return {
    xpNeeded,
    remaining: xpNeeded - xp,
    nextTitle: next.title,
    progress: Math.min(100, Math.max(0, progress))
  }
}

/**
 * Get daily goal progress
 */
export function getDailyGoalProgress() {
  const stats = getStats()
  const today = getToday()
  if (stats.todayDate !== today) return { current: 0, goal: stats.dailyGoal || 20, reached: false }
  return {
    current: stats.todayAnswers || 0,
    goal: stats.dailyGoal || 20,
    reached: (stats.todayAnswers || 0) >= (stats.dailyGoal || 20)
  }
}

/**
 * Set daily goal
 */
export function setDailyGoal(goal) {
  const stats = getStats()
  stats.dailyGoal = goal
  setStats(stats)
}

/**
 * Check and return newly unlocked achievements
 * @returns {Array} newly unlocked achievements
 */
export function checkAchievements() {
  const stats = getStats()
  const progress = getWordProgress()

  // Gather data needed for checks
  let totalLearned = 0
  let mastered = 0
  Object.values(progress).forEach(entry => {
    totalLearned++
    if (entry.status >= 5) mastered++
  })

  // Check perfect round via flag in stats
  const checkData = {
    totalLearned,
    mastered,
    streak: stats.streak || 0,
    level: getLevel(stats.xp || 0).level,
    perfectRound: stats._perfectRoundFlag || false
  }

  const unlocked = stats.achievements || []
  const newlyUnlocked = []

  ACHIEVEMENTS.forEach(ach => {
    if (!unlocked.includes(ach.id) && ach.check(checkData)) {
      unlocked.push(ach.id)
      newlyUnlocked.push(ach)
    }
  })

  if (newlyUnlocked.length > 0) {
    stats.achievements = unlocked
    // Reset flag
    if (newlyUnlocked.some(a => a.id === 'perfectionist')) {
      stats._perfectRoundFlag = false
    }
    setStats(stats)
  }

  return newlyUnlocked
}

/**
 * Mark a perfect round occurred
 */
export function markPerfectRound() {
  const stats = getStats()
  stats._perfectRoundFlag = true
  setStats(stats)
}

/**
 * Get all unlocked achievements
 */
export function getUnlockedAchievements() {
  const stats = getStats()
  return (stats.achievements || []).map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean)
}

/**
 * Get all achievements with unlocked status
 */
export function getAllAchievements() {
  const stats = getStats()
  const unlocked = stats.achievements || []
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.includes(a.id)
  }))
}

export { LEVELS }