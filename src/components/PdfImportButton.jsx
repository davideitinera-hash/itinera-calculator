import { useState, useRef } from 'react';
import { parsePdfFile } from '../utils/pdfParser';

/**
 * PdfImportButton — Inline button that triggers PDF parsing and imports data.
 * 
 * Props:
 *   onImport(parsedData) — callback with parsed result
 */
export default function PdfImportButton({ onImport, style = {} }) {
    const [status, setStatus] = useState('idle'); // idle | loading | done | error
    const inputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('loading');

        try {
            const result = await parsePdfFile(file);
            setStatus('done');
            onImport(result);

            // Reset after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);
        } catch (err) {
            console.error('PDF import error:', err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }

        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const label = {
        idle: '📄 Importa da PDF',
        loading: '⏳ Analisi PDF...',
        done: '✅ Importato!',
        error: '❌ Errore',
    }[status];

    const bg = {
        idle: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        loading: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        done: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        error: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    }[status];

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <button
                onClick={(e) => { e.stopPropagation(); if (status === 'idle') inputRef.current?.click(); }}
                disabled={status === 'loading'}
                style={{
                    background: bg,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: status === 'loading' ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 8px rgba(102,126,234,0.25)',
                    transition: 'all 0.3s ease',
                    opacity: status === 'loading' ? 0.8 : 1,
                    whiteSpace: 'nowrap',
                    ...style,
                }}
            >
                {status === 'loading' && (
                    <span style={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'pdfSpin 0.8s linear infinite',
                    }} />
                )}
                {label}
                <style>{`@keyframes pdfSpin { to { transform: rotate(360deg); } }`}</style>
            </button>
        </>
    );
}
