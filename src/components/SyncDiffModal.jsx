import { useState } from 'react';

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };
const modal = { background: '#fff', borderRadius: 14, width: '95%', maxWidth: 640, maxHeight: '85vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' };
const header = { padding: '16px 20px', background: 'linear-gradient(135deg, #1B3A5C, #2E86AB)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const fmtVal = (v) => {
    if (v == null || v === '') return '—';
    if (typeof v === 'number') return v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
    return String(v);
};

function DiffField({ label, oldVal, newVal }) {
    if (oldVal === newVal) return null;
    return (
        <span style={{ fontSize: 10, color: '#475569', marginRight: 6 }}>
            {label}: <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{fmtVal(oldVal)}</span>
            {' → '}
            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{fmtVal(newVal)}</span>
        </span>
    );
}

function SectionHeader({ icon, title, count, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0 6px', borderBottom: `2px solid ${color}22` }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontWeight: 700, fontSize: 13, color }}>{title}</span>
            <span style={{ background: color + '18', color, padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{count}</span>
        </div>
    );
}

export default function SyncDiffModal({ diff, onApply, onCancel }) {
    const [applying, setApplying] = useState(false);
    const { updates, additions, removals } = diff;
    const total = updates.length + additions.length + removals.length;

    const handleApply = async () => {
        setApplying(true);
        onApply();
    };

    return (
        <div style={overlay} onClick={onCancel}>
            <div style={modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22 }}>🔍</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Anteprima Sync</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                                {total === 0 ? 'Nessuna modifica rilevata' : `${total} modifiche da applicare`}
                            </div>
                        </div>
                    </div>
                    <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Summary bar */}
                <div style={{ display: 'flex', gap: 12, padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>
                        ↻ {updates.length} da aggiornare
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700 }}>
                        + {additions.length} da aggiungere
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>
                        − {removals.length} da rimuovere
                    </div>
                </div>

                {/* Content */}
                <div style={{ maxHeight: 'calc(85vh - 190px)', overflowY: 'auto', padding: '0 20px 16px' }}>

                    {/* Updates */}
                    {updates.length > 0 && (
                        <div>
                            <SectionHeader icon="↻" title="Aggiornamenti" count={updates.length} color="#2563eb" />
                            {updates.map((u, i) => (
                                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', marginBottom: 3 }}>
                                        {u.description || u.desc || `Item #${u.rentmanId}`}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        {u.changes.map((ch, j) => (
                                            <DiffField key={j} label={ch.field} oldVal={ch.oldVal} newVal={ch.newVal} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Additions */}
                    {additions.length > 0 && (
                        <div>
                            <SectionHeader icon="+" title="Nuovi" count={additions.length} color="#16a34a" />
                            {additions.map((a, i) => (
                                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 500 }}>
                                        {a.desc || `Item #${a.rentmanId}`}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        {a.type === 'equipment' ? `qty: ${a.qty || 1}` : `€${fmtVal(a.cost)}${a.qty && a.qty > 1 ? ` × ${a.qty}` : ''}`}
                                    </span>
                                    {a.supplier && <span style={{ fontSize: 10, color: '#94a3b8' }}>({a.supplier})</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Removals */}
                    {removals.length > 0 && (
                        <div>
                            <SectionHeader icon="−" title="Da rimuovere" count={removals.length} color="#dc2626" />
                            {removals.map((r, i) => (
                                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through' }}>
                                        {r.description || `Item #${r.rentmanId}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {total === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                            <div style={{ fontSize: 13 }}>Tutti gli item sono già sincronizzati!</div>
                        </div>
                    )}

                    {/* Note */}
                    <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fef3c7', fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14 }}>ℹ️</span>
                        I campi manuali (owned, purchase_price, IVA) saranno preservati
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
                    <button
                        onClick={onCancel}
                        disabled={applying}
                        style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                        ❌ Annulla
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={applying || total === 0}
                        style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: applying ? 'wait' : 'pointer',
                            background: applying ? '#93c5fd' : 'linear-gradient(135deg, #2E86AB, #1B3A5C)', color: '#fff',
                            opacity: total === 0 ? 0.5 : 1,
                        }}
                    >
                        {applying ? '⏳ Applicando...' : '✅ Applica'}
                    </button>
                </div>
            </div>
        </div>
    );
}
