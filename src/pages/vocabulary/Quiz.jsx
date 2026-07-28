import { useState } from 'react'
import SpeakerButton from './SpeakerButton'

const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const ACCENT = '#c17c4a'
const OLIVE = '#8d9a55'
const DANGER = '#d94f4f'
const LIGHT = '#f8f5f2'
const CARD_BG = '#ffffff'

const FALLBACK_DEFINITIONS = [
  'A word used to describe a feeling.',
  'An action or activity.',
  'A common everyday object.',
  'A way of describing something.',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(words) {
  const allDefinitions = words.map(w => w.vocabulary.definition)
  return shuffle(words).map(w => {
    const vocab = w.vocabulary
    const distractorPool = shuffle(allDefinitions.filter(d => d !== vocab.definition))
    const distractors = distractorPool.slice(0, 3)
    while (distractors.length < 3) distractors.push(FALLBACK_DEFINITIONS[distractors.length])
    return { vocab, options: shuffle([vocab.definition, ...distractors]) }
  })
}

export default function Quiz({ words, reserveWords = [], onExit, onReview }) {
  const [questions, setQuestions] = useState(() => buildQuestions(words))
  const [extra, setExtra] = useState(reserveWords)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[index]

  function choose(option) {
    if (selected) return
    setSelected(option)
    const correct = option === q.vocab.definition
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
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🏆</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>Score: {score} / {questions.length}</p>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 14px' }}>{extra.length} more word{extra.length === 1 ? '' : 's'} available.</p>
          <button onClick={continueWithMore} style={{ ...btn(OLIVE), marginRight: 10 }}>Continue with {extra.length} more</button>
          <button onClick={onExit} style={btn('transparent', MUTED)}>Back to modes</button>
        </div>
      )
    }
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>🏆</p>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 800, color: TEXT, margin: 0, textAlign: 'center' }}>{q.vocab.word}</p>
          <SpeakerButton word={q.vocab.word} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map(opt => {
            const isCorrect = opt === q.vocab.definition
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
