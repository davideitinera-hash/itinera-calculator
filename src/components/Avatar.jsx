export default function Avatar({ name, size = 32 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#2E86AB', '#1B3A5C', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#ec4899', '#0891b2'];
    const colorIdx = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return (
        <div style={{ width: size, height: size, borderRadius: size / 2, background: colors[colorIdx], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, letterSpacing: -0.5 }}>
            {initials}
        </div>
    );
}
