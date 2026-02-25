import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() { return useContext(ToastContext); }

function ToastItem({ toast, onRemove }) {
    useEffect(() => { const t = setTimeout(() => onRemove(toast.id), toast.duration || 3000); return () => clearTimeout(t); }, [toast, onRemove]);
    const colors = { success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', icon: '✓' }, error: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: '✕' }, warning: { bg: '#fffbeb', border: '#fed7aa', text: '#d97706', icon: '!' }, info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: 'i' } };
    const c = colors[toast.type] || colors.info;
    return (
        <div style={{ background: c.bg, border: '1px solid ' + c.border, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', animation: 'slideIn 0.3s ease-out', minWidth: 280, maxWidth: 420 }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: c.text, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.icon}</div>
            <span style={{ fontSize: 13, color: c.text, fontWeight: 600, flex: 1 }}>{toast.message}</span>
            <button onClick={() => onRemove(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: c.text, opacity: 0.5, padding: 0 }}>×</button>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);
    const removeToast = useCallback((id) => { setToasts(prev => prev.filter(t => t.id !== id)); }, []);
    const toast = { success: (msg) => addToast(msg, 'success'), error: (msg) => addToast(msg, 'error'), warning: (msg) => addToast(msg, 'warning'), info: (msg) => addToast(msg, 'info') };
    return (
        <ToastContext.Provider value={toast}>
            {children}
            <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
            <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={removeToast} />)}
            </div>
        </ToastContext.Provider>
    );
}
