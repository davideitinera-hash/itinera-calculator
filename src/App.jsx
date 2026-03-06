import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ProjectsList from './components/ProjectsList';
import SettingsPage from './components/SettingsPage';
import ItineraCalculator from './itinera-calculator-v4';
import { CrmPage } from './pages/CrmPage';
import { AccountingPage } from './pages/AccountingPage';
import { ToastProvider } from './components/Toast';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCrm, setShowCrm] = useState(false);
  const [showAccounting, setShowAccounting] = useState(false);

  useEffect(() => {
    const base = 'Itinera Calculator';
    if (!user) { document.title = base + ' — Login'; }
    else if (showSettings) { document.title = base + ' — Impostazioni'; }
    else if (showCrm) { document.title = base + ' — Anagrafica CRM'; }
    else if (showAccounting) { document.title = base + ' — Contabilità Rentman'; }
    else if (currentProjectId) { document.title = base + ' — Progetto'; }
    else { document.title = base + ' — Dashboard'; }
  }, [user, showSettings, showCrm, showAccounting, currentProjectId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1B3A5C', marginBottom: 8 }}>ITINERA</div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (showSettings) return <SettingsPage onBack={() => setShowSettings(false)} />;
  if (showAccounting && currentProjectId) return <AccountingPage projectId={currentProjectId} onBack={() => setShowAccounting(false)} />;
  if (showCrm && currentProjectId) return <CrmPage projectId={currentProjectId} onBack={() => setShowCrm(false)} />;
  if (currentProjectId) return <ItineraCalculator projectId={currentProjectId} onBack={() => setCurrentProjectId(null)} onOpenCrm={() => setShowCrm(true)} onOpenAccounting={() => setShowAccounting(true)} />;
  return <ProjectsList onSelectProject={(id) => setCurrentProjectId(id)} onOpenSettings={() => setShowSettings(true)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
