import { getApiKey } from './storage.js'

const API_URL = 'https://api.deepseek.com/v1/chat/completions'

/**
 * Generate vocabulary words for a given topic using DeepSeek AI
 * @param {string} topic - The topic/context
 * @param {number} count - How many words to generate
 * @returns {Array} Array of { en, de, type, example }
 */
export async function generateVocabWords(topic, count = 10) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('KEIN_API_KEY')
  }

  const prompt = `Generate exactly ${count} English vocabulary words for a German 9th grader (B1 level) about: '${topic}'. Format each as: EN|DE|TYPE|EXAMPLE. One per line. No numbers or extra text. TYPE must be one of: noun, verb, adj.`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful vocabulary assistant for German students learning English at B1 level. Always respond in the exact format requested.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'API_ERROR')
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  return parseGeneratedVocab(content)
}

/**
 * Generate translation, example and memory tip for a given English word
 * @param {string} enWord
 * @returns {object} { de, example, tip }
 */
export async function generateWordDetails(enWord) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('KEIN_API_KEY')
  }

  const prompt = `For the English word '${enWord}': Provide DE_TRANSLATION (in German), EXAMPLE_SENTENCE (B1 level, using the word naturally), and MEMORY_TIP in German (a short tip to remember this word). Format: DE:|EXAMPLE:|TIP:`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful vocabulary assistant for German students. Always respond in the exact format requested.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'API_ERROR')
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  return parseWordDetails(content)
}

/**
 * Generate a fill-in-the-blank sentence for a given English word
 * @param {string} enWord
 * @returns {object} { sentence, answer }
 */
export async function generateFillSentence(enWord) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('KEIN_API_KEY')
  }

  const prompt = `Create a single B1-level English sentence using the word '${enWord}'. Replace the word '${enWord}' with '_____' in the sentence. Format your response as: SENTENCE:|ANSWER:${enWord}`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You create fill-in-the-blank sentences. Respond exactly in the requested format.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.8
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'API_ERROR')
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  return parseFillSentence(content, enWord)
}

// ─── PARSERS ───

function parseGeneratedVocab(text) {
  const lines = text.trim().split('\n').filter(l => l.includes('|'))
  const words = []

  lines.forEach(line => {
    const parts = line.split('|').map(s => s.trim())
    if (parts.length >= 4) {
      const [en, de, type, example] = parts
      words.push({
        en,
        de,
        type: type.toLowerCase(),
        example,
        id: Date.now() + Math.random() // unique-ish ID
      })
    }
  })

  return words
}

function parseWordDetails(text) {
  const lines = text.trim().split('\n')
  let de = ''
  let example = ''
  let tip = ''

  lines.forEach(line => {
    if (line.startsWith('DE:')) de = line.replace('DE:', '').trim()
    if (line.startsWith('EXAMPLE:')) example = line.replace('EXAMPLE:', '').trim()
    if (line.startsWith('TIP:')) tip = line.replace('TIP:', '').trim()
  })

  return { de, example, tip }
}

function parseFillSentence(text, enWord) {
  let sentence = ''
  const lines = text.trim().split('\n')
  lines.forEach(line => {
    if (line.startsWith('SENTENCE:')) {
      sentence = line.replace('SENTENCE:', '').trim()
    }
  })

  // Fallback if parsing fails
  if (!sentence) {
    sentence = text.replace(/SENTENCE:\s*|ANSWER:.*$/gi, '').trim()
  }

  return { sentence: sentence || `_____ is the missing word.`, answer: enWord }
}

/**
 * Fuzzy match – checks if user input is close enough to the correct answer
 * Allows up to 1 character difference (Levenshtein distance <= 1)
 */
export function fuzzyMatch(input, correct) {
  const a = input.trim().toLowerCase()
  const b = correct.trim().toLowerCase()

  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false

  // Proper Levenshtein distance (exact O(n*m) but limited to distance ≤ 1)
  const m = a.length
  const n = b.length

  // Use two rows for memory efficiency
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)

  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      )
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    // Early exit: whole row already > 1
    if (rowMin > 1) return false
    // Swap rows
    ;[prev, curr] = [curr, prev]
  }

  return prev[n] <= 1
}
