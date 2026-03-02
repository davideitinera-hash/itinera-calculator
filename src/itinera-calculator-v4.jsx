import { useState, useMemo, useEffect, useRef } from "react";
import { useSupabaseProject } from './hooks/useSupabaseProject';
import { useAppConfig } from './hooks/useAppConfig';
import { supabase } from './lib/supabaseClient';
import { useResponsive } from './hooks/useResponsive';
import { useDragDrop } from './hooks/useDragDrop';
import Breadcrumb from './components/Breadcrumb';
import ExportPDFButton from './components/ExportPDF';
import RentmanImportModal from './components/RentmanImportModal';
import SyncHistoryModal from './components/SyncHistoryModal';
import SyncDiffModal from './components/SyncDiffModal';
import { useToast } from './components/Toast';

// ═══ CONFIG ═══
const DIESEL = 1.666;
const ROUTES = {
  "Magazzino → Borgo Egnazia (85km)": { km: 85, tolls: 6.2 },
  "Magazzino → Torre Maizza (78km)": { km: 78, tolls: 4.8 },
  "Magazzino → Fiera Bari (55km)": { km: 55, tolls: 3.1 },
  "Magazzino → Castello Monaci (92km)": { km: 92, tolls: 5.5 },
  "Magazzino → Le Carrube (52km)": { km: 52, tolls: 2.4 },
  "Magazzino → Villa Ceglie (45km)": { km: 45, tolls: 0 },
  "Magazzino → Tenuta Moreno (38km)": { km: 38, tolls: 0 },
  "Personalizzato": { km: 0, tolls: 0 },
};
const RK = Object.keys(ROUTES);
const VEHICLE_TYPES = [
  { name: "Furgone Standard", cons: 10, vol: 10, payload: 1400 },
  { name: "Furgone Maxi (Passo Lungo)", cons: 12, vol: 15, payload: 1400 },
  { name: "Motrice Piccola (2 Assi)", cons: 18, vol: 35, payload: 8000 },
  { name: "Bilico (Autoarticolato)", cons: 32, vol: 80, payload: 24000 },
  { name: "Auto/Pick-up", cons: 8, vol: 3, payload: 500 },
];
const OT_MULT = { ordinario: 1.00, straordinario: 1.25, festivo: 1.50, notturno: 1.15 };


const fmt = v => (v || 0).toLocaleString("it-IT", { maximumFractionDigits: 0 });
const fmtD = (v, d = 1) => (v || 0).toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtD2 = v => fmtD(v, 2);
const pc = (v, t) => t > 0 ? v / t * 100 : 0;

// ═══ HOOKS ═══




// ═══ UI COMPONENTS ═══
const Badge = ({ v }) => {
  const c = v >= 30 ? "#27ae60" : v >= 15 ? "#e67e22" : "#e74c3c";
  const l = v >= 30 ? "✅ OTTIMO" : v >= 15 ? "⚠️ ATTENZIONE" : "🚨 CRITICO";
  return <span style={{ background: c, color: "#fff", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{l}</span>;
};
const M = ({ label, value, color, s }) => (
  <div style={{ textAlign: "center", padding: "2px 5px" }}>
    <div style={{ fontSize: s ? 16 : 24, fontWeight: 800, color: color || "#1B3A5C", transition: 'color 0.3s ease' }}>{value}</div>
    <div style={{ fontSize: 9, color: "#888" }}>{label}</div>
  </div>
);
const Card = ({ title, icon, children, accent, open, onToggle, right }) => (
  <div className="no-print" style={{ background: "#fff", borderRadius: 10, border: `1px solid ${accent || "#e0e6ed"}`, borderTop: `3px solid ${accent || "#2E86AB"}`, marginBottom: 10, overflow: "hidden" }}>
    <div onClick={onToggle} style={{ padding: "9px 14px", cursor: onToggle ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontWeight: 700, fontSize: 11, color: "#1B3A5C", textTransform: "uppercase", letterSpacing: 0.3 }}>{icon} {title}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {right && <span style={{ fontSize: 12, fontWeight: 700, color: accent || "#2E86AB", transition: 'color 0.3s ease' }}>{right}</span>}
        {onToggle && <span style={{ fontSize: 13, color: "#bbb", transform: open ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.25s ease" }}>▼</span>}
      </div>
    </div>
    <div style={{ overflow: 'hidden', maxHeight: open !== false ? 5000 : 0, opacity: open !== false ? 1 : 0, transition: 'max-height 0.35s ease, opacity 0.25s ease' }}>
      <div style={{ padding: "0 14px 12px" }}>{children}</div>
    </div>
  </div>
);
const R = ({ children, gap }) => <div className="no-print" style={{ display: "flex", gap: gap || 6, marginBottom: 5, flexWrap: "wrap", alignItems: "end" }}>{children}</div>;
const F = ({ label, value, onChange, type = "number", min, step = 1, w, ph, disabled, vr }) => {
  const [err, setErr] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [local, setLocal] = useState(null);
  const prevRef = useRef(value);
  const timerRef = useRef(null);
  const editing = local !== null;
  const displayed = editing ? local : value;
  const handleFocus = (e) => { setLocal(String(value)); prevRef.current = value; if (type === 'number') e.target.select(); };
  const handleChange = (e) => { clearTimeout(timerRef.current); setErr(null); if (type === 'text') { onChange(e.target.value); } else { setLocal(e.target.value); } };
  const handleBlur = (e) => {
    const raw = type === 'text' ? e.target.value : local;
    setLocal(null);
    if (type === 'text') { const t = raw.trim().slice(0, 200); if (t !== value) onChange(t); return; }
    const num = parseFloat(raw);
    const rule = vr || { min: min != null ? min : 0, max: 999999 };
    if (raw === '' || isNaN(num) || num < rule.min || num > rule.max) {
      setErr(`Non valido (${rule.min}-${rule.max})`); setShaking(true); setTimeout(() => setShaking(false), 500);
      clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { setErr(null); }, 2000);
      onChange(prevRef.current); return;
    }
    prevRef.current = num; setErr(null); onChange(num);
  };
  return (
    <div style={{ flex: w || 1, minWidth: 60, position: 'relative' }}>
      {label && <label style={{ fontSize: 9, color: "#888", display: "block", marginBottom: 1 }}>{label}</label>}
      <input type={type === 'number' && editing ? 'text' : type} value={displayed} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} min={min} step={step} placeholder={ph} disabled={disabled} inputMode={type === 'number' ? 'decimal' : undefined}
        className={shaking ? 'inp-shake' : ''} style={{ width: "100%", padding: "4px 6px", border: `1px solid ${err ? '#ef4444' : '#d0d7de'}`, borderRadius: 4, fontSize: 11, background: disabled ? "#f5f5f5" : "#fff", boxSizing: "border-box", transition: 'border-color 0.2s' }} />
      {err && <div style={{ position: 'absolute', left: 0, top: '100%', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 9, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 10, marginTop: 1 }}>{err}</div>}
    </div>
  );
};
const Sel = ({ label, value, onChange, options, w }) => (
  <div style={{ flex: w || 1, minWidth: 80 }}>
    {label && <label style={{ fontSize: 9, color: "#888", display: "block", marginBottom: 1 }}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "4px 6px", border: "1px solid #d0d7de", borderRadius: 4, fontSize: 11, background: "#fff" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);
const Chk = ({ label, checked, onChange }) => (
  <label style={{ fontSize: 10, color: "#666", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    {label}
  </label>
);
const Bar = ({ label, value, max, color }) => {
  const p = max > 0 ? Math.min(value / max * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 1 }}>
        <span style={{ color: "#555" }}>{label}</span>
        <span style={{ fontWeight: 700 }}>€{fmt(value)} ({fmtD(p)}%)</span>
      </div>
      <div style={{ background: "#edf0f4", borderRadius: 3, height: 5, width: "100%" }}>
        <div style={{ width: `${p}%`, background: color, height: "100%", borderRadius: 3, transition: "width 0.3s" }} />
      </div>
    </div>
  );
};
const Btn = ({ children, onClick, color = "#2E86AB", s, disabled, title, className }) => (
  <button title={title} onClick={onClick} disabled={disabled} className={className} style={{ background: disabled ? "#ccc" : color, color: "#fff", border: "none", borderRadius: 4, padding: s ? "3px 7px" : "6px 12px", fontSize: s ? 10 : 11, cursor: disabled ? "default" : "pointer", fontWeight: 600, transition: 'all 0.2s ease' }}>{children}</button>
);
const Sub = ({ text }) => <div style={{ fontSize: 10, color: "#666", background: "#f8f9fb", borderRadius: 5, padding: "5px 8px", marginTop: 5, lineHeight: 1.5 }}>{text}</div>;
const X = ({ onClick }) => <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c", fontSize: 13, padding: "1px 3px" }}>✕</button>;
const Inp = ({ value, onChange, type = "text", ph, align, w, vr }) => {
  const [err, setErr] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [local, setLocal] = useState(null);
  const prevRef = useRef(value);
  const timerRef = useRef(null);
  const editing = local !== null;
  const displayed = editing ? local : value;
  const handleFocus = (e) => { setLocal(String(value)); prevRef.current = value; if (type === 'number') e.target.select(); };
  const handleChange = (e) => { clearTimeout(timerRef.current); setErr(null); if (type === 'text') { onChange(e.target.value); } else { setLocal(e.target.value); } };
  const handleBlur = () => {
    const raw = type === 'text' ? undefined : local;
    setLocal(null);
    if (type === 'text') { const t = String(value).trim().slice(0, 200); if (t !== value) onChange(t); return; }
    const num = parseFloat(raw);
    const rule = vr || { min: 0, max: 999999 };
    if (raw === '' || isNaN(num) || num < rule.min || num > rule.max) {
      setErr(`Non valido (${rule.min}-${rule.max})`); setShaking(true); setTimeout(() => setShaking(false), 500);
      clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { setErr(null); }, 2000);
      onChange(prevRef.current); return;
    }
    prevRef.current = num; setErr(null); onChange(num);
  };
  return (
    <div style={{ position: 'relative' }}>
      <input type={type === 'number' && editing ? 'text' : type} value={displayed} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} placeholder={ph} inputMode={type === 'number' ? 'decimal' : undefined}
        className={shaking ? 'inp-shake' : ''} style={{ padding: "3px 5px", border: `1px solid ${err ? '#ef4444' : '#d0d7de'}`, borderRadius: 4, fontSize: 11, textAlign: align || "left", width: w || "100%", boxSizing: "border-box", transition: 'border-color 0.2s' }} />
      {err && <div style={{ position: 'absolute', left: 0, top: '100%', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 9, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 10, marginTop: 1 }}>{err}</div>}
    </div>
  );
};
const Warn = ({ text, color = "#e74c3c" }) => <div style={{ background: color + "15", border: `1px solid ${color}`, borderRadius: 6, padding: "5px 8px", fontSize: 10, color, marginTop: 5 }}>{text}</div>;
const Info = ({ text }) => <div style={{ fontSize: 9, color: "#aaa", marginTop: 3 }}>{text}</div>;

// ═══ GLOBAL STYLES (Print Additions) ═══
const GlobalStyles = () => (
  <style>{`
    @media print {
      body { background: #fff !important; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .hero-dashboard { border: none !important; margin: 0 !important; padding: 0 !important; }
      * { box-shadow: none !important; }
    }
    @keyframes inp-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-3px)} 40%{transform:translateX(3px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
    .inp-shake { animation: inp-shake 0.4s ease; }
  `}</style>
);

function SupplierInput({ value, onChange, placeholder, suppliersList, onAutoSave }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [focused, setFocused] = useState(false);
  // Derive displayed value: when focused use local search state, otherwise use prop value
  const displayValue = focused ? search : (value || '');
  const filterText = focused ? search : (value || '');
  const filtered = filterText.length >= 1 ? suppliersList.filter(s => s.name.toLowerCase().includes(filterText.toLowerCase())).slice(0, 10) : [];
  return (
    <div style={{ position: 'relative' }}>
      <input value={displayValue} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setSearch(value || ''); setOpen(true); }} onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 200); if (search !== value) onChange(search); }} placeholder={placeholder || 'Fornitore'} style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
          {filtered.map(s => (
            <div key={s.id} onMouseDown={e => { e.preventDefault(); onChange(s.name); setSearch(s.name); setOpen(false); if (onAutoSave) onAutoSave(s.name); }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.target.style.background = '#eef6fb'} onMouseLeave={e => e.target.style.background = '#fff'}>
              <span style={{ fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 10 }}>{s.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Staff Sub-component mapping (moved outside of main component)
const StaffTable = ({ listField, calcList, label, isMobile, updateObjList, delObj, addObj }) => {
  const cols = isMobile ? "1.8fr 0.4fr 0.6fr 0.4fr 0.4fr 0.4fr 0.4fr 0.7fr auto" : "2fr 0.5fr 0.7fr 0.5fr 0.5fr 0.5fr 0.5fr 0.8fr auto";
  const mw = isMobile ? 550 : 650;
  return (
    <>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: 3, minWidth: mw, marginBottom: 3 }}>
          {["Ruolo", "N°", "€/h", "Ord", "Str ×1.25", "Fest ×1.5", "Nott ×1.15", "Costo", ""].map(h => <span key={h} style={{ fontSize: 8, color: "#999", fontWeight: 600, textTransform: "uppercase" }}>{h}</span>)}
        </div>
        {calcList.map(s => (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 3, minWidth: mw, marginBottom: 2, alignItems: "center" }}>
            <Inp value={s.role} onChange={v => updateObjList(listField, s.id, "role", v)} ph="Ruolo" />
            <Inp type="number" value={s.count} onChange={v => updateObjList(listField, s.id, "count", v)} align="center" />
            <Inp type="number" value={s.costHour} onChange={v => updateObjList(listField, s.id, "costHour", v)} align="center" />
            <Inp type="number" value={s.hOrd} onChange={v => updateObjList(listField, s.id, "hOrd", v)} align="center" />
            <Inp type="number" value={s.hStr} onChange={v => updateObjList(listField, s.id, "hStr", v)} align="center" />
            <Inp type="number" value={s.hFest} onChange={v => updateObjList(listField, s.id, "hFest", v)} align="center" />
            <Inp type="number" value={s.hNott} onChange={v => updateObjList(listField, s.id, "hNott", v)} align="center" />
            <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right", transition: 'color 0.3s ease' }}>€{fmt(s.total)}</div>
            <X onClick={() => delObj(listField, s.id)} />
          </div>
        ))}
      </div>
      <Btn onClick={() => addObj(listField, { role: "", count: 1, costHour: 20, hOrd: 8, hStr: 0, hFest: 0, hNott: 0 })} s>+ {label}</Btn>
    </>
  );
};

