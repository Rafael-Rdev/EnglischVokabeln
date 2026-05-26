import { useState, useMemo, useCallback, useEffect } from 'react'
import { vocabulary } from '../data/vocabulary.js'
import { getCustomWords, getApiKey } from '../utils/storage.js'
import { reviewWord } from '../utils/spacedRepetition.js'
import { addXP, updateStreak, checkAchievements, markPerfectRound } from '../utils/gamification.js'
import { generateFillSentence, fuzzyMatch } from '../utils/deepseekAPI.js'
import { useToast } from '../components/Toast.jsx'
import { speak } from '../utils/tts.js'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function FillBlank() {
  const toast = useToast()
  const [phase, setPhase] = useState('topic') // 'topic' | 'playing' | 'result'
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [showKonfetti, setShowKonfetti] = useState(false)

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

  const startQuiz = useCallback(async (topic) => {
    const pool = allWords.filter(w => (w.topic || 'Allgemein') === topic)
    if (pool.length < 1) return

    setGenerating(true)
    const questionCount = Math.min(10, pool.length)
    const selected = shuffleArray(pool).slice(0, questionCount)

    const apiKey = getApiKey()
    const generated = []
    for (const word of selected) {
      if (apiKey && /^(noun|verb|adj)$/.test(word.type)) {
        // Nur mit API-Key und für Nomen/Verben/Adjektive generieren
        try {
          const sentence = await generateFillSentence(word.en)
          if (sentence) {
            generated.push({
              wordId: word.id,
              en: word.en,
              de: word.de,
              type: word.type,
              sentence: sentence.sentence,
              blank: sentence.blank,
              correctAnswer: sentence.answer
            })
            continue
          }
        } catch {
          // Fallback ohne KI
        }
      }
      // Fallback: Einfache Lückenübung (nur englisches Wort, Übersetzung kommt im Feedback)
      generated.push({
        wordId: word.id,
        en: word.en,
        de: word.de,
        type: word.type,
        sentence: null,
        blank: null,
        correctAnswer: word.de
      })
    }

    setQuestions(generated)
    setCurrentQ(0)
    setScore(0)
    setAnswered(false)
    setUserAnswer('')
    setFeedback(null)
    setShowKonfetti(false)
    setGenerating(false)
    setPhase('playing')
  }, [allWords])

  const handleSubmit = () => {
    if (answered) return

    const q = questions[currentQ]
    const correctAnswer = q.correctAnswer

    // fuzzyMatch prüft den Benutzerinput gegen die korrekte Antwort
    const isCorrect = fuzzyMatch(userAnswer.trim(), correctAnswer)

    setAnswered(true)
    setFeedback({
      correct: isCorrect,
      userAnswer: userAnswer.trim(),
      correctAnswer
    })

    // Score synchron berechnen
    const newScore = isCorrect ? score + 1 : score
    const isPerfect = newScore === questions.length
    if (isCorrect) {
      setScore(newScore)
    }

    reviewWord(q.wordId, isCorrect)
    if (isCorrect) {
      addXP(10)
      toast(`✓ Richtig! +10 XP`, 'success')
    } else {
      toast(`Die richtige Antwort: ${correctAnswer}`, 'info')
    }
    updateStreak()
    const newAch = checkAchievements()
    newAch.forEach(ach => {
      toast(`🏆 Neuer Erfolg: ${ach.name}`, 'achievement')
    })

    if (isPerfect) {
      markPerfectRound()
    }
  }

  const handleNext = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(q => q + 1)
      setAnswered(false)
      setUserAnswer('')
      setFeedback(null)
    } else {
      // Perfect-Round: Konfetti anzeigen bei perfektem Score
      if (score === questions.length) {
        setShowKonfetti(true)
      }
      setPhase('result')
    }
  }

  const handleRestart = () => {
    setPhase('topic')
    setSelectedTopic(null)
    setQuestions([])
    setCurrentQ(0)
    setScore(0)
    setAnswered(false)
    setUserAnswer('')
    setFeedback(null)
    setShowKonfetti(false)
  }

  if (phase === 'topic') {
    return (
      <div className="quiz-container">
        <div className="quiz-topic-select">
          <h2>Wähle ein Thema für die Lückenübung</h2>
          <p className="quiz-topic-desc">Fülle die Lücken mit der richtigen Übersetzung.</p>
          <div className="topic-grid">
            {topics.map(topic => {
              const count = allWords.filter(w => (w.topic || 'Allgemein') === topic).length
              const disabled = count < 1
              return (
                <button
                  key={topic}
                  className={`topic-btn ${selectedTopic === topic ? 'selected' : ''}`}
                  disabled={disabled}
                  onClick={() => setSelectedTopic(topic)}
                  title={disabled ? 'Keine Vokabeln verfügbar' : ''}
                >
                  {topic} ({count})
                </button>
              )
            })}
          </div>
          <button
            className="btn btn-primary"
            disabled={!selectedTopic || generating}
            onClick={() => startQuiz(selectedTopic)}
          >
            {generating ? 'Sätze werden generiert...' : 'Lückenübung starten'}
          </button>
          {!getApiKey() && (
            <p className="api-key-hint">💡 Mit einem KI-API-Schlüssel (Einstellungen) erhältst du authentische Lückensätze.</p>
          )}
        </div>
      </div>
    )
  }

  if (generating) {
    return (
      <div className="quiz-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p>KI-generierte Lückensätze werden erstellt...</p>
        </div>
      </div>
    )
  }

  if (phase === 'playing' && questions.length > 0) {
    const q = questions[currentQ]
    const progress = ((currentQ + (answered ? 1 : 0)) / questions.length) * 100

    return (
      <div className="quiz-container">
        <div className="quiz-progress">
          <span>Frage {currentQ + 1} / {questions.length}</span>
          <span>{score} richtig</span>
        </div>
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="quiz-question">
          <div className="quiz-word">
            {q.en}{' '}
            <button
              className="speak-button"
              onClick={() => speak(q.en)}
              aria-label="Wort aussprechen"
              title="Wort aussprechen"
            >
              🔊
            </button>
          </div>
          <div className="quiz-word-type">
            {q.type === 'noun' ? 'Nomen' : q.type === 'verb' ? 'Verb' : q.type === 'adj' ? 'Adjektiv' : q.type}
          </div>

          {q.sentence && (
            <div className="fill-blank-sentence">
              <p>{q.sentence}</p>
            </div>
          )}

          <div className="fill-blank-input-area">
            <input
              type="text"
              className="fill-blank-input"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !answered) handleSubmit() }}
              placeholder="Deine Übersetzung..."
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={answered || !userAnswer.trim()}
            >
              Prüfen
            </button>
          </div>

          {feedback && (
            <div className={`fill-blank-feedback ${feedback.correct ? 'correct' : 'wrong'}`}>
              {feedback.correct ? (
                <span>✓ Richtig! <strong>{q.en}</strong> = {q.de}</span>
              ) : (
                <span>
                  ✗ Falsch! Du: "{feedback.userAnswer}" → Richtig: <strong>{q.en} = {q.de}</strong>
                </span>
              )}{' '}
              <button
                className="speak-button"
                onClick={() => speak(q.en)}
                aria-label="Wort aussprechen"
                title="Wort aussprechen"
              >
                🔊
              </button>
            </div>
          )}

          {answered && (
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleNext}>
                {currentQ + 1 < questions.length ? 'Nächste Frage ▶' : 'Ergebnis anzeigen'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const percent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
    let message = 'Weiter üben!'
    if (percent === 100) message = 'Perfekt! 🏆'
    else if (percent >= 80) message = 'Sehr gut! 👏'
    else if (percent >= 60) message = 'Gut gemacht! 👍'
    else if (percent >= 40) message = 'Da geht noch was!'

    return (
      <div className="quiz-container">
        {showKonfetti && (
          <div className="konfetti">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="konfetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: ['#7b61ff', '#00f5a0', '#f59e0b', '#ef4444', '#3b82f6'][i % 5]
                }}
              />
            ))}
          </div>
        )}
        <div className="quiz-result">
          <h2>Lückenübung beendet</h2>
          <div className="quiz-score-circle">
            <span className="quiz-score-number">{percent}%</span>
            <span className="quiz-score-label">{score}/{questions.length}</span>
          </div>
          <div className="quiz-message">{message}</div>
          <div className="quiz-message-sub">
            Du hast {score} von {questions.length} Lücken richtig gefüllt.
          </div>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={() => startQuiz(selectedTopic)}>
              Nochmal spielen
            </button>
            <button className="btn btn-outline" onClick={handleRestart}>
              Anderes Thema
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default FillBlank