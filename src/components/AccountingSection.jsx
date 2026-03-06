import { useState, useMemo } from 'react';

const fmt = v => (v || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
const fmtDate = d => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('it-IT'); } catch { return '—'; } };

const Card = ({ title, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 12, overflow: 'hidden' }}>
            <button onClick={() => setOpen(!open)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1B3A5C' }}>
                {title} <span style={{ fontSize: 10, color: '#94a3b8' }}>{open ? '▲' : '▼'}</span>
            </button>
            {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
        </div>
    );
};

const Badge = ({ label, color, bg }) => (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color }}>{label}</span>
);

const invoiceBadge = (inv) => {
    if (inv.isPaid) return <Badge label="🟢 Pagata" color="#15803d" bg="#dcfce7" />;
    if (inv.finalized === false) return <Badge label="⚪ Bozza" color="#475569" bg="#f1f5f9" />;
    if (inv.outstandingBalance > 0 && inv.daysAfterExpiry > 0) return <Badge label="🔴 Scaduta" color="#dc2626" bg="#fef2f2" />;
    if (inv.outstandingBalance > 0) return <Badge label="🟡 Aperta" color="#a16207" bg="#fef9c3" />;
    return <Badge label="—" color="#94a3b8" bg="#f8fafc" />;
};

