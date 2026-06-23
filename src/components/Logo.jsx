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
        fontFamily: 'Georgia, serif',
        fontStyle: 'italic',
        fontSize: size * 0.6,
        color: 'var(--text-dark)',
        lineHeight: 1,
        marginTop: 2,
      }}>M</span>
    </div>
  )
}
