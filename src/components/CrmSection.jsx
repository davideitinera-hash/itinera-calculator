import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const WEBHOOK_URL = 'https://n8n.itinerapro.com/webhook/crm-sync';

const LINK_CONFIG = [
    { key: 'kommo_lead_url', label: 'Kommo', icon: '📊', color: '#1B3A5C', always: true },
    { key: 'link_wrike', label: 'Wrike', icon: '📁', color: '#2E86AB' },
    { key: 'link_sharepoint', label: 'SharePoint', icon: '📂', color: '#0078d4' },
    { key: 'link_rentman', label: 'Rentman', icon: '🔧', color: '#e67e22' },
    { key: 'link_slack', label: 'Slack', icon: '💬', color: '#4A154B' },
];

const CHIP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'];

function parseJsonChips(val) {
    if (!val) return [];
    try {
        const arr = JSON.parse(val);
        return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
        return [];
    }
}

function fmtCurrency(v) {
    return (v || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function fmtDate(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return d;
    }
}

function fmtDateTime(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return d;
    }
}

function Field({ label, value }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', padding: '6px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', minHeight: 20 }}>{value || '—'}</div>
        </div>
    );
}

function ChipField({ label, jsonValue }) {
    const chips = parseJsonChips(jsonValue);
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 20 }}>
                {chips.length > 0 ? chips.map((c, i) => (
                    <span key={i} style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: CHIP_COLORS[i % CHIP_COLORS.length] + '18',
                        color: CHIP_COLORS[i % CHIP_COLORS.length],
                        border: `1px solid ${CHIP_COLORS[i % CHIP_COLORS.length]}30`,
                    }}>{c}</span>
                )) : <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>}
            </div>
        </div>
    );
}

export function CrmSection({ projectId }) {
    const [crmData, setCrmData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [kommoLeadId, setKommoLeadId] = useState('');
    const [linking, setLinking] = useState(false);

    const loadCrmData = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('crm_data')
                .select('*')
                .eq('project_id', projectId)
                .maybeSingle();
            if (error) {
                console.error('[CRM] Load error:', error);
                setCrmData(null);
            } else {
                setCrmData(data);
            }
        } catch (err) {
            console.error('[CRM] Load exception:', err);
            setCrmData(null);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadCrmData(); }, [loadCrmData]);

    const handleSync = useCallback(async (leadId) => {
        if (!leadId) return;
        setSyncing(true);
        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kommoLeadId: String(leadId), projectId }),
            });
            if (!res.ok) console.error('[CRM] Sync HTTP error:', res.status);
            // Wait for n8n to process
            await new Promise(r => setTimeout(r, 3000));
            await loadCrmData();
        } catch (err) {
            console.error('[CRM] Sync error:', err);
        } finally {
            setSyncing(false);
        }
    }, [projectId, loadCrmData]);

    const handleLink = useCallback(async () => {
        const id = kommoLeadId.trim();
        if (!id) return;
        setLinking(true);
        try {
            await handleSync(id);
            setKommoLeadId('');
        } finally {
            setLinking(false);
        }
    }, [kommoLeadId, handleSync]);

    // ── LOADING ──
    if (loading) {
        return (
            <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Caricamento dati CRM...</div>
            </div>
        );
    }

    // ── STATE 1: NOT LINKED ──
    if (!crmData) {
        return (
            <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.7 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1B3A5C', marginBottom: 6 }}>Progetto non collegato a Kommo</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Per collegare, inserisci il Lead ID di Kommo</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <input
                        type="number"
                        value={kommoLeadId}
                        onChange={e => setKommoLeadId(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleLink(); }}
                        placeholder="Lead ID..."
                        style={{ padding: '8px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 13, width: 160, outline: 'none', textAlign: 'center' }}
                    />
                    <button
                        onClick={handleLink}
                        disabled={linking || !kommoLeadId.trim()}
                        style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            background: linking ? '#94a3b8' : '#2E86AB', color: '#fff', transition: 'all 0.2s',
                            opacity: !kommoLeadId.trim() ? 0.5 : 1,
                        }}
                    >
                        {linking ? '⏳ Collegamento...' : '🔗 Collega'}
                    </button>
                </div>
            </div>
        );
    }

    // ── STATE 2: LINKED ──
    const crm = crmData;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1B3A5C' }}>📋 Anagrafica CRM</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={() => handleSync(crm.kommo_lead_id)}
                        disabled={syncing}
                        style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            background: syncing ? '#f1f5f9' : '#2E86AB', color: syncing ? '#64748b' : '#fff', transition: 'all 0.2s',
                        }}
                    >
                        {syncing ? '⏳ Sincronizzazione...' : '🔄 Kommo Sync'}
                    </button>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        Ultimo sync: {fmtDateTime(crm.last_sync_at)}
                    </span>
                </div>
            </div>

            {/* Two Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 12 }}>
                {/* Left Column — Dati Commerciali */}
                <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dati Commerciali</div>
                    <Field label="Responsabile" value={crm.responsible_user} />
                    <Field label="Sale" value={crm.sale != null ? fmtCurrency(crm.sale) : null} />
                    <Field label="Classe Fatturato" value={crm.classe_fatturato} />
                    <Field label="Assistente" value={crm.assistente} />
                    <Field label="Commessa Rentman" value={crm.commessa_rentman} />
                    <Field label="Source" value={crm.source} />
                    <Field label="Referal" value={crm.referal} />
                </div>

                {/* Right Column — Dati Evento */}
                <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dati Evento</div>
                    <Field label="Giorno Evento" value={fmtDate(crm.giorno_evento)} />
                    <Field label="Fine Evento" value={fmtDate(crm.fine_evento)} />
                    <Field label="Location" value={crm.location} />
                    <Field label="Segmento" value={crm.segmento} />
                    <ChipField label="Prodotto / Servizio" jsonValue={crm.prodotto_servizio} />
                    <ChipField label="Tipo Evento" jsonValue={crm.tipo_evento} />
                    <Field label="Pax (fascia)" value={crm.pax_fascia} />
                </div>
            </div>

            {/* Link Operativi */}
            <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Link Operativi</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {LINK_CONFIG.map(link => {
                        const url = crm[link.key];
                        if (!url && !link.always) return null;
                        return (
                            <a
                                key={link.key}
                                href={url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => { if (!url) e.preventDefault(); }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
                                    fontSize: 12, fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s',
                                    background: url ? link.color + '12' : '#f1f5f9',
                                    color: url ? link.color : '#cbd5e1',
                                    border: `1px solid ${url ? link.color + '30' : '#e2e8f0'}`,
                                    cursor: url ? 'pointer' : 'default',
                                    opacity: url ? 1 : 0.5,
                                }}
                            >
                                <span style={{ fontSize: 14 }}>{link.icon}</span>
                                {link.label}
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
