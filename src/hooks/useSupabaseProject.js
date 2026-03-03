import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function dbToState(project, equipment, transport, intStaff, extStaff, costs, phases, subprojects) {
    return {
        projectCode: project.project_code || '', projectName: project.project_name, eventType: project.event_type, eventDate: project.event_date || '', clientName: project.client_name || '', totalWorkDays: project.total_work_days, status: project.status,
        revenueGross: Number(project.revenue_gross), discType: project.disc_type, discVal: Number(project.disc_val),
        revenueMode: project.revenue_mode || 'manual',
        whCount: project.wh_count, whRate: Number(project.wh_rate), whHLoad: Number(project.wh_h_load), whHUnload: Number(project.wh_h_unload), whSellTotal: Number(project.wh_sell_total || 0),
        planHours: Number(project.plan_hours), planRate: Number(project.plan_rate),
        mealCost: Number(project.meal_cost), mealsDay: project.meals_day, workDays: project.work_days, hotelNights: project.hotel_nights, hotelCost: Number(project.hotel_cost),
        contingencyPct: Number(project.contingency_pct), paymentDays: project.payment_days, interestRate: Number(project.interest_rate),
        agencyFeeType: project.agency_fee_type || 'percent', agencyFeeValue: Number(project.agency_fee_value || 0),
        rentmanProjectId: project.rentman_project_id || null,
        subprojects: subprojects.map(sp => ({ id: sp.id, rentmanSubprojectId: sp.rentman_subproject_id, name: sp.name || '', location: sp.location || '', inFinancial: sp.in_financial ?? true, sortOrder: sp.sort_order ?? 0 })),
        eqItems: equipment.map(e => ({ id: e.id, desc: e.description, supplier: e.supplier || '', qty: e.qty, coefficient: Number(e.coefficient ?? 1), l: Number(e.l), w: Number(e.w), h: Number(e.h), weightKg: Number(e.weight_kg), costUnit: Number(e.cost_unit), sellPrice: Number(e.sell_price || 0), owned: e.owned, purchasePrice: Number(e.purchase_price), totalUses: e.total_uses, usesUsed: e.uses_used, rentmanId: e.rentman_id || null, itemCategory: e.item_category || 'Proprio', subprojectId: e.subproject_id || null })),
        legs: transport.map(t => ({ id: t.id, desc: t.description, route: t.route, cKm: Number(t.custom_km), cTolls: Number(t.custom_tolls), vType: t.vehicle_type, nVeh: t.n_vehicles, rentalDay: Number(t.rental_day), rentalDays: t.rental_days, shared: t.shared, sellPrice: Number(t.sell_price || 0), subprojectId: t.subproject_id || null })),
        intStaff: intStaff.map(s => ({ id: s.id, role: s.role, count: s.count, costHour: Number(s.cost_hour), hOrd: Number(s.h_ord), hStr: Number(s.h_str), hFest: Number(s.h_fest), hNott: Number(s.h_nott), sellTotal: Number(s.sell_total || 0), subprojectId: s.subproject_id || null })),
        extStaff: extStaff.map(s => ({ id: s.id, role: s.role, count: s.count, costHour: Number(s.cost_hour), hOrd: Number(s.h_ord), hStr: Number(s.h_str), hFest: Number(s.h_fest), hNott: Number(s.h_nott), sellTotal: Number(s.sell_total || 0), subprojectId: s.subproject_id || null })),
        analytics: costs.filter(c => c.category === 'analytics').map(c => ({ id: c.id, desc: c.description, cost: Number(c.cost), rentmanId: c.rentman_id || null, subprojectId: c.subproject_id || null })),
        damages: costs.filter(c => c.category === 'damage').map(c => ({ id: c.id, desc: c.description, cost: Number(c.cost), rentmanId: c.rentman_id || null, subprojectId: c.subproject_id || null })),
        misc: costs.filter(c => c.category === 'misc').map(c => ({ id: c.id, desc: c.description, cost: Number(c.cost), qty: c.quantity || 1, rentmanId: c.rentman_id || null, subprojectId: c.subproject_id || null })),
        phases: phases.map(p => ({ id: p.id, phase: p.phase, ds: p.date_start || '', de: p.date_end || '', crew: p.crew, hours: Number(p.hours), notes: p.notes, subprojectId: p.subproject_id || null })),
    };
}

