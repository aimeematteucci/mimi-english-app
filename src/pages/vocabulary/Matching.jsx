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

function buildTiles(words) {
  const round = shuffle(words).slice(0, 6)
  const tiles = round.flatMap(w => ([
    { id: `${w.vocabulary.id}-word`, vocabularyId: w.vocabulary.id, type: 'word', text: w.vocabulary.word },
    { id: `${w.vocabulary.id}-def`, vocabularyId: w.vocabulary.id, type: 'def', text: w.vocabulary.definition },
  ]))
  return { round, tiles: shuffle(tiles) }
}

export default function Matching({ words, reserveWords = [], onExit, onReview }) {
  const [round, setRound] = useState(() => buildTiles(words))
  const [extra, setExtra] = useState(reserveWords)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState(new Set())
  const [moves, setMoves] = useState(0)
  const [busy, setBusy] = useState(false)

  const done = matched.size === round.round.length && round.round.length > 0

  function click(tile) {
    if (busy || matched.has(tile.vocabularyId) || flipped.some(t => t.id === tile.id)) return

    if (flipped.length === 0) {
      setFlipped([tile])
      return
    }

    const pair = [flipped[0], tile]
    setFlipped(pair)
    setMoves(m => m + 1)
    setBusy(true)

    const isMatch = pair[0].vocabularyId === pair[1].vocabularyId && pair[0].id !== pair[1].id
    setTimeout(() => {
      if (isMatch) {
        setMatched(prev => new Set(prev).add(tile.vocabularyId))
        onReview(tile.vocabularyId, 4)
      }
      setFlipped([])
      setBusy(false)
    }, isMatch ? 500 : 800)
  }

  function restart() {
    setRound(buildTiles(words))
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setBusy(false)
  }

  function continueWithMore() {
    setRound(buildTiles([...words, ...extra]))
    setExtra([])
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
    setBusy(false)
  }

  if (done) {
    if (extra.length > 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>🧩</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>All matched in {moves} moves!</p>
          <p style={{ fontSize: 14, color: MUTED, margin: '0 0 14px' }}>{extra.length} more word{extra.length === 1 ? '' : 's'} available.</p>
          <button onClick={continueWithMore} style={{ ...btn(OLIVE), marginRight: 10 }}>Continue with more</button>
          <button onClick={onExit} style={btn('transparent', MUTED)}>Back to modes</button>
        </div>
      )
    }
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>🧩</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>All matched in {moves} moves!</p>
        <button onClick={restart} style={{ ...btn(ACCENT), marginRight: 10, marginTop: 14 }}>Play again</button>
        <button onClick={onExit} style={{ ...btn('transparent', MUTED), marginTop: 14 }}>Back to modes</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={onExit} className="nb-mono" style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: MUTED, cursor: 'pointer', padding: 0 }}>← Back to modes</button>
        <span className="nb-mono" style={{ fontSize: 12, color: MUTED }}>{matched.size} / {round.round.length} pairs · {moves} moves</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {round.tiles.map(tile => {
          const isMatched = matched.has(tile.vocabularyId)
          const isFlipped = isMatched || flipped.some(t => t.id === tile.id)
          return (
            <div key={tile.id} onClick={() => click(tile)} style={{
              minHeight: 96, borderRadius: 12, padding: '12px', cursor: isMatched ? 'default' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: isMatched ? 'rgba(141,154,85,0.15)' : isFlipped ? CARD_BG : LIGHT,
              border: `1.5px solid ${isMatched ? OLIVE : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isFlipped && !isMatched ? '0 4px 14px rgba(0,0,0,0.1)' : 'none',
              textAlign: 'center', transition: 'background 0.15s',
            }}>
              {isFlipped ? (
                tile.type === 'word' ? (
                  <>
                    <p style={{ fontWeight: 700, fontSize: 14, color: TEXT, margin: 0 }}>{tile.text}</p>
                    <SpeakerButton word={tile.text} style={{ width: 24, height: 24, fontSize: 12 }} />
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: TEXT, margin: 0, lineHeight: 1.35 }}>{tile.text}</p>
                )
              ) : (
                <span style={{ fontSize: 22, color: MUTED, opacity: 0.4 }}>?</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function btn(bg, color = 'white') {
  return { padding: '12px 22px', borderRadius: 12, border: bg === 'transparent' ? `1.5px solid rgba(0,0,0,0.15)` : 'none', background: bg, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
}