const EQ_GRID_COLS = "auto 1.6fr 0.9fr 0.4fr 0.4fr 0.4fr 0.4fr 0.4fr 0.45fr 0.5fr 0.5fr 0.5fr 0.5fr 0.35fr 0.55fr 0.55fr auto";
const EQ_HEADERS = ["", "Descrizione", "Fornitore", "Qty", "Coeff.", "L(m)", "W(m)", "H(m)", "Kg/pz", "m³", "Kg tot", "€/pz", "Vendita €/pz", "", "Costo", "Ricavo", ""];

const EquipmentGrid = ({ items, updateObjList, delObj, showDragHandle = false, showCategoryDropdown = false, getDragProps }) => {
  const totalCost = items.reduce((s, e) => s + e.cost, 0);
  const totalRevenue = items.reduce((s, e) => s + e.revenue, 0);
  const totalMargin = items.reduce((s, e) => s + e.marginEur, 0);
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: "grid", gridTemplateColumns: EQ_GRID_COLS, gap: 3, minWidth: 1060, marginBottom: 3, alignItems: "end" }}>
        {EQ_HEADERS.map((h, i) => {
          const hlCost = ["Qty", "Coeff.", "€/pz"].includes(h);
          const hlSell = h === "Vendita €/pz";
          const hl = hlCost || hlSell;
          return <span key={h + i} style={{ fontSize: 8, fontWeight: hl ? 800 : 600, color: hl ? "#ffffff" : "#999", background: hlSell ? "#27ae60" : hlCost ? "#2E86AB" : "transparent", borderRadius: hl ? "4px 4px 0 0" : 0, padding: hl ? "8px 4px" : "0 0 2px", textTransform: "uppercase", textAlign: i >= 3 ? "center" : "left", letterSpacing: 0.3 }}>{h}</span>;
        })}
      </div>
      {items.map((e, idx) => {
        const mColor = e.marginEur > 0 ? (e.marginPct >= 15 ? '#27ae60' : '#e67e22') : e.marginEur < 0 ? '#e74c3c' : '#999';
        const dragProps = showDragHandle && getDragProps ? getDragProps(idx) : {};
        return (
          <div key={e.id} {...dragProps}>
            <div style={{ display: "grid", gridTemplateColumns: EQ_GRID_COLS, gap: 3, minWidth: 1060, marginBottom: 1, alignItems: "center" }}>
              {showDragHandle ? <span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16, userSelect: 'none', padding: '0 4px' }} title="Trascina per riordinare">⠿</span> : <span />}
              <Inp value={e.desc} onChange={v => updateObjList("eqItems", e.id, "desc", v)} />
              <Inp value={e.supplier || ''} onChange={v => updateObjList("eqItems", e.id, "supplier", v)} ph="Fornitore" />
              <div className="eq-col-hl"><Inp type="number" value={e.qty} onChange={v => updateObjList("eqItems", e.id, "qty", Math.round(v))} align="center" vr={{ min: 0, max: 9999 }} /></div>
              <div className="eq-col-hl"><Inp type="number" value={e.coefficient ?? 1} onChange={v => updateObjList("eqItems", e.id, "coefficient", v)} align="center" vr={{ min: 0.1, max: 99 }} /></div>
              <Inp type="number" value={e.l} onChange={v => updateObjList("eqItems", e.id, "l", v)} align="center" />
              <Inp type="number" value={e.w} onChange={v => updateObjList("eqItems", e.id, "w", v)} align="center" />
              <Inp type="number" value={e.h} onChange={v => updateObjList("eqItems", e.id, "h", v)} align="center" />
              <Inp type="number" value={e.weightKg} onChange={v => updateObjList("eqItems", e.id, "weightKg", v)} align="center" />
              <div style={{ fontSize: 10, textAlign: "center", color: "#2E86AB", fontWeight: 600 }}>{fmtD2(e.vol)}</div>
              <div style={{ fontSize: 10, textAlign: "center", color: "#e67e22", fontWeight: 600 }}>{fmt(e.weight)}</div>
              <div className="eq-col-hl"><Inp type="number" value={e.costUnit} onChange={v => updateObjList("eqItems", e.id, "costUnit", v)} align="center" /></div>
              <div className="eq-col-sell"><Inp type="number" value={e.sellPrice || 0} onChange={v => updateObjList("eqItems", e.id, "sellPrice", v)} align="center" /></div>
              <div style={{ fontSize: 10, textAlign: "center", color: (e.coefficient ?? 1) !== 1 ? '#e67e22' : '#ccc' }}>{(e.coefficient ?? 1) !== 1 ? `×${fmtD(e.coefficient, 2)}` : ''}</div>
              <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>€{fmt(e.cost)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right", color: "#2E86AB" }}>€{fmt(e.revenue)}</div>
              <X onClick={() => delObj("eqItems", e.id)} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 5, paddingLeft: showDragHandle ? 4 : 0, alignItems: "center", flexWrap: "wrap" }}>
              {showCategoryDropdown && (
                <select value={e.itemCategory || 'Proprio'} onChange={ev => updateObjList("eqItems", e.id, "itemCategory", ev.target.value)} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid #ddd', fontWeight: 600, color: e.itemCategory === 'Sub-noleggio' ? '#e67e22' : e.itemCategory === 'Acquisto' ? '#8e44ad' : '#2E86AB', background: e.itemCategory === 'Sub-noleggio' ? '#fef3e8' : e.itemCategory === 'Acquisto' ? '#f5eef8' : '#eef6fb' }}>
                  <option value="Proprio">🔵 Proprio</option>
                  <option value="Sub-noleggio">🟠 Sub-noleggio</option>
                  <option value="Acquisto">🟣 Acquisto</option>
                </select>
              )}
              {e.owned && <>
                <F label="Acquisto €" value={e.purchasePrice} onChange={v => updateObjList("eqItems", e.id, "purchasePrice", v)} w="0.5" />
                <F label="Utilizzi vita" value={e.totalUses} onChange={v => updateObjList("eqItems", e.id, "totalUses", v)} w="0.4" />
                <F label="Già usati" value={e.usesUsed} onChange={v => updateObjList("eqItems", e.id, "usesUsed", v)} w="0.4" />
                <span style={{ fontSize: 9, color: "#888" }}>
                  Ammort: €{fmtD2(e.depPerUse)}/uso → <strong>€{fmtD2(e.depTotal)}</strong>/ev | ROI: {e.roiEvents} ev ({fmtD(e.roiPaid)}%{e.roiPaid >= 100 ? " ✅" : ""})
                </span>
              </>}
              <span style={{ fontSize: 9, marginLeft: 'auto', padding: '2px 8px', borderRadius: 4, background: mColor + '12', color: mColor, fontWeight: 700, display: 'inline-flex', gap: 8 }}>
                Margine: <strong>€{fmt(e.marginEur)}</strong>
                {' | Margine %: '}<strong>{e.marginPct !== null ? `${fmtD(e.marginPct)}%` : 'N/A'}</strong>
                {' | Ricarico: '}<strong>{e.markupItemPct === Infinity ? '∞' : e.markupItemPct !== null ? `${fmtD(e.markupItemPct)}%` : 'N/A'}</strong>
              </span>
            </div>
          </div>
        )
      })}
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: EQ_GRID_COLS, gap: 3, minWidth: 1060, marginTop: 4, paddingTop: 4, borderTop: "1px solid #e0e6ed", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1B3A5C", gridColumn: "span 14" }}>TOTALI</span>
          <div style={{ fontSize: 10, textAlign: "right", fontWeight: 700, color: "#555" }}>€{fmt(totalCost)}</div>
          <div style={{ fontSize: 10, textAlign: "right", fontWeight: 700, color: "#2E86AB" }}>€{fmt(totalRevenue)}</div>
          <span></span>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4, paddingRight: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: totalMargin >= 0 ? '#27ae60' : '#e74c3c' }}>
            Margine Tot: €{fmt(totalMargin)}
            {totalRevenue > 0 ? ` (${fmtD((totalRevenue - totalCost) / totalRevenue * 100)}%)` : ''}
            {totalCost > 0 ? ` | Ricarico: ${fmtD((totalRevenue - totalCost) / totalCost * 100)}%` : ''}
          </span>
        </div>
      )}
    </div>
  );
};
export default function ItineraV4({ projectId, onBack }) {
  const [sec, setSec] = useState({});
  const tgl = k => setSec(p => ({ ...p, [k]: p[k] === false ? true : (p[k] === true ? false : false) }));
  const isO = k => sec[k] !== false;

  // Global consolidated state (Supabase)
  const { data: d, loading, updateField, addItem, updateItem, deleteItem, reorderItems, updateProjectMeta, reload } = useSupabaseProject(projectId);
  const { config: appConfig } = useAppConfig();
  const { isMobile } = useResponsive();
  const toast = useToast();

  const [suppliersList, setSuppliersList] = useState([]);
  const [activeNav, setActiveNav] = useState('progetto');
  const [showRentmanModal, setShowRentmanModal] = useState(false);
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [pendingSync, setPendingSync] = useState(null);
  const [pendingNotifCount, setPendingNotifCount] = useState(0);
  const pollingRef = useRef(null);

  // ═══ RENTMAN NOTIFICATION POLLING ═══
  useEffect(() => {
    const rpId = d?.rentmanProjectId;
    if (!rpId) { setPendingNotifCount(0); return; }
    const fetchCount = async () => {
      const { count } = await supabase
        .from('pending_sync_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('rentman_project_id', rpId)
        .eq('acknowledged', false);
      setPendingNotifCount(count || 0);
    };
    fetchCount();
    pollingRef.current = setInterval(fetchCount, 30000);
    return () => clearInterval(pollingRef.current);
  }, [d?.rentmanProjectId]);

  const acknowledgeNotifications = async () => {
    const rpId = d?.rentmanProjectId;
    if (!rpId) return;
    await supabase
      .from('pending_sync_notifications')
      .update({ acknowledged: true })
      .eq('rentman_project_id', rpId)
      .eq('acknowledged', false);
    setPendingNotifCount(0);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById('section-' + id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveNav(id); }
  };
  useEffect(() => {
    supabase.from('suppliers').select('id, name, category').eq('is_active', true).order('name').then(({ data }) => { if (data) setSuppliersList(data); });
  }, []);
  useEffect(() => {
    const sections = ['progetto', 'materiale', 'trasporto', 'staff', 'costi', 'fasi', 'riepilogo', 'subnoleggi', 'acquisti'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id.replace('section-', '')); });
    }, { rootMargin: '-100px 0px -60% 0px' });
    sections.forEach(id => { const el = document.getElementById('section-' + id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [d]);

  // Dynamic config from Supabase (with hardcoded fallback) — memoized to avoid useMemo deps issues
  const ROUTES_DYN = useMemo(() => appConfig?.routes?.items ? Object.fromEntries(appConfig.routes.items.map(r => [r.name, { km: r.km, tolls: r.tolls }])) : ROUTES, [appConfig]);
  const RK_DYN = useMemo(() => Object.keys(ROUTES_DYN), [ROUTES_DYN]);
  const VEH_DYN = useMemo(() => appConfig?.vehicles?.items || VEHICLE_TYPES, [appConfig]);
  const OT_MULT_DYN = useMemo(() => appConfig?.overtime || OT_MULT, [appConfig]);
  const DIESEL_DYN = useMemo(() => appConfig?.fuel?.dieselPricePerLiter || DIESEL, [appConfig]);

  // Helpers to update global state easily
  const updateF = (field, val) => updateField(field, val);
  const updateObjList = (field, id, objField, val) => updateItem(field, id, objField, val);
  const addObj = (field, newObj) => addItem(field, newObj);
  const delObj = (field, id) => deleteItem(field, id);


  // Calculate metrics using useMemo to avoid recalculation on every render
  const calc = useMemo(() => {
    if (!d) return { revenueNet: 0, totalEquipment: 0, totalTransport: 0, totalIntStaff: 0, totalExtStaff: 0, totalSubRentals: 0, totalPurchases: 0, totalAnalytics: 0, totalDamages: 0, totalMisc: 0, warehouseCost: 0, planningCost: 0, mealAccomCost: 0, contingencyCost: 0, financialCost: 0, totalCosts: 0, marginEur: 0, marginPct: 0, costBreakdown: [] };
    // Revenue
    const discAmt = d.discType === "%" ? d.revenueGross * d.discVal / 100 : d.discVal;
    const revenueNet = d.revenueGross - discAmt;

    // Equipment
    const eqCalcs = d.eqItems.map(e => {
      const vol = e.qty * e.l * e.w * e.h;
      const weight = e.qty * e.weightKg;
      const coeff = e.coefficient ?? 1;
      const cost = e.qty * e.costUnit * coeff;
      const revenue = e.qty * (e.sellPrice || 0) * coeff;
      const marginEur = revenue - cost;
      const marginPct = revenue > 0 ? (revenue - cost) / revenue * 100 : null;
      const markupItemPct = cost > 0 ? (revenue - cost) / cost * 100 : (revenue > 0 ? Infinity : null);
      const depPerUse = e.owned && e.totalUses > 0 ? e.purchasePrice / e.totalUses : 0;
      const depTotal = e.owned ? depPerUse * e.qty : 0;
      const roiEvents = e.owned && e.costUnit > 0 ? Math.ceil(e.purchasePrice / e.costUnit) : 0;
      const roiPaid = e.owned && roiEvents > 0 ? Math.min(e.usesUsed / roiEvents * 100, 100) : 0;
      return { ...e, vol, weight, cost, revenue, marginEur, marginPct, markupItemPct, depPerUse, depTotal, roiEvents, roiPaid };
    });
    const totalVol = eqCalcs.reduce((s, e) => s + e.vol, 0);
    const totalVolEff = totalVol / 0.70;
    const totalWeight = eqCalcs.reduce((s, e) => s + e.weight, 0);
    const totalEqCost = eqCalcs.reduce((s, e) => s + e.cost, 0);
    const totalEqRevenue = eqCalcs.reduce((s, e) => s + e.revenue, 0);
    const totalEqMargin = eqCalcs.reduce((s, e) => s + e.marginEur, 0);
    const totalDepreciation = eqCalcs.reduce((s, e) => s + e.depTotal, 0);
    const recVeh = VEH_DYN.find(v => v.vol >= totalVolEff && v.payload >= totalWeight) || VEH_DYN[VEH_DYN.length - 2];
    const weightOverVol = totalWeight > 0 && totalVolEff > 0 && VEH_DYN.find(v => v.vol >= totalVolEff) && VEH_DYN.find(v => v.vol >= totalVolEff).payload < totalWeight;

    // Transport
    const legCalcs = d.legs.map(leg => {
      const rd = ROUTES_DYN[leg.route] || { km: leg.cKm, tolls: leg.cTolls };
      const km = leg.route === "Personalizzato" ? leg.cKm : rd.km;
      const tolls = leg.route === "Personalizzato" ? leg.cTolls : rd.tolls;
      const veh = VEH_DYN[leg.vType] || VEH_DYN[0];
      const fuel = (km * 2 * veh.cons / 100) * DIESEL_DYN * leg.nVeh;
      const toll = tolls * 2 * leg.nVeh;
      const rQ = (leg.shared > 0 ? (leg.rentalDay * leg.rentalDays) / leg.shared : leg.rentalDay * leg.rentalDays) * leg.nVeh;
      const total = fuel + toll + rQ;
      const sellPrice = leg.sellPrice || 0;
      const legMargin = sellPrice - total;
      const legMarginPct = sellPrice > 0 ? (legMargin / sellPrice) * 100 : null;
      return { ...leg, km, fuel, toll, rQ, total, sellPrice, legMargin, legMarginPct, vName: veh.name, vVol: veh.vol, vPayload: veh.payload };
    });
    const totalTransport = legCalcs.reduce((s, l) => s + l.total, 0);
    const totalTransportRevenue = legCalcs.reduce((s, l) => s + l.sellPrice, 0);
    const totalTransportMargin = totalTransportRevenue - totalTransport;
    const totalTransportMarginPct = totalTransportRevenue > 0 ? (totalTransportMargin / totalTransportRevenue) * 100 : null;
    // Fleet capacity vs material
    const fleetCapVol = legCalcs.reduce((s, l) => s + (l.vVol * l.nVeh), 0);
    const fleetCapKg = legCalcs.reduce((s, l) => s + (l.vPayload * l.nVeh), 0);
    const volOverflow = totalVolEff > 0 && fleetCapVol > 0 && totalVolEff > fleetCapVol;
    const weightOverflow = totalWeight > 0 && fleetCapKg > 0 && totalWeight > fleetCapKg;

    // Staff
    const cStaff = s => ({ ...s, total: s.count * s.costHour * (s.hOrd * OT_MULT_DYN.ordinario + s.hStr * OT_MULT_DYN.straordinario + s.hFest * OT_MULT_DYN.festivo + s.hNott * OT_MULT_DYN.notturno), totalHours: s.hOrd + s.hStr + s.hFest + s.hNott });
    const intCalcs = d.intStaff.map(cStaff);
    const totalInt = intCalcs.reduce((s, l) => s + l.total, 0);
    const totalIntP = d.intStaff.reduce((s, l) => s + l.count, 0);
    const extCalcs = d.extStaff.map(cStaff);
    const totalExt = extCalcs.reduce((s, l) => s + l.total, 0);
    const totalExtP = d.extStaff.reduce((s, l) => s + l.count, 0);

    const totalWh = d.whCount * d.whRate * (d.whHLoad + d.whHUnload);
    const totalAllStaff = totalWh + totalInt + totalExt;
    const totalAllPeople = d.whCount + totalIntP + totalExtP;

    // Misc costs
    const totalPlanCost = d.planHours * d.planRate;
    const crewMeals = totalIntP + totalExtP;
    const totalAccom = (crewMeals * d.mealCost * d.mealsDay * d.workDays) + (crewMeals * d.hotelNights * d.hotelCost);
    const totalAn = d.analytics.reduce((s, a) => s + a.cost, 0);
    const totalDmg = d.damages.reduce((s, item) => s + item.cost, 0);
    const totalMisc = d.misc.reduce((s, m) => s + m.cost, 0);
    const totalPhHours = d.phases.reduce((s, p) => s + p.crew * p.hours, 0);

    // Category analytics
    const catStats = ['Proprio', 'Sub-noleggio', 'Acquisto'].map(cat => {
      const items = eqCalcs.filter(e => e.itemCategory === cat);
      const catCost = items.reduce((s, e) => s + e.cost, 0);
      const catRev = items.reduce((s, e) => s + e.revenue, 0);
      const catMarginPct = catRev > 0 ? (catRev - catCost) / catRev * 100 : null;
      const incidencePct = totalEqCost > 0 ? catCost / totalEqCost * 100 : 0;
      return { cat, cost: catCost, rev: catRev, marginPct: catMarginPct, incidencePct, count: items.length };
    });

    // Grand Totals
    const costMaterial = totalEqCost;
    const costsBeforeContingency = costMaterial + totalTransport + totalAllStaff + totalPlanCost + totalAccom + totalAn + totalDmg + totalMisc + totalDepreciation;
    const contingencyAmt = costsBeforeContingency * d.contingencyPct / 100;
    const totalCosts = costsBeforeContingency + contingencyAmt;
    const financialCost = totalCosts * (d.interestRate / 100) * (d.paymentDays / 365);
    const totalCostsAll = totalCosts + financialCost;

    const margin = revenueNet - totalCostsAll;
    const marginPct = pc(margin, revenueNet);
    const markupPct = totalCostsAll > 0 ? (margin / totalCostsAll) * 100 : 0;
    const marginColor = marginPct >= 30 ? "#27ae60" : marginPct >= 15 ? "#e67e22" : "#e74c3c";
    const marginPerDay = d.totalWorkDays > 0 ? margin / d.totalWorkDays : 0;

    return {
      discAmt, revenueNet, margin, marginPct, markupPct, marginColor, marginPerDay,
      eqCalcs, totalVol, totalVolEff, totalWeight, totalEqCost, totalEqRevenue, totalEqMargin, totalDepreciation, recVeh, weightOverVol, catStats,
      legCalcs, totalTransport, totalTransportRevenue, totalTransportMargin, totalTransportMarginPct, fleetCapVol, fleetCapKg, volOverflow, weightOverflow,
      intCalcs, totalInt, totalIntP, extCalcs, totalExt, totalExtP, totalWh, totalAllStaff, totalAllPeople,
      totalPlanCost, crewMeals, totalAccom, totalAn, totalDmg, totalMisc, totalPhHours,
      costMaterial, costsBeforeContingency, contingencyAmt, totalCosts, financialCost, totalCostsAll
    };
  }, [d, ROUTES_DYN, VEH_DYN, OT_MULT_DYN, DIESEL_DYN]);

  const activeAlerts = useMemo(() => {
    if (!d || !appConfig?.alerts?.rules) return [];
    const rules = appConfig.alerts.rules.filter(r => r.enabled);
    const values = {
      marginPct: calc.marginPct || 0,
      contingencyPct: d.contingencyPct || 0,
      transportPctOfRevenue: calc.revenueNet > 0 ? (calc.totalTransport / calc.revenueNet) * 100 : 0,
      staffPctOfRevenue: calc.revenueNet > 0 ? ((calc.totalInt + calc.totalExt) / calc.revenueNet) * 100 : 0,
    };
    return rules.filter(rule => {
      const val = values[rule.condition];
      if (val === undefined) return false;
      switch (rule.operator) {
        case '<': return val < rule.value;
        case '>': return val > rule.value;
        case '=': return val === rule.value;
        case '<=': return val <= rule.value;
        case '>=': return val >= rule.value;
        default: return false;
      }
    });
  }, [d, calc, appConfig]);

  const pricingSuggestion = useMemo(() => {
    if (!d || !appConfig?.pricing || !calc.revenueNet) return null;
    const pricing = appConfig.pricing;
    let suggestions = [];

    if (pricing.applyMarkupAuto && d.eventType) {
      const rule = (pricing.markupRules || []).find(r => r.eventType === d.eventType);
      if (rule) {
        const suggestedRevenue = calc.totalCosts * (1 + rule.markupPct / 100);
        if (d.revenueGross < suggestedRevenue) {
          suggestions.push({ type: 'markup', message: 'Markup ' + rule.label + ': ricavo suggerito ' + Math.round(suggestedRevenue).toLocaleString('it-IT') + ' EUR', value: suggestedRevenue });
        }
      }
    }

    if (pricing.applySeasonalAuto && d.eventDate) {
      const month = new Date(d.eventDate).getMonth() + 1;
      const season = (pricing.seasonalRules || []).find(s => (s.months || []).includes(month));
      if (season && season.adjustPct !== 0) {
        suggestions.push({ type: 'seasonal', message: season.name + ': ' + (season.adjustPct > 0 ? '+' : '') + season.adjustPct + '% sul prezzo' });
      }
    }

    if (pricing.applyVolumeAuto && d.revenueGross > 0) {
      const tier = (pricing.volumeDiscounts || []).find(v => d.revenueGross >= v.minAmount && d.revenueGross <= v.maxAmount);
      if (tier && tier.discountPct > 0) {
        suggestions.push({ type: 'volume', message: 'Fascia ' + tier.label + ': sconto cliente ' + tier.discountPct + '%' });
      }
    }

    return suggestions.length > 0 ? suggestions : null;
  }, [d, calc, appConfig]);

  const { getDragProps: getDragPropsEq } = useDragDrop(d?.eqItems || [], (newOrder) => reorderItems('eqItems', newOrder));
  const { getDragProps: getDragPropsLegs } = useDragDrop(d?.legs || [], (newOrder) => reorderItems('legs', newOrder));
  const { getDragProps: getDragPropsPhases } = useDragDrop(d?.phases || [], (newOrder) => reorderItems('phases', newOrder));

  const autoSaveSupplier = async (name) => {
    if (!name || name.length < 5) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = suppliersList.some(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const { data } = await supabase.from('suppliers').insert({ name: trimmed, category: 'other' }).select('id, name, category').single();
      if (data) setSuppliersList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  // ═══ INCREMENTAL SYNC HELPERS (BATCH) ═══
  const syncEquipmentItems = async (incomingItems) => {
    const stats = { added: 0, updated: 0, removed: 0 };
    // 1. Fetch existing equipment from DB
    const { data: existing } = await supabase
      .from('equipment_items')
      .select('*')
      .eq('project_id', projectId);
    const existingRows = existing || [];

    // 2. Map existing by rentman_id (String keys for consistent matching)
    const existingByRentmanId = {};
    for (const row of existingRows) {
      if (row.rentman_id) existingByRentmanId[String(row.rentman_id)] = row;
    }
    console.log('SYNC: existing items found:', existingRows.length, 'with rentman_id:', Object.keys(existingByRentmanId).length);

    // 3. Set of incoming rentman IDs
    const incomingRentmanIds = new Set(
      incomingItems.filter(i => i.rentmanId).map(i => String(i.rentmanId))
    );

    // 4. Collect batch arrays
    const toUpdate = [];
    const toInsert = [];
    for (const item of incomingItems) {
      const rid = item.rentmanId ? String(item.rentmanId) : null;
      if (rid && existingByRentmanId[rid]) {
        const row = existingByRentmanId[rid];
        toUpdate.push({
          id: row.id,
          project_id: projectId,
          description: item.desc || '',
          supplier: item.supplier || '',
          qty: item.qty || 1,
          coefficient: item.coefficient ?? 1,
          cost_unit: item.costUnit || 0,
          l: item.l || 0, w: item.w || 0, h: item.h || 0,
          weight_kg: item.weightKg || 0,
          rentman_id: row.rentman_id,
          // owned, purchase_price are PRESERVED
        });
      } else {
        toInsert.push({
          project_id: projectId,
          description: item.desc || '',
          supplier: item.supplier || '',
          qty: item.qty || 1,
          coefficient: item.coefficient ?? 1,
          l: item.l || 0, w: item.w || 0, h: item.h || 0,
          weight_kg: item.weightKg || 0,
          cost_unit: item.costUnit || 0,
          owned: false, purchase_price: 0, total_uses: 1, uses_used: 0,
          rentman_id: item.rentmanId || null,
        });
      }
    }

    // 5. Collect IDs to delete (with rentman_id no longer in Rentman)
    const toDeleteIds = existingRows
      .filter(row => row.rentman_id && !incomingRentmanIds.has(String(row.rentman_id)))
      .map(row => row.id);

    // 6. Execute batches
    if (toUpdate.length > 0) {
      console.log('BATCH UPDATE:', toUpdate.length, 'equipment items');
      const { error } = await supabase.from('equipment_items').upsert(toUpdate, { onConflict: 'id' });
      if (error) { console.error('BATCH UPDATE error:', error); throw error; }
      stats.updated = toUpdate.length;
    }
    if (toInsert.length > 0) {
      console.log('BATCH INSERT:', toInsert.length, 'equipment items');
      const { error } = await supabase.from('equipment_items').insert(toInsert);
      if (error) { console.error('BATCH INSERT error:', error); throw error; }
      stats.added = toInsert.length;
    }
    if (toDeleteIds.length > 0) {
      console.log('BATCH DELETE:', toDeleteIds.length, 'equipment items');
      const { error } = await supabase.from('equipment_items').delete().in('id', toDeleteIds);
      if (error) { console.error('BATCH DELETE error:', error); throw error; }
      stats.removed = toDeleteIds.length;
    }

    console.log('SYNC RESULT equipment:', stats);
    return stats;
  };

  const syncCostEntries = async (incomingCosts, category) => {
    const stats = { added: 0, updated: 0, removed: 0 };
    // 1. Fetch existing costs for this category
    const { data: existing } = await supabase
      .from('cost_entries')
      .select('*')
      .eq('project_id', projectId)
      .eq('category', category);
    const existingRows = existing || [];

    // 2. Map by rentman_id
    const existingByRentmanId = {};
    for (const row of existingRows) {
      if (row.rentman_id) existingByRentmanId[String(row.rentman_id)] = row;
    }

    // 3. Incoming IDs
    const incomingRentmanIds = new Set(
      incomingCosts.filter(c => c.rentmanId).map(c => String(c.rentmanId))
    );

    // 4. Collect batch arrays
    const toUpdate = [];
    const toInsert = [];
    for (const cost of incomingCosts) {
      const rid = cost.rentmanId ? String(cost.rentmanId) : null;
      if (rid && existingByRentmanId[rid]) {
        const row = existingByRentmanId[rid];
        toUpdate.push({
          id: row.id,
          project_id: projectId,
          category,
          description: cost.desc || '',
          supplier: cost.supplier || '',
          cost: cost.cost || 0,
          quantity: cost.qty || 1,
          rentman_id: row.rentman_id,
          // vat_included is PRESERVED
        });
      } else {
        toInsert.push({
          project_id: projectId,
          category,
          description: cost.desc || '',
          supplier: cost.supplier || '',
          cost: cost.cost || 0,
          quantity: cost.qty || 1,
          vat_included: false,
          rentman_id: cost.rentmanId || null,
        });
      }
    }

    // 5. Collect IDs to delete
    const toDeleteIds = existingRows
      .filter(row => row.rentman_id && !incomingRentmanIds.has(String(row.rentman_id)))
      .map(row => row.id);

    // 6. Execute batches
    if (toUpdate.length > 0) {
      console.log('BATCH UPDATE:', toUpdate.length, category, 'cost entries');
      const { error } = await supabase.from('cost_entries').upsert(toUpdate, { onConflict: 'id' });
      if (error) { console.error('BATCH UPDATE error:', error); throw error; }
      stats.updated = toUpdate.length;
    }
    if (toInsert.length > 0) {
      console.log('BATCH INSERT:', toInsert.length, category, 'cost entries');
      const { error } = await supabase.from('cost_entries').insert(toInsert);
      if (error) { console.error('BATCH INSERT error:', error); throw error; }
      stats.added = toInsert.length;
    }
    if (toDeleteIds.length > 0) {
      console.log('BATCH DELETE:', toDeleteIds.length, category, 'cost entries');
      const { error } = await supabase.from('cost_entries').delete().in('id', toDeleteIds);
      if (error) { console.error('BATCH DELETE error:', error); throw error; }
      stats.removed = toDeleteIds.length;
    }

    console.log('SYNC RESULT', category + ':', stats);
    return stats;
  };

  // ═══ COMPUTE SYNC DIFF ═══
  const computeSyncDiff = (mapped, currentData) => {
    const updates = [];
    const additions = [];
    const removals = [];

    // — Equipment diff —
    const existingEq = currentData.eqItems || [];
    const existingEqMap = {};
    for (const item of existingEq) {
      if (item.rentmanId) existingEqMap[String(item.rentmanId)] = item;
    }
    const incomingEqIds = new Set();
    for (const eq of (mapped.equipmentItems || [])) {
      const rid = eq.rentmanId ? String(eq.rentmanId) : null;
      if (rid) incomingEqIds.add(rid);
      if (rid && existingEqMap[rid]) {
        const ex = existingEqMap[rid];
        const changes = [];
        const fields = [
          { field: 'descrizione', oldVal: ex.desc, newVal: eq.desc },
          { field: 'qty', oldVal: ex.qty, newVal: eq.qty },
          { field: 'coeff', oldVal: ex.coefficient, newVal: eq.coefficient },
          { field: 'prezzo', oldVal: ex.costUnit, newVal: eq.costUnit },
          { field: 'fornitore', oldVal: ex.supplier, newVal: eq.supplier || '' },
          { field: 'L', oldVal: ex.l, newVal: eq.l },
          { field: 'W', oldVal: ex.w, newVal: eq.w },
          { field: 'H', oldVal: ex.h, newVal: eq.h },
        ];
        for (const f of fields) {
          const o = f.oldVal ?? '';
          const n = f.newVal ?? '';
          if (String(o) !== String(n)) changes.push(f);
        }
        if (changes.length > 0) {
          updates.push({ type: 'equipment', rentmanId: rid, description: ex.desc, desc: eq.desc, changes });
        }
      } else {
        additions.push({ type: 'equipment', rentmanId: rid, desc: eq.desc, qty: eq.qty, supplier: eq.supplier, cost: eq.costUnit });
      }
    }
    for (const item of existingEq) {
      if (item.rentmanId && !incomingEqIds.has(String(item.rentmanId))) {
        removals.push({ type: 'equipment', rentmanId: item.rentmanId, description: item.desc });
      }
    }

    // — Cost entries diff (subRentals, purchases, misc) —
    const costCategories = [
      { incoming: mapped.subRentals || [], existing: currentData.subRentals || [], category: 'sub_rental', label: 'SubRental' },
      { incoming: mapped.purchases || [], existing: currentData.purchases || [], category: 'purchase', label: 'Purchase' },
      { incoming: mapped.miscCosts || [], existing: currentData.misc || [], category: 'misc', label: 'Misc' },
    ];
    for (const cat of costCategories) {
      const existMap = {};
      for (const c of cat.existing) { if (c.rentmanId) existMap[String(c.rentmanId)] = c; }
      const inIds = new Set();
      for (const c of cat.incoming) {
        const rid = c.rentmanId ? String(c.rentmanId) : null;
        if (rid) inIds.add(rid);
        if (rid && existMap[rid]) {
          const ex = existMap[rid];
          const changes = [];
          if (String(ex.desc || '') !== String(c.desc || '')) changes.push({ field: 'descrizione', oldVal: ex.desc, newVal: c.desc });
          if (String(ex.supplier || '') !== String(c.supplier || '')) changes.push({ field: 'fornitore', oldVal: ex.supplier, newVal: c.supplier });
          if (Number(ex.cost || 0) !== Number(c.cost || 0)) changes.push({ field: 'costo', oldVal: ex.cost, newVal: c.cost });
          if (Number(ex.qty || 1) !== Number(c.qty || 1)) changes.push({ field: 'qty', oldVal: ex.qty || 1, newVal: c.qty || 1 });
          if (changes.length > 0) updates.push({ type: cat.label, rentmanId: rid, description: ex.desc, desc: c.desc, changes });
        } else {
          additions.push({ type: cat.label, rentmanId: rid, desc: c.desc, supplier: c.supplier, cost: c.cost, qty: c.qty || 1 });
        }
      }
      for (const c of cat.existing) {
        if (c.rentmanId && !inIds.has(String(c.rentmanId))) {
          removals.push({ type: cat.label, rentmanId: c.rentmanId, description: c.desc });
        }
      }
    }

    return { updates, additions, removals };
  };

  // ═══ DATA VALIDATION ═══
  const validateEquipmentItem = (item) => {
    if (!item.rentmanId && !item.desc) { console.warn('SKIP item: no rentmanId and no description'); return false; }
    if (item.qty != null && (isNaN(Number(item.qty)) || Number(item.qty) < 0)) { console.warn('SKIP item', item.rentmanId, ': invalid qty', item.qty); return false; }
    if (item.costUnit != null && isNaN(Number(item.costUnit))) { console.warn('SKIP item', item.rentmanId, ': invalid costUnit', item.costUnit); return false; }
    return true;
  };
  const validateCostItem = (item) => {
    if (!item.rentmanId && !item.desc) { console.warn('SKIP cost: no rentmanId and no description'); return false; }
    if (item.cost != null && isNaN(Number(item.cost))) { console.warn('SKIP cost', item.rentmanId, ': invalid cost', item.cost); return false; }
    return true;
  };

  const handleRentmanImport = async (mapped, options) => {
    console.log('handleRentmanImport CALLED. options:', JSON.stringify(options));
    if (!mapped) return null;
    const startTime = Date.now();
    const TIMEOUT_MS = 30000;
    const results = { equipment: null, subRentals: null, purchases: null, misc: null, mode: 'clear', skipped: 0 };
    const warnings = [];
    console.log('SYNC MODE:', options.clearExisting ? 'DELETE+INSERT' : 'INCREMENTAL');

    // ── Pre-sync snapshot (incremental only) ──
    let snapshot = null;
    if (!options.clearExisting) {
      snapshot = {
        eqItems: JSON.parse(JSON.stringify(d.eqItems || [])),
        subRentals: JSON.parse(JSON.stringify(d.subRentals || [])),
        purchases: JSON.parse(JSON.stringify(d.purchases || [])),
        misc: JSON.parse(JSON.stringify(d.misc || [])),
      };
      console.log('[Snapshot] Saved', snapshot.eqItems.length, 'equipment,', snapshot.subRentals.length + snapshot.purchases.length + snapshot.misc.length, 'costs');
    }

    // ── Validate incoming data ──
    let skipped = 0;
    const validEquipment = (mapped.equipmentItems || []).filter(item => {
      if (validateEquipmentItem(item)) return true;
      skipped++;
      warnings.push(`Equipment skippato: ${item.rentmanId || 'N/A'}`);
      return false;
    });
    const validSubRentals = (mapped.subRentals || []).filter(item => {
      if (validateCostItem(item)) return true;
      skipped++;
      warnings.push(`SubRental skippato: ${item.rentmanId || 'N/A'}`);
      return false;
    });
    const validPurchases = (mapped.purchases || []).filter(item => {
      if (validateCostItem(item)) return true;
      skipped++;
      warnings.push(`Purchase skippato: ${item.rentmanId || 'N/A'}`);
      return false;
    });
    const validMiscCosts = (mapped.miscCosts || []).filter(item => {
      if (validateCostItem(item)) return true;
      skipped++;
      warnings.push(`MiscCost skippato: ${item.rentmanId || 'N/A'}`);
      return false;
    });
    results.skipped = skipped;
    if (skipped > 0) console.warn('[Validation]', skipped, 'items skippati:', warnings);

    // ── Sync logic wrapped with timeout ──
    const syncWork = async () => {
      if (options.clearExisting) {
        // ── CLEAR + INSERT (batch operations) ──
        results.mode = 'clear';

        const deletePromises = [];
        const eqIds = (d.eqItems || []).map(i => i.id);
        if (eqIds.length > 0) deletePromises.push(supabase.from('equipment_items').delete().in('id', eqIds));
        for (const cat of ['subRentals', 'purchases', 'misc']) {
          const ids = (d[cat] || []).map(i => i.id);
          if (ids.length > 0) deletePromises.push(supabase.from('cost_entries').delete().in('id', ids));
        }
        if (deletePromises.length > 0) {
          console.log('BATCH DELETE: clearing', eqIds.length, 'equipment +', (d.subRentals?.length || 0) + (d.purchases?.length || 0) + (d.misc?.length || 0), 'costs');
          await Promise.all(deletePromises);
        }

        if (options.equipment && validEquipment.length > 0) {
          const eqRows = validEquipment.map(eq => ({
            project_id: projectId,
            description: eq.desc || '', supplier: eq.supplier || '', qty: eq.qty || 1,
            coefficient: eq.coefficient ?? 1, l: eq.l || 0, w: eq.w || 0, h: eq.h || 0,
            weight_kg: eq.weightKg || 0, cost_unit: eq.costUnit || 0,
            owned: false, purchase_price: 0, total_uses: 1, uses_used: 0,
            rentman_id: eq.rentmanId || null,
          }));
          console.log('BATCH INSERT:', eqRows.length, 'equipment items');
          const { error } = await supabase.from('equipment_items').insert(eqRows);
          if (error) { console.error('BATCH INSERT equipment error:', error); throw error; }
        }

        if (options.costs) {
          const costRows = [];
          for (const sr of validSubRentals) costRows.push({ project_id: projectId, category: 'sub_rental', supplier: sr.supplier || '', description: sr.desc || '', cost: sr.cost || 0, quantity: sr.qty || 1, vat_included: false, rentman_id: sr.rentmanId || null });
          for (const p of validPurchases) costRows.push({ project_id: projectId, category: 'purchase', supplier: p.supplier || '', description: p.desc || '', cost: p.cost || 0, quantity: p.qty || 1, vat_included: false, rentman_id: p.rentmanId || null });
          for (const m of validMiscCosts) costRows.push({ project_id: projectId, category: 'misc', description: m.desc || '', cost: m.cost || 0, quantity: m.qty || 1, rentman_id: m.rentmanId || null });
          if (costRows.length > 0) {
            console.log('BATCH INSERT:', costRows.length, 'cost entries');
            const { error } = await supabase.from('cost_entries').insert(costRows);
            if (error) { console.error('BATCH INSERT costs error:', error); throw error; }
          }
        }
      } else {
        // ── INCREMENTAL SYNC ──
        results.mode = 'sync';
        if (options.equipment && validEquipment.length > 0) {
          results.equipment = await syncEquipmentItems(validEquipment);
          console.log('[RentmanSync] Equipment:', results.equipment);
        }
        if (options.costs) {
          if (validSubRentals.length > 0) {
            results.subRentals = await syncCostEntries(validSubRentals, 'sub_rental');
            console.log('[RentmanSync] SubRentals:', results.subRentals);
          }
          if (validPurchases.length > 0) {
            results.purchases = await syncCostEntries(validPurchases, 'purchase');
            console.log('[RentmanSync] Purchases:', results.purchases);
          }
          if (validMiscCosts.length > 0) {
            results.misc = await syncCostEntries(validMiscCosts, 'misc');
            console.log('[RentmanSync] Misc:', results.misc);
          }
        }
      }

      // Update project info
      if (options.projectInfo && mapped.projectFields) {
        for (const [field, value] of Object.entries(mapped.projectFields)) {
          if (value != null && value !== '') await updateField(field, value);
        }
      }

      // Update Rentman sync metadata
      if (mapped.rentmanProjectId) {
        await updateProjectMeta({
          last_rentman_sync: new Date().toISOString(),
          rentman_project_id: mapped.rentmanProjectId,
        });
      }

      await reload();
    };

    try {
      // ── Execute with timeout ──
      await Promise.race([
        syncWork(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: sync ha superato i 30 secondi')), TIMEOUT_MS)),
      ]);

      // ── Save sync log (success) ──
      const durationMs = Date.now() - startTime;
      const eqStats = results.equipment || { added: 0, updated: 0, removed: 0 };
      const costCats = [results.subRentals, results.purchases, results.misc].filter(Boolean);
      const costStats = costCats.reduce((a, s) => ({ added: a.added + s.added, updated: a.updated + s.updated, removed: a.removed + s.removed }), { added: 0, updated: 0, removed: 0 });
      await supabase.from('sync_logs').insert({
        project_id: projectId,
        sync_type: results.mode === 'sync' ? 'incremental' : 'full',
        equipment_added: results.mode === 'clear' ? (validEquipment.length || 0) : eqStats.added,
        equipment_updated: eqStats.updated,
        equipment_removed: eqStats.removed,
        costs_added: results.mode === 'clear' ? (validSubRentals.length + validPurchases.length + validMiscCosts.length) : costStats.added,
        costs_updated: costStats.updated,
        costs_removed: costStats.removed,
        rentman_project_id: mapped.rentmanProjectId || null,
        duration_ms: durationMs,
        synced_at: new Date().toISOString(),
        items_skipped: skipped,
        errors: warnings.length > 0 ? warnings.join('; ') : null,
      });
      console.log('[SyncLog] Saved. Duration:', durationMs, 'ms. Skipped:', skipped);

      return results;
    } catch (err) {
      console.error('Rentman import error:', err);
      console.error('Stack:', err.stack);

      // Save error sync log
      const durationMs = Date.now() - startTime;
      await supabase.from('sync_logs').insert({
        project_id: projectId,
        sync_type: results.mode === 'sync' ? 'incremental' : 'full',
        equipment_added: 0, equipment_updated: 0, equipment_removed: 0,
        costs_added: 0, costs_updated: 0, costs_removed: 0,
        rentman_project_id: mapped.rentmanProjectId || null,
        duration_ms: durationMs,
        synced_at: new Date().toISOString(),
        items_skipped: skipped,
        errors: `ERRORE: ${err.message}`,
      }).catch(logErr => console.error('Failed to save error log:', logErr));

      // Toast error
      if (toast) toast.error(`❌ Errore sync: ${err.message}. I dati potrebbero essere incompleti.`, 8000);

      // Offer rollback for incremental mode
      if (snapshot && !options.clearExisting) {
        const doRollback = window.confirm('Sync fallita. Vuoi ripristinare i dati precedenti?');
        if (doRollback) {
          console.log('[Rollback] Restoring snapshot...');
          try {
            // Delete current items and re-insert from snapshot
            const { data: curEq } = await supabase.from('equipment_items').select('id').eq('project_id', projectId);
            if (curEq?.length > 0) await supabase.from('equipment_items').delete().in('id', curEq.map(r => r.id));
            const { data: curCosts } = await supabase.from('cost_entries').select('id').eq('project_id', projectId);
            if (curCosts?.length > 0) await supabase.from('cost_entries').delete().in('id', curCosts.map(r => r.id));

            // Re-insert equipment from snapshot
            if (snapshot.eqItems.length > 0) {
              const rows = snapshot.eqItems.map(e => ({
                project_id: projectId, description: e.desc || '', supplier: e.supplier || '', qty: e.qty || 1,
                coefficient: e.coefficient ?? 1, l: e.l || 0, w: e.w || 0, h: e.h || 0,
                weight_kg: e.weightKg || 0, cost_unit: e.costUnit || 0, owned: e.owned || false,
                purchase_price: e.purchasePrice || 0, total_uses: e.totalUses || 1, uses_used: e.usesUsed || 0,
                rentman_id: e.rentmanId || null,
              }));
              await supabase.from('equipment_items').insert(rows);
            }
            // Re-insert costs from snapshot
            const costSnap = [
              ...snapshot.subRentals.map(c => ({ ...c, category: 'sub_rental' })),
              ...snapshot.purchases.map(c => ({ ...c, category: 'purchase' })),
              ...snapshot.misc.map(c => ({ ...c, category: 'misc' })),
            ];
            if (costSnap.length > 0) {
              const rows = costSnap.map(c => ({
                project_id: projectId, category: c.category, description: c.desc || '',
                supplier: c.supplier || '', cost: c.cost || 0, vat_included: c.vatIncl || false,
                rentman_id: c.rentmanId || null,
              }));
              await supabase.from('cost_entries').insert(rows);
            }

            await reload();
            if (toast) toast.success('✅ Dati ripristinati dallo snapshot pre-sync', 5000);
            console.log('[Rollback] Complete');
          } catch (rollErr) {
            console.error('[Rollback] Failed:', rollErr);
            if (toast) toast.error('❌ Anche il ripristino è fallito: ' + rollErr.message, 8000);
          }
        }
      }

      results.error = err.message;
      return results;
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800, color: '#1B3A5C' }}>ITINERA</div><div style={{ fontSize: 13, color: '#94a3b8' }}>Caricamento progetto...</div></div></div>;
  if (!d) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800, color: '#1B3A5C' }}>Progetto non trovato</div><button onClick={onBack} style={{ marginTop: 12, padding: '8px 20px', background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Torna ai progetti</button></div></div>;

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
      <GlobalStyles />
      <div style={{ background: '#1B3A5C', padding: isMobile ? '10px 12px' : '8px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>← Progetti</button>
        <span style={{ color: '#fff', fontSize: isMobile ? 12 : 14, fontWeight: 700 }}>ITINERA — {d.projectCode ? `[${d.projectCode}] ` : ''}{d.projectName}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setShowRentmanModal(true)} style={{ background: 'rgba(46,134,171,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 600, position: 'relative' }} title={pendingNotifCount > 0 ? `${pendingNotifCount} modifiche rilevate in Rentman` : 'Importa da Rentman'}>
            📡 Rentman
            {pendingNotifCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: '50%', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid #1B3A5C', lineHeight: 1 }}>{pendingNotifCount}</span>
            )}
          </button>
          <button onClick={() => setShowSyncHistory(true)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }} title="Cronologia Sync">🕐</button>
          <ExportPDFButton projectData={d} calc={calc} appConfig={appConfig} style={{ padding: '6px 14px', fontSize: 11, borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ padding: isMobile ? '4px 12px' : '4px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Breadcrumb items={[
          { label: 'Dashboard', onClick: onBack },
          { label: d?.projectCode ? `[${d.projectCode}] ${d.projectName}` : (d?.projectName || 'Progetto') }
        ]} />
      </div>
      {activeAlerts.length > 0 && (
        <div style={{ padding: isMobile ? '8px' : '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activeAlerts.map((alert, idx) => {
            const colors = { danger: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }, warning: { bg: '#fffbeb', border: '#fed7aa', text: '#d97706' }, success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' }, info: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' } };
            const c = colors[alert.severity] || colors.warning;
            return (
              <div key={idx} style={{ background: c.bg, border: '1px solid ' + c.border, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: c.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{alert.severity === 'danger' ? '🔴' : alert.severity === 'warning' ? '🟡' : alert.severity === 'success' ? '🟢' : '🔵'}</span>
                <span>{alert.message}</span>
              </div>
            );
          })}
        </div>
      )}
      {pricingSuggestion && (
        <div style={{ padding: isMobile ? '8px' : '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pricingSuggestion.map((s, idx) => (
            <div key={idx} style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{s.type === 'markup' ? '💰' : s.type === 'seasonal' ? '📅' : '📊'}</span>
              <span>{s.message}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 0, maxWidth: 1400, margin: '0 auto', padding: isMobile ? '8px' : '0 16px' }}>
        {!isMobile && (
          <div style={{ position: 'sticky', top: 52, width: 180, padding: '12px 8px', alignSelf: 'flex-start', height: 'fit-content', flexShrink: 0 }}>
            {[
              { id: 'progetto', label: 'Progetto & Ricavi', icon: '📋' },
              { id: 'materiale', label: 'Materiale', icon: '📦' },
              { id: 'trasporto', label: 'Trasporto', icon: '🚛' },
              { id: 'staff', label: 'Staff', icon: '👔' },
              { id: 'costi', label: 'Costi', icon: '💶' },
              { id: 'fasi', label: 'Fasi Produzione', icon: '📅' },
              { id: 'riepilogo', label: 'Riepilogo', icon: '📊' },
              { id: 'subnoleggi', label: 'Sub-noleggi', icon: '🤝' },
              { id: 'acquisti', label: 'Acquisti', icon: '🛒' },
            ].map(s => (
              <button key={s.id} onClick={() => scrollToSection(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                padding: '8px 10px', marginBottom: 2, borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
                background: activeNav === s.id ? '#eef6fb' : 'transparent',
                color: activeNav === s.id ? '#1B3A5C' : '#94a3b8',
              }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 0 : '0 0 0 8px' }}>

          {/* HEADER */}
          <div className="no-print" style={{ background: "linear-gradient(135deg,#1B3A5C 0%,#2E86AB 100%)", borderRadius: 10, padding: "12px 18px", marginBottom: 10, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>ITINERA EVENTS</div>
              <div style={{ fontSize: 10, opacity: 0.8 }}>Profitability Calculator v4.1 — Supabase Cloud</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn onClick={() => window.print()} color="#8e44ad">🖨️ Stampa PDF</Btn>
            </div>
          </div>

          {/* ═══ HERO DASHBOARD ═══ */}
          <div className="hero-dashboard" style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", marginBottom: 10, border: `2px solid ${calc.marginColor}` }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{d.projectCode ? `[${d.projectCode}] ` : ''}{d.projectName} - {d.clientName}</div>
                <div style={{ fontSize: 10, color: "#888" }}>{d.eventType} | {d.eventDate} | {d.totalWorkDays} gg</div>
              </div>
              <M label="MARGINE NETTO" value={`€${fmt(calc.margin)}`} color={calc.marginColor} />
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <M label="RICAVO NETTO" value={`€${fmt(calc.revenueNet)}`} s />
              <span style={{ color: "#ccc", fontSize: 18 }}>−</span>
              <M label="COSTI TOTALI" value={`€${fmt(calc.totalCostsAll)}`} s color={calc.totalCostsAll > calc.revenueNet ? "#e74c3c" : "#555"} />
              <span style={{ color: "#ccc", fontSize: 18 }}>=</span>
              <M label="MARGINE %" value={`${fmtD(calc.marginPct)}%`} color={calc.marginColor} />
              <M label="MARKUP" value={`${fmtD(calc.markupPct)}%`} s color="#555" />
              <M label="€/GIORNO" value={`€${fmt(calc.marginPerDay)}`} s color={calc.marginPerDay > 500 ? "#27ae60" : "#e67e22"} />
              <Badge v={calc.marginPct} />
            </div>
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                <span>0%</span>
                <span style={{ fontWeight: 700, color: calc.marginPct >= 15 ? '#16a34a' : calc.marginPct >= 0 ? '#d97706' : '#dc2626' }}>{(calc.marginPct || 0).toFixed(1)}%</span>
                <span>50%</span>
              </div>
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: 2, background: '#e2e8f0', zIndex: 1 }} />
                <div style={{ width: Math.min(Math.max((calc.marginPct || 0) / 50 * 100, 0), 100) + '%', height: '100%', borderRadius: 5, transition: 'width 0.5s ease, background 0.5s ease', background: calc.marginPct >= 15 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : calc.marginPct >= 0 ? 'linear-gradient(90deg, #d97706, #f59e0b)' : 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, textAlign: 'center' }}>Obiettivo: 15%</div>
            </div>
            <div style={{ marginTop: 8 }}>
              <Bar label="Materiale + Sub + Acquisti" value={calc.costMaterial} max={calc.revenueNet} color="#3498db" />
              <Bar label="Ammortamento materiale" value={calc.totalDepreciation} max={calc.revenueNet} color="#2980b9" />
              <Bar label="Trasporto" value={calc.totalTransport} max={calc.revenueNet} color="#e67e22" />
              <Bar label="Personale (campo + magazzino)" value={calc.totalAllStaff} max={calc.revenueNet} color="#9b59b6" />
              <Bar label="Pianificazione / PM" value={calc.totalPlanCost} max={calc.revenueNet} color="#8e44ad" />
              <Bar label="Vitto & Alloggio" value={calc.totalAccom} max={calc.revenueNet} color="#1abc9c" />
              <Bar label="Analitici + Danni" value={calc.totalAn + calc.totalDmg} max={calc.revenueNet} color="#34495e" />
              <Bar label={`Contingency ${d.contingencyPct}%`} value={calc.contingencyAmt} max={calc.revenueNet} color="#e74c3c" />
              <Bar label={`Costo finanziario (${d.paymentDays}gg)`} value={calc.financialCost} max={calc.revenueNet} color="#c0392b" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#888", flexWrap: "wrap", gap: 4 }}>
              <span>Break-even: <strong>€{fmt(calc.totalCostsAll)}</strong> ricavo minimo</span>
              <span>Extra + Misc: €{fmt(calc.totalMisc)}</span>
            </div>
          </div>

          {/* ═══ PROJECT & REVENUE ═══ */}
          <div id="section-progetto">
            <Card title="Progetto & Ricavi" icon="📋" open={isO("pr")} onToggle={() => tgl("pr")}>
              <R>
                <F label="Cod. Commessa" value={d.projectCode} onChange={v => updateF("projectCode", v)} type="text" w="0.7" />
                <F label="Nome progetto" value={d.projectName} onChange={v => updateF("projectName", v)} type="text" w="2" />
                <F label="Cliente" value={d.clientName} onChange={v => updateF("clientName", v)} type="text" />
                <Sel label="Tipo" value={d.eventType} onChange={v => updateF("eventType", v)} options={["Wedding", "Corporate", "Fiera", "Festival", "Privato", "Istituzionale"]} />
                <F label="Data" value={d.eventDate} onChange={v => updateF("eventDate", v)} type="date" />
                <F label="GG lavoro" value={d.totalWorkDays} onChange={v => updateF("totalWorkDays", v)} min={1} w="0.5" />
              </R>
              <R>
                <F label="Ricavo lordo (€)" value={d.revenueGross} onChange={v => updateF("revenueGross", v)} step={500} />
                <Sel label="Sconto" value={d.discType} onChange={v => updateF("discType", v)} options={["%", "€"]} w="0.4" />
                <F label={`Valore (${d.discType})`} value={d.discVal} onChange={v => updateF("discVal", v)} />
              </R>
              <Sub text={`Sconto: €${fmt(calc.discAmt)} → Netto: €${fmt(calc.revenueNet)}`} />
            </Card>
          </div>

          <div id="section-materiale">
            {/* ═══ EQUIPMENT ═══ */}
            <Card title={`Materiale | Costo €${fmt(calc.totalEqCost)} | Ricavo €${fmt(calc.totalEqRevenue)} | Margine €${fmt(calc.totalEqMargin)} | ${fmtD(calc.totalVol, 1)}m³ | ${fmt(calc.totalWeight)}kg`} icon="📦" open={isO("eq")} onToggle={() => tgl("eq")}>
              {/* Material Analytics Cards */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {calc.catStats.map(cs => {
                  const icons = { 'Proprio': '🔵', 'Sub-noleggio': '🟠', 'Acquisto': '🟣' };
                  const colors = { 'Proprio': '#2E86AB', 'Sub-noleggio': '#e67e22', 'Acquisto': '#8e44ad' };
                  const c = colors[cs.cat];
                  return (
                    <div key={cs.cat} style={{ flex: '1 1 200px', background: c + '08', border: `1px solid ${c}30`, borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: c, marginBottom: 4 }}>{icons[cs.cat]} {cs.cat} ({cs.count})</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#555' }}>
                        <span>Costo: <strong>€{fmt(cs.cost)}</strong></span>
                        <span>Ricavo: <strong style={{ color: '#2E86AB' }}>€{fmt(cs.rev)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#555', marginTop: 2 }}>
                        <span>Margine: <strong style={{ color: cs.marginPct !== null && cs.marginPct >= 0 ? '#27ae60' : '#e74c3c' }}>{cs.marginPct !== null ? `${fmtD(cs.marginPct)}%` : 'N/A'}</strong></span>
                        <span>Incidenza: <strong>{fmtD(cs.incidencePct)}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <style>{`
                .eq-col-hl input { border: 2px solid #2E86AB !important; background: #f0f7ff !important; font-weight: 700 !important; color: #1B3A5C !important; }
                .eq-col-sell input { border: 2px solid #27ae60 !important; background: #f0fff5 !important; font-weight: 700 !important; color: #1a5c2e !important; }
              `}</style>
              <EquipmentGrid items={calc.eqCalcs} updateObjList={updateObjList} delObj={delObj} showDragHandle showCategoryDropdown getDragProps={getDragPropsEq} />
              <Btn onClick={() => addObj("eqItems", { desc: "", supplier: "", qty: 1, coefficient: 1, l: 0, w: 0, h: 0, weightKg: 0, costUnit: 0, sellPrice: 0, owned: false, purchasePrice: 0, totalUses: 1, usesUsed: 0 })} s>+ Materiale</Btn>
              <Sub text={`Volume: ${fmtD2(calc.totalVol)}m³ → Effettivo (÷0.70): ${fmtD(calc.totalVolEff)}m³ | Peso: ${fmt(calc.totalWeight)}kg | Min: ${calc.recVeh.name} | Ammort: €${fmt(calc.totalDepreciation)}`} />
              {calc.weightOverVol && <Warn text={`⚠️ PESO: ${fmt(calc.totalWeight)}kg supera portata veicolo per volume. Serve veicolo più grande o più viaggi!`} />}
            </Card>

          </div>

          {/* ═══ SUB-NOLEGGI (Filtered Smart View) ═══ */}
          <div id="section-subnoleggi">
            <Card title={`Sub-noleggi | Costo €${fmt(calc.catStats[1].cost)} | Ricavo €${fmt(calc.catStats[1].rev)} | Margine €${fmt(calc.catStats[1].rev - calc.catStats[1].cost)} | ${calc.catStats[1].count} items`} icon="🤝" open={isO("sn")} onToggle={() => tgl("sn")}>
              <EquipmentGrid items={calc.eqCalcs.filter(e => e.itemCategory === 'Sub-noleggio')} updateObjList={updateObjList} delObj={delObj} />
              <Btn onClick={() => addObj("eqItems", { desc: "", supplier: "", qty: 1, coefficient: 1, l: 0, w: 0, h: 0, weightKg: 0, costUnit: 0, sellPrice: 0, owned: false, purchasePrice: 0, totalUses: 1, usesUsed: 0, itemCategory: 'Sub-noleggio' })} s>+ Sub-noleggio</Btn>
            </Card>
          </div>

          {/* ═══ ACQUISTI (Filtered Smart View) ═══ */}
          <div id="section-acquisti">
            <Card title={`Acquisti | Costo €${fmt(calc.catStats[2].cost)} | Ricavo €${fmt(calc.catStats[2].rev)} | Margine €${fmt(calc.catStats[2].rev - calc.catStats[2].cost)} | ${calc.catStats[2].count} items`} icon="🛒" open={isO("aq")} onToggle={() => tgl("aq")}>
              <EquipmentGrid items={calc.eqCalcs.filter(e => e.itemCategory === 'Acquisto')} updateObjList={updateObjList} delObj={delObj} />
              <Btn onClick={() => addObj("eqItems", { desc: "", supplier: "", qty: 1, coefficient: 1, l: 0, w: 0, h: 0, weightKg: 0, costUnit: 0, sellPrice: 0, owned: false, purchasePrice: 0, totalUses: 1, usesUsed: 0, itemCategory: 'Acquisto' })} s>+ Acquisto</Btn>
            </Card>
          </div>

          <div id="section-trasporto">
            {/* ═══ SMART TRANSPORT MODULE ═══ */}
            <Card title={`Trasporto — ${d.legs.length} tratte | Costo €${fmt(calc.totalTransport)} | Ricavo €${fmt(calc.totalTransportRevenue)}`} icon="🚛" open={isO("tr")} onToggle={() => tgl("tr")}>
              {/* Transport Analytics Dashboard */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {[
                  { label: "Costo Trasporti", value: `€${fmt(calc.totalTransport)}`, color: "#e74c3c" },
                  { label: "Ricavo Trasporti", value: `€${fmt(calc.totalTransportRevenue)}`, color: "#2E86AB" },
                  { label: "Margine Lordo", value: calc.totalTransportMarginPct !== null ? `${fmtD(calc.totalTransportMarginPct)}%` : 'N/A', color: calc.totalTransportMargin >= 0 ? '#27ae60' : '#e74c3c' },
                  { label: "Incidenza su Costi", value: calc.totalCostsAll > 0 ? `${fmtD(calc.totalTransport / calc.totalCostsAll * 100)}%` : '0%', color: "#e67e22" },
                ].map((c, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 120, background: '#f8f9fb', borderRadius: 8, padding: '10px 12px', textAlign: 'center', border: '1px solid #eaecf0' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Capacity Warning Banner */}
              {d.legs.length > 0 && (
                <div style={{
                  marginBottom: 10, padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  background: calc.volOverflow || calc.weightOverflow ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${calc.volOverflow || calc.weightOverflow ? '#fca5a5' : '#86efac'}`,
                  color: calc.volOverflow || calc.weightOverflow ? '#991b1b' : '#166534'
                }}>
                  <span style={{ fontSize: 16 }}>{calc.volOverflow || calc.weightOverflow ? '⚠️' : '✅'}</span>
                  <div>
                    <div>📦 Materiale: <strong>{fmtD2(calc.totalVolEff)} m³</strong> / <strong>{fmt(calc.totalWeight)} kg</strong></div>
                    <div>🚛 Flotta: <strong>{fmtD2(calc.fleetCapVol)} m³</strong> / <strong>{fmt(calc.fleetCapKg)} kg</strong></div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    {calc.volOverflow && <div style={{ color: '#dc2626', fontWeight: 700 }}>🔴 Volume in eccesso! Serve più spazio ({fmtD2(calc.totalVolEff - calc.fleetCapVol)} m³ mancanti)</div>}
                    {calc.weightOverflow && <div style={{ color: '#dc2626', fontWeight: 700 }}>🔴 Sovraccarico! Rischio multa/blocco ({fmt(calc.totalWeight - calc.fleetCapKg)} kg in eccesso)</div>}
                    {!calc.volOverflow && !calc.weightOverflow && <div style={{ color: '#166534', fontWeight: 700 }}>Capacità di carico ottimale</div>}
                  </div>
                </div>
              )}

              {/* Transport Grid */}
              <style>{`
                .tr-col-sell input { border: 2px solid #27ae60 !important; background: #f0fff5 !important; font-weight: 700 !important; color: #1a5c2e !important; }
              `}</style>
              {calc.legCalcs.map((leg, i) => {
                const mColor = leg.legMargin > 0 ? '#27ae60' : leg.legMargin < 0 ? '#e74c3c' : '#999';
                return (
                  <div key={leg.id} {...getDragPropsLegs(i)} style={{ ...getDragPropsLegs(i).style, background: i % 2 === 0 ? "#f8f9fb" : "#fff", borderRadius: 6, padding: "8px 10px", marginBottom: 6, border: "1px solid #eaecf0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 11, color: "#1B3A5C" }}><span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16, userSelect: 'none', padding: '0 4px' }} title="Trascina per riordinare">⠿</span> Tratta {i + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: mColor + '12', color: mColor, fontWeight: 700 }}>
                          Margine: €{fmt(leg.legMargin)} {leg.legMarginPct !== null ? `(${fmtD(leg.legMarginPct)}%)` : ''}
                        </span>
                        {d.legs.length > 1 && <X onClick={() => delObj("legs", leg.id)} />}
                      </div>
                    </div>
                    <R>
                      <F label="Descrizione" value={leg.desc} onChange={v => updateObjList("legs", leg.id, "desc", v)} type="text" w="1.5" />
                      <Sel label="Tratta" value={leg.route} onChange={v => updateObjList("legs", leg.id, "route", v)} options={RK_DYN} w="1.5" />
                    </R>
                    {leg.route === "Personalizzato" && <R><F label="Km" value={leg.cKm} onChange={v => updateObjList("legs", leg.id, "cKm", v)} /><F label="Pedaggi andata €" value={leg.cTolls} onChange={v => updateObjList("legs", leg.id, "cTolls", v)} step={0.5} /></R>}
                    <R>
                      <Sel label="Veicolo" value={leg.vName} onChange={v => updateObjList("legs", leg.id, "vType", VEH_DYN.findIndex(x => x.name === v))} options={VEH_DYN.map(v => v.name)} />
                      <F label="N° veicoli" value={leg.nVeh} onChange={v => updateObjList("legs", leg.id, "nVeh", v)} min={1} w="0.4" />
                      <F label="Nolo €/gg" value={leg.rentalDay} onChange={v => updateObjList("legs", leg.id, "rentalDay", v)} w="0.6" />
                      <F label="GG nolo" value={leg.rentalDays} onChange={v => updateObjList("legs", leg.id, "rentalDays", v)} w="0.4" />
                      <F label="÷ eventi" value={leg.shared} onChange={v => updateObjList("legs", leg.id, "shared", v)} min={1} w="0.4" />
                    </R>
                    <R>
                      <div style={{ flex: 1, minWidth: 60 }}>
                        <label style={{ fontSize: 9, color: '#888', display: 'block', marginBottom: 1 }}>Costo €</label>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#555', padding: '4px 8px', background: '#f1f5f9', borderRadius: 4, border: '1px solid #e2e8f0' }}>€{fmt(leg.total)}</div>
                      </div>
                      <div className="tr-col-sell"><F label="Vendita al Cliente €" value={leg.sellPrice} onChange={v => updateObjList("legs", leg.id, "sellPrice", v)} /></div>
                    </R>
                    <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                      Carb €{fmt(leg.fuel)} | Ped €{fmt(leg.toll)} | Nolo €{fmt(leg.rQ)}{leg.shared > 1 ? ` (÷${leg.shared})` : ""} | 📦 {fmtD2(VEH_DYN[leg.vType]?.vol * leg.nVeh || 0)}m³ / {fmt(VEH_DYN[leg.vType]?.payload * leg.nVeh || 0)}kg cap.
                    </div>
                  </div>
                )
              })}
              {calc.legCalcs.length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4, marginBottom: 6, paddingRight: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: calc.totalTransportMargin >= 0 ? '#27ae60' : '#e74c3c' }}>
                    Margine Tot Trasporti: €{fmt(calc.totalTransportMargin)}
                    {calc.totalTransportMarginPct !== null ? ` (${fmtD(calc.totalTransportMarginPct)}%)` : ''}
                    {calc.totalTransport > 0 ? ` | Ricarico: ${fmtD((calc.totalTransportRevenue - calc.totalTransport) / calc.totalTransport * 100)}%` : ''}
                  </span>
                </div>
              )}
              <Btn onClick={() => addObj("legs", { desc: "", route: RK_DYN[0], cKm: 0, cTolls: 0, vType: 0, nVeh: 1, rentalDay: 150, rentalDays: 1, shared: 1, sellPrice: 0 })} s>+ Tratta</Btn>
            </Card>

          </div>

          <div id="section-staff">
            {/* ═══ STAFF ═══ */}
            <Card title={`Personale | ${calc.totalAllPeople}p | €${fmt(calc.totalAllStaff)}`} icon="👔" open={isO("st")} onToggle={() => tgl("st")}>
              <div style={{ background: "#f8f9fb", padding: 8, borderRadius: 6, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Magazzino — {d.whCount}p | €{fmt(calc.totalWh)}</div>
                <R>
                  <F label="N° magazzinieri" value={d.whCount} onChange={v => updateF("whCount", v)} min={1} />
                  <F label="€/ora" value={d.whRate} onChange={v => updateF("whRate", v)} />
                  <F label="Ore carico" value={d.whHLoad} onChange={v => updateF("whHLoad", v)} />
                  <F label="Ore scarico" value={d.whHUnload} onChange={v => updateF("whHUnload", v)} />
                </R>
              </div>
              <StaffTable listField="intStaff" calcList={calc.intCalcs} label="Interno" isMobile={isMobile} updateObjList={updateObjList} delObj={delObj} addObj={addObj} />
              <div style={{ margin: "16px 0", borderTop: "1px solid #eaecf0" }} />
              <StaffTable listField="extStaff" calcList={calc.extCalcs} label="Esterno / Facchini" isMobile={isMobile} updateObjList={updateObjList} delObj={delObj} addObj={addObj} />
            </Card>

          </div>

          <div id="section-costi">
            {/* ═══ OTHER COSTS (PLAN, ACCOM, ANALYTICAL, MISC) ═══ */}
            <Card title="Costi Aggiuntivi, Vitto/Alloggio & Overhead" icon="📊" open={isO("oc")} onToggle={() => tgl("oc")}>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Pianificazione / PM — €{fmt(calc.totalPlanCost)}</div>
                  <R>
                    <F label="Ore PM / riunioni / admin" value={d.planHours} onChange={v => updateF("planHours", v)} />
                    <F label="Costo orario €" value={d.planRate} onChange={v => updateF("planRate", v)} />
                  </R>
                </div>
                <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Vitto & Alloggio — €{fmt(calc.totalAccom)} <span style={{ fontSize: 9, fontWeight: 400 }}>({calc.crewMeals}p)</span></div>
                  <R>
                    <F label="€/pasto" value={d.mealCost} onChange={v => updateF("mealCost", v)} />
                    <F label="Pasti/gg" value={d.mealsDay} onChange={v => updateF("mealsDay", v)} />
                    <F label="GG lavoro" value={d.workDays} onChange={v => updateF("workDays", v)} />
                  </R>
                  <R>
                    <F label="Notti hotel" value={d.hotelNights} onChange={v => updateF("hotelNights", v)} />
                    {d.hotelNights > 0 && <F label="€/notte/p" value={d.hotelCost} onChange={v => updateF("hotelCost", v)} />}
                  </R>
                </div>
              </div>

              <div style={{ margin: "16px 0", borderTop: "1px solid #eaecf0" }} />

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Overhead & Costi Analitici — €{fmt(calc.totalAn)}</div>
                  {d.analytics.map(a => (
                    <div key={a.id} style={{ display: "flex", gap: 4, marginBottom: 3, alignItems: "center" }}>
                      <Inp value={a.desc} onChange={v => updateObjList("analytics", a.id, "desc", v)} />
                      <Inp type="number" value={a.cost} onChange={v => updateObjList("analytics", a.id, "cost", v)} align="right" w="80px" />
                      <span style={{ fontSize: 10, color: "#999" }}>€</span>
                      <X onClick={() => delObj("analytics", a.id)} />
                    </div>
                  ))}
                  <Btn onClick={() => addObj("analytics", { desc: "", cost: 0 })} s>+ Voce</Btn>
                </div>

                <div style={{ flex: 1, minWidth: isMobile ? '100%' : 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Danni, Rotture & Extra — €{fmt(calc.totalDmg + calc.totalMisc)}</div>
                  {[...d.damages, ...d.misc].map(m => (
                    <div key={m.id} style={{ display: "flex", gap: 4, marginBottom: 3, alignItems: "center" }}>
                      <Inp value={m.desc} onChange={v => {
                        if (d.damages.find(x => x.id === m.id)) updateObjList("damages", m.id, "desc", v);
                        else updateObjList("misc", m.id, "desc", v);
                      }} />
                      <Inp type="number" value={m.cost} onChange={v => {
                        if (d.damages.find(x => x.id === m.id)) updateObjList("damages", m.id, "cost", v);
                        else updateObjList("misc", m.id, "cost", v);
                      }} align="right" w="80px" />
                      <span style={{ fontSize: 10, color: "#999" }}>€</span>
                      <X onClick={() => { delObj("damages", m.id); delObj("misc", m.id); }} />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn onClick={() => addObj("damages", { desc: "", cost: 0 })} s>+ Danno stima</Btn>
                    <Btn onClick={() => addObj("misc", { desc: "", cost: 0 })} s>+ Costo Extra</Btn>
                  </div>
                </div>
              </div>
            </Card>

            {/* ═══ CONTINGENCY + FINANCIAL COST ═══ */}
            <Card title="Contingency & Costo Finanziario" icon="🛡️" open={isO("co")} onToggle={() => tgl("co")} accent="#c0392b">
              <R>
                <F label="Contingency % sui costi" value={d.contingencyPct} onChange={v => updateF("contingencyPct", v)} step={1} />
                <div style={{ flex: 1, paddingTop: 12, fontSize: 11 }}> = <strong>€{fmt(calc.contingencyAmt)}</strong></div>
                <F label="GG pagamento cliente" value={d.paymentDays} onChange={v => updateF("paymentDays", v)} />
                <F label="Tasso interesse annuo %" value={d.interestRate} onChange={v => updateF("interestRate", v)} step={0.5} />
                <div style={{ flex: 1, paddingTop: 12, fontSize: 11 }}> = <strong>€{fmt(calc.financialCost)}</strong></div>
              </R>
              <Sub text={`Contingency: protegge da imprevisti. Finanziario: tu anticipi/spendi €${fmt(calc.totalCosts)}, incassi a ${d.paymentDays}gg. Costa l'equivalente di €${fmt(calc.financialCost)}.`} />
            </Card>

          </div>

          <div id="section-fasi">
            {/* ═══ PRODUCTION PLAN ═══ */}
            <Card title={`Piano di Produzione | ${calc.totalPhHours} ore/uomo`} icon="📅" open={isO("pp")} onToggle={() => tgl("pp")} accent="#8e44ad">
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="no-print">
                <div style={{ display: "grid", gridTemplateColumns: "0.2fr 1.8fr 0.8fr 0.8fr 0.4fr 0.4fr 0.5fr 1.5fr auto", gap: 3, minWidth: 700, marginBottom: 3 }}>
                  {["#", "Fase", "Inizio", "Fine", "Crew", "Ore", "Ore/u", "Note", ""].map(h => <span key={h} style={{ fontSize: 8, color: "#999", fontWeight: 600 }}>{h}</span>)}
                </div>
                {d.phases.map((p, i) => (
                  <div key={p.id} {...getDragPropsPhases(i)} style={{ ...getDragPropsPhases(i).style, display: "grid", gridTemplateColumns: "auto 0.2fr 1.8fr 0.8fr 0.8fr 0.4fr 0.4fr 0.5fr 1.5fr auto", gap: 3, minWidth: 700, marginBottom: 2, alignItems: "center", background: i % 2 === 0 ? "#faf8fd" : "transparent", borderRadius: 3, padding: "1px 2px" }}>
                    <span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16, userSelect: 'none', padding: '0 4px' }} title="Trascina per riordinare">⠿</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#8e44ad", textAlign: "center" }}>{i + 1}</span>
                    <Inp value={p.phase} onChange={v => updateObjList("phases", p.id, "phase", v)} />
                    <Inp type="date" value={p.ds} onChange={v => updateObjList("phases", p.id, "ds", v)} />
                    <Inp type="date" value={p.de} onChange={v => updateObjList("phases", p.id, "de", v)} />
                    <Inp type="number" value={p.crew} onChange={v => updateObjList("phases", p.id, "crew", v)} align="center" />
                    <Inp type="number" value={p.hours} onChange={v => updateObjList("phases", p.id, "hours", v)} align="center" />
                    <div style={{ fontSize: 10, textAlign: "center", fontWeight: 600, color: "#8e44ad" }}>{p.crew * p.hours}</div>
                    <Inp value={p.notes} onChange={v => updateObjList("phases", p.id, "notes", v)} ph="Note..." />
                    <X onClick={() => delObj("phases", p.id)} />
                  </div>
                ))}
                <Btn onClick={() => addObj("phases", { phase: "", ds: "", de: "", crew: 2, hours: 4, notes: "" })} s color="#8e44ad">+ Fase</Btn>
              </div>

              {/* VISUAL TIMELINE */}
              <div style={{ marginTop: 10, background: "#faf8fd", borderRadius: 6, padding: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#8e44ad", marginBottom: 4 }}>CRONOPROGRAMMA VISUALE</div>
                {d.phases.map((p, i) => {
                  const w = calc.totalPhHours > 0 ? Math.max((p.crew * p.hours) / calc.totalPhHours * 100, 5) : 10;
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      <div style={{ width: 16, fontSize: 9, fontWeight: 700, color: "#8e44ad", textAlign: "center" }}>{i + 1}</div>
                      <div style={{ flex: 1.5, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.phase}</div>
                      <div style={{ flex: 3, position: "relative", height: 14 }}>
                        <div style={{ position: "absolute", left: 0, right: 0, top: 5, height: 4, background: "#e8e0f0", borderRadius: 2 }} />
                        <div style={{ position: "absolute", left: 0, width: `${w}%`, top: 2, height: 10, background: "#8e44ad", borderRadius: 4, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 7, color: "#fff", fontWeight: 700 }}>{p.crew * p.hours}h</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>

          <div id="section-riepilogo">
            <div className="no-print" style={{ textAlign: "center", padding: "4px 0 12px", fontSize: 8, color: "#ccc" }}>
              Itinera Events — Profitability Calculator v4.1 Full Analytical | Salvataggio Automatico | Export PDF & JSON
            </div>
          </div>
        </div>
      </div>
      {showRentmanModal && (
        <RentmanImportModal
          onClose={() => setShowRentmanModal(false)}
          onImport={async (mapped, options) => {
            // ── DIFF PREVIEW for incremental sync ──
            if (!options.clearExisting) {
              setShowRentmanModal(false);
              const diff = computeSyncDiff(mapped, d);
              setPendingSync({ mapped, options, diff });
              return null;
            }
            // ── Full import: proceed directly ──
            const results = await handleRentmanImport(mapped, options);
            if (results && toast && !results.error) {
              const skippedMsg = results.skipped > 0 ? `, ${results.skipped} skippati` : '';
              toast.success(`✅ Import completo: dati Rentman importati${skippedMsg}`, 5000);
              acknowledgeNotifications();
            }
            return results;
          }}
        />
      )}
      {pendingSync && (
        <SyncDiffModal
          diff={pendingSync.diff}
          onCancel={() => setPendingSync(null)}
          onApply={async () => {
            const { mapped, options } = pendingSync;
            setPendingSync(null);
            const results = await handleRentmanImport(mapped, options);
            if (results && toast && !results.error) {
              const skippedMsg = results.skipped > 0 ? `, ${results.skipped} skippati` : '';
              const cats = [results.equipment, results.subRentals, results.purchases, results.misc].filter(Boolean);
              const totals = cats.reduce((a, s) => ({ added: a.added + s.added, updated: a.updated + s.updated, removed: a.removed + s.removed }), { added: 0, updated: 0, removed: 0 });
              const parts = [];
              if (totals.updated > 0) parts.push(`${totals.updated} aggiornati`);
              if (totals.added > 0) parts.push(`${totals.added} aggiunti`);
              if (totals.removed > 0) parts.push(`${totals.removed} rimossi`);
              toast.success(`✅ Sync incrementale: ${parts.length > 0 ? parts.join(', ') : 'nessuna modifica'}${skippedMsg}`, 5000);
              acknowledgeNotifications();
            }
          }}
        />
      )}
      {showSyncHistory && (
        <SyncHistoryModal
          projectId={projectId}
          onClose={() => setShowSyncHistory(false)}
        />
      )}
    </div>
  );
}
