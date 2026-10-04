import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

// Five questions per CEFR band, easiest first. A band counts as "passed"
// with 3+ correct; the result is the last band passed before the first one
// failed, so lucky guesses in the hard questions can't inflate the level.
const QUESTIONS = [
  { band: 'A1', q: 'Hi! My name ___ Ana.', options: ['am', 'is', 'are', 'be'], answer: 1 },
  { band: 'A1', q: '___ you from Brazil?', options: ['Do', 'Is', 'Are', 'Does'], answer: 2 },
  { band: 'A1', q: 'She ___ two brothers.', options: ['have', 'is', 'haves', 'has'], answer: 3 },
  { band: 'A1', q: 'There ___ a book on the table.', options: ['is', 'are', 'am', 'be'], answer: 0 },
  { band: 'A1', q: 'I ___ coffee every morning.', options: ['drinks', 'drink', 'drinking', 'am drink'], answer: 1 },

  { band: 'A2', q: 'Yesterday I ___ to the beach.', options: ['go', 'goes', 'went', 'gone'], answer: 2 },
  { band: 'A2', q: 'Did you ___ the movie?', options: ['like', 'liked', 'likes', 'liking'], answer: 0 },
  { band: 'A2', q: 'My brother is ___ than me.', options: ['tall', 'more tall', 'tallest', 'taller'], answer: 3 },
  { band: 'A2', q: 'We ___ dinner when the phone rang.', options: ['have', 'were having', 'are having', 'has had'], answer: 1 },
  { band: 'A2', q: "I'm going ___ my grandmother this weekend.", options: ['visit', 'visiting', 'to visit', 'visited'], answer: 2 },

  { band: 'B1', q: 'I ___ in São Paulo since 2018.', options: ['live', 'have lived', 'lived', 'am living'], answer: 1 },
  { band: 'B1', q: 'If it rains tomorrow, we ___ at home.', options: ['will stay', 'stay', 'would stay', 'stayed'], answer: 0 },
  { band: 'B1', q: 'This house ___ in 1950.', options: ['built', 'has built', 'is building', 'was built'], answer: 3 },
  { band: 'B1', q: 'She asked me where ___.', options: ['did I live', 'do I live', 'I lived', 'I live'], answer: 2 },
  { band: 'B1', q: "I'm not used to ___ up so early.", options: ['wake', 'waking', 'woke', 'be waking'], answer: 1 },

  { band: 'B2', q: 'If I ___ more time, I would learn Japanese.', options: ['have', 'would have', 'will have', 'had'], answer: 3 },
  { band: 'B2', q: 'By the time we arrived, the movie ___.', options: ['had already started', 'has started', 'started', 'was starting'], answer: 0 },
  { band: 'B2', q: 'You ___ have told me! I would have helped.', options: ['must', 'should', 'can', 'will'], answer: 1 },
  { band: 'B2', q: 'The meeting was ___ off because of the storm.', options: ['put', 'turned', 'called', 'taken'], answer: 2 },
  { band: 'B2', q: 'I wish I ___ that email yesterday.', options: ["didn't send", "haven't sent", "wouldn't send", "hadn't sent"], answer: 3 },

  { band: 'C1', q: 'Not only ___ late, but he also forgot the documents.', options: ['he arrived', 'did he arrive', 'he did arrive', 'arrived he'], answer: 1 },
  { band: 'C1', q: 'Had I known about the traffic, I ___ earlier.', options: ['would leave', 'left', 'would have left', 'had left'], answer: 2 },
  { band: 'C1', q: 'The new policy has been met with ___ criticism.', options: ['widespread', 'wide', 'widely', 'widening'], answer: 0 },
  { band: 'C1', q: "It's high time we ___ a decision.", options: ['make', 'will make', 'are making', 'made'], answer: 3 },
  { band: 'C1', q: "Her argument doesn't hold ___ — there's no evidence for it.", options: ['ground', 'water', 'air', 'weight'], answer: 1 },
]

const BANDS = ['A1', 'A2', 'B1', 'B2', 'C1']

