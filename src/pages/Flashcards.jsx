import { useState, useMemo, useCallback, useEffect } from 'react'
import { vocabulary } from '../data/vocabulary.js'
import { getCustomWords, getWordProgress } from '../utils/storage.js'
import { reviewWord, getDueWordIds, getStatusLabel } from '../utils/spacedRepetition.js'
import { addXP, updateStreak, checkAchievements } from '../utils/gamification.js'
import { useToast } from '../components/Toast.jsx'
import { speak } from '../utils/tts.js'

function Flashcards() {
  const toast = useToast()
  const [mode, setMode] = useState('due') // 'all' | 'due' | 'unknown' | 'topic'
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showTopicSelect, setShowTopicSelect] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'correct'|'wrong', word: string }

  const [customWords, setCustomWords] = useState(() => getCustomWords())

  useEffect(() => {
    const handler = (e) => setCustomWords(e.detail)
    window.addEventListener('vocabboost_customWordsChanged', handler)
    return () => window.removeEventListener('vocabboost_customWordsChanged', handler)
  }, [])

  const allWords = useMemo(() => {
    return [...vocabulary, ...customWords]
  }, [customWords])

  const topics = useMemo(() => {
    const s = new Set()
    allWords.forEach(w => s.add(w.topic || 'Allgemein'))
    return [...s].sort()
  }, [allWords])

  const filteredWords = useMemo(() => {
    let result = allWords
    if (mode === 'topic' && selectedTopic) {
      result = allWords.filter(w => (w.topic || 'Allgemein') === selectedTopic)
    }

    if (mode === 'due') {
      const dueIds = getDueWordIds(result.map(w => w.id))
      const dueSet = new Set(dueIds)
      result = result.filter(w => dueSet.has(w.id))
      // Sort by due priority
      result.sort((a, b) => {
        const aDue = dueIds.indexOf(a.id)
        const bDue = dueIds.indexOf(b.id)
        return aDue - bDue
      })
    }

    if (mode === 'unknown') {
      const progress = getWordProgress()
      result = result.filter(w => {
        const entry = progress[w.id]
        return !entry || entry.status < 2
      })
    }

    return result
  }, [mode, selectedTopic, allWords])

  const words = filteredWords

  useEffect(() => {
    setCurrentIndex(0)
    setFlipped(false)
    setFeedback(null)
  }, [filteredWords])

  const currentWord = words[currentIndex] || null
  const total = words.length
  const progress = getWordProgress()

  const goNext = useCallback(() => {
    setFlipped(false)
    setFeedback(null)
    setCurrentIndex(i => (i + 1 < total ? i + 1 : 0))
  }, [total])

  const goPrev = useCallback(() => {
    setFlipped(false)
    setFeedback(null)
    setCurrentIndex(i => (i - 1 + total) % total)
  }, [total])

  const handleFlip = () => {
    if (feedback) return // Don't flip during feedback
    setFlipped(f => !f)
  }

  const handleKnown = () => {
    if (!currentWord || feedback) return
    reviewWord(currentWord.id, true)
    const xpResult = addXP(10)
    updateStreak()
    const newAch = checkAchievements()

    if (xpResult.leveledUp) {
      toast(`🎉 Level ${xpResult.newLevel} erreicht!`, 'achievement')
    }
    newAch.forEach(ach => {
      toast(`🏆 Neuer Erfolg: ${ach.name}`, 'achievement')
    })

    setFeedback({ type: 'correct', xp: 10 })
    setTimeout(goNext, 800)
  }

  const handleUnknown = () => {
    if (!currentWord || feedback) return
    reviewWord(currentWord.id, false)
    updateStreak()
    checkAchievements()

    setFeedback({ type: 'wrong' })
    setTimeout(goNext, 1200)
  }

  const shuffleWords = () => {
    if (total > 1) {
      let newIdx
      do { newIdx = Math.floor(Math.random() * total) } while (newIdx === currentIndex)
      setFlipped(false)
      setFeedback(null)
      setCurrentIndex(newIdx)
    }
  }

  if (total === 0) {
    return (
      <div className="flashcard-container">
        <h2>Karteikarten</h2>
        <div className="progress-empty">
          <div className="progress-empty-icon">🎉</div>
          <p>Keine fälligen Vokabeln in dieser Auswahl!</p>
          <button className="btn btn-outline" onClick={() => { setMode('all'); setShowTopicSelect(false) }}>
            Alle Vokabeln anzeigen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flashcard-container">
      <h2>Karteikarten</h2>

      {/* Mode selector */}
      <div className="btn-group" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
        <button
          className={`btn ${mode === 'due' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setMode('due'); setShowTopicSelect(false) }}
        >
          Fällig
        </button>
        <button
          className={`btn ${mode === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setMode('all'); setShowTopicSelect(false) }}
        >
          Alle
        </button>
        <button
          className={`btn ${mode === 'unknown' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setMode('unknown'); setShowTopicSelect(false) }}
        >
          Neue
        </button>
        <button
          className={`btn ${mode === 'topic' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setShowTopicSelect(!showTopicSelect)}
        >
          {selectedTopic ? `Thema: ${selectedTopic}` : 'Nach Thema'}
        </button>
      </div>

      {/* Topic selection */}
      {showTopicSelect && mode === 'topic' && (
        <div className="topic-grid" style={{ marginBottom: '1rem' }}>
          {topics.map(topic => (
            <button
              key={topic}
              className={`topic-btn ${selectedTopic === topic ? 'selected' : ''}`}
              onClick={() => { setSelectedTopic(topic); setShowTopicSelect(false) }}
            >
              {topic}
            </button>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="flashcard-progress-bar">
        <div
          className="flashcard-progress-fill"
          style={{ width: `${total > 0 ? ((currentIndex + 1) / total) * 100 : 0}%` }}
        />
      </div>
      <div className="flashcard-counter">
        {currentIndex + 1} / {total}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flashcard-feedback ${feedback.type}`}>
          {feedback.type === 'correct' ? `✓ Richtig! +${feedback.xp} XP` : '✗ Falsch'}
        </div>
      )}

      {/* Card */}
      {currentWord && (
        <>
          <div className="flashcard" onClick={handleFlip}>
            <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
              <div className="flashcard-front">
                <span className="card-word">
                  {currentWord.en}{' '}
                  <button
                    className="speak-button"
                    onClick={(e) => { e.stopPropagation(); speak(currentWord.en) }}
                    aria-label="Wort aussprechen"
                    title="Wort aussprechen"
                  >
                    🔊
                  </button>
                </span>
                <span className="card-type">
                  {currentWord.type === 'noun' ? 'Nomen' : currentWord.type === 'verb' ? 'Verb' : currentWord.type === 'adj' ? 'Adjektiv' : currentWord.type}
                </span>
                <span className="card-status">
                  {getStatusLabel(progress[currentWord.id]?.status || 0)}
                </span>
                <span className="card-hint">Klick zum Umdrehen</span>
              </div>
              <div className="flashcard-back">
                <span className="card-translation">{currentWord.de}</span>
                {currentWord.example && (
                  <span className="card-example">"{currentWord.example}"</span>
                )}
                {currentWord.tip && (
                  <span className="card-example" style={{ color: 'var(--color-warning)' }}>💡 {currentWord.tip}</span>
                )}
                <span className="card-type-badge">{currentWord.type}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flashcard-controls">
            <button className="btn btn-outline" onClick={goPrev} title="Zurück">◀</button>
            <button className="btn btn-outline" onClick={shuffleWords} title="Zufällig">🔀</button>
            <button className="btn btn-danger" onClick={handleUnknown} disabled={!!feedback}>
              ✗ Nochmal
            </button>
            <button className="btn btn-success" onClick={handleKnown} disabled={!!feedback}>
              ✓ Gewusst
            </button>
            <button className="btn btn-outline" onClick={goNext} title="Weiter">▶</button>
          </div>
        </>
      )}
    </div>
  )
}

export default Flashcards