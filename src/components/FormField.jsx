export default function FormField({ label, type = 'text', value, onChange, placeholder, required, rows, options }) {
  const base = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid rgba(67,73,42,0.2)', background: 'white',
    fontSize: 14, color: 'var(--text-dark)', outline: 'none',
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} required={required} rows={rows || 3}
          style={{ ...base, resize: 'vertical' }} />
      ) : type === 'select' ? (
        <select value={value} onChange={onChange} required={required} style={base}>
          <option value="">Select...</option>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} style={base} />
      )}
    </div>
  )
}
