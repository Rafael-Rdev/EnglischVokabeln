import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { getStats } from '../utils/storage.js'
import { getLevel, getXPToNextLevel, getDailyGoalProgress, getUnlockedAchievements, ACHIEVEMENTS } from '../utils/gamification.js'
import { vocabulary } from '../data/vocabulary.js'

function Home() {
  const [stats, setStats] = useState(null)

  const refresh = useCallback(() => {
    setStats(getStats())
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refresh])

  if (!stats) return null

  const level = getLevel(stats.xp || 0)
  const xpInfo = getXPToNextLevel(stats.xp || 0)
  const dailyGoal = getDailyGoalProgress()
  const unlocked = getUnlockedAchievements()

  return (
    <div className="home">
      <h1>VocabBoost</h1>
      <p className="home-subtitle">Dein smarter Englisch-Vokabeltrainer für die 9. Klasse</p>

      {/* Gamification Row */}
      <div className="gamification-row">
        <div className="gamification-badge streak-badge">
          <span>🔥</span>
          <span>{stats.streak || 0} Tage in Folge</span>
        </div>
        <div className="gamification-badge level-badge">
          <span>📊</span>
          <span>Level {level.level} – {level.title}</span>
        </div>
        <div className="gamification-badge xp-badge">
          <span>⚡</span>
          <span>{stats.xp || 0} XP</span>
        </div>
      </div>

      {/* Level Progress */}
      {xpInfo.remaining > 0 && (
        <div className="level-progress">
          <div className="level-progress-label">
            <span>XP bis Level {level.level + 1} ({xpInfo.nextTitle})</span>
            <span>{xpInfo.progress}%</span>
          </div>
          <div className="level-progress-bar">
            <div className="level-progress-fill" style={{ width: `${xpInfo.progress}%` }} />
          </div>
        </div>
      )}

      {/* Daily Goal */}
      <div className="daily-goal">
        {dailyGoal.reached ? (
          <div className="daily-goal-reached">🎉 Tagesziel erreicht! ({dailyGoal.current}/{dailyGoal.goal} Vokabeln)</div>
        ) : (
          <>
            <div className="daily-goal-text">
              <span>Tagesziel: {dailyGoal.current}/{dailyGoal.goal} Vokabeln</span>
              <span>Noch {dailyGoal.goal - dailyGoal.current} Vokabeln</span>
            </div>
            <div className="daily-goal-bar">
              <div
                className="daily-goal-fill"
                style={{ width: `${Math.min(100, (dailyGoal.current / dailyGoal.goal) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Unlocked Achievements */}
      {unlocked.length > 0 && (
        <div className="achievements-row">
          {unlocked.map(ach => (
            <span key={ach.id} className="achievement-icon unlocked" title={ach.name}>
              {ach.icon}
            </span>
          ))}
          {ACHIEVEMENTS.filter(a => !unlocked.find(u => u.id === a.id)).map(ach => (
            <span key={ach.id} className="achievement-icon" title={`${ach.name} (gesperrt)`}>
              {ach.icon}
            </span>
          ))}
        </div>
      )}

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{vocabulary.length}</span>
          <span className="stat-label">Vokabeln</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.xp || 0}</span>
          <span className="stat-label">Gesamt-XP</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{unlocked.length}/{ACHIEVEMENTS.length}</span>
          <span className="stat-label">Erfolge</span>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="home-cards">
        <Link to="/flashcards" className="home-card">
          <div className="home-card-icon">🃏</div>
          <h3>Karteikarten</h3>
          <p>Lerne Vokabeln mit dem bewährten Karteikartensystem – mit 3D-Flip und Spaced Repetition.</p>
        </Link>
        <Link to="/quiz" className="home-card">
          <div className="home-card-icon">🎯</div>
          <h3>Quiz</h3>
          <p>Teste dein Wissen mit Multiple-Choice-Fragen und sammle XP für jede richtige Antwort.</p>
        </Link>
        <Link to="/fillblank" className="home-card">
          <div className="home-card-icon">✍️</div>
          <h3>Lückentext</h3>
          <p>Fülle die Lücken in englischen Sätzen – mit KI-generierten Kontextsätzen.</p>
        </Link>
        <Link to="/vocabulary" className="home-card">
          <div className="home-card-icon">📚</div>
          <h3>Vokabeln</h3>
          <p>Alle Vokabeln durchsuchen und neue Wörter mit KI-Unterstützung hinzufügen.</p>
        </Link>
        <Link to="/ai-generator" className="home-card">
          <div className="home-card-icon">🤖</div>
          <h3>KI-Generator</h3>
          <p>Lass dir von der KI neue Vokabeln zu jedem Thema generieren – perfekt für Klassenarbeiten.</p>
        </Link>
        <Link to="/progress" className="home-card">
          <div className="home-card-icon">📊</div>
          <h3>Fortschritt</h3>
          <p>Behalte den Überblick: Statistik, Erfolge und Lernfortschritt nach Themen.</p>
        </Link>
      </div>
    </div>
  )
}

export default Home