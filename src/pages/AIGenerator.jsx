import { useState } from 'react'
import { generateVocabWords } from '../utils/deepseekAPI.js'
import { getApiKey, getCustomWords, setCustomWords } from '../utils/storage.js'
import { useToast } from '../components/Toast.jsx'
import { speak } from '../utils/tts.js'

const COUNT_OPTIONS = [5, 10, 15, 20]

function AIGenerator() {
  const toast = useToast()
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  const apiKey = getApiKey()

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setGenerated(null)
    setSaved(false)

    try {
      const words = await generateVocabWords(topic.trim(), count)
      if (words.length === 0) {
        setError('Keine Vokabeln generiert. Bitte versuche ein anderes Thema.')
      } else {
        setGenerated(words)
        toast(`${words.length} Vokabeln generiert!`, 'success')
      }
    } catch (err) {
      if (err.message === 'KEIN_API_KEY') {
        setError('Bitte DeepSeek API-Key in den Einstellungen hinterlegen.')
      } else {
        setError('KI-Fehler – bitte API-Key in den Einstellungen prüfen.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = () => {
    if (!generated) return
    const existing = getCustomWords()
    // Generate proper unique IDs for custom words
    let maxId = 100000
    existing.forEach(w => { if (w.id > maxId) maxId = w.id })
    const newWords = generated.map((w, i) => ({
      ...w,
      id: maxId + i + 1,
      topic: topic.trim()
    }))
    setCustomWords([...existing, ...newWords])
    setSaved(true)
    toast(`${newWords.length} Vokabeln gespeichert!`, 'success')
  }

  return (
    <div className="ai-generator">
      <h2>KI-Generator</h2>

      {!apiKey && (
        <div className="ai-error" style={{ color: 'var(--color-warning)', marginBottom: '1rem' }}>
          ⚠ Kein API-Key – Bitte DeepSeek API-Key in den Einstellungen hinterlegen.
        </div>
      )}

      <div className="ai-generator-input">
        <label htmlFor="ai-topic">Thema oder Kontext eingeben...</label>
        <textarea
          id="ai-topic"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="z.B. 'Klassenarbeit über den Klimawandel' oder 'Urlaub in London'"
          rows={2}
        />

        <label>Anzahl Vokabeln</label>
        <div className="ai-generator-count">
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              className={`count-chip ${count === n ? 'selected' : ''}`}
              onClick={() => setCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <button
          className="btn btn-accent"
          onClick={handleGenerate}
          disabled={!topic.trim() || loading || !apiKey}
        >
          {loading ? 'Generiere...' : '⚡ Vokabeln generieren'}
        </button>
      </div>

      {error && (
        <div className="ai-error">{error}</div>
      )}

      {loading && (
        <div className="ai-loading">🤖 KI generiert Vokabeln...</div>
      )}

      {generated && !loading && (
        <>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {generated.length} Vokabeln generiert
          </p>
          <div className="ai-result-list">
            {generated.map((word, i) => (
              <div key={i} className="ai-word-card">
                <div className="ai-word-info">
                  <div className="ai-word-en">
                    {word.en}{' '}
                    <button
                      className="speak-button"
                      onClick={() => speak(word.en)}
                      aria-label="Wort aussprechen"
                      title="Wort aussprechen"
                    >
                      🔊
                    </button>
                  </div>
                  <div className="ai-word-de">{word.de}</div>
                  <div className="ai-word-type">{word.type}</div>
                  {word.example && <div className="ai-word-example">"{word.example}"</div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            {saved ? (
              <p style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Alle gespeichert!</p>
            ) : (
              <button className="btn btn-success" onClick={handleSaveAll}>
                Alle speichern
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AIGenerator