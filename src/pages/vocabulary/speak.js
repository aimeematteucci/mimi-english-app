export function speak(word, lang = 'en-US') {
  if (!word || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = lang
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}
