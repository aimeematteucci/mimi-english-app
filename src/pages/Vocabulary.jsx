import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { nextReview } from '../lib/sm2'
import './notebook.css'
import Flashcards from './vocabulary/Flashcards'
import Quiz from './vocabulary/Quiz'
import Matching from './vocabulary/Matching'
import BlastGame from './vocabulary/BlastGame'
import FillBlank from './vocabulary/FillBlank'

const PAGE_BG = '#f2ece4'
const CARD_BG = '#ffffff'
const LIGHT = '#f8f5f2'
const TEXT = '#1a1a1a'
const MUTED = '#7a6a5a'
const OLIVE = '#8d9a55'

const MODES = [
  { key: 'flashcards', name: 'Flashcards', icon: '🗂️', desc: 'Flip the card, reveal the word.' },
  { key: 'quiz', name: 'Quiz', icon: '❓', desc: 'Multiple choice, pick the right definition.' },
  { key: 'matching', name: 'Matching', icon: '🧩', desc: 'Find every word–definition pair.' },
  { key: 'blast', name: 'Blast', icon: '🚀', desc: 'Blast the asteroid before time runs out.' },
  { key: 'fillblank', name: 'Fill in the Blank', icon: '✏️', desc: 'Complete the sentence with the right word.' },
]

const todayString = () => new Date().toISOString().slice(0, 10)

export default function Vocabulary() {
  const { profile, signOut } = useAuth()
  const [words, setWords] = useState([])
  const [mode, setMode] = useState(null)
  const [interstitialMode, setInterstitialMode] = useState(null)

  const fetchWords = useCallback(async () => {
    const { data } = await supabase.from('student_vocabulary').select('*, vocabulary(*)').eq('student_id', profile.id)
    setWords((data || []).filter(w => w.vocabulary))
  }, [profile])

  useEffect(() => {
    if (!profile) return
    fetchWords()
  }, [profile, fetchWords])

  const today = todayString()
  const dueWords = words.filter(w => w.next_review_date <= today)
  const laterWords = words.filter(w => w.next_review_date > today)
  const sessionWords = dueWords.length > 0 ? dueWords : laterWords
  const sessionReserve = dueWords.length > 0 ? laterWords : []

  async function reviewWord(vocabularyId, quality) {
    const row = words.find(w => w.vocabulary_id === vocabularyId)
    if (!row) return
    const update = nextReview(
      { repetitions: row.repetitions, easeFactor: row.ease_factor, intervalDays: row.interval_days },
      quality
    )
    await supabase.from('student_vocabulary').update({
      repetitions: update.repetitions,
      ease_factor: update.easeFactor,
      interval_days: update.intervalDays,
      next_review_date: update.nextReviewDate,
      last_reviewed_at: new Date().toISOString(),
    }).eq('id', row.id)
  }

  function chooseMode(key) {
    if (dueWords.length > 0 || laterWords.length === 0) setMode(key)
    else setInterstitialMode(key)
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Student'

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div className="nb-hero" style={{ padding: '36px 32px 44px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <Link to="/dashboard" className="nb-back nb-mono" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', display: 'inline-block', marginBottom: 10 }}>
              ← Back to Notebook
            </Link>
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, fontWeight: 800,
              color: '#f7f2ea', margin: 0, lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.4)',
            }}>
              Vocabulary Training
            </h1>
          </div>
          <button onClick={signOut} style={{
            padding: '12px 16px', borderRadius: 12,
            border: '1.5px solid rgba(255,255,255,0.25)', background: 'transparent',
            fontSize: 13, color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
          }}>Sign out</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 900 }}>
          <div className="nb-spiral">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="nb-ring" />)}
          </div>

          <main className="nb-page" style={{ padding: '40px 8px 60px 36px' }}>
            <div className="nb-margin-line" />

            {mode ? (
              <ModeRunner
                mode={mode}
                words={sessionWords}
                reserveWords={sessionReserve}
                firstName={firstName}
                onExit={() => { setMode(null); fetchWords() }}
                onReview={reviewWord}
              />
            ) : interstitialMode ? (
              <section>
                <span className="nb-tab" style={{ background: OLIVE }}><span>📚</span>Choose a mode</span>
                <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: TEXT, margin: '0 0 18px' }}>
                    No words due for review today. Study {laterWords.length} more word{laterWords.length === 1 ? '' : 's'} anyway?
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={() => setInterstitialMode(null)} style={{ padding: '12px 22px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.15)', background: 'transparent', color: MUTED, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Not now</button>
                    <button onClick={() => { setMode(interstitialMode); setInterstitialMode(null) }} style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: OLIVE, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue studying</button>
                  </div>
                </div>
              </section>
            ) : (
              <section>
                <span className="nb-tab" style={{ background: OLIVE }}><span>📚</span>Choose a mode</span>
                <div className="nb-card" style={{ background: CARD_BG, borderRadius: '0 16px 16px 16px', padding: '20px 24px', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
                  {words.length === 0 ? (
                    <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Aimee hasn't assigned any words yet — check back soon!</p>
                  ) : (
                    <>
                      <p className="nb-mono" style={{ fontSize: 12, color: MUTED, margin: '0 0 16px' }}>
                        {dueWords.length} word{dueWords.length === 1 ? '' : 's'} due today
                        {laterWords.length > 0 && ` · ${laterWords.length} more available`}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                        {MODES.filter(m => m.key !== 'fillblank' || profile?.fill_blank_enabled).map(m => (
                          <div key={m.key} onClick={() => chooseMode(m.key)} className="nb-shelf-card" style={{
                            background: LIGHT, border: '1.5px solid rgba(0,0,0,0.06)',
                            borderRadius: 14, padding: '22px 16px', textAlign: 'center',
                          }}>
                            <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>{m.icon}</span>
                            <p style={{ fontWeight: 700, fontSize: 15, color: TEXT, margin: 0 }}>{m.name}</p>
                            <p style={{ fontSize: 12, color: MUTED, margin: '5px 0 0', lineHeight: 1.4 }}>{m.desc}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function ModeRunner({ mode, words, reserveWords, onExit, onReview }) {
  const props = { words, reserveWords, onExit, onReview }
  if (mode === 'flashcards') return <Flashcards {...props} />
  if (mode === 'quiz') return <Quiz {...props} />
  if (mode === 'matching') return <Matching {...props} />
  if (mode === 'blast') return <BlastGame {...props} />
  if (mode === 'fillblank') return <FillBlank {...props} />
  return null
}
