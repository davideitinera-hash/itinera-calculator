import { useState, useCallback } from 'react';

const WEBHOOK_URL = 'https://n8n.itinerapro.com/webhook/rentman-sync';

export function useRentmanSync() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [projects, setProjects] = useState([]);
    const [detail, setDetail] = useState(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.projects || []);
            setProjects(list);
            return list;
        } catch (err) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDetail = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setDetail(data);
            return data;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const mapToCalculator = useCallback((rentmanData) => {
        if (!rentmanData) return null;
        const { project, equipment, costs, rentmanTotals, subrentals: rawSubrentals, subprojects: rawSubprojects } = rentmanData;

        const projectFields = {};
        if (project) {
            if (project.projectName) projectFields.projectName = project.projectName;
            if (project.clientName) projectFields.clientName = project.clientName;
            if (project.eventDate) projectFields.eventDate = project.eventDate;
            if (project.revenueGross != null) projectFields.revenueGross = project.revenueGross;
            if (project.totalWorkDays != null) projectFields.totalWorkDays = project.totalWorkDays;
            if (project.projectNumber != null) projectFields.projectCode = String(project.projectNumber);
        }

        const equipmentItems = (equipment || []).map((e, i) => {
            if (i === 0) console.log('First Rentman item:', JSON.stringify(e, null, 2));
            return {
                desc: e.desc || '',
                supplier: e.custom?.custom_14 || e.supplier || e.contactName || e.contact?.displayname || '',
                qty: e.qty || 1,
                coefficient: (e.factor && e.factor !== 0) ? String(e.factor) : '1',
                l: Math.round(((e.l || 0) / 100) * 100) / 100,
                w: Math.round(((e.w || 0) / 100) * 100) / 100,
                h: Math.round(((e.h || 0) / 100) * 100) / 100,
                weightKg: e.weightKg || 0,
                costUnit: e.costUnit || 0,
                owned: false,
                purchasePrice: 0,
                totalUses: 1,
                usesUsed: 0,
                rentmanId: e.rentmanId,
                subprojectId: e.subprojectId || null,
                _group: e.group || '',
                _remarks: e.remarks || '',
            };
        });

        // ═══ SUBRENTALS: flatten equipment lines from the new subrentals array ═══
        const subRentals = [];
        if (Array.isArray(rawSubrentals) && rawSubrentals.length > 0) {
            // New format: top-level subrentals array with nested equipment
            for (const sr of rawSubrentals) {
                const supplierName = sr.supplierName || '';
                const eqLines = sr.equipment || [];
                if (eqLines.length > 0) {
                    for (const eq of eqLines) {
                        subRentals.push({
                            desc: eq.name || '',
                            cost: eq.lineprice || 0,
                            supplier: supplierName,
                            qty: eq.quantity || 1,
                            unitPrice: eq.unit_price || 0,
                            vatIncl: false,
                            rentmanId: eq.id || null,
                            _subrentalId: sr.id || null,
                        });
                    }
                } else {
                    // Subrental with no equipment lines — use aggregate cost
                    subRentals.push({
                        desc: supplierName ? `Subaffitto ${supplierName}` : 'Subaffitto',
                        cost: sr.equipment_cost || 0,
                        supplier: supplierName,
                        qty: 1,
                        unitPrice: sr.equipment_cost || 0,
                        vatIncl: false,
                        rentmanId: sr.id || null,
                        _subrentalId: sr.id || null,
                    });
                }
            }
            console.log('[RentmanSync] Subrentals from new format:', subRentals.length, 'lines');
        }

        // ═══ COSTS: purchases and misc (+ legacy sub_rental fallback) ═══
        const purchases = [];
        const miscCosts = [];

        (costs || []).forEach(c => {
            const item = {
                desc: c.desc || '',
                cost: c.cost || 0,
                supplier: c.supplier || '',
                qty: c.quantity || 1,
                vatIncl: false,
                rentmanId: c.rentmanId,
                subprojectId: c.subprojectId || null,
                _remark: c.remark || '',
            };
            switch (c.category) {
                case 'sub_rental':
                    // Only use legacy sub_rental costs if no top-level subrentals data
                    if (!rawSubrentals || rawSubrentals.length === 0) {
                        subRentals.push(item);
                    }
                    break;
                case 'purchase':
                    purchases.push(item);
                    break;
                default:
                    miscCosts.push({ desc: c.desc || '', cost: c.cost || 0, qty: c.quantity || 1, supplier: c.supplier || '', rentmanId: c.rentmanId, subprojectId: c.subprojectId || null });
                    break;
            }
        });

        return {
            projectFields,
            equipmentItems,
            subRentals,
            purchases,
            miscCosts,
            subprojects: rawSubprojects || [],
            rentmanTotals: rentmanTotals || {},
            rentmanProject: project || {},
        };
    }, []);

    return {
        loading,
        error,
        projects,
        detail,
        fetchProjects,
        fetchDetail,
        mapToCalculator,
    };
}
