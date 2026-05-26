/**
 * Text-to-Speech utility using the Web Speech API.
 * Speaks text in the given language with learner-friendly settings.
 */

export function speak(text, language = 'en-US') {
  if (!window.speechSynthesis) {
    // Silent fail – browser doesn't support TTS
    return
  }

  // Cancel any ongoing speech before starting new one
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  utterance.rate = 0.9
  utterance.pitch = 1.0
  utterance.volume = 1.0
  window.speechSynthesis.speak(utterance)
}

export function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}