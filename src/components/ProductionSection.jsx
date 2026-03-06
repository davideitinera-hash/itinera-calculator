import { useMemo } from 'react';

// ═══ GANTT COLORS ═══
const GANTT_COLORS = [
    '#8e44ad', '#3498db', '#e67e22', '#27ae60', '#e74c3c',
    '#1abc9c', '#f39c12', '#9b59b6', '#2980b9', '#d35400',
];

// ═══ HELPER COMPONENTS (match parent style) ═══
const Inp = ({ value, onChange, type = 'text', ph, align, style: sx = {} }) => (
    <input
        type={type}
        value={value ?? ''}
        placeholder={ph}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) || 0 : e.target.value)}
        style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 11, width: '100%', textAlign: align || 'left', ...sx }}
    />
);

const X = ({ onClick }) => (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: '0 4px' }} title="Elimina">×</button>
);

const Btn = ({ onClick, children, color = '#8e44ad' }) => (
    <button onClick={onClick} style={{ background: color, color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>{children}</button>
);

const fmt = v => (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });

// ═══ MAIN COMPONENT ═══
export function ProductionSection({ phases, onUpdate, onAdd, onDelete, getDragProps }) {
    // ── CALCS ──
    const phaseCalcs = useMemo(() => {
        return (phases || []).map(p => ({
            ...p,
            manHours: (p.crew || 0) * (p.hours || 0),
        }));
    }, [phases]);

    const totalManHours = useMemo(() => {
        return phaseCalcs.reduce((s, p) => s + p.manHours, 0);
    }, [phaseCalcs]);

    // ── GANTT TIMELINE ──
    const ganttData = useMemo(() => {
        // Filter phases that have valid start AND end datetime
        const valid = (phases || []).filter(p => p.ds && p.de).map(p => ({
            ...p,
            startMs: new Date(p.ds).getTime(),
            endMs: new Date(p.de).getTime(),
        })).filter(p => !isNaN(p.startMs) && !isNaN(p.endMs) && p.endMs > p.startMs);

        if (valid.length === 0) return null;

        const minTime = Math.min(...valid.map(v => v.startMs));
        const maxTime = Math.max(...valid.map(v => v.endMs));
        const totalSpan = maxTime - minTime;
        if (totalSpan <= 0) return null;

        // Generate time markers (every 6 hours, or every day if span > 3 days)
        const spanHours = totalSpan / (1000 * 60 * 60);
        const markers = [];
        const stepMs = spanHours > 72 ? 24 * 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
        let t = Math.ceil(minTime / stepMs) * stepMs;
        while (t < maxTime) {
            const dt = new Date(t);
            const label = spanHours > 72
                ? dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                : dt.toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            markers.push({ pct: ((t - minTime) / totalSpan) * 100, label });
            t += stepMs;
        }

        const bars = valid.map((v, i) => ({
            id: v.id,
            phase: v.phase || `Fase ${i + 1}`,
            leftPct: ((v.startMs - minTime) / totalSpan) * 100,
            widthPct: Math.max(((v.endMs - v.startMs) / totalSpan) * 100, 1.5),
            color: GANTT_COLORS[i % GANTT_COLORS.length],
            crew: v.crew,
            hours: v.hours,
            startLabel: new Date(v.startMs).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            endLabel: new Date(v.endMs).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        }));

        return { bars, markers, minTime, maxTime };
    }, [phases]);

    return (
        <div>
            {/* ── TABLE ── */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '0.2fr 1.8fr 1fr 1fr 0.4fr 0.4fr 0.5fr 1.5fr auto', gap: 3, minWidth: 750, marginBottom: 3 }}>
                    {['#', 'Fase', 'Inizio', 'Fine', 'Crew', 'Ore', 'Ore/u', 'Note', ''].map(h => (
                        <span key={h} style={{ fontSize: 8, color: '#999', fontWeight: 600 }}>{h}</span>
                    ))}
                </div>

                {/* Rows */}
                {phaseCalcs.map((p, i) => (
                    <div key={p.id} {...getDragProps(i)} style={{ ...getDragProps(i).style, display: 'grid', gridTemplateColumns: 'auto 0.2fr 1.8fr 1fr 1fr 0.4fr 0.4fr 0.5fr 1.5fr auto', gap: 3, minWidth: 750, marginBottom: 2, alignItems: 'center', background: i % 2 === 0 ? '#faf8fd' : 'transparent', borderRadius: 3, padding: '1px 2px' }}>
                        <span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16, userSelect: 'none', padding: '0 4px' }} title="Trascina per riordinare">⠿</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#8e44ad', textAlign: 'center' }}>{i + 1}</span>
                        <Inp value={p.phase} onChange={v => onUpdate(p.id, 'phase', v)} ph="Nome fase..." />
                        <Inp type="datetime-local" value={p.ds} onChange={v => onUpdate(p.id, 'ds', v)} />
                        <Inp type="datetime-local" value={p.de} onChange={v => onUpdate(p.id, 'de', v)} />
                        <Inp type="number" value={p.crew} onChange={v => onUpdate(p.id, 'crew', v)} align="center" />
                        <Inp type="number" value={p.hours} onChange={v => onUpdate(p.id, 'hours', v)} align="center" />
                        <div style={{ fontSize: 10, textAlign: 'center', fontWeight: 600, color: '#8e44ad' }}>{p.manHours}</div>
                        <Inp value={p.notes} onChange={v => onUpdate(p.id, 'notes', v)} ph="Note..." />
                        <X onClick={() => onDelete(p.id)} />
                    </div>
                ))}

                <Btn onClick={() => onAdd({ phase: '', ds: '', de: '', crew: 2, hours: 4, notes: '' })}>+ Fase</Btn>
            </div>

            {/* ── TOTALS BAR ── */}
            <div style={{ marginTop: 8, padding: '6px 10px', background: '#f3eef8', borderRadius: 5, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, fontWeight: 600 }}>
                <span>📊 Fasi: <strong>{phaseCalcs.length}</strong></span>
                <span>👥 Ore/Uomo Totali: <strong style={{ color: '#8e44ad' }}>{fmt(totalManHours)}</strong></span>
                <span>⏱ Media ore/fase: <strong>{phaseCalcs.length > 0 ? (totalManHours / phaseCalcs.length).toFixed(1) : 0}</strong></span>
            </div>

            {/* ── VISUAL GANTT (TIMELINE) ── */}
            <div style={{ marginTop: 14, background: '#faf8fd', borderRadius: 6, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#8e44ad', marginBottom: 6 }}>📅 CRONOPROGRAMMA VISUALE</div>

                {!ganttData ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: '#bbb', fontSize: 11, fontStyle: 'italic' }}>
                        Inserisci date di inizio e fine per visualizzare il cronoprogramma
                    </div>
                ) : (
                    <div>
                        {/* Time axis markers */}
                        <div style={{ position: 'relative', height: 18, marginLeft: 120, marginRight: 8, borderBottom: '1px solid #e0d8ea' }}>
                            {ganttData.markers.map((m, i) => (
                                <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, bottom: 0, transform: 'translateX(-50%)', fontSize: 7, color: '#999', whiteSpace: 'nowrap' }}>
                                    <div style={{ width: 1, height: 4, background: '#ccc', margin: '0 auto 1px' }} />
                                    {m.label}
                                </div>
                            ))}
                        </div>

                        {/* Bars */}
                        {ganttData.bars.map(bar => (
                            <div key={bar.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 3, height: 22 }}>
                                {/* Label */}
                                <div style={{ width: 115, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 5 }} title={bar.phase}>
                                    {bar.phase}
                                </div>
                                {/* Bar container */}
                                <div style={{ flex: 1, position: 'relative', height: 18, marginRight: 8 }}>
                                    {/* Track */}
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: 7, height: 4, background: '#e8e0f0', borderRadius: 2 }} />
                                    {/* Bar */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: `${bar.leftPct}%`,
                                            width: `${bar.widthPct}%`,
                                            top: 1,
                                            height: 16,
                                            background: `linear-gradient(135deg, ${bar.color}cc, ${bar.color})`,
                                            borderRadius: 4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            boxShadow: `0 1px 3px ${bar.color}40`,
                                            cursor: 'default',
                                        }}
                                        title={`${bar.phase}\n${bar.startLabel} → ${bar.endLabel}\nCrew: ${bar.crew} × ${bar.hours}h = ${bar.crew * bar.hours} ore/uomo`}
                                    >
                                        <span style={{ fontSize: 7, color: '#fff', fontWeight: 700, padding: '0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {bar.phase} ({bar.crew}×{bar.hours}h)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Legend */}
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 8, color: '#aaa' }}>
                            {ganttData.bars.map(bar => (
                                <span key={bar.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: bar.color, display: 'inline-block' }} />
                                    {bar.phase}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
