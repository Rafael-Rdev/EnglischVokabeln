import { getWordProgress, setWordProgress } from './storage.js'

// Review intervals in days for status levels 0-5
const INTERVALS = [0, 1, 3, 7, 14, 30]

/**
 * Update word after a review attempt.
 * @param {number} wordId
 * @param {boolean} correct
 * @returns {object} updated word entry
 */
export function reviewWord(wordId, correct) {
  const progress = getWordProgress()
  const entry = progress[wordId] || {
    status: 0,
    correct: 0,
    wrong: 0,
    nextReviewDate: Date.now(), // Due immediately
    lastReviewed: null
  }

  const now = Date.now()

  if (correct) {
    entry.correct = (entry.correct || 0) + 1
    entry.status = Math.min(5, (entry.status || 0) + 1)
  } else {
    entry.wrong = (entry.wrong || 0) + 1
    entry.status = Math.max(0, (entry.status || 0) - 1)
  }

  entry.lastReviewed = now
  const intervalDays = INTERVALS[entry.status]
  entry.nextReviewDate = now + intervalDays * 24 * 60 * 60 * 1000

  progress[wordId] = entry
  setWordProgress(progress)
  return entry
}

/**
 * Get words that are due for review (nextReviewDate <= now).
 * Returns array of word IDs sorted by nextReviewDate (oldest first).
 * @param {Array} wordIds - optional subset of word IDs to check
 * @returns {number[]}
 */
export function getDueWordIds(wordIds = null) {
  const progress = getWordProgress()
  const now = Date.now()
  const ids = wordIds || Object.keys(progress).map(Number)

  const due = ids.filter(id => {
    const entry = progress[id]
    // No entry = new word, so it's due
    if (!entry) return true
    return entry.nextReviewDate <= now
  })

  // Sort: words with older nextReviewDate first, then no entry (new words) last
  due.sort((a, b) => {
    const entryA = progress[a]
    const entryB = progress[b]
    if (!entryA && !entryB) return 0
    if (!entryA) return 1
    if (!entryB) return -1
    return entryA.nextReviewDate - entryB.nextReviewDate
  })

  return due
}

/**
 * Get status label in German
 * @param {number} status 0-5
 * @returns {string}
 */
export function getStatusLabel(status) {
  const labels = ['Neu', 'Gesehen', 'Lernend', 'Vertraut', 'Sicher', 'Gemeistert']
  return labels[status] || 'Neu'
}

/**
 * Get status color (CSS class compatible)
 * @param {number} status 0-5
 * @returns {string}
 */
export function getStatusColor(status) {
  const colors = ['#6b7280', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981']
  return colors[status] || colors[0]
}

/**
 * Get topic counts for due words
 * @param {Array} vocabulary array
 * @returns {object} { topic: count }
 */
export function getDueCountByTopic(vocabulary) {
  const due = getDueWordIds(vocabulary.map(w => w.id))
  const dueSet = new Set(due)
  const counts = {}

  vocabulary.forEach(w => {
    if (dueSet.has(w.id)) {
      const topic = w.topic || 'Allgemein'
      counts[topic] = (counts[topic] || 0) + 1
    }
  })

  return counts
}

/**
 * Get overall SR stats
 * @returns {object} { new, learning, review, mastered }
 */
export function getSRStats() {
  const progress = getWordProgress()
  const now = Date.now()
  let newWords = 0
  let learning = 0
  let mastered = 0
  let due = 0

  Object.values(progress).forEach(entry => {
    if (entry.status === 0) newWords++
    else if (entry.status >= 5) mastered++
    else learning++
    if (entry.nextReviewDate && entry.nextReviewDate <= now) due++
  })

  return { newWords, learning, mastered, due, total: Object.keys(progress).length }
}

export { INTERVALS }