import { useState, useMemo, useEffect } from 'react'
import { vocabulary } from '../data/vocabulary.js'
import { getCustomWords, setCustomWords, getApiKey } from '../utils/storage.js'
import { generateWordDetails } from '../utils/deepseekAPI.js'
import { useToast } from '../components/Toast.jsx'
import { speak } from '../utils/tts.js'

function Vocabulary() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWord, setNewWord] = useState({ en: '', de: '', topic: 'Schule' })
  const [adding, setAdding] = useState(false)
  const [customWords, setCustomWordsState] = useState(() => getCustomWords())

  useEffect(() => {
    const handler = (e) => setCustomWordsState(e.detail)
    window.addEventListener('vocabboost_customWordsChanged', handler)
    return () => window.removeEventListener('vocabboost_customWordsChanged', handler)
  }, [])
  const allWords = useMemo(() => [...vocabulary, ...customWords], [customWords])

  const topics = useMemo(() => {
    const s = new Set()
    allWords.forEach(w => s.add(w.topic || 'Allgemein'))
    return [...s].sort()
  }, [allWords])

  const filtered = useMemo(() => {
    if (!search.trim()) return allWords
    const q = search.toLowerCase()
    return allWords.filter(w =>
      w.en.toLowerCase().includes(q) ||
      w.de.toLowerCase().includes(q) ||
      (w.topic || '').toLowerCase().includes(q)
    )
  }, [allWords, search])

  const handleAddWithAI = async () => {
    if (!newWord.en.trim()) return
    setAdding(true)

    try {
      const details = await generateWordDetails(newWord.en.trim())
      const word = {
        id: Date.now(),
        en: newWord.en.trim(),
        de: details.de || newWord.de || '',
        type: 'noun',
        topic: newWord.topic,
        example: details.example || '',
        tip: details.tip || ''
      }
      const updated = [...customWords, word]
      setCustomWords(updated)
      setNewWord({ en: '', de: '', topic: 'Schule' })
      setShowAddForm(false)
      toast('Vokabel gespeichert!', 'success')
    } catch (err) {
      if (err.message === 'KEIN_API_KEY') {
        toast('Bitte API-Key in Einstellungen hinterlegen', 'info')
        handleAddManual()
      } else {
        toast('KI-Fehler – Vokabel ohne KI gespeichert', 'info')
        handleAddManual()
      }
    } finally {
      setAdding(false)
    }
  }

  const handleAddManual = () => {
    if (!newWord.en.trim()) return
    const word = {
      id: Date.now(),
      en: newWord.en.trim(),
      de: newWord.de.trim() || newWord.en.trim(),
      type: 'noun',
      topic: newWord.topic,
      example: '',
      tip: ''
    }
    const updated = [...customWords, word]
    setCustomWords(updated)
    setNewWord({ en: '', de: '', topic: 'Schule' })
    setShowAddForm(false)
    toast('Vokabel gespeichert!', 'success')
  }

  return (
    <div className="vocab-page">
      <h2>Vokabeln</h2>

      <input
        type="text"
        className="vocab-search"
        placeholder="Suchen..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Abbrechen' : '+ Vokabel hinzufügen'}
        </button>
      </div>

      {showAddForm && (
        <div className="vocab-add-form">
          <h3>Neue Vokabel</h3>
          <input
            type="text"
            placeholder="Englisches Wort *"
            value={newWord.en}
            onChange={e => setNewWord({ ...newWord, en: e.target.value })}
          />
          <input
            type="text"
            placeholder="Deutsche Übersetzung (optional)"
            value={newWord.de}
            onChange={e => setNewWord({ ...newWord, de: e.target.value })}
          />
          <select
            value={newWord.topic}
            onChange={e => setNewWord({ ...newWord, topic: e.target.value })}
          >
            {topics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="btn-group" style={{ marginTop: 0 }}>
            {getApiKey() ? (
              <button
                className="btn btn-accent"
                onClick={handleAddWithAI}
                disabled={!newWord.en.trim() || adding}
              >
                {adding ? 'Wird ergänzt...' : '✨ Mit KI ergänzen & speichern'}
              </button>
            ) : null}
            <button
              className="btn btn-outline"
              onClick={handleAddManual}
              disabled={!newWord.en.trim()}
            >
              Ohne KI speichern
            </button>
          </div>
        </div>
      )}

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
        {filtered.length} Vokabeln gefunden
      </p>

      <div className="vocab-list">
        {filtered.map(word => (
          <div key={word.id} className="vocab-item">
            <div className="vocab-item-main">
              <div className="vocab-item-en">
                {word.en}{' '}
                <button
                  className="speak-button"
                  onClick={() => speak(word.en)}
                  aria-label="Wort aussprechen"
                  title="Englisch aussprechen"
                >
                  🔊
                </button>
              </div>
              <div className="vocab-item-de">
                {word.de}{' '}
                <button
                  className="speak-button"
                  onClick={() => speak(word.de, 'de-DE')}
                  aria-label="Deutsche Übersetzung aussprechen"
                  title="Deutsch aussprechen"
                >
                  🇩🇪
                </button>
              </div>
              <div className="vocab-item-meta">
                {word.type} · {word.topic || 'Allgemein'}
                {word.tip && <span> · 💡 {word.tip}</span>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
            Keine Vokabeln gefunden.
          </p>
        )}
      </div>
    </div>
  )
}

export default Vocabulary