import { AccountingSection } from '../components/AccountingSection';
import { useSupabaseProject } from '../hooks/useSupabaseProject';
import { useToast } from '../components/Toast';

export function AccountingPage({ projectId, projectName, onBack }) {
    const { data, syncAccounting } = useSupabaseProject(projectId);
    const toast = useToast();

    const handleSync = async () => {
        const result = await syncAccounting();
        if (result?.success) {
            toast.success('Contabilità sincronizzata!');
        } else {
            toast.error('Errore sync: ' + (result?.error || 'sconosciuto'));
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)', padding: '12px 24px', color: '#fff', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={onBack}
                            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        >
                            ← Torna al Calcolatore
                        </button>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>🧾 Contabilità Rentman</div>
                            {projectName && <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>{projectName}</div>}
                        </div>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#FFE600', letterSpacing: 1 }}>ITINERA</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
                <AccountingSection accounting={data?.accounting} onSync={handleSync} />
            </div>
        </div>
    );
}
