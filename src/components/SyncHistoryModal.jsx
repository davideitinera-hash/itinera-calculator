import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };
const modal = { background: '#fff', borderRadius: 14, width: '95%', maxWidth: 560, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };
const header = { padding: '16px 20px', background: 'linear-gradient(135deg, #1B3A5C, #2E86AB)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const closeBtn = { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' };

const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

const fmtDuration = (ms) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
};

const StatBadge = ({ value, color }) => (
    <span style={{ display: 'inline-block', minWidth: 18, textAlign: 'center', padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: color + '18', color }}>{value}</span>
);

export default function SyncHistoryModal({ projectId, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('sync_logs')
                .select('*')
                .eq('project_id', projectId)
                .order('synced_at', { ascending: false })
                .limit(20);
            if (!cancelled) {
                setLogs(data || []);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [projectId]);

    return (
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={e => e.stopPropagation()}>
                <div style={header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🕐</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Cronologia Sync</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{logs.length} operazioni registrate</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={closeBtn}>✕</button>
                </div>

                <div style={{ maxHeight: 'calc(80vh - 70px)', overflowY: 'auto' }}>
                    {loading && (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                            <div style={{ color: '#64748b', fontSize: 13 }}>Caricamento cronologia...</div>
                        </div>
                    )}

                    {!loading && logs.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>Nessuna sync effettuata</div>
                        </div>
                    )}

                    {!loading && logs.length > 0 && (
                        <div style={{ padding: '12px 16px' }}>
                            {/* Table header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '110px 72px 1fr 1fr 52px', gap: 6, padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #e2e8f0' }}>
                                <span>Data/Ora</span>
                                <span>Tipo</span>
                                <span>Equipment</span>
                                <span>Costi</span>
                                <span>Durata</span>
                            </div>

                            {logs.map(log => {
                                const isIncremental = log.sync_type === 'incremental';
                                const hasError = log.errors && log.errors.startsWith('ERRORE');
                                return (
                                    <div key={log.id} style={{ borderBottom: '1px solid #f1f5f9', background: hasError ? '#fef2f2' : 'transparent' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '110px 72px 1fr 1fr 52px', gap: 6, padding: '8px 8px', fontSize: 11, alignItems: 'center' }}>
                                            <span style={{ color: '#475569', fontSize: 10 }}>{fmtDate(log.synced_at)}</span>
                                            <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textAlign: 'center', background: hasError ? '#fee2e2' : isIncremental ? '#dbeafe' : '#fef3c7', color: hasError ? '#dc2626' : isIncremental ? '#1d4ed8' : '#b45309' }}>
                                                {hasError ? '❌ Err' : isIncremental ? '🔄 Sync' : '📥 Full'}
                                            </span>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {(log.equipment_added > 0 || log.equipment_updated > 0 || log.equipment_removed > 0) ? (
                                                    <>
                                                        {log.equipment_added > 0 && <StatBadge value={`+${log.equipment_added}`} color="#16a34a" />}
                                                        {log.equipment_updated > 0 && <StatBadge value={`↻${log.equipment_updated}`} color="#2563eb" />}
                                                        {log.equipment_removed > 0 && <StatBadge value={`-${log.equipment_removed}`} color="#dc2626" />}
                                                    </>
                                                ) : <span style={{ color: '#cbd5e1', fontSize: 10 }}>—</span>}
                                                {log.items_skipped > 0 && <StatBadge value={`⚠${log.items_skipped}`} color="#d97706" />}
                                            </div>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {(log.costs_added > 0 || log.costs_updated > 0 || log.costs_removed > 0) ? (
                                                    <>
                                                        {log.costs_added > 0 && <StatBadge value={`+${log.costs_added}`} color="#16a34a" />}
                                                        {log.costs_updated > 0 && <StatBadge value={`↻${log.costs_updated}`} color="#2563eb" />}
                                                        {log.costs_removed > 0 && <StatBadge value={`-${log.costs_removed}`} color="#dc2626" />}
                                                    </>
                                                ) : <span style={{ color: '#cbd5e1', fontSize: 10 }}>—</span>}
                                            </div>
                                            <span style={{ color: '#64748b', fontSize: 10, textAlign: 'right' }}>{fmtDuration(log.duration_ms)}</span>
                                        </div>
                                        {log.errors && (
                                            <div style={{ padding: '2px 8px 6px', fontSize: 9, color: hasError ? '#dc2626' : '#d97706', fontStyle: 'italic' }}>
                                                {log.errors.length > 80 ? log.errors.substring(0, 80) + '…' : log.errors}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
