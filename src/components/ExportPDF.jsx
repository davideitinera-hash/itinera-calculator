// eslint-disable-next-line react-refresh/only-export-components
export function generateQuotePDF(projectData, calc, appConfig) {
  const d = projectData;
  const branding = appConfig?.branding || {};
  const fmt = v => (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });
  const fmtD = v => (v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const costBreakdown = [
    { label: 'Materiale e Attrezzature', value: calc.totalEquipment || 0 },
    { label: 'Trasporto', value: calc.totalTransport || 0 },
    { label: 'Personale', value: (calc.totalIntStaff || 0) + (calc.totalExtStaff || 0) },
    { label: 'Sub-noleggi', value: calc.totalSubRentals || 0 },
    { label: 'Acquisti', value: calc.totalPurchases || 0 },
    { label: 'Magazzino', value: calc.warehouseCost || 0 },
    { label: 'Pianificazione', value: calc.planningCost || 0 },
    { label: 'Vitto e Alloggio', value: calc.mealAccomCost || 0 },
    { label: 'Costi Analitici', value: calc.totalAnalytics || 0 },
    { label: 'Contingency', value: calc.contingencyCost || 0 },
  ].filter(c => c.value > 0);

  const equipmentList = (d.eqItems || []).filter(e => e.desc);
  const transportList = (d.legs || []).filter(l => l.desc || l.route);
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
  
  .summary-box { background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); color: #fff; border-radius: 12px; padding: 24px; margin: 24px 0; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center; }
  .summary-item .label { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-item .value { font-size: 22px; font-weight: 800; margin-top: 4px; }
  
  .cost-bar { height: 6px; background: #f1f5f9; border-radius: 3px; margin-top: 4px; overflow: hidden; }
  .cost-bar-fill { height: 100%; border-radius: 3px; background: ${accentColor}; }
  
  .footer { padding: 20px 40px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; }
  .legal { background: #f8fafc; padding: 16px 20px; border-radius: 8px; font-size: 11px; color: #64748b; line-height: 1.8; margin-top: 16px; }
  
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; font-weight: 800; color: rgba(220,38,38,0.06); letter-spacing: 20px; pointer-events: none; z-index: 0; }
  
  .margin-positive { color: #16a34a; }
  .margin-negative { color: #dc2626; }
  
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
    <div class="summary-box">
      <div class="summary-grid">
        <div class="summary-item"><div class="label">Ricavo Netto</div><div class="value">${fmt(calc.revenueNet)} EUR</div></div>
        <div class="summary-item"><div class="label">Costi Totali</div><div class="value" id="summary-costs">${fmt(calc.totalCosts)} EUR</div></div>
        <div class="summary-item"><div class="label">Margine</div><div class="value ${(calc.marginPct || 0) >= 0 ? 'margin-positive' : 'margin-negative'}" id="summary-margin" style="color: ${(calc.marginPct || 0) >= 0 ? '#86efac' : '#fca5a5'}">${fmtD(calc.marginPct)}%</div></div>
      </div>
    </div>

    ${equipmentList.length > 0 ? `
    <div class="section">
      <div class="section-title">Materiale e Attrezzature</div>
      <table>
        <thead><tr><th>Descrizione</th><th style="color:#999;font-size:0.9em">Fornitore</th><th class="text-center">Qty</th><th class="text-center">Coeff.</th><th class="text-right">Costo Unit.</th><th class="text-right">Totale</th></tr></thead>
        <tbody>${equipmentList.map((e, i) => `<tr data-eq-row="${i}" data-qty="${e.qty}" data-cost="${e.costUnit}"><td>${e.desc}</td><td style="color:#999;font-size:0.9em">${e.supplier || ''}</td><td class="text-center">${e.qty}</td><td class="text-center"><input type="number" value="${e.coefficient ?? 1}" min="0.1" step="0.1" data-eq-coeff="${i}" style="width:70px;text-align:center;border:1px solid #d0d7de;border-radius:4px;padding:2px 4px;font-size:12px;"></td><td class="text-right">${fmt(e.costUnit)} EUR</td><td class="text-right font-bold" data-eq-total="${i}">${fmt(e.qty * e.costUnit * (e.coefficient ?? 1))} EUR</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

    ${transportList.length > 0 ? `
    <div class="section">
      <div class="section-title">Trasporto</div>
      <table>
        <thead><tr><th>Tratta</th><th>Percorso</th><th class="text-center">Veicoli</th><th class="text-right">Costo</th></tr></thead>
        <tbody>${transportList.map(l => `<tr><td>${l.desc || '-'}</td><td>${l.route || 'Custom'}</td><td class="text-center">${l.nVeh || 1}</td><td class="text-right font-bold">${fmt(l.rentalDay * l.rentalDays)} EUR</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

    <div class="section">
      <div class="section-title">Riepilogo Costi</div>
      <table>
        <thead><tr><th>Voce</th><th class="text-right">Importo</th><th style="width: 200px">Incidenza</th></tr></thead>
        <tbody>${costBreakdown.map(c => {
    const pct = calc.totalCosts > 0 ? (c.value / calc.totalCosts * 100) : 0;
    return `<tr><td>${c.label}</td><td class="text-right font-bold">${fmt(c.value)} EUR</td><td><div style="display:flex;align-items:center;gap:8px"><div class="cost-bar" style="flex:1"><div class="cost-bar-fill" style="width:${pct}%"></div></div><span style="font-size:11px;color:#64748b;min-width:40px;text-align:right">${pct.toFixed(1)}%</span></div></td></tr>`;
  }).join('')}
        <tr style="background:${primaryColor};color:#fff" id="cost-total-row"><td class="font-bold">TOTALE COSTI</td><td class="text-right font-bold" id="cost-total-value">${fmt(calc.totalCosts)} EUR</td><td></td></tr>
        </tbody>
      </table>
    </div>

    ${phases.length > 0 ? `
    <div class="section">
      <div class="section-title">Fasi di Produzione</div>
      <table>
        <thead><tr><th>Fase</th><th class="text-center">Crew</th><th class="text-center">Ore</th><th>Note</th></tr></thead>
        <tbody>${phases.map(p => `<tr><td class="font-bold">${p.phase}</td><td class="text-center">${p.crew}</td><td class="text-center">${p.hours}</td><td style="color:#64748b">${p.notes || ''}</td></tr>`).join('')}</tbody>
      </table>
    </div>` : ''}

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
<script>
(function() {
  var revenueNet = ${calc.revenueNet || 0};
  var baseTotalCosts = ${calc.totalCosts || 0};
  var baseEqCost = ${calc.totalEqCost || 0};
  var fmt = function(v) { return (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 }); };
  var fmtD = function(v) { return (v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  document.addEventListener('input', function(ev) {
    var inp = ev.target;
    if (!inp.dataset || !inp.dataset.eqCoeff) return;
    var idx = inp.dataset.eqCoeff;
    var row = document.querySelector('tr[data-eq-row="' + idx + '"]');
    if (!row) return;
    var qty = parseFloat(row.dataset.qty) || 0;
    var cost = parseFloat(row.dataset.cost) || 0;
    var coeff = parseFloat(inp.value) || 1;
    var rowTotal = qty * cost * coeff;
    var totalCell = document.querySelector('td[data-eq-total="' + idx + '"]');
    if (totalCell) totalCell.textContent = fmt(rowTotal) + ' EUR';

    // Recalc equipment section total
    var newEqTotal = 0;
    document.querySelectorAll('tr[data-eq-row]').forEach(function(r) {
      var q = parseFloat(r.dataset.qty) || 0;
      var c = parseFloat(r.dataset.cost) || 0;
      var coeffInput = r.querySelector('input[data-eq-coeff]');
      var cf = coeffInput ? (parseFloat(coeffInput.value) || 1) : 1;
      newEqTotal += q * c * cf;
    });

    // Update totals: replace equipment portion in total costs
    var newTotalCosts = baseTotalCosts - baseEqCost + newEqTotal;
    var margin = revenueNet - newTotalCosts;
    var marginPct = revenueNet > 0 ? (margin / revenueNet * 100) : 0;

    var costEl = document.getElementById('cost-total-value');
    if (costEl) costEl.textContent = fmt(newTotalCosts) + ' EUR';
    var sumCosts = document.getElementById('summary-costs');
    if (sumCosts) sumCosts.textContent = fmt(newTotalCosts) + ' EUR';
    var sumMargin = document.getElementById('summary-margin');
    if (sumMargin) {
      sumMargin.textContent = fmtD(marginPct) + '%';
      sumMargin.style.color = marginPct >= 0 ? '#86efac' : '#fca5a5';
    }
  });
})();
</script>
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

export default function ExportPDFButton({ projectData, calc, appConfig, style = {} }) {
  const handleExport = () => {
    const html = generateQuotePDF(projectData, calc, appConfig);
    openPDFPreview(html);
  };

  return (
    <button onClick={handleExport} style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(27,58,92,0.2)', ...style }}>
      📄 Esporta PDF
    </button>
  );
}
