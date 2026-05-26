import { vocabulary } from '../data/vocabulary.js'

const PREFIX = 'vocabboost_'

export function getItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn('localStorage voll oder nicht verfügbar:', e)
  }
}

export function removeItem(key) {
  localStorage.removeItem(PREFIX + key)
}

// Word progress: { [wordId]: { status, correct, wrong, nextReviewDate, lastReviewed } }
export function getWordProgress() {
  return getItem('wordProgress', {})
}

export function setWordProgress(progress) {
  setItem('wordProgress', progress)
}

// Custom words added by user
export function getCustomWords() {
  return getItem('customWords', [])
}

export function setCustomWords(words) {
  setItem('customWords', words)
  window.dispatchEvent(new CustomEvent('vocabboost_customWordsChanged', { detail: words }))
}

// Gamification
export function getStats() {
  return getItem('stats', {
    xp: 0,
    lastStudiedDate: null,
    streak: 0,
    dailyGoal: 20,
    achievements: [],
    todayAnswers: 0,
    todayDate: null
  })
}

export function setStats(stats) {
  setItem('stats', stats)
}

// Settings
export function getSettings() {
  return getItem('settings', {
    apiKey: '',
    dailyGoal: 20
  })
}

export function setSettings(settings) {
  setItem('settings', settings)
}

export function getApiKey() {
  const settings = getSettings()
  return settings.apiKey || ''
}

export function clearAll() {
  removeItem('wordProgress')
  removeItem('customWords')
  removeItem('stats')
  localStorage.removeItem('vocabboost_progress')
  localStorage.removeItem('lastStudiedDate')
  localStorage.removeItem('streak')
}

/**
 * Returns all available words (built-in + custom) for stats calculations.
 */
function getAllWords() {
  const customWords = getCustomWords()
  return [...vocabulary, ...customWords]
}

// Topic & overall stats for Progress page
export function getTopicStats() {
  const progress = getWordProgress()
  const allWords = getAllWords()
  const topics = {}

  allWords.forEach(word => {
    const topic = word.topic || 'Allgemein'
    if (!topics[topic]) {
      topics[topic] = { total: 0, known: 0, quizCorrect: 0, quizTotal: 0 }
    }
    topics[topic].total++
    const entry = progress[word.id]
    if (entry && entry.status >= 2) {
      topics[topic].known++
    }
    if (entry) {
      topics[topic].quizCorrect += entry.correct || 0
      topics[topic].quizTotal += (entry.correct || 0) + (entry.wrong || 0)
    }
  })

  return topics
}

export function getOverallStats() {
  const progress = getWordProgress()
  const allWords = getAllWords()
  const total = allWords.length
  let known = 0
  let quizCorrect = 0
  let quizTotal = 0

  allWords.forEach(word => {
    const entry = progress[word.id]
    if (entry && entry.status >= 2) known++
    if (entry) {
      quizCorrect += entry.correct || 0
      quizTotal += (entry.correct || 0) + (entry.wrong || 0)
    }
  })

  return { total, known, quizCorrect, quizTotal }
}

// ─── Perfect-Round-Flag (nur noch über gamification.js gesteuert) ───
// Diese drei Funktionen bleiben als Legacy-Kompatibilität erhalten,
// werden aber nicht mehr aktiv verwendet. Die Perfect-Round-Logik
// läuft jetzt ausschließlich über gamification.js (markPerfectRound).
export function getPerfectRoundFlag() {
  return getItem('perfectRound', false)
}

export function setPerfectRoundFlag(value) {
  setItem('perfectRound', value)
}

export function removePerfectRoundFlag() {
  removeItem('perfectRound')
}

export function resetProgress() {
  clearAll()
}