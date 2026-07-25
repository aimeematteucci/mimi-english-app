import { speak } from './speak'

export default function SpeakerButton({ word, style }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); speak(word) }}
      aria-label={`Listen to "${word}"`}
      style={{
        border: 'none', background: 'rgba(0,0,0,0.06)', borderRadius: '50%',
        width: 30, height: 30, fontSize: 14, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, ...style,
      }}
    >🔊</button>
  )
}
