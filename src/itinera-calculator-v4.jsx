import { useState, useMemo, useEffect } from "react";
import { useSupabaseProject } from './hooks/useSupabaseProject';
import { useAppConfig } from './hooks/useAppConfig';
import { supabase } from './lib/supabaseClient';
import { useResponsive } from './hooks/useResponsive';
import { useDragDrop } from './hooks/useDragDrop';
import Breadcrumb from './components/Breadcrumb';
import ExportPDFButton from './components/ExportPDF';

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
const VEH = [
  { name: "Furgone ≤3.5t", cons: 12, vol: 23, payload: 1200 },
  { name: "Motrice 7.5t", cons: 18, vol: 35, payload: 3500 },
  { name: "Motrice 18t", cons: 25, vol: 52, payload: 8500 },
  { name: "Bilico", cons: 32, vol: 90, payload: 24000 },
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
const F = ({ label, value, onChange, type = "number", suffix, min, step = 1, w, ph, disabled }) => (
  <div style={{ flex: w || 1, minWidth: 60 }}>
    {label && <label style={{ fontSize: 9, color: "#888", display: "block", marginBottom: 1 }}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)} min={min} step={step} placeholder={ph} disabled={disabled}
      style={{ width: "100%", padding: "4px 6px", border: "1px solid #d0d7de", borderRadius: 4, fontSize: 11, background: disabled ? "#f5f5f5" : "#fff", boxSizing: "border-box" }} />
  </div>
);
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
const Inp = ({ value, onChange, type = "text", ph, align, w }) => (
  <input type={type} value={value} onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)} placeholder={ph}
    style={{ padding: "3px 5px", border: "1px solid #d0d7de", borderRadius: 4, fontSize: 11, textAlign: align || "left", width: w || "100%", boxSizing: "border-box" }} />
);
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
  `}</style>
);

function SupplierInput({ value, onChange, placeholder, suppliersList, onAutoSave }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setSearch(value || ''); }, [value, focused]);
  const filtered = search.length >= 1 ? suppliersList.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10) : [];
  return (
    <div style={{ position: 'relative' }}>
      <input value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} onFocus={() => { setFocused(true); setOpen(true); }} onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 200); if (search !== value) onChange(search); }} placeholder={placeholder || 'Fornitore'} style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
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

// ═══ MAIN COMPONENT ═══
export default function ItineraV4({ projectId, onBack }) {
  const [sec, setSec] = useState({});
  const tgl = k => setSec(p => ({ ...p, [k]: p[k] === false ? true : (p[k] === true ? false : false) }));
  const isO = k => sec[k] !== false;

  // Global consolidated state (Supabase)
  const { data: d, loading, updateField, addItem, updateItem, deleteItem, reorderItems } = useSupabaseProject(projectId);
  const { config: appConfig } = useAppConfig();
  const { isMobile, isTablet, isTouch } = useResponsive();

  const [suppliersList, setSuppliersList] = useState([]);
  const [activeNav, setActiveNav] = useState('progetto');
  const scrollToSection = (id) => {
    const el = document.getElementById('section-' + id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveNav(id); }
  };
  useEffect(() => {
    supabase.from('suppliers').select('id, name, category').eq('is_active', true).order('name').then(({ data }) => { if (data) setSuppliersList(data); });
  }, []);
  useEffect(() => {
    const sections = ['progetto', 'materiale', 'trasporto', 'staff', 'costi', 'fasi', 'riepilogo'];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id.replace('section-', '')); });
    }, { rootMargin: '-100px 0px -60% 0px' });
    sections.forEach(id => { const el = document.getElementById('section-' + id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [d]);

  // Dynamic config from Supabase (with hardcoded fallback)
  const ROUTES_DYN = appConfig?.routes?.items ? Object.fromEntries(appConfig.routes.items.map(r => [r.name, { km: r.km, tolls: r.tolls }])) : ROUTES;
  const RK_DYN = Object.keys(ROUTES_DYN);
  const VEH_DYN = appConfig?.vehicles?.items || VEH;
  const OT_MULT_DYN = appConfig?.overtime || OT_MULT;
  const DIESEL_DYN = appConfig?.fuel?.dieselPricePerLiter || DIESEL;

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
      const cost = e.qty * e.costUnit;
      const depPerUse = e.owned && e.totalUses > 0 ? e.purchasePrice / e.totalUses : 0;
      const depTotal = e.owned ? depPerUse * e.qty : 0;
      const roiEvents = e.owned && e.costUnit > 0 ? Math.ceil(e.purchasePrice / e.costUnit) : 0;
      const roiPaid = e.owned && roiEvents > 0 ? Math.min(e.usesUsed / roiEvents * 100, 100) : 0;
      return { ...e, vol, weight, cost, depPerUse, depTotal, roiEvents, roiPaid };
    });
    const totalVol = eqCalcs.reduce((s, e) => s + e.vol, 0);
    const totalVolEff = totalVol / 0.70;
    const totalWeight = eqCalcs.reduce((s, e) => s + e.weight, 0);
    const totalEqCost = eqCalcs.reduce((s, e) => s + e.cost, 0);
    const totalDepreciation = eqCalcs.reduce((s, e) => s + e.depTotal, 0);
    const recVeh = VEH_DYN.find(v => v.vol >= totalVolEff && v.payload >= totalWeight) || VEH_DYN[VEH_DYN.length - 2];
    const weightOverVol = totalWeight > 0 && totalVolEff > 0 && VEH_DYN.find(v => v.vol >= totalVolEff) && VEH_DYN.find(v => v.vol >= totalVolEff).payload < totalWeight;

    // Purchases/Subs
    const totalSub = d.subRentals.reduce((s, r) => s + r.cost, 0);
    const totalPurch = d.purchases.reduce((s, r) => s + r.cost, 0);

    // Transport
    const legCalcs = d.legs.map(leg => {
      const rd = ROUTES_DYN[leg.route] || { km: leg.cKm, tolls: leg.cTolls };
      const km = leg.route === "Personalizzato" ? leg.cKm : rd.km;
      const tolls = leg.route === "Personalizzato" ? leg.cTolls : rd.tolls;
      const fuel = (km * 2 * VEH_DYN[leg.vType].cons / 100) * DIESEL_DYN * leg.nVeh;
      const toll = tolls * 2 * leg.nVeh;
      const rQ = (leg.shared > 0 ? (leg.rentalDay * leg.rentalDays) / leg.shared : leg.rentalDay * leg.rentalDays) * leg.nVeh;
      return { ...leg, km, fuel, toll, rQ, total: fuel + toll + rQ, vName: VEH_DYN[leg.vType].name };
    });
    const totalTransport = legCalcs.reduce((s, l) => s + l.total, 0);

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
    const totalDmg = d.damages.reduce((s, d) => s + d.cost, 0);
    const totalMisc = d.misc.reduce((s, m) => s + m.cost, 0);
    const totalPhHours = d.phases.reduce((s, p) => s + p.crew * p.hours, 0);

    // Grand Totals
    const costMaterial = totalEqCost + totalSub + totalPurch;
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
      eqCalcs, totalVol, totalVolEff, totalWeight, totalEqCost, totalDepreciation, recVeh, weightOverVol,
      totalSub, totalPurch, legCalcs, totalTransport, intCalcs, totalInt, totalIntP, extCalcs, totalExt, totalExtP, totalWh, totalAllStaff, totalAllPeople,
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
      staffPctOfRevenue: calc.revenueNet > 0 ? ((calc.totalIntStaff + calc.totalExtStaff) / calc.revenueNet) * 100 : 0,
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

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800, color: '#1B3A5C' }}>ITINERA</div><div style={{ fontSize: 13, color: '#94a3b8' }}>Caricamento progetto...</div></div></div>;
  if (!d) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 800, color: '#1B3A5C' }}>Progetto non trovato</div><button onClick={onBack} style={{ marginTop: 12, padding: '8px 20px', background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Torna ai progetti</button></div></div>;

  // Staff Sub-component mapping
  const StaffTable = ({ listField, calcList, label }) => {
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

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", background: "#f0f4f8", minHeight: "100vh" }}>
      <GlobalStyles />
      <div style={{ background: '#1B3A5C', padding: isMobile ? '10px 12px' : '8px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>← Progetti</button>
        <span style={{ color: '#fff', fontSize: isMobile ? 12 : 14, fontWeight: 700 }}>ITINERA — {d.projectName}</span>
        <ExportPDFButton projectData={d} calc={calc} appConfig={appConfig} style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: 11, borderRadius: 6 }} />
      </div>
      <div style={{ padding: isMobile ? '4px 12px' : '4px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Breadcrumb items={[
          { label: 'Dashboard', onClick: onBack },
          { label: d?.projectName || 'Progetto' }
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
                <div style={{ fontWeight: 800, fontSize: 16 }}>{d.projectName} - {d.clientName}</div>
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
            <Card title={`Materiale & Ingombro | €${fmt(calc.totalEqCost)} | ${fmtD(calc.totalVol, 1)}m³ | ${fmt(calc.totalWeight)}kg`} icon="📦" open={isO("eq")} onToggle={() => tgl("eq")}>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.4fr 0.45fr 0.45fr 0.45fr 0.5fr 0.55fr 0.55fr 0.5fr 0.6fr auto", gap: 3, minWidth: 820, marginBottom: 3 }}>
                  {["Descrizione", "Qty", "L(m)", "W(m)", "H(m)", "Kg/pz", "m³", "Kg tot", "€/pz", "Costo", ""].map(h => <span key={h} style={{ fontSize: 8, color: "#999", fontWeight: 600 }}>{h}</span>)}
                </div>
                {calc.eqCalcs.map((e, idx) => (
                  <div key={e.id} {...getDragPropsEq(idx)}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1.8fr 0.4fr 0.45fr 0.45fr 0.45fr 0.5fr 0.55fr 0.55fr 0.5fr 0.6fr auto", gap: 3, minWidth: 820, marginBottom: 1, alignItems: "center" }}>
                      <span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16, userSelect: 'none', padding: '0 4px' }} title="Trascina per riordinare">⠿</span>
                      <Inp value={e.desc} onChange={v => updateObjList("eqItems", e.id, "desc", v)} />
                      <Inp type="number" value={e.qty} onChange={v => updateObjList("eqItems", e.id, "qty", v)} align="center" />
                      <Inp type="number" value={e.l} onChange={v => updateObjList("eqItems", e.id, "l", v)} align="center" />
                      <Inp type="number" value={e.w} onChange={v => updateObjList("eqItems", e.id, "w", v)} align="center" />
                      <Inp type="number" value={e.h} onChange={v => updateObjList("eqItems", e.id, "h", v)} align="center" />
                      <Inp type="number" value={e.weightKg} onChange={v => updateObjList("eqItems", e.id, "weightKg", v)} align="center" />
                      <div style={{ fontSize: 10, textAlign: "center", color: "#2E86AB", fontWeight: 600 }}>{fmtD2(e.vol)}</div>
                      <div style={{ fontSize: 10, textAlign: "center", color: "#e67e22", fontWeight: 600 }}>{fmt(e.weight)}</div>
                      <Inp type="number" value={e.costUnit} onChange={v => updateObjList("eqItems", e.id, "costUnit", v)} align="center" />
                      <div style={{ fontSize: 11, fontWeight: 700, textAlign: "right" }}>€{fmt(e.cost)}</div>
                      <X onClick={() => delObj("eqItems", e.id)} />
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 5, paddingLeft: 4, alignItems: "center", flexWrap: "wrap" }}>
                      <Chk label="Proprio" checked={e.owned} onChange={v => updateObjList("eqItems", e.id, "owned", v)} />
                      {!e.owned && <SupplierInput value={e.supplier || ''} onChange={v => updateObjList('eqItems', e.id, 'supplier', v)} placeholder="Fornitore materiale" suppliersList={suppliersList} onAutoSave={autoSaveSupplier} />}
                      {e.owned && <>
                        <F label="Acquisto €" value={e.purchasePrice} onChange={v => updateObjList("eqItems", e.id, "purchasePrice", v)} w="0.5" />
                        <F label="Utilizzi vita" value={e.totalUses} onChange={v => updateObjList("eqItems", e.id, "totalUses", v)} w="0.4" />
                        <F label="Già usati" value={e.usesUsed} onChange={v => updateObjList("eqItems", e.id, "usesUsed", v)} w="0.4" />
                        <span style={{ fontSize: 9, color: "#888" }}>
                          Ammort: €{fmtD2(e.depPerUse)}/uso → <strong>€{fmtD2(e.depTotal)}</strong>/ev | ROI: {e.roiEvents} ev ({fmtD(e.roiPaid)}%{e.roiPaid >= 100 ? " ✅" : ""})
                        </span>
                      </>}
                    </div>
                  </div>
                ))}
              </div>
              <Btn onClick={() => addObj("eqItems", { desc: "", qty: 1, l: 0, w: 0, h: 0, weightKg: 0, costUnit: 0, owned: false, purchasePrice: 0, totalUses: 1, usesUsed: 0 })} s>+ Materiale</Btn>
              <Sub text={`Volume: ${fmtD2(calc.totalVol)}m³ → Effettivo (÷0.70): ${fmtD(calc.totalVolEff)}m³ | Peso: ${fmt(calc.totalWeight)}kg | Min: ${calc.recVeh.name} | Ammort: €${fmt(calc.totalDepreciation)}`} />
              {calc.weightOverVol && <Warn text={`⚠️ PESO: ${fmt(calc.totalWeight)}kg supera portata veicolo per volume. Serve veicolo più grande o più viaggi!`} />}
            </Card>

          </div>

          {/* ═══ SUB-RENTALS & PURCHASES ═══ */}
          <div style={{ display: "flex", flexDirection: isMobile ? 'column' : 'row', gap: 10 }} className="no-print">
            <div style={{ flex: 1 }}>
              <Card title={`Sub-noleggi | €${fmt(calc.totalSub)}`} icon="🔄" open={isO("sb")} onToggle={() => tgl("sb")}>
                {d.subRentals.map(s => (
                  <R key={s.id}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 9, color: '#888', display: 'block', marginBottom: 2 }}>Fornitore</label><SupplierInput value={s.supplier || ''} onChange={v => updateObjList('subRentals', s.id, 'supplier', v)} placeholder="Cerca fornitore..." suppliersList={suppliersList} onAutoSave={autoSaveSupplier} /></div>
                    <F label="Descrizione" value={s.desc} onChange={v => updateObjList("subRentals", s.id, "desc", v)} type="text" w="1" />
                    <F label="Costo €" value={s.cost} onChange={v => updateObjList("subRentals", s.id, "cost", v)} w="0.6" />
                    <div style={{ paddingTop: 12 }}><Chk label="IVA incl." checked={s.vatIncl} onChange={v => updateObjList("subRentals", s.id, "vatIncl", v)} /></div>
                    <X onClick={() => delObj("subRentals", s.id)} />
                  </R>
                ))}
                <Btn onClick={() => addObj("subRentals", { supplier: "", desc: "", cost: 0, vatIncl: false })} s>+ Sub-noleggio</Btn>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Card title={`Acquisti | €${fmt(calc.totalPurch)}`} icon="🛒" open={isO("pu")} onToggle={() => tgl("pu")}>
                {d.purchases.map(p => (
                  <R key={p.id}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: 9, color: '#888', display: 'block', marginBottom: 2 }}>Fornitore</label><SupplierInput value={p.supplier || ''} onChange={v => updateObjList('purchases', p.id, 'supplier', v)} placeholder="Cerca fornitore..." suppliersList={suppliersList} onAutoSave={autoSaveSupplier} /></div>
                    <F label="Descrizione" value={p.desc} onChange={v => updateObjList("purchases", p.id, "desc", v)} type="text" w="1" />
                    <F label="Costo €" value={p.cost} onChange={v => updateObjList("purchases", p.id, "cost", v)} w="0.6" />
                    <div style={{ paddingTop: 12 }}><Chk label="IVA incl." checked={p.vatIncl} onChange={v => updateObjList("purchases", p.id, "vatIncl", v)} /></div>
                    <X onClick={() => delObj("purchases", p.id)} />
                  </R>
                ))}
                <Btn onClick={() => addObj("purchases", { supplier: "", desc: "", cost: 0, vatIncl: false })} s>+ Acquisto</Btn>
              </Card>
            </div>
          </div>

          <div id="section-trasporto">
            {/* ═══ TRANSPORT ═══ */}
            <Card title={`Trasporto — ${d.legs.length} tratte | €${fmt(calc.totalTransport)}`} icon="🚛" open={isO("tr")} onToggle={() => tgl("tr")}>
              {calc.legCalcs.map((leg, i) => (
                <div key={leg.id} {...getDragPropsLegs(i)} style={{ ...getDragPropsLegs(i).style, background: i % 2 === 0 ? "#f8f9fb" : "#fff", borderRadius: 6, padding: "8px 10px", marginBottom: 6, border: "1px solid #eaecf0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: "#1B3A5C" }}><span style={{ cursor: 'grab', color: '#cbd5e1', fontSize: 16, userSelect: 'none', padding: '0 4px' }} title="Trascina per riordinare">⠿</span> Tratta {i + 1}</span>
                    {d.legs.length > 1 && <X onClick={() => delObj("legs", leg.id)} />}
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
                  <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>
                    Carb €{fmt(leg.fuel)} | Ped €{fmt(leg.toll)} | Nolo €{fmt(leg.rQ)}{leg.shared > 1 ? ` (÷${leg.shared})` : ""} → <strong>€{fmt(leg.total)}</strong>
                  </div>
                </div>
              ))}
              <Btn onClick={() => addObj("legs", { desc: "", route: RK_DYN[0], cKm: 0, cTolls: 0, vType: 0, nVeh: 1, rentalDay: 150, rentalDays: 1, shared: 1 })} s>+ Tratta</Btn>
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
              <StaffTable listField="intStaff" calcList={calc.intCalcs} label="Interno" />
              <div style={{ margin: "16px 0", borderTop: "1px solid #eaecf0" }} />
              <StaffTable listField="extStaff" calcList={calc.extCalcs} label="Esterno / Facchini" />
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
    </div>
  );
}