// Index = number of bands passed in a row.
const LEVELS = [
  { code: 'A1', name: 'Iniciante', pct: 10, text: 'Você está dando os primeiros passos. Com aulas estruturadas, rapidinho você vai se apresentar, falar da sua rotina e entender frases do dia a dia.' },
  { code: 'A2', name: 'Elementar', pct: 25, text: 'Você já domina o básico! Agora é hora de ganhar confiança para conversar sobre o passado, planos e situações práticas, como viagens e compras.' },
  { code: 'B1', name: 'Comunicador', pct: 45, text: 'Você já se comunica em situações do dia a dia. O próximo passo é falar com mais fluência, ampliar vocabulário e entender nativos com mais facilidade.' },
  { code: 'B2', name: 'Falante confiante', pct: 65, text: 'Você se vira bem em inglês! Agora o foco é refinar estruturas mais complexas e soar mais natural em conversas, reuniões e apresentações.' },
  { code: 'C1', name: 'Avançado', pct: 85, text: 'Seu inglês é avançado! Vamos lapidar nuances, expressões idiomáticas e precisão para você se expressar com total naturalidade.' },
  { code: 'C2', name: 'Proficiente', pct: 100, text: 'Impressionante! Você acertou praticamente tudo. Vamos trabalhar conversação de alto nível, escrita e pronúncia para manter seu inglês afiado.' },
]

// Teacher's WhatsApp for the trial-class button. The env var overrides it.
const WHATSAPP = import.meta.env.VITE_WHATSAPP_NUMBER || '5512988803900'

function computeResult(answers) {
  const correctByBand = Object.fromEntries(BANDS.map(b => [b, 0]))
  let score = 0
  QUESTIONS.forEach((q, i) => {
    if (answers[i] === q.answer) { correctByBand[q.band]++; score++ }
  })
  let passed = 0
  for (const b of BANDS) {
    if (correctByBand[b] >= 3) passed++
    else break
  }
  // Getting every single question right lands on C2.
  if (score === QUESTIONS.length) passed = LEVELS.length - 1
  return { level: LEVELS[passed], score }
}

export default function PlacementTest() {
  const [step, setStep] = useState('intro') // intro | quiz | lead | result
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const result = useMemo(() => computeResult(answers), [answers])

  function choose(optionIndex) {
    const next = [...answers]
    next[index] = optionIndex
    setAnswers(next)
    if (index + 1 < QUESTIONS.length) setIndex(index + 1)
    else setStep('lead')
  }

  function restart() {
    setAnswers([])
    setIndex(0)
    setStep('intro')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <Logo size={36} />
          <span style={styles.brandName}>EnglishBox</span>
        </div>
        {step === 'intro' && <Intro onStart={() => setStep('quiz')} />}
        {step === 'quiz' && (
          <Question
            index={index}
            onChoose={choose}
            onBack={index > 0 ? () => setIndex(index - 1) : null}
          />
        )}
        {step === 'lead' && <LeadForm answers={answers} result={result} onDone={() => setStep('result')} />}
        {step === 'result' && <Result result={result} onRestart={restart} />}
      </div>
    </div>
  )
}