export function useSupabaseProject(projectId) {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
    const [error, setError] = useState(null);
    const pendingOps = useRef(0);
    const debounceTimers = useRef({});

    const loadProject = useCallback(async () => {
        if (!projectId || !user) return;
        setLoading(true);
        setError(null);
        try {
            const [projRes, eqRes, trRes, intRes, extRes, costRes, phRes, spRes] = await Promise.all([
                supabase.from('projects').select('*').eq('id', projectId).single(),
                supabase.from('equipment_items').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('transport_legs').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('staff_entries').select('*').eq('project_id', projectId).eq('staff_type', 'internal').order('sort_order'),
                supabase.from('staff_entries').select('*').eq('project_id', projectId).eq('staff_type', 'external').order('sort_order'),
                supabase.from('cost_entries').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('production_phases').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('subprojects').select('*').eq('project_id', projectId).order('sort_order'),
            ]);
            if (projRes.error) throw projRes.error;
            const state = dbToState(projRes.data, eqRes.data || [], trRes.data || [], intRes.data || [], extRes.data || [], costRes.data || [], phRes.data || [], spRes.data || []);
            setData(state);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId, user]);

    useEffect(() => { loadProject(); }, [loadProject]);

    // Wrap Supabase writes with sync status tracking
    const trackedWrite = useCallback(async (writeFn) => {
        pendingOps.current += 1;
        setSyncStatus('saving');
        try {
            await writeFn();
            pendingOps.current -= 1;
            if (pendingOps.current <= 0) { pendingOps.current = 0; setSyncStatus('saved'); }
        } catch (err) {
            pendingOps.current -= 1;
            setSyncStatus('error');
            console.error('[Supabase] Write error:', err);
        }
    }, []);

    // Debounced write: local state updates are instant, DB writes are delayed
    const debouncedWrite = useCallback((key, writeFn, delay = 800) => {
        if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
        // Show 'saving' indicator to signal pending write
        setSyncStatus('saving');
        debounceTimers.current[key] = setTimeout(async () => {
            delete debounceTimers.current[key];
            try {
                pendingOps.current += 1;
                await writeFn();
                pendingOps.current -= 1;
                // Only mark 'saved' if no more pending ops or pending debounces
                if (pendingOps.current <= 0 && Object.keys(debounceTimers.current).length === 0) {
                    pendingOps.current = 0;
                    setSyncStatus('saved');
                }
            } catch (err) {
                pendingOps.current -= 1;
                setSyncStatus('error');
                console.error('[Supabase] Debounced write error:', err);
            }
        }, delay);
    }, []);

    // Cleanup debounce timers on unmount — flush pending writes
    useEffect(() => {
        return () => {
            Object.values(debounceTimers.current).forEach(t => clearTimeout(t));
            debounceTimers.current = {};
        };
    }, []);

    const updateField = useCallback(async (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        const fieldMap = { projectCode: 'project_code', projectName: 'project_name', clientName: 'client_name', eventType: 'event_type', eventDate: 'event_date', totalWorkDays: 'total_work_days', status: 'status', revenueGross: 'revenue_gross', discType: 'disc_type', discVal: 'disc_val', revenueMode: 'revenue_mode', whCount: 'wh_count', whRate: 'wh_rate', whHLoad: 'wh_h_load', whHUnload: 'wh_h_unload', whSellTotal: 'wh_sell_total', planHours: 'plan_hours', planRate: 'plan_rate', mealCost: 'meal_cost', mealsDay: 'meals_day', workDays: 'work_days', hotelNights: 'hotel_nights', hotelCost: 'hotel_cost', contingencyPct: 'contingency_pct', paymentDays: 'payment_days', interestRate: 'interest_rate', agencyFeeType: 'agency_fee_type', agencyFeeValue: 'agency_fee_value' };
        const dbField = fieldMap[field];
        if (dbField) debouncedWrite(`field_${field}`, () => supabase.from('projects').update({ [dbField]: value }).eq('id', projectId));
    }, [projectId, debouncedWrite]);

    const addItem = useCallback(async (listField, newItem) => {
        const tableMap = {
            eqItems: { table: 'equipment_items', transform: (item) => ({ project_id: projectId, description: item.desc || '', supplier: item.supplier || '', qty: item.qty || 1, coefficient: item.coefficient ?? 1, l: item.l || 0, w: item.w || 0, h: item.h || 0, weight_kg: item.weightKg || 0, cost_unit: item.costUnit || 0, sell_price: item.sellPrice || 0, owned: item.owned || false, purchase_price: item.purchasePrice || 0, total_uses: item.totalUses || 1, uses_used: item.usesUsed || 0, rentman_id: item.rentmanId || null, item_category: item.itemCategory || 'Proprio', subproject_id: item.subprojectId || null }) },
            legs: { table: 'transport_legs', transform: (item) => ({ project_id: projectId, description: item.desc || '', route: item.route || '', custom_km: item.cKm || 0, custom_tolls: item.cTolls || 0, vehicle_type: item.vType || 0, n_vehicles: item.nVeh || 1, rental_day: item.rentalDay || 150, rental_days: item.rentalDays || 1, shared: item.shared || 1, sell_price: item.sellPrice || 0, subproject_id: item.subprojectId || null }) },
            intStaff: { table: 'staff_entries', transform: (item) => ({ project_id: projectId, staff_type: 'internal', role: item.role || '', count: item.count || 1, cost_hour: item.costHour || 20, h_ord: item.hOrd || 8, h_str: item.hStr || 0, h_fest: item.hFest || 0, h_nott: item.hNott || 0, sell_total: item.sellTotal || 0, subproject_id: item.subprojectId || null }) },
            extStaff: { table: 'staff_entries', transform: (item) => ({ project_id: projectId, staff_type: 'external', role: item.role || '', count: item.count || 1, cost_hour: item.costHour || 15, h_ord: item.hOrd || 8, h_str: item.hStr || 0, h_fest: item.hFest || 0, h_nott: item.hNott || 0, sell_total: item.sellTotal || 0, subproject_id: item.subprojectId || null }) },
            analytics: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'analytics', description: item.desc || '', cost: item.cost || 0, rentman_id: item.rentmanId || null, subproject_id: item.subprojectId || null }) },
            damages: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'damage', description: item.desc || '', cost: item.cost || 0, rentman_id: item.rentmanId || null, subproject_id: item.subprojectId || null }) },
            misc: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'misc', description: item.desc || '', cost: item.cost || 0, quantity: item.qty || 1, rentman_id: item.rentmanId || null, subproject_id: item.subprojectId || null }) },
            phases: { table: 'production_phases', transform: (item) => ({ project_id: projectId, phase: item.phase || '', date_start: item.ds || null, date_end: item.de || null, crew: item.crew || 2, hours: item.hours || 4, notes: item.notes || '', subproject_id: item.subprojectId || null }) },
        };
        const mapping = tableMap[listField];
        if (!mapping) return;
        const payload = mapping.transform(newItem);
        console.log('SUPABASE INSERT PAYLOAD:', mapping.table, JSON.stringify(payload));
        await trackedWrite(async () => {
            const { data: inserted, error: insertError } = await supabase.from(mapping.table).insert(payload).select().single();
            console.log('[Supabase] INSERT:', mapping.table, 'error:', insertError, 'inserted:', inserted);
            if (!insertError && inserted) {
                const stateItem = { ...newItem, id: inserted.id, subprojectId: inserted.subproject_id || null };
                setData(prev => ({ ...prev, [listField]: [...(prev[listField] || []), stateItem] }));
            } else if (insertError) {
                throw insertError;
            }
        });
    }, [projectId, trackedWrite]);

    const updateItem = useCallback(async (listField, itemId, field, value) => {
        setData(prev => ({ ...prev, [listField]: prev[listField].map(item => item.id === itemId ? { ...item, [field]: value } : item) }));
        const tableMap = { eqItems: 'equipment_items', legs: 'transport_legs', intStaff: 'staff_entries', extStaff: 'staff_entries', analytics: 'cost_entries', damages: 'cost_entries', misc: 'cost_entries', phases: 'production_phases' };
        const fieldMaps = {
            eqItems: { desc: 'description', supplier: 'supplier', qty: 'qty', coefficient: 'coefficient', l: 'l', w: 'w', h: 'h', weightKg: 'weight_kg', costUnit: 'cost_unit', sellPrice: 'sell_price', owned: 'owned', purchasePrice: 'purchase_price', totalUses: 'total_uses', usesUsed: 'uses_used', itemCategory: 'item_category' },
            legs: { desc: 'description', route: 'route', cKm: 'custom_km', cTolls: 'custom_tolls', vType: 'vehicle_type', nVeh: 'n_vehicles', rentalDay: 'rental_day', rentalDays: 'rental_days', shared: 'shared', sellPrice: 'sell_price' },
            intStaff: { role: 'role', count: 'count', costHour: 'cost_hour', hOrd: 'h_ord', hStr: 'h_str', hFest: 'h_fest', hNott: 'h_nott', sellTotal: 'sell_total' },
            extStaff: { role: 'role', count: 'count', costHour: 'cost_hour', hOrd: 'h_ord', hStr: 'h_str', hFest: 'h_fest', hNott: 'h_nott', sellTotal: 'sell_total' },
            analytics: { desc: 'description', cost: 'cost' },
            damages: { desc: 'description', cost: 'cost' },
            misc: { desc: 'description', cost: 'cost', qty: 'quantity' },
            phases: { phase: 'phase', ds: 'date_start', de: 'date_end', crew: 'crew', hours: 'hours', notes: 'notes' },
        };
        const table = tableMap[listField];
        const dbField = fieldMaps[listField]?.[field];
        if (table && dbField) debouncedWrite(`item_${itemId}_${field}`, () => supabase.from(table).update({ [dbField]: value }).eq('id', itemId));
    }, [debouncedWrite]);

    const deleteItem = useCallback(async (listField, itemId) => {
        setData(prev => ({ ...prev, [listField]: prev[listField].filter(item => item.id !== itemId) }));
        const tableMap = { eqItems: 'equipment_items', legs: 'transport_legs', intStaff: 'staff_entries', extStaff: 'staff_entries', analytics: 'cost_entries', damages: 'cost_entries', misc: 'cost_entries', phases: 'production_phases' };
        const table = tableMap[listField];
        if (table) await trackedWrite(() => supabase.from(table).delete().eq('id', itemId));
    }, [trackedWrite]);

    const reorderItems = useCallback(async (listField, newOrder) => {
        setData(prev => ({ ...prev, [listField]: newOrder }));
        const tableMap = { eqItems: 'equipment_items', legs: 'transport_legs', intStaff: 'staff_entries', extStaff: 'staff_entries', analytics: 'cost_entries', damages: 'cost_entries', misc: 'cost_entries', phases: 'production_phases' };
        const table = tableMap[listField];
        if (table) {
            for (let i = 0; i < newOrder.length; i++) {
                if (newOrder[i].id) await supabase.from(table).update({ sort_order: i }).eq('id', newOrder[i].id);
            }
        }
    }, []);

    const updateProjectMeta = useCallback(async (fields) => {
        if (!projectId) return;
        await supabase.from('projects').update(fields).eq('id', projectId);
    }, [projectId]);

    const updateSubprojectFinancial = useCallback(async (subprojectId, inFinancial) => {
        // Aggiorna lo stato locale
        setData(prev => ({
            ...prev,
            subprojects: (prev.subprojects || []).map(sp =>
                sp.id === subprojectId ? { ...sp, inFinancial } : sp
            ),
        }));
        // Persisti su Supabase
        await trackedWrite(() =>
            supabase.from('subprojects').update({ in_financial: inFinancial }).eq('id', subprojectId)
        );
    }, [trackedWrite]);

    return { data, loading, syncStatus, error, updateField, addItem, updateItem, deleteItem, reorderItems, updateProjectMeta, updateSubprojectFinancial, reload: loadProject };
}
