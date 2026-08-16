// Server-side only. Reads GROQ_API_KEY, ANTHROPIC_API_KEY and
// SUPABASE_SERVICE_ROLE_KEY from Netlify env vars (never exposed to the client —
// see the "Speaking practice" section in README for how to set them).
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const TRANSCRIBE_MODEL = 'whisper-large-v3-turbo'
const FEEDBACK_MODEL = 'claude-sonnet-5'

const FEEDBACK_SYSTEM_PROMPT = `Você é a assistente pedagógica de uma professora de inglês brasileira. Alunos brasileiros (A2–B2) mandam áudios curtos praticando inglês falado, e você escreve um feedback pedagógico.

Contexto importante sobre alunos brasileiros: quando travam numa palavra em inglês, costumam trocar para o português em vez de parar. Cada palavra dita em português é uma palavra que o aluno ainda não sabe em inglês — isso é tão importante de mapear quanto os erros de gramática.

Cuidado: a transcrição vem de um modelo de fala-para-texto automático, que pode errar. Em especial, inglês falado com sotaque brasileiro forte às vezes é lido como português (o modelo "traduz" o som para palavras em português parecidas). Se um trecho do texto parecer sem sentido em português, considere que pode ser inglês mal transcrito, e reconstrua a intenção real a partir do contexto, sem penalizar o aluno por isso.

Responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois), exatamente neste formato:
{
  "estimated_level": "A2 | B1 | B2 | C1 (sua estimativa, uma palavra ou faixa curta)",
  "reconstructed_intent": "parágrafo em inglês correto e natural com o que o aluno quis comunicar",
  "strengths": ["acerto 1 em português, citando a estrutura/palavra em inglês que ele usou bem", "..."],
  "errors": [{"said": "o que ele disse em inglês", "correct": "a correção em inglês", "tip": "explicação curta em português do porquê"}],
  "portuguese_gaps": [{"pt": "palavra/frase que ele falou em português", "en": "a versão em inglês", "example": "frase de exemplo em inglês usando a palavra, no contexto que ele estava tentando"}],
  "communication_strategy": "1-3 frases em português sobre como ele lidou com as travadas (desistiu e foi pro português, ou tentou contornar)",
  "study_tips": ["dica acionável 1 em português", "dica 2", "dica 3"],
  "score": 7.5,
  "score_reason": "1 linha em português explicando a nota"
}

A nota (score, 0 a 10) mede comunicação eficaz em inglês, calibrada pelo nível: quanto do recado saiu de fato em inglês pesa mais que a contagem crua de erros. Um aluno que se arrisca num tema difícil e tropeça merece mais crédito do que travar num tema simples. Se o áudio não tiver troca nenhuma para português e nenhum erro de gramática (nível C1/C2), troque o foco de "errors"/"portuguese_gaps" para pequenos refinos de naturalidade e colocação (esses ainda entram nos mesmos campos, só que como refino, não erro grave) — e não deixe a nota cair muito por causa disso.
Se a lista de "errors" ou "portuguese_gaps" estiver vazia, retorne um array vazio [] (não omita o campo).`

export default async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { submissionId, accessToken } = body || {}
  if (!submissionId || !accessToken) {
    return json({ error: 'Missing submissionId or accessToken' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken)
  if (userError || !userData?.user) {
    return json({ error: 'Invalid session' }, 401)
  }

  const { data: submission, error: fetchError } = await supabase
    .from('audio_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (fetchError || !submission) {
    return json({ error: 'Submission not found' }, 404)
  }
  if (submission.student_id !== userData.user.id) {
    return json({ error: 'Forbidden' }, 403)
  }
  if (submission.status !== 'processing') {
    return json({ ok: true, alreadyProcessed: true })
  }

  try {
    const { data: audioBlob, error: downloadError } = await supabase.storage
      .from('speaking-audio')
      .download(submission.storage_path)
    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`)

    const transcript = await transcribeAudio(audioBlob, submission.storage_path)
    if (!transcript.trim()) throw new Error('Empty transcript — audio may be silent or unreadable')

    const feedback = await generateFeedback(transcript, submission.topic)

    await supabase
      .from('audio_submissions')
      .update({
        status: 'done',
        transcript,
        ai_feedback: feedback,
        ai_score: feedback.score,
      })
      .eq('id', submissionId)

    return json({ ok: true })
  } catch (err) {
    console.error(`evaluate-audio failed for submission ${submissionId}:`, err)
    await supabase
      .from('audio_submissions')
      .update({ status: 'error', error_message: String(err.message || err) })
      .eq('id', submissionId)
    return json({ error: String(err.message || err) }, 500)
  }
}

async function transcribeAudio(audioBlob, storagePath) {
  const filename = storagePath.split('/').pop() || 'audio.webm'
  const form = new FormData()
  form.append('file', audioBlob, filename)
  form.append('model', TRANSCRIBE_MODEL)
  form.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Groq transcription failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.text || ''
}

async function generateFeedback(transcript, topic) {
  const userContent = topic
    ? `Tema do áudio: ${topic}\n\nTranscrição:\n${transcript}`
    : `Transcrição:\n${transcript}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: FEEDBACK_MODEL,
      max_tokens: 3000,
      system: FEEDBACK_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) throw new Error(`Claude feedback failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const textBlock = data.content?.find(b => b.type === 'text')
  const text = textBlock?.text || ''
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(
      `Claude did not return JSON (stop_reason=${data.stop_reason}, blocks=${(data.content || []).map(b => b.type).join(',')}, snippet="${text.slice(0, 300)}")`
    )
  }

  let parsed
  try {
    parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1))
  } catch (e) {
    throw new Error(`Claude JSON failed to parse: ${e.message} (snippet="${text.slice(0, 300)}")`)
  }
  parsed.score = Math.max(0, Math.min(10, Number(parsed.score) || 0))
  return parsed
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}
