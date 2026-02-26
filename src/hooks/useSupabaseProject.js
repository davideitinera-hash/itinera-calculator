import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function dbToState(project, equipment, transport, intStaff, extStaff, costs, phases) {
    return {
        projectCode: project.project_code || '', projectName: project.project_name, eventType: project.event_type, eventDate: project.event_date || '', clientName: project.client_name || '', totalWorkDays: project.total_work_days, status: project.status,
        revenueGross: Number(project.revenue_gross), discType: project.disc_type, discVal: Number(project.disc_val),
        whCount: project.wh_count, whRate: Number(project.wh_rate), whHLoad: Number(project.wh_h_load), whHUnload: Number(project.wh_h_unload),
        planHours: Number(project.plan_hours), planRate: Number(project.plan_rate),
        mealCost: Number(project.meal_cost), mealsDay: project.meals_day, workDays: project.work_days, hotelNights: project.hotel_nights, hotelCost: Number(project.hotel_cost),
        contingencyPct: Number(project.contingency_pct), paymentDays: project.payment_days, interestRate: Number(project.interest_rate),
        eqItems: equipment.map(e => ({ id: e.id, desc: e.description, supplier: e.supplier || '', qty: e.qty, coefficient: Number(e.coefficient ?? 1), l: Number(e.l), w: Number(e.w), h: Number(e.h), weightKg: Number(e.weight_kg), costUnit: Number(e.cost_unit), owned: e.owned, purchasePrice: Number(e.purchase_price), totalUses: e.total_uses, usesUsed: e.uses_used })),
        legs: transport.map(t => ({ id: t.id, desc: t.description, route: t.route, cKm: Number(t.custom_km), cTolls: Number(t.custom_tolls), vType: t.vehicle_type, nVeh: t.n_vehicles, rentalDay: Number(t.rental_day), rentalDays: t.rental_days, shared: t.shared })),
        intStaff: intStaff.map(s => ({ id: s.id, role: s.role, count: s.count, costHour: Number(s.cost_hour), hOrd: Number(s.h_ord), hStr: Number(s.h_str), hFest: Number(s.h_fest), hNott: Number(s.h_nott) })),
        extStaff: extStaff.map(s => ({ id: s.id, role: s.role, count: s.count, costHour: Number(s.cost_hour), hOrd: Number(s.h_ord), hStr: Number(s.h_str), hFest: Number(s.h_fest), hNott: Number(s.h_nott) })),
        subRentals: costs.filter(c => c.category === 'sub_rental').map(c => ({ id: c.id, supplier: c.supplier, desc: c.description, cost: Number(c.cost), vatIncl: c.vat_included })),
        purchases: costs.filter(c => c.category === 'purchase').map(c => ({ id: c.id, supplier: c.supplier, desc: c.description, cost: Number(c.cost), vatIncl: c.vat_included })),
        analytics: costs.filter(c => c.category === 'analytics').map(c => ({ id: c.id, desc: c.description, cost: Number(c.cost) })),
        damages: costs.filter(c => c.category === 'damage').map(c => ({ id: c.id, desc: c.description, cost: Number(c.cost) })),
        misc: costs.filter(c => c.category === 'misc').map(c => ({ id: c.id, desc: c.description, cost: Number(c.cost) })),
        phases: phases.map(p => ({ id: p.id, phase: p.phase, ds: p.date_start || '', de: p.date_end || '', crew: p.crew, hours: Number(p.hours), notes: p.notes })),
    };
}

