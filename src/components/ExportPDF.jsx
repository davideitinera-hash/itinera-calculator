import { useState, useRef, useEffect } from 'react';

const fmt = v => (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });
const fmtD = v => (v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═══════════════════════════════════════════════════════════════
// 1. CLIENT-FACING PDF (No costs, margins, suppliers)
// ═══════════════════════════════════════════════════════════════
// eslint-disable-next-line react-refresh/only-export-components
export function generatePDFQuote(projectData, calc, appConfig) {
  const d = projectData;
  const branding = appConfig?.branding || {};
  const today = new Date().toLocaleDateString('it-IT');
  const eventDate = d.eventDate ? new Date(d.eventDate).toLocaleDateString('it-IT') : 'Da definire';

  const primaryColor = branding.pdfHeaderColor || '#1B3A5C';
  const accentColor = branding.pdfAccentColor || '#2E86AB';
  const companyName = branding.companyFullName || 'Itinera Pro S.r.l.';
  const tagline = branding.tagline || 'Event Production & Design';
  const footer = branding.pdfFooterText || '';
  const legalNotes = branding.quoteLegalNotes || '';
  const paymentTerms = branding.quotePaymentTerms || '';
  const showWatermark = branding.pdfWatermark && d.status === 'draft';
  const watermarkText = branding.pdfWatermarkText || 'BOZZA';

  // Equipment — CLIENT view: description, qty, sell price, total sell
  const equipmentList = (calc.eqCalcs || []).filter(e => e.desc && (e.sellPrice || 0) > 0);
  const totalEqSell = equipmentList.reduce((s, e) => s + e.revenue, 0);

  // Transport — CLIENT view: description, route, sell price
  const transportList = (calc.legCalcs || []).filter(l => (l.desc || l.route) && (l.sellPrice || 0) > 0);
  const totalTransportSell = transportList.reduce((s, l) => s + l.sellPrice, 0);

  // Staff — CLIENT view: role, sell total
  const staffList = [...(calc.intCalcs || []), ...(calc.extCalcs || [])].filter(s => s.role && (s.sellTotal || 0) > 0);
  const whSell = d.whSellTotal || 0;
  const totalStaffSell = staffList.reduce((s, r) => s + (r.sellTotal || 0), 0) + whSell;

  // Total Quote
  const totalQuote = totalEqSell + totalTransportSell + totalStaffSell;

  const phases = (d.phases || []).filter(p => p.phase);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; background: #fff; }
  @page { margin: 0; size: A4; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; overflow: hidden; }
  
  .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); color: #fff; padding: 40px; }
  .header h1 { font-size: 28px; font-weight: 800; letter-spacing: 2px; margin-bottom: 4px; }
  .header .tagline { font-size: 12px; opacity: 0.8; letter-spacing: 1px; text-transform: uppercase; }
  .header .divider { width: 50px; height: 3px; background: rgba(255,255,255,0.5); margin: 16px 0; border-radius: 2px; }
  .header .meta { display: flex; justify-content: space-between; margin-top: 20px; }
  .header .meta-item { font-size: 12px; }
  .header .meta-label { opacity: 0.7; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .header .meta-value { font-weight: 700; font-size: 14px; margin-top: 2px; }
  
  .content { padding: 32px 40px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 2px solid ${accentColor}; margin-bottom: 12px; }
  
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
  th { background: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) { background: #fafbfc; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  
  .total-box { background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); color: #fff; border-radius: 12px; padding: 24px 32px; margin: 24px 0; display: flex; justify-content: space-between; align-items: center; }
  .total-label { font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .total-value { font-size: 32px; font-weight: 800; }
  
  .subtotal-row { background: #f1f5f9 !important; font-weight: 700; }
  
  .footer { padding: 20px 40px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
  .legal { background: #f8fafc; padding: 16px 20px; border-radius: 8px; font-size: 11px; color: #64748b; line-height: 1.8; margin-top: 16px; }
  
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 800; color: rgba(220,38,38,0.06); letter-spacing: 20px; pointer-events: none; z-index: 0; }
  
  @media print {
    .page { width: 100%; min-height: auto; }
    .no-print { display: none; }
  }
</style>
</head><body>
${showWatermark ? '<div class="watermark">' + watermarkText + '</div>' : ''}
<div class="page">
  <div class="header">
    <h1>${companyName}</h1>
    <div class="tagline">${tagline}</div>
    <div class="divider"></div>
    <div style="font-size: 18px; font-weight: 700; margin-top: 12px;">PREVENTIVO</div>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">Progetto</div><div class="meta-value">${d.projectName || 'Senza nome'}</div></div>
      <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${d.clientName || '-'}</div></div>
      <div class="meta-item"><div class="meta-label">Tipo Evento</div><div class="meta-value">${d.eventType || '-'}</div></div>
      <div class="meta-item"><div class="meta-label">Data Evento</div><div class="meta-value">${eventDate}</div></div>
      <div class="meta-item"><div class="meta-label">Data Preventivo</div><div class="meta-value">${today}</div></div>
    </div>
  </div>
  
  <div class="content">
    ${equipmentList.length > 0 ? `
    <div class="section">
      <div class="section-title">Materiale e Attrezzature</div>
      <table>
        <thead><tr><th>Descrizione</th><th class="text-center">Qty</th><th class="text-center">Coeff.</th><th class="text-right">Prezzo Unit.</th><th class="text-right">Totale</th></tr></thead>
        <tbody>${equipmentList.map(e => `<tr><td>${e.desc}</td><td class="text-center">${e.qty}</td><td class="text-center">${fmtD(e.coefficient ?? 1)}</td><td class="text-right">${fmt(e.sellPrice)} €</td><td class="text-right font-bold">${fmt(e.revenue)} €</td></tr>`).join('')}
        <tr class="subtotal-row"><td colspan="4">Subtotale Materiale</td><td class="text-right font-bold">${fmt(totalEqSell)} €</td></tr>
        </tbody>
      </table>
    </div>` : ''}

    ${transportList.length > 0 ? `
    <div class="section">
      <div class="section-title">Trasporto</div>
      <table>
        <thead><tr><th>Descrizione</th><th>Tratta</th><th class="text-center">N° Veicoli</th><th class="text-right">Importo</th></tr></thead>
        <tbody>${transportList.map(l => `<tr><td>${l.desc || '-'}</td><td>${l.route || '-'}</td><td class="text-center">${l.nVeh || 1}</td><td class="text-right font-bold">${fmt(l.sellPrice)} €</td></tr>`).join('')}
        <tr class="subtotal-row"><td colspan="3">Subtotale Trasporto</td><td class="text-right font-bold">${fmt(totalTransportSell)} €</td></tr>
        </tbody>
      </table>
    </div>` : ''}

    ${(staffList.length > 0 || whSell > 0) ? `
    <div class="section">
      <div class="section-title">Personale</div>
      <table>
        <thead><tr><th>Ruolo</th><th class="text-center">N°</th><th class="text-right">Importo</th></tr></thead>
        <tbody>
        ${whSell > 0 ? `<tr><td>Magazzino (${d.whCount}p)</td><td class="text-center">${d.whCount}</td><td class="text-right font-bold">${fmt(whSell)} €</td></tr>` : ''}
        ${staffList.map(s => `<tr><td>${s.role}</td><td class="text-center">${s.count}</td><td class="text-right font-bold">${fmt(s.sellTotal)} €</td></tr>`).join('')}
        <tr class="subtotal-row"><td colspan="2">Subtotale Personale</td><td class="text-right font-bold">${fmt(totalStaffSell)} €</td></tr>
        </tbody>
      </table>
    </div>` : ''}

    ${phases.length > 0 ? `
    <div class="section">
      <div class="section-title">Fasi di Produzione</div>
      <table>
        <thead><tr><th>Fase</th><th class="text-center">Crew</th><th class="text-center">Ore</th><th>Note</th></tr></thead>
        <tbody>${phases.map(p => `<tr><td class="font-bold">${p.phase}</td><td class="text-center">${p.crew}</td><td class="text-center">${p.hours}</td><td style="color:#64748b">${p.notes || ''}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

    <div class="total-box">
      <div class="total-label">Totale Preventivo</div>
      <div class="total-value">${fmt(totalQuote)} €</div>
    </div>

    ${(legalNotes || paymentTerms) ? `
    <div class="legal">
      ${legalNotes ? '<div style="margin-bottom:8px"><strong>Note:</strong> ' + legalNotes + '</div>' : ''}
      ${paymentTerms ? '<div><strong>Condizioni di pagamento:</strong> ' + paymentTerms + '</div>' : ''}
    </div>` : ''}
  </div>

  <div class="footer">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>${footer}</div>
      <div>Pagina 1</div>
    </div>
  </div>
</div>
</body></html>`;

  return html;
}

// eslint-disable-next-line react-refresh/only-export-components
export function openPDFPreview(html) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. INTERNAL CSV (Full financial data dump)
// ═══════════════════════════════════════════════════════════════
// eslint-disable-next-line react-refresh/only-export-components
export function generateInternalCSV(projectData, calc) {
  const d = projectData;
  const esc = v => {
    const s = String(v ?? '').replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const n = v => (v || 0).toFixed(2);

  let csv = '';

  // Project info
  csv += `PROGETTO,${esc(d.projectName)}\n`;
  csv += `CLIENTE,${esc(d.clientName)}\n`;
  csv += `DATA EVENTO,${esc(d.eventDate)}\n`;
  csv += `CODICE,${esc(d.projectCode)}\n`;
  csv += `RICAVO LORDO,${n(d.revenueGross)}\n`;
  csv += `RICAVO NETTO,${n(calc.revenueNet)}\n`;
  csv += `COSTI TOTALI,${n(calc.totalCostsAll)}\n`;
  csv += `MARGINE NETTO,${n(calc.margin)}\n`;
  csv += `MARGINE %,${n(calc.marginPct)}\n\n`;

  // Equipment
  csv += `--- MATERIALE ---\n`;
  csv += `Categoria,Descrizione,Fornitore,Qty,Coeff,L(m),W(m),H(m),Kg/pz,M³,Kg Tot,Costo Unit,Vendita Unit,Costo Tot,Ricavo Tot,Margine €,Margine %,Ricarico %\n`;
  (calc.eqCalcs || []).forEach(e => {
    const markup = e.cost > 0 ? ((e.revenue - e.cost) / e.cost * 100) : 0;
    csv += `${esc(e.itemCategory || 'Proprio')},${esc(e.desc)},${esc(e.supplier)},${e.qty},${n(e.coefficient ?? 1)},${n(e.l)},${n(e.w)},${n(e.h)},${n(e.weightKg)},${n(e.vol)},${n(e.weight)},${n(e.costUnit)},${n(e.sellPrice || 0)},${n(e.cost)},${n(e.revenue)},${n(e.marginEur)},${e.marginPct !== null ? n(e.marginPct) : 'N/A'},${n(markup)}\n`;
  });
  csv += `TOTALE MATERIALE,,,,,,,,,,${n(calc.totalVol)},${n(calc.totalWeight)},,,${n(calc.totalEqCost)},${n(calc.totalEqRevenue)},${n(calc.totalEqMargin)}\n\n`;

  // Transport
  csv += `--- TRASPORTI ---\n`;
  csv += `Descrizione,Tratta,Veicolo,N° Veicoli,Km,Carburante €,Pedaggi €,Nolo €,Costo Tot €,Vendita €,Margine €,Margine %\n`;
  (calc.legCalcs || []).forEach(l => {
    csv += `${esc(l.desc)},${esc(l.route)},${esc(l.vName)},${l.nVeh},${n(l.km)},${n(l.fuel)},${n(l.toll)},${n(l.rQ)},${n(l.total)},${n(l.sellPrice)},${n(l.legMargin)},${l.legMarginPct !== null ? n(l.legMarginPct) : 'N/A'}\n`;
  });
  csv += `TOTALE TRASPORTI,,,,,,,,,${n(calc.totalTransport)},${n(calc.totalTransportRevenue)},${n(calc.totalTransportMargin)}\n\n`;

  // Staff
  csv += `--- PERSONALE ---\n`;
  csv += `Tipo,Ruolo,N°,€/h,Ore Ord,Ore Str,Ore Fest,Ore Nott,Costo Tot €,Vendita €,Margine €\n`;
  csv += `Magazzino,Magazziniere,${d.whCount},${n(d.whRate)},${n(d.whHLoad + d.whHUnload)},,,,,${n(calc.totalWh)},${n(d.whSellTotal || 0)},${n((d.whSellTotal || 0) - calc.totalWh)}\n`;
  (calc.intCalcs || []).forEach(s => {
    csv += `Interno,${esc(s.role)},${s.count},${n(s.costHour)},${n(s.hOrd)},${n(s.hStr)},${n(s.hFest)},${n(s.hNott)},${n(s.total)},${n(s.sellTotal || 0)},${n((s.sellTotal || 0) - s.total)}\n`;
  });
  (calc.extCalcs || []).forEach(s => {
    csv += `Esterno,${esc(s.role)},${s.count},${n(s.costHour)},${n(s.hOrd)},${n(s.hStr)},${n(s.hFest)},${n(s.hNott)},${n(s.total)},${n(s.sellTotal || 0)},${n((s.sellTotal || 0) - s.total)}\n`;
  });
  csv += `TOTALE STAFF,,,,,,,,${n(calc.totalAllStaff)},${n(calc.totalStaffRevenue)},${n(calc.totalStaffMargin)}\n\n`;

  // Other costs
  csv += `--- ALTRI COSTI ---\n`;
  csv += `Voce,Importo €\n`;
  csv += `Pianificazione,${n(calc.totalPlanCost)}\n`;
  csv += `Vitto & Alloggio,${n(calc.totalAccom)}\n`;
  csv += `Costi Analitici,${n(calc.totalAn)}\n`;
  csv += `Danni & Extra,${n(calc.totalDmg)}\n`;
  csv += `Varie,${n(calc.totalMisc)}\n`;
  csv += `Ammortamenti,${n(calc.totalDepreciation)}\n`;
  csv += `Contingency,${n(calc.contingencyAmt)}\n`;
  csv += `Costo Finanziario,${n(calc.financialCost)}\n`;

  return csv;
}

// eslint-disable-next-line react-refresh/only-export-components
export function downloadCSV(csv, filename) {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// 3. EXPORT DROPDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ExportDropdown({ projectData, calc, appConfig, style = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePDF = () => {
    setOpen(false);
    const html = generatePDFQuote(projectData, calc, appConfig);
    openPDFPreview(html);
  };

  const handleCSV = () => {
    setOpen(false);
    const csv = generateInternalCSV(projectData, calc);
    const name = (projectData.projectCode || projectData.projectName || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadCSV(csv, `${name}_dati_tecnici.csv`);
  };

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6,
          padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 2px 8px rgba(27,58,92,0.2)', transition: 'all 0.2s',
        }}
      >
        📥 Esporta <span style={{ fontSize: 8, opacity: 0.8 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          background: '#fff', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0', minWidth: 260, zIndex: 999, overflow: 'hidden',
        }}>
          <button
            onClick={handlePDF}
            style={{
              width: '100%', padding: '12px 16px', border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 600, color: '#1B3A5C', textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 20 }}>📄</span>
            <div>
              <div>Preventivo Cliente (PDF)</div>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>Solo prezzi di vendita, nessun costo interno</div>
            </div>
          </button>
          <div style={{ height: 1, background: '#e2e8f0' }} />
          <button
            onClick={handleCSV}
            style={{
              width: '100%', padding: '12px 16px', border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 600, color: '#1B3A5C', textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0fff5'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 20 }}>📊</span>
            <div>
              <div>Dati Tecnici & Finanziari (CSV)</div>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>Export completo: costi, margini, fornitori, volumi</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
