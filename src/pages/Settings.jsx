import { useState, useEffect } from 'react'
import { getSettings, setSettings, getApiKey, clearAll } from '../utils/storage.js'
import { setDailyGoal, getDailyGoalProgress } from '../utils/gamification.js'
import { useToast } from '../components/Toast.jsx'

function Settings() {
  const toast = useToast()
  const [apiKey, setApiKey] = useState('')
  const [dailyGoal, setDailyGoalState] = useState(20)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const settings = getSettings()
    setApiKey(settings.apiKey || '')
    setDailyGoalState(settings.dailyGoal || 20)
  }, [])

  const handleSaveApiKey = () => {
    const settings = getSettings()
    settings.apiKey = apiKey.trim()
    setSettings(settings)
    setSaved(true)
    toast('✓ API-Key gespeichert', 'success')
    setTimeout(() => setSaved(false), 3000)
  }

  const handleSaveDailyGoal = (goal) => {
    setDailyGoalState(goal)
    setDailyGoal(goal)
    const settings = getSettings()
    settings.dailyGoal = goal
    setSettings(settings)
    toast('Tagesziel gespeichert', 'success')
  }

  const handleReset = () => {
    if (window.confirm('Wirklich alle Fortschritte zurücksetzen? Das kann nicht rückgängig gemacht werden.')) {
      clearAll()
      toast('Fortschritt zurückgesetzt', 'info')
    }
  }

  return (
    <div className="settings-page">
      <h2>Einstellungen</h2>

      <div className="settings-group">
        <h3>DeepSeek API-Key</h3>
        <label htmlFor="api-key">API-Key</label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <p className="settings-hint">Wird nur lokal gespeichert. Nicht weitergegeben.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handleSaveApiKey}>
            API-Key speichern
          </button>
          <span className={`settings-status ${getApiKey() ? 'ok' : 'warn'}`}>
            {getApiKey() ? '✓ API-Key gespeichert' : '⚠ Kein API-Key – KI-Features deaktiviert'}
          </span>
        </div>
      </div>

      <div className="settings-group">
        <h3>Tagesziel</h3>
        <label htmlFor="daily-goal">Vokabeln pro Tag</label>
        <select
          id="daily-goal"
          value={dailyGoal}
          onChange={e => handleSaveDailyGoal(Number(e.target.value))}
        >
          <option value={10}>10 Vokabeln</option>
          <option value={20}>20 Vokabeln</option>
          <option value={30}>30 Vokabeln</option>
        </select>
        <p className="settings-hint">
          Aktuell heute: {getDailyGoalProgress().current}/{dailyGoal} Vokabeln
        </p>
      </div>

      <div className="settings-group">
        <h3>Daten</h3>
        <button className="btn btn-danger" onClick={handleReset}>
          Fortschritt zurücksetzen
        </button>
        <p className="settings-hint" style={{ marginTop: '0.5rem' }}>
          Löscht alle Lernfortschritte, XP, Erfolge und benutzerdefinierte Vokabeln.
        </p>
      </div>
    </div>
  )
}

export default Settings