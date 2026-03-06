import { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

// Register autotable plugin on jsPDF prototype (required for Vite/Rollup)
applyPlugin(jsPDF);

const fmt = v => (v || 0).toLocaleString('it-IT', { maximumFractionDigits: 0 });
const fmtD = v => (v || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ═══════════════════════════════════════════════════════════════
// 1. ANALYTICAL PDF REPORT (Full financial data — jsPDF)
// ═══════════════════════════════════════════════════════════════
// eslint-disable-next-line react-refresh/only-export-components
export function generateAnalyticalPDF(projectData, calc, appConfig, selectedSubprojectId = null) {
  try {
    const d = projectData;
    const branding = appConfig?.branding || {};
    const today = new Date().toLocaleDateString('it-IT');
    const eventDate = d.eventDate ? new Date(d.eventDate).toLocaleDateString('it-IT') : 'Da definire';

    const primaryColor = branding.pdfHeaderColor || '#1B3A5C';
    const accentColor = branding.pdfAccentColor || '#2E86AB';
    const companyName = branding.companyFullName || 'Itinera Pro S.r.l.';

    // Parse hex colors to RGB arrays
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const primaryRgb = hexToRgb(primaryColor);
    const accentRgb = hexToRgb(accentColor);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 0;

    // ── HEADER BAR ──
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(...accentRgb);
    doc.rect(0, 26, pageW, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 10, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORT ANALITICO INTERNO', 10, 19);

    // Right-side meta
    doc.setFontSize(8);
    const meta = [
      `Progetto: ${d.projectName || 'Senza nome'}`,
      `Cliente: ${d.clientName || '-'}`,
      `Data Evento: ${eventDate}`,
      `Report: ${today}`,
    ];
    meta.forEach((line, i) => {
      doc.text(line, pageW - 10, 8 + i * 5, { align: 'right' });
    });
    y = 34;

    // ── STAND CONTEXT HEADER (if viewing a specific subproject) ──
    if (selectedSubprojectId !== null && d.subprojects && d.subprojects.length > 0) {
      const stand = d.subprojects.find(sp => sp.id === selectedSubprojectId);
      if (stand) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accentRgb);
        doc.text(`STAND: ${stand.name || 'Senza nome'}`, 10, y);
        y += 7;
      }
    }

    // ── DASHBOARD SUMMARY ──
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RIEPILOGO FINANZIARIO', 10, y);
    y += 6;

    const dashCards = [
      { label: 'Ricavo Lordo', value: `€ ${fmt(d.revenueGross)}`, color: accentRgb },
      { label: 'Ricavo Netto', value: `€ ${fmt(calc.revenueNet)}`, color: accentRgb },
      { label: 'Costi Totali', value: `€ ${fmt(calc.totalCostsAll)}`, color: [220, 53, 69] },
      { label: 'Margine Netto', value: `€ ${fmt(calc.margin)}`, color: calc.margin >= 0 ? [39, 174, 96] : [220, 53, 69] },
      { label: 'Margine %', value: `${fmtD(calc.marginPct)}%`, color: calc.marginPct >= 15 ? [39, 174, 96] : [220, 53, 69] },
      { label: 'Markup %', value: `${fmtD(calc.markupPct)}%`, color: [108, 117, 125] },
    ];

    const cardW = (pageW - 20 - 5 * 5) / 6; // 6 cards with 5px gap
    dashCards.forEach((card, i) => {
      const cx = 10 + i * (cardW + 5);
      // Card background
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(cx, y, cardW, 18, 2, 2, 'F');
      // Color accent bar
      doc.setFillColor(...card.color);
      doc.rect(cx, y, cardW, 3, 'F');
      // Label
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(card.label, cx + cardW / 2, y + 8, { align: 'center' });
      // Value
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...card.color);
      doc.text(card.value, cx + cardW / 2, y + 15, { align: 'center' });
    });

    y += 24;

    // ── Cost breakdown mini-row ──
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const breakdown = [
      `Materiale: €${fmt(calc.totalEqCost)}`,
      `Trasporti: €${fmt(calc.totalTransport)}`,
      `Staff: €${fmt(calc.totalAllStaff)}`,
      `Pianif.: €${fmt(calc.totalPlanCost)}`,
      `Vitto/Alloggio: €${fmt(calc.totalAccom)}`,
      `Fee Agenzia: €${fmt(calc.agencyFeeTotal || 0)}`,
      `Contingency: €${fmt(calc.contingencyAmt)}`,
      `Ammort.: €${fmt(calc.amortCost || 0)}`,
      `Fin.: €${fmt(calc.financialCost)}`,
    ];
    doc.text(breakdown.join('   |   '), 10, y);
    y += 6;

    // ── Separator ──
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(0.5);
    doc.line(10, y, pageW - 10, y);
    y += 5;

    // ── CRUSCOTTO STAND (Home view only) ──
    if (selectedSubprojectId === null && d.subprojects && d.subprojects.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('RIEPILOGO STAND / SOTTOPROGETTI', 10, y);
      y += 2;

      const spRows = d.subprojects.map(sp => {
        const spItems = (d.eqItems || []).filter(e => (e.subprojectId || null) === sp.id);
        const matCost = spItems.reduce((s, e) => s + Math.round((e.qty || 0) * (e.costUnit || 0) * (e.coefficient ?? 1) * 100) / 100, 0);
        const matRev = spItems.reduce((s, e) => s + (e.sellPrice || 0), 0);
        const spLegs = (d.legs || []).filter(l => (l.subprojectId || null) === sp.id);
        const trCost = spLegs.reduce((s, l) => s + ((l.rentalDay || 0) * (l.rentalDays || 1) * (l.nVeh || 1)), 0);
        const spStaff = [...(d.intStaff || []), ...(d.extStaff || [])].filter(x => (x.subprojectId || null) === sp.id);
        const staffCost = spStaff.reduce((s, x) => s + (x.count || 0) * (x.costHour || 0) * ((x.hOrd || 0) + (x.hStr || 0) + (x.hFest || 0) + (x.hNott || 0)), 0);
        const extraCost = [...(d.analytics || []), ...(d.damages || []), ...(d.misc || [])].filter(c => (c.subprojectId || null) === sp.id).reduce((s, c) => s + (c.cost || 0), 0);
        const totalCost = matCost + trCost + staffCost + extraCost;
        return [
          `${sp.inFinancial ? '✓' : '✗'} ${sp.name || 'Stand'}`,
          `€ ${fmt(matCost)}`,
          `€ ${fmt(matRev)}`,
          `€ ${fmt(trCost)}`,
          `€ ${fmt(staffCost)}`,
          `€ ${fmt(extraCost)}`,
          `€ ${fmt(totalCost)}`,
        ];
      });

      // Totals row (active stands only)
      const activeStands = d.subprojects.filter(sp => sp.inFinancial);
      const totMat = activeStands.reduce((s, sp) => {
        return s + (d.eqItems || []).filter(e => (e.subprojectId || null) === sp.id).reduce((a, e) => a + Math.round((e.qty || 0) * (e.costUnit || 0) * (e.coefficient ?? 1) * 100) / 100, 0);
      }, 0);
      const totRev = activeStands.reduce((s, sp) => {
        return s + (d.eqItems || []).filter(e => (e.subprojectId || null) === sp.id).reduce((a, e) => a + (e.sellPrice || 0), 0);
      }, 0);
      const totTr = activeStands.reduce((s, sp) => {
        return s + (d.legs || []).filter(l => (l.subprojectId || null) === sp.id).reduce((a, l) => a + ((l.rentalDay || 0) * (l.rentalDays || 1) * (l.nVeh || 1)), 0);
      }, 0);
      const totStaff = activeStands.reduce((s, sp) => {
        return s + [...(d.intStaff || []), ...(d.extStaff || [])].filter(x => (x.subprojectId || null) === sp.id).reduce((a, x) => a + (x.count || 0) * (x.costHour || 0) * ((x.hOrd || 0) + (x.hStr || 0) + (x.hFest || 0) + (x.hNott || 0)), 0);
      }, 0);
      const totExtra = activeStands.reduce((s, sp) => {
        return s + [...(d.analytics || []), ...(d.damages || []), ...(d.misc || [])].filter(c => (c.subprojectId || null) === sp.id).reduce((a, c) => a + (c.cost || 0), 0);
      }, 0);

      autoTable(doc, {
        startY: y,
        head: [['Stand', 'Materiale €', 'Ricavo Mat. €', 'Trasporti €', 'Staff €', 'Extra €', 'Totale €']],
        body: spRows,
        foot: [['TOTALE STAND ATTIVI', `€ ${fmt(totMat)}`, `€ ${fmt(totRev)}`, `€ ${fmt(totTr)}`, `€ ${fmt(totStaff)}`, `€ ${fmt(totExtra)}`, `€ ${fmt(totMat + totTr + totStaff + totExtra)}`]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: accentRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { halign: 'right', cellWidth: 30 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'right', cellWidth: 30 },
          4: { halign: 'right', cellWidth: 30 },
          5: { halign: 'right', cellWidth: 30 },
          6: { halign: 'right', cellWidth: 30 },
        },
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const sp = d.subprojects[data.row.index];
            if (sp && !sp.inFinancial) {
              data.cell.styles.textColor = [180, 180, 180];
              data.cell.styles.fontStyle = 'italic';
            }
          }
        },
        didDrawPage: (data) => { addPageFooter(doc, data.pageNumber); },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── TABLE: MATERIALE ──
    const eqRows = (calc.eqCalcs || []).map(e => [
      e.desc || '',
      e.supplier || '-',
      e.itemCategory || 'Proprio',
      e.qty,
      fmtD(e.coefficient ?? 1),
      `€ ${fmt(e.costUnit)}`,
      `€ ${fmt(e.cost)}`,
      `€ ${fmt(e.sellPrice || 0)}`,
      `€ ${fmt(e.revenue)}`,
      `€ ${fmt(e.marginEur)}`,
      e.marginPct !== null ? `${fmtD(e.marginPct)}%` : 'N/A',
      fmtD(e.vol),
      fmt(e.weight),
    ]);

    if (eqRows.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('MATERIALE E ATTREZZATURE', 10, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Descrizione', 'Fornitore', 'Categoria', 'QTY', 'Coeff', 'Costo Unit.', 'Costo Tot.', 'Vendita €/pz', 'Vendita Tot.', 'Margine €', 'Margine %', 'M³', 'KG']],
        body: eqRows,
        foot: [['TOTALE', '', '', '', '', '', `€ ${fmt(calc.totalEqCost)}`, '', `€ ${fmt(calc.totalEqRevenue)}`, `€ ${fmt(calc.totalEqMargin)}`, calc.totalEqRevenue > 0 ? `${fmtD((calc.totalEqRevenue - calc.totalEqCost) / calc.totalEqRevenue * 100)}%` : '-', fmtD(calc.totalVol), fmt(calc.totalWeight)]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 28 },
          2: { cellWidth: 20 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'right', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 22 },
          7: { halign: 'right', cellWidth: 22 },
          8: { halign: 'right', cellWidth: 22 },
          9: { halign: 'right', cellWidth: 20 },
          10: { halign: 'center', cellWidth: 18 },
          11: { halign: 'center', cellWidth: 14 },
          12: { halign: 'center', cellWidth: 14 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => { addPageFooter(doc, data.pageNumber); },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── TABLE: TRASPORTI ──
    const trRows = (calc.legCalcs || []).map(l => [
      l.desc || '-',
      l.route || '-',
      l.vName || '-',
      l.nVeh,
      l.km,
      `€ ${fmt(l.fuel)}`,
      `€ ${fmt(l.toll)}`,
      `€ ${fmt(l.rQ)}`,
      `€ ${fmt(l.total)}`,
      `€ ${fmt(l.sellPrice)}`,
      `€ ${fmt(l.legMargin)}`,
      l.legMarginPct !== null ? `${fmtD(l.legMarginPct)}%` : 'N/A',
    ]);

    if (trRows.length > 0) {
      // Check if we need a new page
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 15;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('TRASPORTI', 10, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Descrizione', 'Tratta', 'Veicolo', 'N° Veicoli', 'Km', 'Carburante €', 'Pedaggi €', 'Nolo €', 'Costo Tot.', 'Vendita €', 'Margine €', 'Margine %']],
        body: trRows,
        foot: [['TOTALE', '', '', '', '', '', '', '', `€ ${fmt(calc.totalTransport)}`, `€ ${fmt(calc.totalTransportRevenue)}`, `€ ${fmt(calc.totalTransportMargin)}`, calc.totalTransportMarginPct !== null ? `${fmtD(calc.totalTransportMarginPct)}%` : '-']],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 14 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', cellWidth: 20 },
          7: { halign: 'right', cellWidth: 20 },
          8: { halign: 'right', cellWidth: 22 },
          9: { halign: 'right', cellWidth: 22 },
          10: { halign: 'right', cellWidth: 20 },
          11: { halign: 'center', cellWidth: 18 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => { addPageFooter(doc, data.pageNumber); },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── TABLE: STAFF ──
    const staffRows = [];
    // Warehouse
    if (d.whCount > 0) {
      const whCost = calc.totalWh;
      const whSell = d.whSellTotal || 0;
      const whMargin = whSell - whCost;
      const whMarginPct = whSell > 0 ? (whMargin / whSell) * 100 : null;
      staffRows.push([
        'Magazzino', 'Magazziniere', d.whCount, `€ ${fmt(d.whRate)}`,
        fmtD(d.whHLoad + d.whHUnload), '-', '-', '-',
        `€ ${fmt(whCost)}`, `€ ${fmt(whSell)}`, `€ ${fmt(whMargin)}`,
        whMarginPct !== null ? `${fmtD(whMarginPct)}%` : 'N/A',
      ]);
    }
    // Internal staff
    (calc.intCalcs || []).forEach(s => {
      const margin = (s.sellTotal || 0) - s.total;
      const marginPct = (s.sellTotal || 0) > 0 ? (margin / s.sellTotal) * 100 : null;
      staffRows.push([
        'Interno', s.role || '-', s.count, `€ ${fmt(s.costHour)}`,
        fmtD(s.hOrd), fmtD(s.hStr), fmtD(s.hFest), fmtD(s.hNott),
        `€ ${fmt(s.total)}`, `€ ${fmt(s.sellTotal || 0)}`, `€ ${fmt(margin)}`,
        marginPct !== null ? `${fmtD(marginPct)}%` : 'N/A',
      ]);
    });
    // External staff
    (calc.extCalcs || []).forEach(s => {
      const margin = (s.sellTotal || 0) - s.total;
      const marginPct = (s.sellTotal || 0) > 0 ? (margin / s.sellTotal) * 100 : null;
      staffRows.push([
        'Esterno', s.role || '-', s.count, `€ ${fmt(s.costHour)}`,
        fmtD(s.hOrd), fmtD(s.hStr), fmtD(s.hFest), fmtD(s.hNott),
        `€ ${fmt(s.total)}`, `€ ${fmt(s.sellTotal || 0)}`, `€ ${fmt(margin)}`,
        marginPct !== null ? `${fmtD(marginPct)}%` : 'N/A',
      ]);
    });

    if (staffRows.length > 0) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 15;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text('PERSONALE', 10, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Ruolo', 'N°', '€/h', 'Ore Ord', 'Ore Str', 'Ore Fest', 'Ore Nott', 'Costo Tot.', 'Vendita €', 'Margine €', 'Margine %']],
        body: staffRows,
        foot: [['TOTALE', '', '', '', '', '', '', '', `€ ${fmt(calc.totalAllStaff)}`, `€ ${fmt(calc.totalStaffRevenue)}`, `€ ${fmt(calc.totalStaffMargin)}`, calc.totalStaffMarginPct !== null ? `${fmtD(calc.totalStaffMarginPct)}%` : '-']],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.2 },
        headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', textColor: [40, 40, 40] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40 },
          2: { halign: 'center', cellWidth: 12 },
          3: { halign: 'right', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 18 },
          8: { halign: 'right', cellWidth: 24 },
          9: { halign: 'right', cellWidth: 24 },
          10: { halign: 'right', cellWidth: 22 },
          11: { halign: 'center', cellWidth: 18 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => { addPageFooter(doc, data.pageNumber); },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // ── TABLE: ALTRI COSTI ──
    const otherCosts = [
      ['Pianificazione', `€ ${fmt(calc.totalPlanCost)}`],
      ['Vitto & Alloggio', `€ ${fmt(calc.totalAccom)}`],
      ['Costi Analitici', `€ ${fmt(calc.totalAn)}`],
      ['Danni & Extra', `€ ${fmt(calc.totalDmg)}`],
      ['Varie', `€ ${fmt(calc.totalMisc)}`],
      ['Ammortamenti (calcolato)', `€ ${fmt(calc.totalDepreciation)}`],
      ...(selectedSubprojectId === null && (projectData.amortization || 0) > 0 ? [['Ammortamento materiale (manuale)', `€ ${fmt(projectData.amortization)}`]] : []),
      [`Fee Agenzia / WP (${(d.agencyFeeType || 'percent') === 'percent' ? (d.agencyFeeValue || 0) + '%' : 'fisso'})`, `€ ${fmt(calc.agencyFeeTotal || 0)}`],
      ['Contingency', `€ ${fmt(calc.contingencyAmt)}`],
      ['Costo Finanziario', `€ ${fmt(calc.financialCost)}`],
    ];

    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('ALTRI COSTI', 10, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Voce', 'Importo']],
      body: otherCosts,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'right', cellWidth: 30 },
      },
      tableWidth: 90,
      margin: { left: 10 },
      didDrawPage: (data) => { addPageFooter(doc, data.pageNumber); },
    });
    y = doc.lastAutoTable.finalY + 8;

    // ═══════════════════════════════════════════════════════════════
    // NEW PAGE: RIEPILOGO FINANZIARIO E MARGINALITÀ (USO INTERNO)
    // ═══════════════════════════════════════════════════════════════
    doc.addPage();
    y = 0;

    // Header bar for summary page
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFillColor(...accentRgb);
    doc.rect(0, 20, pageW, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RIEPILOGO FINANZIARIO E MARGINALITÀ (USO INTERNO)', 10, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Progetto: ${d.projectName || '-'}  |  Cliente: ${d.clientName || '-'}  |  ${today}`, pageW - 10, 14, { align: 'right' });
    y = 30;

    // Margin color helper
    const marginColor = (pct) => {
      if (pct >= 15) return [39, 174, 96];   // green
      if (pct >= 0) return [230, 126, 34];   // orange
      return [220, 53, 69];                   // red
    };
    const mCol = marginColor(calc.marginPct || 0);

    // Fee description
    const feeLabel = (d.agencyFeeType || 'percent') === 'percent'
      ? `Fee Agenzia / WP (${d.agencyFeeValue || 0}% di €${fmt(calc.effectiveGross)})`
      : `Fee Agenzia / WP (importo fisso)`;

    // Summary Table
    const summaryRows = [
      // SECTION: RICAVI
      ['RICAVO LORDO EFFETTIVO', `€ ${fmtD(calc.effectiveGross)}`, '', { section: 'revenue' }],
      [`  Sconto applicato (${d.discType === '%' ? d.discVal + '%' : '€'})`, `- € ${fmtD(calc.discAmt)}`, '', {}],
      ['RICAVO NETTO (post-sconto)', `€ ${fmtD(calc.revenueNet)}`, '', { bold: true }],
      // SEPARATOR
      ['', '', '', { separator: true }],
      // SECTION: COSTI OPERATIVI
      ['COSTI OPERATIVI', '', '', { header: true }],
      ['  Materiale + Sub + Acquisti', `€ ${fmtD(calc.costMaterial)}`, `${calc.revenueNet > 0 ? fmtD(calc.costMaterial / calc.revenueNet * 100) : '0'}%`, {}],
      ['  Ammortamento materiale (calcolato)', `€ ${fmtD(calc.totalDepreciation)}`, `${calc.revenueNet > 0 ? fmtD(calc.totalDepreciation / calc.revenueNet * 100) : '0'}%`, {}],
      ...(selectedSubprojectId === null && (projectData.amortization || 0) > 0 ? [['  Ammortamento materiale (manuale)', `€ ${fmtD(projectData.amortization)}`, `${calc.revenueNet > 0 ? fmtD(projectData.amortization / calc.revenueNet * 100) : '0'}%`, {}]] : []),
      ['  Trasporto', `€ ${fmtD(calc.totalTransport)}`, `${calc.revenueNet > 0 ? fmtD(calc.totalTransport / calc.revenueNet * 100) : '0'}%`, {}],
      ['  Personale (campo + magazzino)', `€ ${fmtD(calc.totalAllStaff)}`, `${calc.revenueNet > 0 ? fmtD(calc.totalAllStaff / calc.revenueNet * 100) : '0'}%`, {}],
      // SEPARATOR
      ['', '', '', { separator: true }],
      // SECTION: COSTI AGGIUNTIVI
      ['COSTI AGGIUNTIVI & OVERHEAD', '', '', { header: true }],
      ['  Pianificazione / PM', `€ ${fmtD(calc.totalPlanCost)}`, `${calc.revenueNet > 0 ? fmtD(calc.totalPlanCost / calc.revenueNet * 100) : '0'}%`, {}],
      ['  Vitto & Alloggio', `€ ${fmtD(calc.totalAccom)}`, `${calc.revenueNet > 0 ? fmtD(calc.totalAccom / calc.revenueNet * 100) : '0'}%`, {}],
      ['  Costi Analitici + Danni + Extra', `€ ${fmtD(calc.totalAn + calc.totalDmg + calc.totalMisc)}`, `${calc.revenueNet > 0 ? fmtD((calc.totalAn + calc.totalDmg + calc.totalMisc) / calc.revenueNet * 100) : '0'}%`, {}],
      [`  ${feeLabel}`, `€ ${fmtD(calc.agencyFeeTotal || 0)}`, `${calc.revenueNet > 0 ? fmtD((calc.agencyFeeTotal || 0) / calc.revenueNet * 100) : '0'}%`, { highlight: (calc.agencyFeeTotal || 0) > 0 }],
      // SEPARATOR
      ['', '', '', { separator: true }],
      // SECTION: TOTALI E MARGINE
      ['SUBTOTALE COSTI (pre-contingency)', `€ ${fmtD(calc.costsBeforeContingency)}`, `${calc.revenueNet > 0 ? fmtD(calc.costsBeforeContingency / calc.revenueNet * 100) : '0'}%`, { bold: true }],
      [`  Contingency (${d.contingencyPct}%)`, `€ ${fmtD(calc.contingencyAmt)}`, '', {}],
      [`  Costo finanziario (${d.paymentDays}gg, ${d.interestRate}%)`, `€ ${fmtD(calc.financialCost)}`, '', {}],
      ['TOTALE COSTI PROGETTO', `€ ${fmtD(calc.totalCostsAll)}`, '', { bold: true, fillColor: [248, 249, 250] }],
      // SEPARATOR
      ['', '', '', { separator: true }],
      // FINAL MARGIN
      ['MARGINE NETTO', `€ ${fmtD(calc.margin)}`, `${fmtD(calc.marginPct)}%`, { bold: true, textColor: mCol }],
      ['MARKUP SUL COSTO', `${fmtD(calc.markupPct)}%`, '', {}],
      ['MARGINE / GIORNO LAVORO', `€ ${fmtD(calc.marginPerDay || 0)}`, `(${d.totalWorkDays || 0} gg)`, {}],
      ['BREAK-EVEN (ricavo minimo)', `€ ${fmtD(calc.totalCostsAll)}`, '', { bold: true, fillColor: [255, 248, 240] }],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Voce', 'Importo', 'Incidenza %']],
      body: summaryRows.map(row => [row[0], row[1], row[2]]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 }, lineColor: [230, 230, 230], lineWidth: 0.2, overflow: 'linebreak' },
      headStyles: { fillColor: primaryRgb, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 120, font: 'helvetica' },
        1: { cellWidth: 50, halign: 'right', font: 'helvetica' },
        2: { cellWidth: 35, halign: 'center', font: 'helvetica', textColor: [120, 120, 120] },
      },
      tableWidth: 205,
      margin: { left: 10 },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const meta = summaryRows[data.row.index]?.[3] || {};
        if (meta.separator) {
          data.cell.styles.minCellHeight = 2;
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.text = [''];
        }
        if (meta.header) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 244, 248];
          data.cell.styles.textColor = primaryRgb;
          data.cell.styles.fontSize = 9;
        }
        if (meta.bold) {
          data.cell.styles.fontStyle = 'bold';
        }
        if (meta.fillColor) {
          data.cell.styles.fillColor = meta.fillColor;
        }
        if (meta.textColor) {
          data.cell.styles.textColor = meta.textColor;
        }
        if (meta.highlight && data.column.index === 1) {
          data.cell.styles.textColor = [233, 30, 99]; // pink like UI
        }
        // Color the margin row
        if (data.row.index === summaryRows.length - 4 && data.column.index >= 1) {
          data.cell.styles.textColor = mCol;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 11;
        }
      },
      didDrawPage: (data) => { addPageFooter(doc, data.pageNumber); },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Watermark note
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(180, 180, 180);
    doc.text('Documento riservato — Solo per uso interno. I dati sono calcolati automaticamente dal sistema Itinera Calculator.', 10, y);

    // ── SAVE ──
    const safeName = (d.projectName || 'Progetto').replace(/[^a-zA-Z0-9_\- àèéìòùÀÈÉÌÒÙ]/g, '_');
    doc.save(`Report_Analitico_${safeName}.pdf`);
  } catch (err) {
    console.error('PDF generation error:', err);
    alert('Errore nella generazione del PDF: ' + (err.message || err));
  }
}

function addPageFooter(doc, pageNumber) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Report Analitico Interno — Documento Riservato', 10, pageH - 5);
  doc.text(`Pagina ${pageNumber}`, pageW - 10, pageH - 5, { align: 'right' });
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
  csv += `Tipo,Ruolo,N°,€/h,Ore Ord,Ore Str,Ore Fest,Ore Nott,Costo Tot €,Vendita €,Margine €,Margine %\n`;
  const whCost = calc.totalWh;
  const whSell = d.whSellTotal || 0;
  const whMargin = whSell - whCost;
  const whMarginPct = whSell > 0 ? (whMargin / whSell) * 100 : null;
  csv += `Magazzino,Magazziniere,${d.whCount},${n(d.whRate)},${n(d.whHLoad + d.whHUnload)},,,,,${n(whCost)},${n(whSell)},${n(whMargin)},${whMarginPct !== null ? n(whMarginPct) : 'N/A'}\n`;
  (calc.intCalcs || []).forEach(s => {
    const margin = (s.sellTotal || 0) - s.total;
    const marginPct = (s.sellTotal || 0) > 0 ? (margin / s.sellTotal) * 100 : null;
    csv += `Interno,${esc(s.role)},${s.count},${n(s.costHour)},${n(s.hOrd)},${n(s.hStr)},${n(s.hFest)},${n(s.hNott)},${n(s.total)},${n(s.sellTotal || 0)},${n(margin)},${marginPct !== null ? n(marginPct) : 'N/A'}\n`;
  });
  (calc.extCalcs || []).forEach(s => {
    const margin = (s.sellTotal || 0) - s.total;
    const marginPct = (s.sellTotal || 0) > 0 ? (margin / s.sellTotal) * 100 : null;
    csv += `Esterno,${esc(s.role)},${s.count},${n(s.costHour)},${n(s.hOrd)},${n(s.hStr)},${n(s.hFest)},${n(s.hNott)},${n(s.total)},${n(s.sellTotal || 0)},${n(margin)},${marginPct !== null ? n(marginPct) : 'N/A'}\n`;
  });
  csv += `TOTALE STAFF,,,,,,,,${n(calc.totalAllStaff)},${n(calc.totalStaffRevenue)},${n(calc.totalStaffMargin)},${calc.totalStaffMarginPct !== null ? n(calc.totalStaffMarginPct) : 'N/A'}\n\n`;

  // Other costs
  csv += `--- ALTRI COSTI ---\n`;
  csv += `Voce,Importo €\n`;
  csv += `Pianificazione,${n(calc.totalPlanCost)}\n`;
  csv += `Vitto & Alloggio,${n(calc.totalAccom)}\n`;
  csv += `Costi Analitici,${n(calc.totalAn)}\n`;
  csv += `Danni & Extra,${n(calc.totalDmg)}\n`;
  csv += `Varie,${n(calc.totalMisc)}\n`;
  csv += `Ammortamenti,${n(calc.totalDepreciation)}\n`;
  csv += `Fee Agenzia (${(d.agencyFeeType || 'percent') === 'percent' ? (d.agencyFeeValue || 0) + '%' : 'fisso'}),${n(calc.agencyFeeTotal || 0)}\n`;
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
export default function ExportDropdown({ projectData, calc, appConfig, selectedSubprojectId = null, style = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePDF = () => {
    setOpen(false);
    setTimeout(() => {
      generateAnalyticalPDF(projectData, calc, appConfig, selectedSubprojectId);
    }, 100);
  };

  const handleCSV = () => {
    setOpen(false);
    setTimeout(() => {
      const csv = generateInternalCSV(projectData, calc);
      const name = (projectData.projectCode || projectData.projectName || 'export').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadCSV(csv, `${name}_dati_tecnici.csv`);
    }, 100);
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
              <div>Report Analitico (PDF)</div>
              <div style={{ fontSize: 10, color: '#888', fontWeight: 400 }}>Report completo: costi, margini, fornitori, volumi</div>
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
