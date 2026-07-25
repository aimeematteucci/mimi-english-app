import { useCallback, useEffect, useState } from 'react'

const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const ACCENT = '#c17c4a'

const GAME_SECONDS = 60
const START_LIVES = 3
const TICK_MS = 60
const FIELD_HEIGHT = 340

function pick(arr, n, exclude) {
  const pool = shuffle(arr.filter(w => !exclude || w.vocabulary.id !== exclude.vocabulary.id))
  return pool.slice(0, n)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let uid = 0
function makeWave(words) {
  const target = words[Math.floor(Math.random() * words.length)]
  const poolSize = Math.min(4, words.length)
  const distractors = pick(words, poolSize - 1, target)
  const asteroids = shuffle([target, ...distractors]).map((w, i) => ({
    uid: uid++,
    vocabularyId: w.vocabulary.id,
    word: w.vocabulary.word,
    isTarget: w.vocabulary.id === target.vocabulary.id,
    top: -10 - i * 18,
    left: 8 + Math.random() * 76,
    speed: 0.18 + Math.random() * 0.14,
  }))
  return { target: target.vocabulary, asteroids }
}

export default function BlastGame({ words, onExit, onStatus }) {
  const [wave, setWave] = useState(() => makeWave(words))
  const [lives, setLives] = useState(START_LIVES)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [gameOver, setGameOver] = useState(false)
  const [hitFx, setHitFx] = useState(null)

  const nextWave = useCallback(() => setWave(makeWave(words)), [words])

  function loseLife() {
    setLives(l => {
      const n = l - 1
      if (n <= 0) setGameOver(true)
      return n
    })
  }

  function blast(asteroid) {
    if (gameOver) return
    if (asteroid.isTarget) {
      setScore(s => s + 1)
      onStatus(asteroid.vocabularyId, 'mastered')
      setHitFx(asteroid.uid)
      setTimeout(() => setHitFx(null), 300)
      setTimeout(nextWave, 200)
    } else {
      loseLife()
      setWave(w => ({ ...w, asteroids: w.asteroids.filter(a => a.uid !== asteroid.uid) }))
    }
  }

  // movement loop
  useEffect(() => {
    if (gameOver) return
    const id = setInterval(() => {
      setWave(w => {
        const survivors = []
        let missed = false
        for (const a of w.asteroids) {
          const top = a.top + a.speed
          if (top >= 100) {
            if (a.isTarget) missed = true
          } else {
            survivors.push({ ...a, top })
          }
        }
        if (missed) setTimeout(loseLife, 0)
        if (survivors.length === 0 || missed) {
          setTimeout(nextWave, missed ? 150 : 0)
          return w
        }
        return { ...w, asteroids: survivors }
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [gameOver, nextWave])

  // countdown
  useEffect(() => {
    if (gameOver) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameOver(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [gameOver])

  function restart() {
    setWave(makeWave(words))
    setLives(START_LIVES)
    setScore(0)
    setTimeLeft(GAME_SECONDS)
    setGameOver(false)
  }

  if (gameOver) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>🚀</p>
        <p style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 6px' }}>Score: {score}</p>
        <button onClick={restart} style={{ ...btn(ACCENT), marginRight: 10, marginTop: 14 }}>Play again</button>
        <button onClick={onExit} style={{ ...btn('transparent', MUTED), marginTop: 14 }}>Back to modes</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onExit} className="nb-mono" style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: MUTED, cursor: 'pointer', padding: 0 }}>← Back to modes</button>
        <span className="nb-mono" style={{ fontSize: 12, color: MUTED }}>⏱ {timeLeft}s · ❤️ {lives} · 🏆 {score}</span>
      </div>

      <div style={{ background: '#141a24', borderRadius: 16, padding: '16px 20px', marginBottom: 10, textAlign: 'center' }}>
        <p className="nb-mono" style={{ fontSize: 11, color: '#8fa3c4', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>Blast the word that means</p>
        <p style={{ fontSize: 16, color: '#f7f2ea', margin: 0, fontWeight: 600 }}>{wave.target.definition}</p>
      </div>

      <div style={{
        position: 'relative', height: FIELD_HEIGHT, borderRadius: 16, overflow: 'hidden',
        background: 'radial-gradient(circle at 20% 10%, #1e2740, #0a0e18 70%)',
      }}>
        {wave.asteroids.map(a => (
          <div key={a.uid} onClick={() => blast(a)} style={{
            position: 'absolute', top: `${a.top}%`, left: `${a.left}%`, transform: 'translate(-50%, -50%)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            background: hitFx === a.uid ? 'rgba(141,154,85,0.9)' : 'rgba(193,124,74,0.85)',
            border: '2px solid rgba(255,255,255,0.25)', borderRadius: '50%',
            padding: '10px 16px', boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            transition: 'background 0.2s', whiteSpace: 'nowrap',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{hitFx === a.uid ? '💥' : a.word}</span>
          </div>
        ))}
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', fontSize: FIELD_HEIGHT / 4, lineHeight: 1 }}>🛸</div>
      </div>
    </div>
  )
}

function btn(bg, color = 'white') {
  return { padding: '12px 22px', borderRadius: 12, border: bg === 'transparent' ? `1.5px solid rgba(0,0,0,0.15)` : 'none', background: bg, color, fontSize: 14, fontWeight: 700, cursor: 'pointer' }
}
