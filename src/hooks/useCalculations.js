import { useMemo, useCallback } from 'react';

// ═══ COSTANTI STATICHE (mirror da itinera-calculator-v4.jsx) ═══
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
const VEHICLE_TYPES = [
    { name: "Furgone Standard", cons: 10, vol: 10, payload: 1400 },
    { name: "Furgone Maxi (Passo Lungo)", cons: 12, vol: 15, payload: 1400 },
    { name: "Motrice Piccola (2 Assi)", cons: 18, vol: 35, payload: 8000 },
    { name: "Bilico (Autoarticolato)", cons: 32, vol: 80, payload: 24000 },
    { name: "Auto/Pick-up", cons: 8, vol: 3, payload: 500 },
];
const OT_MULT = { ordinario: 1.00, straordinario: 1.25, festivo: 1.50, notturno: 1.15 };

// Utility pura (nessuna dipendenza React)
const pc = (v, t) => t > 0 ? v / t * 100 : 0;

/**
 * useCalculations — Hook puro di calcolo finanziario.
 * Contiene TUTTA la logica computazionale estratta da itinera-calculator-v4.jsx.
 * Non gestisce stato, non fa chiamate API, non contiene JSX.
 *
 * @param {object}  d                  - Dati progetto da useSupabaseProject
 * @param {object}  appConfig          - Configurazione app da useAppConfig
 * @param {string|null} selectedSubprojectId - Sottoprogetto selezionato (null = Home)
 * @param {object}  ROUTES_DYN         - Tabella rotte dinamica (da appConfig o fallback)
 * @param {Array}   VEH_DYN            - Tipi veicolo dinamici (da appConfig o fallback)
 * @param {object}  OT_MULT_DYN        - Moltiplicatori straordinario (da appConfig o fallback)
 * @param {number}  DIESEL_DYN         - Prezzo gasolio (da appConfig o fallback)
 */
