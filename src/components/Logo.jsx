export default function Logo({ size = 56 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'var(--card-green)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: size * 0.44,
        letterSpacing: '-0.04em',
        color: 'var(--text-dark)',
        lineHeight: 1,
        marginTop: 1,
      }}>EB</span>
    </div>
  )
}
