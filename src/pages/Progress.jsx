import { useState, useEffect, useCallback } from 'react'
import { getTopicStats, getOverallStats, resetProgress, getStats } from '../utils/storage.js'
import { getLevel, getAllAchievements } from '../utils/gamification.js'
import { getSRStats } from '../utils/spacedRepetition.js'

function Progress() {
  const [topicStats, setTopicStats] = useState(null)
  const [overall, setOverall] = useState(null)
  const [srStats, setSRStats] = useState(null)
  const [gamificationStats, setGamificationStats] = useState(null)
  const [achievements, setAchievements] = useState([])

  const refresh = useCallback(() => {
    setTopicStats(getTopicStats())
    setOverall(getOverallStats())
    setSRStats(getSRStats())
    setGamificationStats(getStats())
    setAchievements(getAllAchievements())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleReset = () => {
    if (window.confirm('Möchtest du wirklich alle Fortschrittsdaten löschen? Das kann nicht rückgängig gemacht werden.')) {
      resetProgress()
      refresh()
    }
  }

  if (!topicStats || !overall || !gamificationStats) return null

  const topicEntries = Object.entries(topicStats)
  const hasData = overall.known > 0 || overall.quizTotal > 0
  const level = getLevel(gamificationStats.xp || 0)

  return (
    <div className="progress-page">
      <h2>Dein Fortschritt</h2>

      {!hasData && (
        <div className="progress-empty">
          <div className="progress-empty-icon">📈</div>
          <p>Noch keine Daten vorhanden.</p>
          <p style={{ fontSize: '0.9rem' }}>Lerne ein paar Karteikarten oder spiele ein Quiz, um deinen Fortschritt zu sehen!</p>
        </div>
      )}

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value">{overall.total}</span>
          <span className="stat-label">Vokabeln gesamt</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{srStats?.mastered || 0}</span>
          <span className="stat-label">Gemeistert</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">
            {overall.quizTotal > 0 ? Math.round((overall.quizCorrect / overall.quizTotal) * 100) : 0}%
          </span>
          <span className="stat-label">Trefferquote</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">🔥 {gamificationStats.streak || 0}</span>
          <span className="stat-label">Streak-Tage</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">⚡ {gamificationStats.xp || 0}</span>
          <span className="stat-label">Gesamt-XP</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">📊 {level.level}</span>
          <span className="stat-label">{level.title}</span>
        </div>
      </div>

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', marginTop: '1.5rem' }}>
        Fortschritt nach Thema
      </h3>

      {topicEntries.length > 0 ? topicEntries.map(([topic, data]) => {
        const knownPercent = data.total > 0 ? Math.round((data.known / data.total) * 100) : 0
        const quizPercent = data.quizTotal > 0 ? Math.round((data.quizCorrect / data.quizTotal) * 100) : null

        return (
          <div key={topic} className="topic-progress">
            <h3>{topic}</h3>
            <div className="topic-progress-bar">
              <div className="topic-progress-fill" style={{ width: `${knownPercent}%` }} />
            </div>
            <div className="topic-progress-text">
              {data.known} / {data.total} Vokabeln gelernt ({knownPercent}%)
              {quizPercent !== null && (
                <span> – Quiz: {quizPercent}% richtig</span>
              )}
            </div>
          </div>
        )
      }) : (
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Keine Themen vorhanden.</p>
      )}

      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', marginTop: '2rem' }}>
        Alle Erfolge
      </h3>

      <div className="progress-achievements">
        {achievements.map(ach => (
          <div key={ach.id} className={`achievement-card ${!ach.unlocked ? 'locked' : ''}`}>
            <span className="ach-icon">{ach.icon}</span>
            <div className="ach-info">
              <h4>{ach.name}</h4>
              <p>{ach.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="progress-reset">
        <button className="btn btn-danger" onClick={handleReset}>
          Fortschritt zurücksetzen
        </button>
      </div>
    </div>
  )
}

export default Progress