function LevelBars({ highlight }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {LEVELS.map(l => {
        const active = highlight === l.code
        const dim = highlight && !active
        const fill = Math.max(l.pct, 16)
        // Short bars can't fit the level name, so it goes after the fill.
        const inside = l.pct >= 60
        return (
          <div key={l.code} style={{ ...styles.barOuter, opacity: dim ? 0.4 : 1, borderColor: active ? 'var(--card-olive)' : 'var(--text-dark)' }}>
            <div style={{ ...styles.barFill, width: `${fill}%`, background: active ? 'var(--card-olive)' : 'var(--text-dark)' }} />
            <span style={{ ...styles.barLabel, left: 16 }}>
              <strong style={{ color: 'var(--card-cream)' }}>{l.code}</strong>
              {inside && <span style={{ color: 'var(--card-cream)', marginLeft: 8 }}>– {l.name}</span>}
            </span>
            {!inside && <span style={{ ...styles.barLabel, left: `calc(${fill}% + 10px)`, color: 'var(--text-dark)' }}>{l.name}</span>}
            <span style={{ ...styles.barPct, color: l.pct >= 95 ? 'var(--card-cream)' : 'var(--text-dark)' }}>{l.pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function Intro({ onStart }) {
  return (
    <>
      <h1 style={styles.headline}>Qual é o seu nível de inglês?</h1>
      <p style={styles.lead}>25 perguntas rápidas · cerca de 5 minutos · resultado na hora</p>
      <LevelBars />
      <button onClick={onStart} style={{ ...styles.primaryBtn, marginTop: 28 }}>FAZER O TESTE</button>
      <p style={styles.hint}>Responda sem consultar nada. Se não souber, escolha “Não sei” — isso deixa o resultado mais preciso.</p>
    </>
  )
}

function Question({ index, onChoose, onBack }) {
  const q = QUESTIONS[index]
  const progress = (index / QUESTIONS.length) * 100
  return (
    <>
      <div style={styles.progressRow}>
        <span style={styles.counter}>Pergunta {index + 1} de {QUESTIONS.length}</span>
        {onBack && <button onClick={onBack} style={styles.linkBtn}>← Voltar</button>}
      </div>
      <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${progress}%` }} /></div>
      <p style={styles.instruction}>Complete a frase:</p>
      <h2 style={styles.question}>{q.q}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => onChoose(i)} style={styles.option}>{opt}</button>
        ))}
        <button onClick={() => onChoose(-1)} style={{ ...styles.option, ...styles.dontKnow }}>Não sei</button>
      </div>
    </>
  )
}

function LeadForm({ answers, result, onDone }) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const source = new URLSearchParams(window.location.search).get('src')
    // A failed save shouldn't hold the student's result hostage, so we show
    // it either way.
    await supabase.from('placement_leads').insert({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim() || null,
      level: result.level.code,
      score: result.score,
      total: QUESTIONS.length,
      answers,
      source,
    })
    setSaving(false)
    onDone()
  }

  return (
    <>
      <h1 style={{ ...styles.headline, fontSize: 30 }}>Seu resultado está pronto! 🎉</h1>
      <p style={styles.lead}>Deixe seu nome e WhatsApp para ver seu nível e receber dicas para o seu próximo passo.</p>
      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label style={styles.label}>Nome</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome" style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>WhatsApp</label>
          <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required
            placeholder="(11) 99999-9999" pattern="[0-9()+\-\s]{8,}" style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>E-mail (opcional)</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" style={styles.input} />
        </div>
        <button type="submit" disabled={saving} style={styles.primaryBtn}>
          {saving ? 'Calculando...' : 'VER MEU NÍVEL'}
        </button>
      </form>
    </>
  )
}

function Result({ result, onRestart }) {
  const { level, score } = result
  const message = encodeURIComponent(`Oi! Fiz o teste de nivelamento e meu resultado foi ${level.code} – ${level.name}. Quero saber mais sobre as aulas!`)
  return (
    <>
      <p style={{ ...styles.counter, textAlign: 'center' }}>Seu nível de inglês é</p>
      <h1 style={{ ...styles.headline, fontSize: 52, margin: '4px 0 0' }}>{level.code}</h1>
      <p style={{ ...styles.lead, fontSize: 20, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>{level.name}</p>
      <p style={{ ...styles.counter, textAlign: 'center', marginBottom: 20 }}>{score} de {QUESTIONS.length} acertos</p>
      <LevelBars highlight={level.code} />
      <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-dark)', margin: '24px 0' }}>{level.text}</p>
      {WHATSAPP && (
        <a href={`https://wa.me/${WHATSAPP}?text=${message}`} target="_blank" rel="noreferrer"
          style={{ ...styles.primaryBtn, display: 'block', textAlign: 'center' }}>
          QUERO UMA AULA EXPERIMENTAL
        </a>
      )}
      <button onClick={onRestart} style={{ ...styles.linkBtn, display: 'block', margin: '16px auto 0' }}>Refazer o teste</button>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)', padding: 16,
  },
  card: {
    background: 'var(--card-cream)', borderRadius: 28, padding: '28px 24px 32px',
    width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 20 },
  brandName: { fontWeight: 700, fontSize: 15, color: 'var(--text-muted)', letterSpacing: 0.5 },
  headline: {
    fontSize: 36, fontWeight: 800, lineHeight: 1.1, textAlign: 'center',
    color: 'var(--text-dark)', margin: '0 0 10px',
  },
  lead: { fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 },
  hint: { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 },
  barOuter: {
    position: 'relative', height: 40, borderRadius: 999, border: '2.5px solid',
    padding: 3, background: 'white', transition: 'opacity 0.2s',
  },
  barFill: { height: '100%', borderRadius: 999 },
  barLabel: { position: 'absolute', top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 14 },
  barPct: { position: 'absolute', right: 16, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' },
  primaryBtn: {
    width: '100%', padding: '15px', borderRadius: 12, border: 'none',
    background: 'var(--text-dark)', color: 'var(--card-green)', fontSize: 16,
    fontWeight: 800, letterSpacing: 1,
  },
  progressRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  counter: { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' },
  linkBtn: { background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', padding: 0 },
  progressTrack: { height: 8, borderRadius: 999, background: 'rgba(67,73,42,0.12)', overflow: 'hidden', marginBottom: 28 },
  progressFill: { height: '100%', background: 'var(--card-olive)', transition: 'width 0.25s' },
  instruction: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 },
  question: { fontSize: 22, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.35, marginBottom: 22 },
  option: {
    width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 14,
    border: '2px solid var(--text-dark)', background: 'white', fontSize: 16,
    fontWeight: 600, color: 'var(--text-dark)',
  },
  dontKnow: { borderStyle: 'dashed', borderColor: 'rgba(67,73,42,0.35)', color: 'var(--text-muted)', fontWeight: 500 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 },
  input: { width: '100%', padding: '12px 14px', fontSize: 15 },
}
