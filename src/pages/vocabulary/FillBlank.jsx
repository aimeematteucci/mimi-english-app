import { useState } from 'react'

const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const ACCENT = '#c17c4a'
const OLIVE = '#8d9a55'
const DANGER = '#d94f4f'
const LIGHT = '#f8f5f2'
const CARD_BG = '#ffffff'

const CLOZE_TOKEN = '{blank}'
const FALLBACK_WORDS = ['happy', 'quickly', 'yesterday', 'the table']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isEligible(w) {
  return typeof w.vocabulary?.cloze_sentence === 'string' && w.vocabulary.cloze_sentence.includes(CLOZE_TOKEN)
}

function buildQuestion(w, allWords) {
  const vocab = w.vocabulary
  const idx = vocab.cloze_sentence.indexOf(CLOZE_TOKEN)
  const before = vocab.cloze_sentence.slice(0, idx)
  const after = vocab.cloze_sentence.slice(idx + CLOZE_TOKEN.length)
  const pool = shuffle(allWords.map(x => x.vocabulary.word).filter(word => word !== vocab.word))
  const distractors = pool.slice(0, 3)
  while (distractors.length < 3) distractors.push(FALLBACK_WORDS[distractors.length])
  return { vocab, before, after, options: shuffle([vocab.word, ...distractors]) }
}

function buildQuestions(words) {
  const eligible = shuffle(words.filter(isEligible))
  return eligible.map(w => buildQuestion(w, words))
}

export default function FillBlank({ words, reserveWords = [], onExit, onReview }) {
  const [questions, setQuestions] = useState(() => buildQuestions(words))
  const [extra, setExtra] = useState(() => reserveWords.filter(isEligible))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>✏️</p>
        <p style={{ fontSize: 16, color: MUTED, margin: '0 0 20px' }}>No fill-in-the-blank sentences yet — check back soon!</p>
        <button onClick={onExit} style={btn(ACCENT)}>Back to modes</button>
      </div>
    )
  }

  const q = questions[index]

  function choose(option) {
    if (selected) return
    setSelected(option)
    const correct = option === q.vocab.word
    if (correct) setScore(s => s + 1)
    onReview(q.vocab.id, correct ? 4 : 1)
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true)
    } else {
      setIndex(index + 1)
      setSelected(null)
    }
  }

  function restart() {
    setQuestions(buildQuestions(words))
    setIndex(0)
    setSelected(null)
    setScore(0)
    setDone(false)
  }

  function continueWithMore() {
    setQuestions(qs => [...qs, ...buildQuestions(extra)])
    setExtra([])
    setIndex(i => i + 1)
    setSelected(null)
    setDone(false)
  }

  if (done) {
    if (extra.length > 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>✏️</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>Score: {score} / {questions.length}</p>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 14px' }}>{extra.length} more word{extra.length === 1 ? '' : 's'} available.</p>
          <button onClick={continueWithMore} style={{ ...btn(OLIVE), marginRight: 10 }}>Continue with {extra.length} more</button>
          <button onClick={onExit} style={btn('transparent', MUTED)}>Back to modes</button>
        </div>
      )
    }
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>✏️</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>Score: {score} / {questions.length}</p>
        <button onClick={restart} style={{ ...btn(ACCENT), marginRight: 10, marginTop: 14 }}>Play again</button>
        <button onClick={onExit} style={{ ...btn('transparent', MUTED), marginTop: 14 }}>Back to modes</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onExit} className="nb-mono" style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: MUTED, cursor: 'pointer', padding: 0 }}>← Back to modes</button>
        <span className="nb-mono" style={{ fontSize: 12, color: MUTED }}>{index + 1} / {questions.length}</span>
      </div>

      <div style={{ background: CARD_BG, borderRadius: 20, padding: '32px', boxShadow: '0 6px 22px rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize: 20, color: TEXT, textAlign: 'center', lineHeight: 1.6, margin: '0 0 24px' }}>
          {q.before}
          <span style={{ display: 'inline-block', minWidth: 70, borderBottom: `2px solid ${ACCENT}`, margin: '0 4px' }}>&nbsp;</span>
          {q.after}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map(opt => {
            const isCorrect = opt === q.vocab.word
            const isSelected = opt === selected
            let bg = LIGHT, border = 'rgba(0,0,0,0.08)', color = TEXT
            if (selected) {
              if (isCorrect) { bg = 'rgba(141,154,85,0.15)'; border = OLIVE; color = TEXT }
              else if (isSelected) { bg = 'rgba(217,79,79,0.12)'; border = DANGER; color = TEXT }
            }
            return (
              <button key={opt} onClick={() => choose(opt)} disabled={!!selected} style={{
                textAlign: 'left', padding: '14px 16px', borderRadius: 12, fontSize: 14,
                border: `1.5px solid ${border}`, background: bg, color, cursor: selected ? 'default' : 'pointer',
              }}>{opt}</button>
            )
          })}
        </div>

        {selected && (
          <button onClick={next} style={{ ...btn(ACCENT), marginTop: 20, width: '100%' }}>
            {index + 1 >= questions.length ? 'See score' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  )
}

function btn(bg, color = 'white') {
  return { padding: '12px 22px', borderRadius: 12, border: bg === 'transparent' ? `1.5px solid rgba(0,0,0,0.15)` : 'none', background: bg, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
}
