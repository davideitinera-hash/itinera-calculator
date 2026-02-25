import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { error: authError } = await signIn(email, password);
        if (authError) {
            setError(authError.message === 'Invalid login credentials' ? 'Email o password non corretti' : 'Errore di connessione. Riprova.');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f2439 0%, #1B3A5C 40%, #2E86AB 100%)', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 'clamp(24px, 5vw, 48px) clamp(20px, 4vw, 40px)', width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }} className="fade-in">
                <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 4vw, 32px)' }}>
                    <div style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, color: '#1B3A5C', letterSpacing: 2, marginBottom: 4 }}>ITINERA</div>
                    <div style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: '#2E86AB', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Profitability Calculator</div>
                    <div style={{ width: 40, height: 3, background: 'linear-gradient(90deg, #2E86AB, #1B3A5C)', borderRadius: 2, margin: '16px auto 0' }} />
                </div>
                {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16, textAlign: 'center' }} className="fade-in">{error}</div>}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@itinerapro.com" style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 16, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                </div>
                <button onClick={handleSubmit} disabled={loading || !email || !password} style={{ width: '100%', padding: '14px', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', letterSpacing: 0.5, transition: 'all 0.2s' }}>
                    {loading ? 'Accesso in corso...' : 'Accedi'}
                </button>
                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>Accesso riservato al team Itinera</div>
            </div>
        </div>
    );
}
