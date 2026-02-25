export default function Breadcrumb({ items }) {
    return (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 0', flexWrap: 'wrap' }}>
            {items.map((item, idx) => (
                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {idx > 0 && <span style={{ color: '#cbd5e1', fontSize: 10 }}>›</span>}
                    {item.onClick ? (
                        <span onClick={item.onClick} style={{ color: '#2E86AB', cursor: 'pointer', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#1B3A5C'} onMouseLeave={e => e.target.style.color = '#2E86AB'}>{item.label}</span>
                    ) : (
                        <span style={{ color: '#1B3A5C', fontWeight: 700 }}>{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