export function useCalculations(d, appConfig, selectedSubprojectId, ROUTES_DYN, VEH_DYN, OT_MULT_DYN, DIESEL_DYN) {

    // ═══ VISIBLE ITEMS (UI Tables — filtered by selectedSubprojectId) ═══
    const visibleLegs = useMemo(() => (d?.legs || []).filter(l => (l.subprojectId || null) === selectedSubprojectId), [d?.legs, selectedSubprojectId]);
    const visibleAnalytics = useMemo(() => (d?.analytics || []).filter(a => (a.subprojectId || null) === selectedSubprojectId), [d?.analytics, selectedSubprojectId]);
    const visibleDamages = useMemo(() => (d?.damages || []).filter(dm => (dm.subprojectId || null) === selectedSubprojectId), [d?.damages, selectedSubprojectId]);
    const visibleMisc = useMemo(() => (d?.misc || []).filter(m => (m.subprojectId || null) === selectedSubprojectId), [d?.misc, selectedSubprojectId]);
    const visiblePhases = useMemo(() => (d?.phases || []).filter(p => (p.subprojectId || null) === selectedSubprojectId), [d?.phases, selectedSubprojectId]);
    const visibleAccommodations = useMemo(() => (d?.accommodations || []).filter(a => (a.subprojectId || null) === selectedSubprojectId), [d?.accommodations, selectedSubprojectId]);
    const visiblePlan = useMemo(() => (d?.planItems || []).filter(p => (p.subprojectId || null) === selectedSubprojectId), [d?.planItems, selectedSubprojectId]);
    const visibleWh = useMemo(() => (d?.whItems || []).filter(w => (w.subprojectId || null) === selectedSubprojectId), [d?.whItems, selectedSubprojectId]);

    // ═══ CALC ITEMS (Financial Dashboard — Home: general+activeStands, Stand: only that stand) ═══
    const activeSpIds = useMemo(() => (d?.subprojects || []).filter(sp => sp.inFinancial).map(sp => sp.id), [d?.subprojects]);
    const filterCalc = useCallback((items) => {
        if (!items) return [];
        if (selectedSubprojectId === null) {
            // Home: costi generali (null/undefined) + stand con inFinancial=true
            return items.filter(e => {
                const spId = e.subprojectId || null;
                return spId === null || activeSpIds.includes(spId);
            });
        }
        // Vista Stand: solo lo stand selezionato
        return items.filter(e => (e.subprojectId || null) === selectedSubprojectId);
    }, [selectedSubprojectId, activeSpIds]);

    const calcEqItems = useMemo(() => filterCalc(d?.eqItems), [d?.eqItems, filterCalc]);
    const calcLegs = useMemo(() => filterCalc(d?.legs), [d?.legs, filterCalc]);
    const calcIntStaff = useMemo(() => filterCalc(d?.intStaff), [d?.intStaff, filterCalc]);
    const calcExtStaff = useMemo(() => filterCalc(d?.extStaff), [d?.extStaff, filterCalc]);
    const calcAnalytics = useMemo(() => filterCalc(d?.analytics), [d?.analytics, filterCalc]);
    const calcDamages = useMemo(() => filterCalc(d?.damages), [d?.damages, filterCalc]);
    const calcMisc = useMemo(() => filterCalc(d?.misc), [d?.misc, filterCalc]);
    const calcPhases = useMemo(() => filterCalc(d?.phases), [d?.phases, filterCalc]);
    const calcAccommodations = useMemo(() => filterCalc(d?.accommodations), [d?.accommodations, filterCalc]);
    const calcPlan = useMemo(() => filterCalc(d?.planItems), [d?.planItems, filterCalc]);
    const calcWh = useMemo(() => filterCalc(d?.whItems), [d?.whItems, filterCalc]);

    // Calculate metrics using useMemo to avoid recalculation on every render
    const calc = useMemo(() => {
        if (!d) return { revenueNet: 0, totalEquipment: 0, totalTransport: 0, totalIntStaff: 0, totalExtStaff: 0, totalSubRentals: 0, totalPurchases: 0, totalAnalytics: 0, totalDamages: 0, totalMisc: 0, warehouseCost: 0, planningCost: 0, mealAccomCost: 0, contingencyCost: 0, financialCost: 0, totalCosts: 0, marginEur: 0, marginPct: 0, costBreakdown: [] };
        // Revenue — Dual Mode: manual (A Forfait) or auto (Somma Voci)
        const currentMode = d.revenueMode || 'manual';
        const manualGross = d.revenueGross || 0;
        // We need equipment/transport/staff revenues first, so discAmt/revenueNet are computed later

        // Equipment
        const eqCalcs = calcEqItems.map(e => {
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
        const legCalcs = calcLegs.map(leg => {
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
        const intCalcs = calcIntStaff.map(cStaff);
        const totalInt = intCalcs.reduce((s, l) => s + l.total, 0);
        const totalIntP = calcIntStaff.reduce((s, l) => s + l.count, 0);
        const totalIntRev = intCalcs.reduce((s, l) => s + (l.sellTotal || 0), 0);
        const extCalcs = calcExtStaff.map(cStaff);
        const totalExt = extCalcs.reduce((s, l) => s + l.total, 0);
        const totalExtP = calcExtStaff.reduce((s, l) => s + l.count, 0);
        const totalExtRev = extCalcs.reduce((s, l) => s + (l.sellTotal || 0), 0);

        const totalWh = calcWh.reduce((s, w) => s + (w.people || 1) * (w.hours || 0) * (w.costUnit || 0), 0);
        const whSellTotal = calcWh.reduce((s, w) => s + (w.sellTotal || 0), 0);
        const totalAllStaff = totalWh + totalInt + totalExt;
        const whPeople = calcWh.reduce((s, w) => s + (w.people || 0), 0);
        const totalAllPeople = whPeople + totalIntP + totalExtP;
        const totalStaffRevenue = totalIntRev + totalExtRev + whSellTotal;
        const totalStaffMargin = totalStaffRevenue - totalAllStaff;
        const totalStaffMarginPct = totalStaffRevenue > 0 ? (totalStaffMargin / totalStaffRevenue) * 100 : null;

        // Misc costs (scalar = project-level only, zero in stand view)
        const totalPlanCost = calcPlan.reduce((s, p) => s + (p.hours || 0) * (p.costUnit || 0), 0);
        const totalAccom = calcAccommodations.reduce((s, a) => s + (a.people || 1) * (a.days || 1) * (a.costUnit || 0), 0);
        const totalAn = calcAnalytics.reduce((s, a) => s + a.cost, 0);
        const totalDmg = calcDamages.reduce((s, item) => s + item.cost, 0);
        const totalMisc = calcMisc.reduce((s, m) => s + m.cost, 0);
        const totalPhHours = calcPhases.reduce((s, p) => s + p.crew * p.hours, 0);

        // Category analytics
        const catStats = ['Proprio', 'Sub-noleggio', 'Acquisto'].map(cat => {
            const items = eqCalcs.filter(e => e.itemCategory === cat);
            const catCost = items.reduce((s, e) => s + e.cost, 0);
            const catRev = items.reduce((s, e) => s + e.revenue, 0);
            const catMarginPct = catRev > 0 ? (catRev - catCost) / catRev * 100 : null;
            const incidencePct = totalEqCost > 0 ? catCost / totalEqCost * 100 : 0;
            return { cat, cost: catCost, rev: catRev, marginPct: catMarginPct, incidencePct, count: items.length };
        });

        // ═══ DUAL-MODE REVENUE ═══
        const autoGross = totalEqRevenue + totalTransportRevenue + totalStaffRevenue;
        const effectiveGross = currentMode === 'auto' ? autoGross : manualGross;
        const discAmt = d.discType === "%" ? effectiveGross * d.discVal / 100 : (d.discVal || 0);
        const revenueNet = effectiveGross - discAmt;

        // Grand Totals
        const costMaterial = totalEqCost;
        // Agency Fee (% sul ricavo lordo effettivo oppure importo fisso)
        const agencyFeeTotal = Math.round(
            ((d.agencyFeeType || 'percent') === 'percent'
                ? effectiveGross * (d.agencyFeeValue || 0) / 100
                : (d.agencyFeeValue || 0)
            ) * 100
        ) / 100;
        const amortCost = selectedSubprojectId === null ? (d.amortization || 0) : 0;
        const costsBeforeContingency = costMaterial + totalTransport + totalAllStaff + totalPlanCost + totalAccom + totalAn + totalDmg + totalMisc + totalDepreciation + agencyFeeTotal + amortCost;
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
            discAmt, revenueNet, effectiveGross, autoGross, margin, marginPct, markupPct, marginColor, marginPerDay,
            eqCalcs, totalVol, totalVolEff, totalWeight, totalEqCost, totalEqRevenue, totalEqMargin, totalDepreciation, recVeh, weightOverVol, catStats,
            legCalcs, totalTransport, totalTransportRevenue, totalTransportMargin, totalTransportMarginPct, fleetCapVol, fleetCapKg, volOverflow, weightOverflow,
            intCalcs, totalInt, totalIntP, extCalcs, totalExt, totalExtP, totalWh, totalAllStaff, totalAllPeople, totalStaffRevenue, totalStaffMargin, totalStaffMarginPct, whSellTotal,
            totalPlanCost, totalAccom, totalAn, totalDmg, totalMisc, totalPhHours, agencyFeeTotal,
            costMaterial, costsBeforeContingency, contingencyAmt, totalCosts, financialCost, totalCostsAll, amortCost
        };
    }, [d,
        calcEqItems, calcLegs, calcIntStaff, calcExtStaff,
        calcAnalytics, calcDamages, calcMisc, calcPhases,
        calcAccommodations, calcPlan, calcWh,
        ROUTES_DYN, VEH_DYN, OT_MULT_DYN, DIESEL_DYN, selectedSubprojectId]);

    // ═══ VISIBLE CALCS (UI Tables — calc results filtered by view) ═══
    const visibleEqCalcs = useMemo(() => (calc?.eqCalcs || []).filter(e => (e.subprojectId || null) === selectedSubprojectId), [calc?.eqCalcs, selectedSubprojectId]);
    const visibleIntCalcs = useMemo(() => (calc?.intCalcs || []).filter(s => (s.subprojectId || null) === selectedSubprojectId), [calc?.intCalcs, selectedSubprojectId]);
    const visibleExtCalcs = useMemo(() => (calc?.extCalcs || []).filter(s => (s.subprojectId || null) === selectedSubprojectId), [calc?.extCalcs, selectedSubprojectId]);

    // ═══ VISIBLE TOTALS (header dei Card — coerenti con le righe visibili) ═══
    const vt = useMemo(() => {
        const eqCost = visibleEqCalcs.reduce((s, e) => s + (e.cost || 0), 0);
        const eqRev = visibleEqCalcs.reduce((s, e) => s + (e.revenue || 0), 0);
        const eqMargin = eqRev - eqCost;
        const eqVol = visibleEqCalcs.reduce((s, e) => s + (e.vol || 0), 0);
        const eqWeight = visibleEqCalcs.reduce((s, e) => s + (e.weight || 0), 0);
        const trCost = (calc?.legCalcs || []).filter(l => (l.subprojectId || null) === selectedSubprojectId).reduce((s, l) => s + (l.total || 0), 0);
        const trRev = (calc?.legCalcs || []).filter(l => (l.subprojectId || null) === selectedSubprojectId).reduce((s, l) => s + (l.sellPrice || 0), 0);
        const intCost = visibleIntCalcs.reduce((s, x) => s + (x.total || 0), 0);
        const intRev = visibleIntCalcs.reduce((s, x) => s + (x.sellTotal || 0), 0);
        const intP = visibleIntCalcs.reduce((s, x) => s + (x.count || 0), 0);
        const extCost = visibleExtCalcs.reduce((s, x) => s + (x.total || 0), 0);
        const extRev = visibleExtCalcs.reduce((s, x) => s + (x.sellTotal || 0), 0);
        const extP = visibleExtCalcs.reduce((s, x) => s + (x.count || 0), 0);
        const staffCost = intCost + extCost + (calc?.totalWh || 0);
        const staffRev = intRev + extRev + (calc?.whSellTotal || 0);
        const whPeopleVis = visibleWh.reduce((s, w) => s + (w.people || 0), 0);
        const staffP = intP + extP + whPeopleVis;
        const anCost = visibleAnalytics.reduce((s, a) => s + (a.cost || 0), 0);
        const dmgCost = visibleDamages.reduce((s, a) => s + (a.cost || 0), 0);
        const miscCost = visibleMisc.reduce((s, m) => s + (m.cost || 0), 0);
        const phHours = visiblePhases.reduce((s, p) => s + (p.crew || 0) * (p.hours || 0), 0);
        // catStats visibili
        const catStats = ['Proprio', 'Sub-noleggio', 'Acquisto'].map(cat => {
            const items = visibleEqCalcs.filter(e => e.itemCategory === cat);
            const cost = items.reduce((s, e) => s + (e.cost || 0), 0);
            const rev = items.reduce((s, e) => s + (e.revenue || 0), 0);
            const marginPct = rev > 0 ? (rev - cost) / rev * 100 : null;
            const incidencePct = eqCost > 0 ? cost / eqCost * 100 : 0;
            return { cat, cost, rev, marginPct, incidencePct, count: items.length };
        });
        return { eqCost, eqRev, eqMargin, eqVol, eqWeight, trCost, trRev, intCost, extCost, staffCost, staffRev, staffP, anCost, dmgCost, miscCost, phHours, catStats };
    }, [visibleEqCalcs, visibleIntCalcs, visibleExtCalcs, visibleAnalytics, visibleDamages, visibleMisc, visiblePhases, calc?.legCalcs, calc?.totalWh, calc?.whSellTotal, selectedSubprojectId, visibleWh]);

    // ═══ SUBPROJECT BREAKDOWN (per il cruscotto Home — usa dati GREZZI, non filtrati) ═══
    const spBreakdown = useMemo(() => {
        if (!d?.subprojects?.length) return [];
        return d.subprojects.map(sp => {
            const spItems = (d.eqItems || []).filter(e => (e.subprojectId || null) === sp.id);
            const matCost = spItems.reduce((s, e) => s + Math.round((e.qty || 0) * (e.costUnit || 0) * (e.coefficient ?? 1) * 100) / 100, 0);
            const matRev = spItems.reduce((s, e) => s + (e.sellPrice || 0), 0);
            const spLegs = (d.legs || []).filter(l => (l.subprojectId || null) === sp.id);
            const trCost = spLegs.reduce((s, l) => s + ((l.rentalDay || 0) * (l.rentalDays || 1) * (l.nVeh || 1)), 0);
            const spStaff = [...(d.intStaff || []), ...(d.extStaff || [])].filter(x => (x.subprojectId || null) === sp.id);
            const staffCost = spStaff.reduce((s, x) => s + (x.count || 0) * (x.costHour || 0) * ((x.hOrd || 0) + (x.hStr || 0) + (x.hFest || 0) + (x.hNott || 0)), 0);
            const extraCost = [...(d.analytics || []), ...(d.damages || []), ...(d.misc || [])].filter(c => (c.subprojectId || null) === sp.id).reduce((s, c) => s + (c.cost || 0), 0);
            const totalCost = matCost + trCost + staffCost + extraCost;
            return { ...sp, matCost, matRev, trCost, staffCost, extraCost, totalCost };
        });
    }, [d]);

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

    return {
        // Visible items (per tabelle UI)
        visibleLegs,
        visibleAnalytics,
        visibleDamages,
        visibleMisc,
        visiblePhases,
        visibleAccommodations,
        visiblePlan,
        visibleWh,
        // Calc items (per cruscotto finanziario — non filtrare per vista stand)
        calcEqItems,
        calcLegs,
        calcIntStaff,
        calcExtStaff,
        calcAnalytics,
        calcDamages,
        calcMisc,
        calcPhases,
        calcAccommodations,
        calcPlan,
        calcWh,
        // Oggetto principale con tutti i totali finanziari
        calc,
        // Visible calcs (righe UI con margini calcolati)
        visibleEqCalcs,
        visibleIntCalcs,
        visibleExtCalcs,
        // Totali visibili (header dei Card)
        vt,
        // Breakdown per sottoprogetto (cruscotto Home)
        spBreakdown,
        // Alert e suggerimenti pricing
        activeAlerts,
        pricingSuggestion,
    };
}