export function useSupabaseProject(projectId) {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const loadProject = useCallback(async () => {
        if (!projectId || !user) return;
        setLoading(true);
        setError(null);
        try {
            const [projRes, eqRes, trRes, intRes, extRes, costRes, phRes] = await Promise.all([
                supabase.from('projects').select('*').eq('id', projectId).single(),
                supabase.from('equipment_items').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('transport_legs').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('staff_entries').select('*').eq('project_id', projectId).eq('staff_type', 'internal').order('sort_order'),
                supabase.from('staff_entries').select('*').eq('project_id', projectId).eq('staff_type', 'external').order('sort_order'),
                supabase.from('cost_entries').select('*').eq('project_id', projectId).order('sort_order'),
                supabase.from('production_phases').select('*').eq('project_id', projectId).order('sort_order'),
            ]);
            if (projRes.error) throw projRes.error;
            const state = dbToState(projRes.data, eqRes.data || [], trRes.data || [], intRes.data || [], extRes.data || [], costRes.data || [], phRes.data || []);
            setData(state);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectId, user]);

    useEffect(() => { loadProject(); }, [loadProject]);

    const updateField = useCallback(async (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        const fieldMap = { projectCode: 'project_code', projectName: 'project_name', clientName: 'client_name', eventType: 'event_type', eventDate: 'event_date', totalWorkDays: 'total_work_days', status: 'status', revenueGross: 'revenue_gross', discType: 'disc_type', discVal: 'disc_val', whCount: 'wh_count', whRate: 'wh_rate', whHLoad: 'wh_h_load', whHUnload: 'wh_h_unload', planHours: 'plan_hours', planRate: 'plan_rate', mealCost: 'meal_cost', mealsDay: 'meals_day', workDays: 'work_days', hotelNights: 'hotel_nights', hotelCost: 'hotel_cost', contingencyPct: 'contingency_pct', paymentDays: 'payment_days', interestRate: 'interest_rate' };
        const dbField = fieldMap[field];
        if (dbField) await supabase.from('projects').update({ [dbField]: value }).eq('id', projectId);
    }, [projectId]);

    const addItem = useCallback(async (listField, newItem) => {
        const tableMap = {
            eqItems: { table: 'equipment_items', transform: (item) => ({ project_id: projectId, description: item.desc || '', supplier: item.supplier || '', qty: item.qty || 1, coefficient: item.coefficient ?? 1, l: item.l || 0, w: item.w || 0, h: item.h || 0, weight_kg: item.weightKg || 0, cost_unit: item.costUnit || 0, owned: item.owned || false, purchase_price: item.purchasePrice || 0, total_uses: item.totalUses || 1, uses_used: item.usesUsed || 0 }) },
            legs: { table: 'transport_legs', transform: (item) => ({ project_id: projectId, description: item.desc || '', route: item.route || '', custom_km: item.cKm || 0, custom_tolls: item.cTolls || 0, vehicle_type: item.vType || 0, n_vehicles: item.nVeh || 1, rental_day: item.rentalDay || 150, rental_days: item.rentalDays || 1, shared: item.shared || 1 }) },
            intStaff: { table: 'staff_entries', transform: (item) => ({ project_id: projectId, staff_type: 'internal', role: item.role || '', count: item.count || 1, cost_hour: item.costHour || 20, h_ord: item.hOrd || 8, h_str: item.hStr || 0, h_fest: item.hFest || 0, h_nott: item.hNott || 0 }) },
            extStaff: { table: 'staff_entries', transform: (item) => ({ project_id: projectId, staff_type: 'external', role: item.role || '', count: item.count || 1, cost_hour: item.costHour || 15, h_ord: item.hOrd || 8, h_str: item.hStr || 0, h_fest: item.hFest || 0, h_nott: item.hNott || 0 }) },
            subRentals: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'sub_rental', description: item.desc || '', supplier: item.supplier || '', cost: item.cost || 0, vat_included: item.vatIncl || false }) },
            purchases: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'purchase', description: item.desc || '', supplier: item.supplier || '', cost: item.cost || 0, vat_included: item.vatIncl || false }) },
            analytics: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'analytics', description: item.desc || '', cost: item.cost || 0 }) },
            damages: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'damage', description: item.desc || '', cost: item.cost || 0 }) },
            misc: { table: 'cost_entries', transform: (item) => ({ project_id: projectId, category: 'misc', description: item.desc || '', cost: item.cost || 0 }) },
            phases: { table: 'production_phases', transform: (item) => ({ project_id: projectId, phase: item.phase || '', date_start: item.ds || null, date_end: item.de || null, crew: item.crew || 2, hours: item.hours || 4, notes: item.notes || '' }) },
        };
        const mapping = tableMap[listField];
        if (!mapping) return;
        const { data: inserted, error } = await supabase.from(mapping.table).insert(mapping.transform(newItem)).select().single();
        if (!error && inserted) {
            const stateItem = { ...newItem, id: inserted.id };
            setData(prev => ({ ...prev, [listField]: [...(prev[listField] || []), stateItem] }));
        }
    }, [projectId]);

    const updateItem = useCallback(async (listField, itemId, field, value) => {
        setData(prev => ({ ...prev, [listField]: prev[listField].map(item => item.id === itemId ? { ...item, [field]: value } : item) }));
        const tableMap = { eqItems: 'equipment_items', legs: 'transport_legs', intStaff: 'staff_entries', extStaff: 'staff_entries', subRentals: 'cost_entries', purchases: 'cost_entries', analytics: 'cost_entries', damages: 'cost_entries', misc: 'cost_entries', phases: 'production_phases' };
        const fieldMaps = {
            eqItems: { desc: 'description', supplier: 'supplier', qty: 'qty', coefficient: 'coefficient', l: 'l', w: 'w', h: 'h', weightKg: 'weight_kg', costUnit: 'cost_unit', owned: 'owned', purchasePrice: 'purchase_price', totalUses: 'total_uses', usesUsed: 'uses_used' },
            legs: { desc: 'description', route: 'route', cKm: 'custom_km', cTolls: 'custom_tolls', vType: 'vehicle_type', nVeh: 'n_vehicles', rentalDay: 'rental_day', rentalDays: 'rental_days', shared: 'shared' },
            intStaff: { role: 'role', count: 'count', costHour: 'cost_hour', hOrd: 'h_ord', hStr: 'h_str', hFest: 'h_fest', hNott: 'h_nott' },
            extStaff: { role: 'role', count: 'count', costHour: 'cost_hour', hOrd: 'h_ord', hStr: 'h_str', hFest: 'h_fest', hNott: 'h_nott' },
            subRentals: { desc: 'description', supplier: 'supplier', cost: 'cost', vatIncl: 'vat_included' },
            purchases: { desc: 'description', supplier: 'supplier', cost: 'cost', vatIncl: 'vat_included' },
            analytics: { desc: 'description', cost: 'cost' },
            damages: { desc: 'description', cost: 'cost' },
            misc: { desc: 'description', cost: 'cost' },
            phases: { phase: 'phase', ds: 'date_start', de: 'date_end', crew: 'crew', hours: 'hours', notes: 'notes' },
        };
        const table = tableMap[listField];
        const dbField = fieldMaps[listField]?.[field];
        if (table && dbField) await supabase.from(table).update({ [dbField]: value }).eq('id', itemId);
    }, []);

    const deleteItem = useCallback(async (listField, itemId) => {
        setData(prev => ({ ...prev, [listField]: prev[listField].filter(item => item.id !== itemId) }));
        const tableMap = { eqItems: 'equipment_items', legs: 'transport_legs', intStaff: 'staff_entries', extStaff: 'staff_entries', subRentals: 'cost_entries', purchases: 'cost_entries', analytics: 'cost_entries', damages: 'cost_entries', misc: 'cost_entries', phases: 'production_phases' };
        const table = tableMap[listField];
        if (table) await supabase.from(table).delete().eq('id', itemId);
    }, []);

    const reorderItems = useCallback(async (listField, newOrder) => {
        setData(prev => ({ ...prev, [listField]: newOrder }));
        const tableMap = { eqItems: 'equipment_items', legs: 'transport_legs', intStaff: 'staff_entries', extStaff: 'staff_entries', subRentals: 'cost_entries', purchases: 'cost_entries', analytics: 'cost_entries', damages: 'cost_entries', misc: 'cost_entries', phases: 'production_phases' };
        const table = tableMap[listField];
        if (table) {
            for (let i = 0; i < newOrder.length; i++) {
                if (newOrder[i].id) await supabase.from(table).update({ sort_order: i }).eq('id', newOrder[i].id);
            }
        }
    }, []);

    return { data, loading, saving, error, updateField, addItem, updateItem, deleteItem, reorderItems, reload: loadProject };
}