const thStyle = { fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #f1f5f9' };
const tdStyle = { fontSize: 11, color: '#334155', padding: '6px 8px', borderBottom: '1px solid #f8fafc' };
const tdRight = { ...tdStyle, textAlign: 'right', fontWeight: 600 };

const DocTable = ({ items, label }) => {
    if (!items || items.length === 0) return null;
    return (
        <Card title={`${label === 'Preventivi' ? '📋' : '📝'} ${label} (${items.length})`}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                        <th style={thStyle}>N° / Versione</th>
                        <th style={thStyle}>Data</th>
                        <th style={thStyle}>Scadenza</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Prezzo IVA escl.</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Prezzo IVA incl.</th>
                    </tr></thead>
                    <tbody>{items.map((it, i) => (
                        <tr key={it.id || i}>
                            <td style={tdStyle}>{it.displayname || it.number || '—'}</td>
                            <td style={tdStyle}>{fmtDate(it.date)}</td>
                            <td style={tdStyle}>{fmtDate(it.expirationDate)}</td>
                            <td style={tdRight}>{fmt(it.price)}</td>
                            <td style={tdRight}>{fmt(it.priceInVat)}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </Card>
    );
};

export function AccountingSection({ accounting, onSync }) {
    const [syncing, setSyncing] = useState(false);

    const invoiceTotals = useMemo(() => {
        const inv = accounting?.invoices || [];
        return {
            totalInvoiced: inv.reduce((s, i) => s + (i.priceInVat || 0), 0),
            totalPaid: inv.reduce((s, i) => s + (i.totalPaid || 0), 0),
            totalOutstanding: inv.reduce((s, i) => s + (i.outstandingBalance || 0), 0),
        };
    }, [accounting?.invoices]);

    const handleSync = async () => {
        setSyncing(true);
        try { await onSync(); } finally { setSyncing(false); }
    };

    const fo = accounting?.financeOverview || {};
    const br = fo.breakdown || {};
    const progressPct = invoiceTotals.totalInvoiced > 0 ? (invoiceTotals.totalPaid / invoiceTotals.totalInvoiced) * 100 : 0;

    return (
        <div>
            {/* Header + Sync */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1B3A5C' }}>🧾 Contabilità Rentman</div>
                    {accounting?.lastSyncAt && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Ultimo sync: {fmtDate(accounting.lastSyncAt)}</div>}
                </div>
                <button onClick={handleSync} disabled={syncing} style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: syncing ? 'wait' : 'pointer', opacity: syncing ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {syncing ? '⏳ Sync...' : '🔄 Sync Contabilità'}
                </button>
            </div>

            {/* Empty state */}
            {!accounting && (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>Nessun dato contabile</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Clicca "Sync Contabilità" per importare da Rentman</div>
                </div>
            )}

            {accounting && (
                <>
                    {/* Preventivi */}
                    <DocTable items={accounting.quotes} label="Preventivi" />

                    {/* Contratti */}
                    <DocTable items={accounting.contracts} label="Contratti" />

                    {/* Fatture */}
                    {accounting.invoices?.length > 0 && (
                        <Card title={`💰 Fatture (${accounting.invoices.length})`}>
                            {/* Invoice metrics */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                {[
                                    { label: '🧾 Fatturato', value: invoiceTotals.totalInvoiced, bg: '#f1f5f9', color: '#334155' },
                                    { label: '🟢 Incassato', value: invoiceTotals.totalPaid, bg: '#dcfce7', color: '#15803d' },
                                    { label: '🔴 Da incassare', value: invoiceTotals.totalOutstanding, bg: '#fef2f2', color: '#dc2626' },
                                ].map(m => (
                                    <div key={m.label} style={{ flex: 1, minWidth: 120, background: m.bg, borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: m.color }}>{fmt(m.value)}</div>
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{m.label}</div>
                                    </div>
                                ))}
                            </div>
                            {/* Invoice table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>
                                        <th style={thStyle}>N°</th>
                                        <th style={thStyle}>Data</th>
                                        <th style={thStyle}>Scadenza</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Prezzo</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>In sospeso</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Pagato</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Stato</th>
                                    </tr></thead>
                                    <tbody>{accounting.invoices.map((inv, i) => (
                                        <tr key={inv.id || i}>
                                            <td style={tdStyle}>{inv.number || inv.displayname || '—'}</td>
                                            <td style={tdStyle}>{fmtDate(inv.date)}</td>
                                            <td style={tdStyle}>{fmtDate(inv.expirationDate)}</td>
                                            <td style={tdRight}>{fmt(inv.price)}</td>
                                            <td style={{ ...tdRight, color: inv.outstandingBalance > 0 ? '#dc2626' : '#15803d' }}>{fmt(inv.outstandingBalance)}</td>
                                            <td style={{ ...tdRight, color: '#15803d' }}>{fmt(inv.totalPaid)}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{invoiceBadge(inv)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Panoramica Finanze */}
                    {fo.breakdown && (
                        <Card title="📊 Panoramica Finanze">
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                                Fonte: {fo.source === 'contract' ? 'Contratto' : 'Preventivo'} {fo.sourceNumber || ''}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                                <tbody>
                                    {[
                                        { icon: '🔧', cat: 'Noleggio', val: br.noleggio },
                                        { icon: '🛒', cat: 'Vendita', val: br.vendita },
                                        { icon: '👥', cat: 'Personale', val: br.personale },
                                        { icon: '🚚', cat: 'Trasporti', val: br.trasporti },
                                        { icon: '📦', cat: 'Costi aggiuntivi', val: br.costiAggiuntivi },
                                        { icon: '🛡️', cat: 'Assicurazione', val: br.assicurazione },
                                    ].map(r => (
                                        <tr key={r.cat}>
                                            <td style={{ ...tdStyle, fontSize: 12 }}>{r.icon} {r.cat}</td>
                                            <td style={tdRight}>{fmt(r.val)}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                                        <td style={{ ...tdStyle, fontWeight: 800, fontSize: 12 }}>TOTALE</td>
                                        <td style={{ ...tdRight, fontWeight: 800, fontSize: 13 }}>{fmt(fo.totalPrice)}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Progress bar */}
                            <div style={{ marginTop: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>{fmt(invoiceTotals.totalPaid)} incassato</span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>su {fmt(fo.totalInvoicedInVat || invoiceTotals.totalInvoiced)} fatturato</span>
                                </div>
                                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                                    <div style={{ width: Math.min(progressPct, 100) + '%', height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: 5, transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
