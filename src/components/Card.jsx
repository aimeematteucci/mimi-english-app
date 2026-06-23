export default function Card({ children, color = 'var(--card-cream)', style = {} }) {
  return (
    <div style={{
      background: color,
      borderRadius: 24,
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      color: 'var(--text-dark)',
      ...style,
    }}>
      {children}
    </div>
  )
}
