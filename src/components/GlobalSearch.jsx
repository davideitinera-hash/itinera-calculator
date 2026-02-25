import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function GlobalSearch({ onSelectProject, onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        const timeout = setTimeout(async () => {
            setLoading(true);
            const { data } = await supabase.from('projects').select('id, project_name, client_name, event_type, status, revenue_gross, event_date').or('project_name.ilike.%' + query + '%,client_name.ilike.%' + query + '%').order('updated_at', { ascending: false }).limit(10);
            if (data) setResults(data);
            setLoading(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [query]);

    const STATUS = { draft: 'Bozza', sent: 'Inviato', approved: 'Approvato', completed: 'Completato', cancelled: 'Annullato' };
    const ICONS = { Wedding: '💒', Corporate: '🏢', Fiera: '🎪', Festival: '🎶', Privato: '🏠', Istituzionale: '🏛️' };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'dropIn 0.2s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', gap: 12 }}>
                    <span style={{ fontSize: 18, color: '#94a3b8' }}>🔍</span>
                    <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca progetto o cliente..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, background: 'transparent', color: '#1B3A5C' }} />
                    <kbd onClick={onClose} style={{ background: '#f1f5f9', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#94a3b8', cursor: 'pointer', border: '1px solid #e2e8f0' }}>ESC</kbd>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {loading && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Ricerca...</div>}
                    {!loading && query.length >= 2 && results.length === 0 && (
                        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>🔍</div>
                            <div style={{ fontSize: 14, color: '#94a3b8' }}>Nessun risultato per "{query}"</div>
                        </div>
                    )}
                    {results.map(p => (
                        <div key={p.id} onClick={() => { onSelectProject(p.id); onClose(); }} style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1B3A5C' }}>{ICONS[p.event_type] || '📋'} {p.project_name}</div>
                                    {p.client_name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{p.client_name}</div>}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>{STATUS[p.status] || p.status}</span>
                                    {p.revenue_gross > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginTop: 4 }}>{(p.revenue_gross || 0).toLocaleString('it-IT')} EUR</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {query.length < 2 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Digita almeno 2 caratteri per cercare</div>
                )}
            </div>
        </div>
    );
}
