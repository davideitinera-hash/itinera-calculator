import { useState, useEffect } from 'react';
import { useRentmanSync } from '../hooks/useRentmanSync';

const fmt = v => (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });

export default function RentmanImportModal({ onClose, onImport }) {
    const { loading, error, projects, fetchProjects, fetchDetail, mapToCalculator } = useRentmanSync();
    const [step, setStep] = useState('list');
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [preview, setPreview] = useState(null);
    const [syncResults, setSyncResults] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importOptions, setImportOptions] = useState({
        projectInfo: true,
        equipment: true,
        costs: true,
        clearExisting: false,
    });

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const handleSelectProject = async (proj) => {
        setSelectedProject(proj);
        setStep('preview');
        const detail = await fetchDetail(proj.id);
        if (detail) {
            const mapped = mapToCalculator(detail);
            setPreview(mapped);
        }
    };

    const handleImport = async () => {
        if (!preview) return;
        setStep('importing');
        setImporting(true);
        try {
            const results = await onImport({ ...preview, rentmanProjectId: selectedProject?.id || null }, importOptions);
            setSyncResults(results);
        } catch (err) {
            console.error('Import error:', err);
        } finally {
            setImporting(false);
        }
    };

    const filtered = projects.filter(p => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (p.name || '').toLowerCase().includes(s)
            || (p.reference || '').toLowerCase().includes(s)
            || (p.number || '').toString().includes(s)
            || (p.account_manager || '').toLowerCase().includes(s);
    });

    // Helper to sum sync stats
    const totalStats = (results) => {
        if (!results) return null;
        const cats = [results.equipment, results.subRentals, results.purchases, results.misc].filter(Boolean);
        if (cats.length === 0) return null;
        return cats.reduce((acc, s) => ({ added: acc.added + s.added, updated: acc.updated + s.updated, removed: acc.removed + s.removed }), { added: 0, updated: 0, removed: 0 });
    };

    return (
        <div style={overlay} onClick={onClose}>
            <div style={modal} onClick={e => e.stopPropagation()}>
                <div style={header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>📡</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#1B3A5C' }}>Importa da Rentman</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                {step === 'list' ? `${projects.length} progetti disponibili` :
                                    step === 'preview' ? selectedProject?.name : 'Importazione...'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={closeBtn}>✕</button>
                </div>

                {error && (
                    <div style={{ margin: '12px 16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
                        ⚠️ Errore: {error}
                        <button onClick={fetchProjects} style={{ marginLeft: 8, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>Riprova</button>
                    </div>
                )}

                {loading && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>
                            {step === 'list' ? 'Caricamento progetti Rentman...' : 'Caricamento dettaglio progetto...'}
                        </div>
                    </div>
                )}

                {step === 'list' && !loading && (
                    <>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="🔍  Cerca per nome, riferimento, numero..."
                                style={searchInput}
                            />
                        </div>
                        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 16px' }}>
                            {filtered.length === 0 && (
                                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                                    Nessun progetto trovato
                                </div>
                            )}
                            {filtered.map(p => (
                                <div key={p.id} onClick={() => handleSelectProject(p)} style={projectRow}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1B3A5C', marginBottom: 2 }}>
                                            {p.name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            {p.number && <span>#{p.number}</span>}
                                            {p.reference && <span>Rif: {p.reference}</span>}
                                            {p.date && <span>📅 {p.date}</span>}
                                            {p.account_manager && <span>👤 {p.account_manager}</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {p.total != null && (
                                            <div style={{ fontWeight: 700, fontSize: 14, color: '#2E86AB' }}>€{fmt(p.total)}</div>
                                        )}
                                        {p.status && (
                                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{p.status}</div>
                                        )}
                                    </div>
                                    <span style={{ color: '#cbd5e1', fontSize: 18, marginLeft: 8 }}>›</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {step === 'preview' && !loading && preview && (
                    <div style={{ padding: '16px', maxHeight: 480, overflowY: 'auto' }}>
                        <button onClick={() => { setStep('list'); setPreview(null); setSelectedProject(null); }}
                            style={{ background: 'none', border: 'none', color: '#2E86AB', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 12, padding: 0 }}>
                            ← Torna alla lista
                        </button>

                        <div style={previewCard}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#1B3A5C', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                📋 Info Progetto
                            </div>
                            <div>
                                <PreviewRow label="N° Progetto" value={preview.rentmanProject.projectNumber} />
                                <PreviewRow label="Nome" value={preview.rentmanProject.projectName} />
                                <PreviewRow label="Cliente" value={preview.rentmanProject.clientName} />
                                <PreviewRow label="Account Manager" value={preview.rentmanProject.accountManager} />
                                <PreviewRow label="Data Evento" value={preview.rentmanProject.eventDate} />
                                <PreviewRow label="Ricavo Lordo" value={preview.rentmanProject.revenueGross ? `€${fmt(preview.rentmanProject.revenueGross)}` : '—'} />
                                <PreviewRow label="Giorni Lavoro" value={preview.rentmanProject.totalWorkDays} />
                            </div>
                        </div>

                        <div style={previewCard}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#1B3A5C', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                📦 Materiale ({preview.equipmentItems.length} voci)
                            </div>
                            {preview.equipmentItems.length > 0 ? (
                                <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                                    {preview.equipmentItems.slice(0, 15).map((e, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ color: '#475569' }}>{e.qty}× {e.desc}</span>
                                            <span style={{ fontWeight: 600, color: '#1B3A5C' }}>€{fmt(e.costUnit * e.qty)}</span>
                                        </div>
                                    ))}
                                    {preview.equipmentItems.length > 15 && (
                                        <div style={{ fontSize: 10, color: '#94a3b8', padding: '4px 0' }}>
                                            ...e altri {preview.equipmentItems.length - 15} articoli
                                        </div>
                                    )}
                                </div>
                            ) : <div style={{ fontSize: 11, color: '#94a3b8' }}>Nessun materiale</div>}
                        </div>

                        {(preview.subRentals.length > 0 || preview.purchases.length > 0 || preview.miscCosts.length > 0) && (
                            <div style={previewCard}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: '#1B3A5C', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    💶 Costi Extra
                                </div>
                                {preview.subRentals.length > 0 && (() => {
                                    // Group subrentals by supplier
                                    const bySupplier = {};
                                    preview.subRentals.forEach(c => {
                                        const key = c.supplier || 'Altro';
                                        if (!bySupplier[key]) bySupplier[key] = [];
                                        bySupplier[key].push(c);
                                    });
                                    const totalSub = preview.subRentals.reduce((s, c) => s + (c.cost || 0), 0);
                                    return (
                                        <div style={{ marginBottom: 6 }}>
                                            <div style={{ fontSize: 10, fontWeight: 600, color: '#e67e22', marginBottom: 3 }}>🔄 Subaffitti ({preview.subRentals.length} righe) — €{fmt(totalSub)}</div>
                                            {Object.entries(bySupplier).map(([supplier, items]) => (
                                                <div key={supplier} style={{ marginBottom: 4, paddingLeft: 6, borderLeft: '2px solid #e67e22' }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1B3A5C', marginBottom: 2 }}>{supplier}</div>
                                                    {items.map((c, i) => (
                                                        <div key={i} style={costRow}>
                                                            <span>{c.qty && c.qty > 1 ? `${c.qty}× ` : ''}{c.desc}</span>
                                                            <span style={{ fontWeight: 600 }}>€{fmt(c.cost)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                                {preview.purchases.length > 0 && (
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#9b59b6', marginBottom: 3 }}>Acquisti ({preview.purchases.length})</div>
                                        {preview.purchases.map((c, i) => (
                                            <div key={i} style={costRow}>
                                                <span>{c.supplier ? `[${c.supplier}] ` : ''}{c.qty && c.qty > 1 ? `${c.qty}× ` : ''}{c.desc}</span><span style={{ fontWeight: 600 }}>€{fmt(c.cost)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {preview.miscCosts.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#34495e', marginBottom: 3 }}>Altro ({preview.miscCosts.length})</div>
                                        {preview.miscCosts.map((c, i) => (
                                            <div key={i} style={costRow}>
                                                <span>{c.qty && c.qty > 1 ? `${c.qty}× ` : ''}{c.desc}</span><span style={{ fontWeight: 600 }}>€{fmt(c.cost)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {preview.rentmanTotals && (
                            <div style={{ ...previewCard, background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: '#0369a1', marginBottom: 6 }}>📊 Totali Rentman</div>
                                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
                                    {preview.rentmanTotals.total != null && <span>Totale: <b>€{fmt(preview.rentmanTotals.total)}</b></span>}
                                    {preview.rentmanTotals.rental != null && <span>Noleggio: €{fmt(preview.rentmanTotals.rental)}</span>}
                                    {preview.rentmanTotals.crew != null && preview.rentmanTotals.crew > 0 && <span>Crew: €{fmt(preview.rentmanTotals.crew)}</span>}
                                    {preview.rentmanTotals.transport != null && preview.rentmanTotals.transport > 0 && <span>Trasporto: €{fmt(preview.rentmanTotals.transport)}</span>}
                                    {preview.rentmanTotals.weight_kg != null && <span>Peso: {fmt(preview.rentmanTotals.weight_kg)}kg</span>}
                                    {preview.rentmanTotals.volume_m3 != null && <span>Volume: {(preview.rentmanTotals.volume_m3 || 0).toFixed(1)}m³</span>}
                                </div>
                            </div>
                        )}

                        <div style={{ ...previewCard, border: '2px solid #2E86AB' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#1B3A5C', marginBottom: 10, textTransform: 'uppercase' }}>
                                ⚙️ Opzioni Importazione
                            </div>
                            <label style={checkLabel}>
                                <input type="checkbox" checked={importOptions.projectInfo} onChange={e => setImportOptions(p => ({ ...p, projectInfo: e.target.checked }))} />
                                Info progetto (nome, cliente, data, ricavo, giorni)
                            </label>
                            <label style={checkLabel}>
                                <input type="checkbox" checked={importOptions.equipment} onChange={e => setImportOptions(p => ({ ...p, equipment: e.target.checked }))} />
                                Materiale ({preview.equipmentItems.length} articoli)
                            </label>
                            <label style={checkLabel}>
                                <input type="checkbox" checked={importOptions.costs} onChange={e => setImportOptions(p => ({ ...p, costs: e.target.checked }))} />
                                Costi extra ({preview.subRentals.length + preview.purchases.length + preview.miscCosts.length} voci)
                            </label>
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 8 }}>
                                <label style={{ ...checkLabel, color: '#dc2626' }}>
                                    <input type="checkbox" checked={importOptions.clearExisting} onChange={e => setImportOptions(p => ({ ...p, clearExisting: e.target.checked }))} />
                                    ⚠️ Cancella dati esistenti prima dell'importazione
                                </label>
                                {!importOptions.clearExisting && (
                                    <div style={{ fontSize: 10, color: '#16a34a', marginTop: 4, padding: '4px 8px', background: '#f0fdf4', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                                        🔄 Sync incrementale: aggiorna esistenti, aggiunge nuovi, rimuove obsoleti. I campi manuali (owned, purchase_price, IVA) saranno preservati.
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={handleImport} style={importBtn}>
                            {importOptions.clearExisting ? '📥 Importa nel Calculator' : '🔄 Sincronizza con Calculator'}
                        </button>
                    </div>
                )}

                {step === 'importing' && (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        {importing ? (
                            <>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#2E86AB', marginBottom: 8 }}>
                                    {importOptions.clearExisting ? 'Importazione in corso...' : 'Sincronizzazione in corso...'}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                    Attendere, operazione sui dati Rentman...
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#16a34a', marginBottom: 8 }}>
                                    {syncResults?.mode === 'sync' ? 'Sincronizzazione completata!' : 'Importazione completata!'}
                                </div>
                                {syncResults?.mode === 'sync' && (() => {
                                    const t = totalStats(syncResults);
                                    return t ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{t.added}</div>
                                                <div style={{ fontSize: 10, color: '#64748b' }}>Aggiunti</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#2E86AB' }}>{t.updated}</div>
                                                <div style={{ fontSize: 10, color: '#64748b' }}>Aggiornati</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#e74c3c' }}>{t.removed}</div>
                                                <div style={{ fontSize: 10, color: '#64748b' }}>Rimossi</div>
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
                                    {syncResults?.mode === 'sync'
                                        ? 'I dati sono stati sincronizzati. I campi manuali sono stati preservati.'
                                        : 'I dati Rentman sono stati importati nel Calculator.'}
                                </div>
                                <button onClick={onClose} style={{ ...importBtn, background: '#1B3A5C' }}>
                                    Chiudi
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function PreviewRow({ label, value }) {
    if (!value && value !== 0) return null;
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>{label}</span>
            <span style={{ fontWeight: 600, color: '#1B3A5C' }}>{value}</span>
        </div>
    );
}

const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
};
const modal = {
    background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
};
const header = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
};
const closeBtn = {
    background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
    color: '#94a3b8', padding: '4px 8px', borderRadius: 4,
};
const searchInput = {
    width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    background: '#f8fafc',
};
const projectRow = {
    display: 'flex', alignItems: 'center', padding: '12px 14px',
    borderRadius: 8, cursor: 'pointer', marginBottom: 4,
    border: '1px solid #f1f5f9', transition: 'all 0.15s',
};
const previewCard = {
    background: '#f8fafc', borderRadius: 8, padding: '12px 14px',
    marginBottom: 10, border: '1px solid #e2e8f0',
};
const costRow = {
    display: 'flex', justifyContent: 'space-between', fontSize: 11,
    padding: '2px 0', color: '#475569',
};
const checkLabel = {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12, color: '#475569', cursor: 'pointer', marginBottom: 6,
};
const importBtn = {
    width: '100%', padding: '14px', background: '#2E86AB', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', marginTop: 8, transition: 'background 0.2s',
};
