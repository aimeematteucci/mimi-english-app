import { useState } from 'react'
import SpeakerButton from './SpeakerButton'

const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const ACCENT = '#c17c4a'
const OLIVE = '#8d9a55'
const LIGHT = '#f8f5f2'
const CARD_BG = '#ffffff'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Flashcards({ words, onExit, onStatus }) {
  const [deck] = useState(() => shuffle(words))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)

  const current = deck[index]?.vocabulary

  function next(status) {
    if (status) onStatus(current.id, status)
    if (index + 1 >= deck.length) {
      setDone(true)
    } else {
      setIndex(index + 1)
      setFlipped(false)
    }
  }

  function restart() {
    setIndex(0)
    setFlipped(false)
    setDone(false)
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>🎉</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>Deck complete!</p>
        <button onClick={restart} style={{ ...btn(ACCENT), marginRight: 10 }}>Study again</button>
        <button onClick={onExit} style={btn('transparent', MUTED)}>Back to modes</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onExit} className="nb-back nb-mono" style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: MUTED, cursor: 'pointer', padding: 0 }}>← Back to modes</button>
        <span className="nb-mono" style={{ fontSize: 12, color: MUTED }}>{index + 1} / {deck.length}</span>
      </div>

      <div onClick={() => setFlipped(f => !f)} style={{
        background: CARD_BG, borderRadius: 20, padding: '50px 32px', minHeight: 220,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        boxShadow: '0 6px 22px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center',
      }}>
        {flipped ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 30, fontWeight: 800, color: TEXT, margin: 0 }}>{current.word}</p>
              <SpeakerButton word={current.word} />
            </div>
            {current.example && <p style={{ fontSize: 14, color: MUTED, fontStyle: 'italic', margin: 0 }}>"{current.example}"</p>}
          </>
        ) : (
          <>
            <p style={{ fontSize: 18, color: TEXT, margin: 0, lineHeight: 1.5 }}>{current.definition}</p>
            <p className="nb-mono" style={{ fontSize: 11, color: MUTED, margin: 0 }}>tap to reveal</p>
          </>
        )}
      </div>

      {flipped && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
          <button onClick={() => next('learning')} style={btn(LIGHT, TEXT)}>Still learning</button>
          <button onClick={() => next('mastered')} style={btn(OLIVE)}>Got it! ✓</button>
        </div>
      )}
    </div>
  )
}

function btn(bg, color = 'white') {
  return { padding: '12px 22px', borderRadius: 12, border: bg === 'transparent' ? `1.5px solid rgba(0,0,0,0.15)` : 'none', background: bg, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
}
