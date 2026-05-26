import { useState, useMemo, useCallback, useEffect } from 'react'
import { vocabulary } from '../data/vocabulary.js'
import { getCustomWords } from '../utils/storage.js'
import { reviewWord } from '../utils/spacedRepetition.js'
import { addXP, updateStreak, checkAchievements, markPerfectRound } from '../utils/gamification.js'
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

function Quiz() {
  const toast = useToast()
  const [phase, setPhase] = useState('topic') // 'topic' | 'playing' | 'result'
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
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

  const startQuiz = useCallback((topic) => {
    const pool = allWords.filter(w => (w.topic || 'Allgemein') === topic)
    if (pool.length < 4) return

    const questionCount = Math.min(10, pool.length)
    const selected = shuffleArray(pool).slice(0, questionCount)

    const generated = selected.map(word => {
      const others = pool.filter(w => w.id !== word.id)
      const wrongAnswers = shuffleArray(others).slice(0, 3).map(w => w.de)
      const options = shuffleArray([word.de, ...wrongAnswers])
      return {
        wordId: word.id,
        en: word.en,
        type: word.type,
        correctAnswer: word.de,
        options
      }
    })

    setQuestions(generated)
    setCurrentQ(0)
    setScore(0)
    setAnswered(false)
    setSelectedOption(null)
    setShowKonfetti(false)
    setPhase('playing')
  }, [allWords])

  const handleAnswer = (option) => {
    if (answered) return
    const isCorrect = option === questions[currentQ].correctAnswer
    setSelectedOption(option)
    setAnswered(true)

    // Berechne neuen Score SYNCHRON vor setScore
    const newScore = isCorrect ? score + 1 : score
    const isPerfect = newScore === questions.length
    if (isCorrect) {
      setScore(newScore)
    }

    reviewWord(questions[currentQ].wordId, isCorrect)
    if (isCorrect) {
      addXP(10)
      toast(`✓ Richtig! +10 XP`, 'success')
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
      setSelectedOption(null)
    } else {
      // Perfect-Round-Prüfung: checkAchievements in handleAnswer hat den Flag
      // bereits erkannt – hier nur noch Konfetti anzeigen
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
    setSelectedOption(null)
    setShowKonfetti(false)
  }

  if (phase === 'topic') {
    return (
      <div className="quiz-container">
        <div className="quiz-topic-select">
          <h2>Wähle ein Thema für das Quiz</h2>
          <div className="topic-grid">
            {topics.map(topic => {
              const count = allWords.filter(w => (w.topic || 'Allgemein') === topic).length
              const disabled = count < 4
              return (
                <button
                  key={topic}
                  className={`topic-btn ${selectedTopic === topic ? 'selected' : ''}`}
                  disabled={disabled}
                  onClick={() => setSelectedTopic(topic)}
                  title={disabled ? 'Mindestens 4 Vokabeln benötigt' : ''}
                >
                  {topic} ({count})
                </button>
              )
            })}
          </div>
          <button
            className="btn btn-primary"
            disabled={!selectedTopic}
            onClick={() => startQuiz(selectedTopic)}
          >
            Quiz starten
          </button>
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

          <div className="quiz-options">
            {q.options.map((option, idx) => {
              let cls = ''
              if (answered) {
                if (option === q.correctAnswer) cls = 'correct'
                else if (option === selectedOption) cls = 'wrong'
              }
              return (
                <button
                  key={idx}
                  className={`quiz-option ${cls}`}
                  onClick={() => handleAnswer(option)}
                  disabled={answered}
                >
                  {option}
                </button>
              )
            })}
          </div>

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
          <h2>Quiz beendet</h2>
          <div className="quiz-score-circle">
            <span className="quiz-score-number">{percent}%</span>
            <span className="quiz-score-label">{score}/{questions.length}</span>
          </div>
          <div className="quiz-message">{message}</div>
          <div className="quiz-message-sub">
            Du hast {score} von {questions.length} Fragen richtig beantwortet.
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

export default Quiz