import { useState } from 'react'
import SpeakerButton from './SpeakerButton'

const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const ACCENT = '#c17c4a'
const OLIVE = '#8d9a55'
const LIGHT = '#f8f5f2'
const CARD_BG = '#181d29'
const CARD_TEXT = '#f7f2ea'
const CARD_MUTED = 'rgba(247,242,234,0.62)'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Flashcards({ words, reserveWords = [], onExit, onReview }) {
  const [deck, setDeck] = useState(() => shuffle(words))
  const [extra, setExtra] = useState(reserveWords)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)

  const current = deck[index]?.vocabulary

  function next(quality) {
    if (quality) onReview(current.id, quality)
    if (index + 1 >= deck.length) {
      setDone(true)
    } else {
      setIndex(index + 1)
      setFlipped(false)
    }
  }

  function restart() {
    setDeck(shuffle(words))
    setIndex(0)
    setFlipped(false)
    setDone(false)
  }

  function continueWithMore() {
    setDeck(d => [...d, ...shuffle(extra)])
    setExtra([])
    setIndex(i => i + 1)
    setFlipped(false)
    setDone(false)
  }

  if (done) {
    if (extra.length > 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🎉</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>Due words done! {extra.length} more word{extra.length === 1 ? '' : 's'} available.</p>
          <button onClick={continueWithMore} style={{ ...btn(OLIVE), marginRight: 10 }}>Continue with {extra.length} more</button>
          <button onClick={onExit} style={btn('transparent', MUTED)}>Back to modes</button>
        </div>
      )
    }
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
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)', cursor: 'pointer', textAlign: 'center',
      }}>
        {flipped ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 40, fontWeight: 800, color: CARD_TEXT, margin: 0 }}>{current.word}</p>
              <SpeakerButton word={current.word} style={{ background: 'rgba(255,255,255,0.14)' }} />
            </div>
            {current.example && <p style={{ fontSize: 16, color: CARD_MUTED, fontStyle: 'italic', margin: 0 }}>"{current.example}"</p>}
          </>
        ) : (
          <>
            <p style={{ fontSize: 24, color: CARD_TEXT, margin: 0, lineHeight: 1.5, fontWeight: 600 }}>{current.definition}</p>
            <p className="nb-mono" style={{ fontSize: 12, color: CARD_MUTED, margin: 0 }}>tap to reveal</p>
          </>
        )}
      </div>

      {flipped && (
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
          <button onClick={() => next(2)} style={btn(LIGHT, TEXT)}>Still learning</button>
          <button onClick={() => next(4)} style={btn(OLIVE)}>Got it! ✓</button>
        </div>
      )}
    </div>
  )
}

function btn(bg, color = 'white') {
  return { padding: '12px 22px', borderRadius: 12, border: bg === 'transparent' ? `1.5px solid rgba(0,0,0,0.15)` : 'none', background: bg, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
}
