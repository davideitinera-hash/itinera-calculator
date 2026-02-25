import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import Avatar from './Avatar';
import { useToast } from './Toast';
import { SkeletonDashboard } from './Skeleton';
import CountUp from './CountUp';
import GlobalSearch from './GlobalSearch';

const STATUS_COLORS = {
    draft: { bg: '#f1f5f9', color: '#475569', label: 'Bozza' },
    sent: { bg: '#dbeafe', color: '#1d4ed8', label: 'Inviato' },
    approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approvato' },
    completed: { bg: '#f0fdf4', color: '#15803d', label: 'Completato' },
    cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Annullato' },
};

const EVENT_ICONS = { Wedding: '💒', Corporate: '🏢', Fiera: '🎪', Festival: '🎶', Privato: '🏠', Istituzionale: '🏛️' };

export default function ProjectsList({ onSelectProject, onOpenSettings }) {
    const { user, profile, signOut, isAdmin } = useAuth();
    const { isMobile, isTablet, isTouch } = useResponsive();
    const toast = useToast();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [menuOpen, setMenuOpen] = useState(false);
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);

    const loadProjects = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('projects').select('*, profiles!projects_owner_id_fkey ( full_name )').order('updated_at', { ascending: false });
        if (!error) setProjects(data || []);
        setLoading(false);
    };

    useEffect(() => { loadProjects(); }, []);
    useEffect(() => {
        const handleKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowGlobalSearch(true); } if (e.key === 'Escape') setShowGlobalSearch(false); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    const createProject = async () => {
        setCreating(true);
        const { data, error } = await supabase.from('projects').insert({ owner_id: user.id, project_name: 'Nuovo Progetto', event_type: 'Wedding', revenue_gross: 0 }).select().single();
        if (!error && data) { onSelectProject(data.id); toast.success('Progetto creato!'); }
        setCreating(false);
    };

    const duplicateProject = async (projId) => {
        if (!window.confirm('Duplicare questo progetto?')) return;
        const { data: orig } = await supabase.from('projects').select('*').eq('id', projId).single();
        if (!orig) return;
        const { id, created_at, updated_at, ...projData } = orig;
        const { data: newProj } = await supabase.from('projects').insert({ ...projData, owner_id: user.id, project_name: orig.project_name + ' (copia)', status: 'draft' }).select().single();
        if (!newProj) return;
        for (const tbl of ['equipment_items', 'transport_legs', 'staff_entries', 'cost_entries', 'production_phases']) {
            const { data: rows } = await supabase.from(tbl).select('*').eq('project_id', projId);
            if (rows && rows.length > 0) {
                const newRows = rows.map(row => { const r = { ...row }; delete r.id; delete r.created_at; r.project_id = newProj.id; return r; });
                await supabase.from(tbl).insert(newRows);
            }
        }
        loadProjects();
        toast.success('Progetto duplicato!');
    };

    const deleteProject = async (projId, projName) => {
        if (!window.confirm('Eliminare "' + projName + '"? Azione irreversibile!')) return;
        await supabase.from('projects').delete().eq('id', projId);
        loadProjects();
        toast.success('Progetto eliminato');
    };

    const filtered = projects.filter(p => {
        const matchSearch = search === '' || p.project_name.toLowerCase().includes(search.toLowerCase()) || (p.client_name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || p.status === filterStatus;
        const matchType = filterType === 'all' || p.event_type === filterType;
        return matchSearch && matchStatus && matchType;
    });

    const fmt = v => (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });

    return (
        <>
            <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)', padding: isMobile ? '12px 16px' : '16px 24px', color: '#fff', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 1400, margin: '0 auto' }}>
                        <div>
                            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, letterSpacing: 1, color: '#FFE600' }}>ITINERA EVENTS</div>
                            {!isMobile && <div style={{ fontSize: 11, opacity: 0.8 }}>Profitability Calculator — Dashboard Progetti</div>}
                        </div>
                        {isMobile ? (
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 18, cursor: 'pointer' }}>☰</button>
                                {menuOpen && (
                                    <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 8, minWidth: 180, zIndex: 100 }} className="dropdown-overlay">
                                        <div style={{ padding: '10px 12px', fontSize: 13, color: '#1B3A5C', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{profile?.full_name || user?.email}</div>
                                        <div style={{ padding: '4px 12px', fontSize: 10, color: '#2E86AB', textTransform: 'uppercase', fontWeight: 600 }}>{profile?.role}</div>
                                        {isAdmin && <button onClick={() => { setMenuOpen(false); onOpenSettings(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#475569', borderTop: '1px solid #f1f5f9' }}>Impostazioni</button>}
                                        <button onClick={signOut} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#dc2626', borderTop: '1px solid #f1f5f9' }}>Esci</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar name={profile?.full_name || user?.email} size={28} />
                                <span style={{ fontSize: 12, opacity: 0.9 }}>{profile?.full_name || user?.email} <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10, fontSize: 10, marginLeft: 6, textTransform: 'uppercase' }}>{profile?.role}</span></span>
                                {isAdmin && <button onClick={onOpenSettings} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Impostazioni</button>}
                                <button onClick={() => setShowGlobalSearch(true)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>🔍 Cerca <kbd style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 6px', fontSize: 10, marginLeft: 4 }}>Ctrl+K</kbd></button>
                                <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Esci</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: isMobile ? '12px' : '20px 24px' }}>
                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                        <button onClick={createProject} disabled={creating} style={{ background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 8, padding: isMobile ? '12px 16px' : '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', width: isMobile ? '100%' : 'auto' }}>{creating ? 'Creazione...' : '+ Nuovo Progetto'}</button>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca progetto o cliente..." style={{ flex: 1, minWidth: isMobile ? '100%' : 0, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff' }} />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', width: isMobile ? '100%' : 'auto' }}>
                            <option value="all">Tutti gli stati</option>
                            <option value="draft">Bozza</option>
                            <option value="sent">Inviato</option>
                            <option value="approved">Approvato</option>
                            <option value="completed">Completato</option>
                            <option value="cancelled">Annullato</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Tipo:</span>
                        {[{ value: 'all', label: 'Tutti', icon: '' }, ...Object.entries(EVENT_ICONS).map(([value, icon]) => ({ value, label: value, icon }))].map(t => (
                            <button key={t.value} onClick={() => setFilterType(t.value)}
                                style={{
                                    padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (filterType === t.value ? '#2E86AB' : '#e2e8f0'),
                                    background: filterType === t.value ? '#eef6fb' : '#fff',
                                    color: filterType === t.value ? '#1B3A5C' : '#64748b',
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}>
                                {t.icon && <span style={{ fontSize: 14 }}>{t.icon}</span>}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 16, width: '100%' }}>
                        {[{ label: 'Totale', count: projects.length, color: '#1B3A5C' }, { label: 'Bozze', count: projects.filter(p => p.status === 'draft').length, color: '#64748b' }, { label: 'Approvati', count: projects.filter(p => p.status === 'approved').length, color: '#16a34a' }, { label: 'Completati', count: projects.filter(p => p.status === 'completed').length, color: '#15803d' }].map(s => (
                            <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: isMobile ? '8px 12px' : '10px 16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                <CountUp value={s.count} style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: s.color }} />
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {projects.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginBottom: 12 }}>Progetti per Stato</div>
                                {Object.entries(STATUS_COLORS).map(([key, val]) => {
                                    const count = projects.filter(p => p.status === key).length;
                                    const pct = projects.length > 0 ? (count / projects.length) * 100 : 0;
                                    return count > 0 ? (
                                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 11, color: '#64748b', width: 70 }}>{val.label}</span>
                                            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: pct + '%', height: '100%', background: val.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: val.color, width: 24, textAlign: 'right' }}>{count}</span>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginBottom: 12 }}>Ricavo Totale per Tipo</div>
                                {Object.entries(EVENT_ICONS).map(([type, icon]) => {
                                    const typeProjects = projects.filter(p => p.event_type === type);
                                    const total = typeProjects.reduce((sum, p) => sum + (p.revenue_gross || 0), 0);
                                    const maxRevenue = Math.max(...Object.entries(EVENT_ICONS).map(([t]) => projects.filter(p => p.event_type === t).reduce((s, p) => s + (p.revenue_gross || 0), 0)), 1);
                                    const pct = (total / maxRevenue) * 100;
                                    return total > 0 ? (
                                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span style={{ fontSize: 13 }}>{icon}</span>
                                            <span style={{ fontSize: 11, color: '#64748b', width: 80 }}>{type}</span>
                                            <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg, #1B3A5C, #2E86AB)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#1B3A5C', minWidth: 60, textAlign: 'right' }}>{total.toLocaleString('it-IT')} EUR</span>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}

                    {/* Projects Grid */}
                    {loading ? (
                        <SkeletonDashboard isMobile={isMobile} />
                    ) : filtered.length === 0 ? (
                        projects.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '60px 40px' }} className="fade-in">
                                <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.8 }}>📋</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Nessun progetto ancora</div>
                                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Crea il tuo primo progetto per iniziare a calcolare la profittabilità dei tuoi eventi.</div>
                                <button onClick={createProject} disabled={creating} style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(46,134,171,0.3)', transition: 'all 0.2s' }}>{creating ? 'Creazione...' : '+ Crea il Primo Progetto'}</button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '60px 40px' }} className="fade-in">
                                <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.8 }}>🔍</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Nessun risultato</div>
                                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>Prova a cambiare i filtri o il termine di ricerca.</div>
                                <button onClick={() => { setSearch(''); setFilterStatus('all'); }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>Resetta Filtri</button>
                            </div>
                        )
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, width: '100%' }}>
                            {filtered.map(p => {
                                const st = STATUS_COLORS[p.status] || STATUS_COLORS.draft; return (
                                    <div key={p.id} onClick={() => onSelectProject(p.id)} className="card-hover fade-in" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(27,58,92,0.12)'; e.currentTarget.style.borderColor = '#2E86AB'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                                        <div style={{ padding: isMobile ? '12px' : '14px 16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1B3A5C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{EVENT_ICONS[p.event_type] || '📋'} {p.project_name}</div>
                                                    {p.client_name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client_name}</div>}
                                                </div>
                                                <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{st.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8', marginBottom: 10, flexWrap: 'wrap' }}>
                                                <span>{p.event_type}</span>
                                                {p.event_date && <span>{new Date(p.event_date).toLocaleDateString('it-IT')}</span>}
                                                <span style={{ fontWeight: 600, color: '#1B3A5C' }}>{fmt(p.revenue_gross)} EUR</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                                                <span style={{ fontSize: 10, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}><Avatar name={p.profiles?.full_name || 'Team'} size={18} />{p.profiles?.full_name || 'Team'} — {new Date(p.updated_at).toLocaleDateString('it-IT')}</span>
                                                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => duplicateProject(p.id)} title="Duplica" style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 4, color: '#475569', fontWeight: 600 }}>Duplica</button>
                                                    {isAdmin && <button onClick={() => deleteProject(p.id, p.project_name)} title="Elimina" style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 4, color: '#dc2626', fontWeight: 600 }}>Elimina</button>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {showGlobalSearch && <GlobalSearch onSelectProject={onSelectProject} onClose={() => setShowGlobalSearch(false)} />}
        </>
    );
}
