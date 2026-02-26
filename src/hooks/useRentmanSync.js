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
        const { project, equipment, costs, rentmanTotals } = rentmanData;

        const projectFields = {};
        if (project) {
            if (project.projectName) projectFields.projectName = project.projectName;
            if (project.clientName) projectFields.clientName = project.clientName;
            if (project.eventDate) projectFields.eventDate = project.eventDate;
            if (project.revenueGross != null) projectFields.revenueGross = project.revenueGross;
            if (project.totalWorkDays != null) projectFields.totalWorkDays = project.totalWorkDays;
            if (project.projectNumber != null) projectFields.projectCode = String(project.projectNumber);
        }

        const equipmentItems = (equipment || []).map(e => ({
            desc: e.desc || '',
            qty: e.qty || 1,
            l: Math.round(((e.l || 0) / 100) * 100) / 100,
            w: Math.round(((e.w || 0) / 100) * 100) / 100,
            h: Math.round(((e.h || 0) / 100) * 100) / 100,
            weightKg: e.weightKg || 0,
            costUnit: e.costUnit || 0,
            owned: false,
            purchasePrice: 0,
            totalUses: 1,
            usesUsed: 0,
            _rentmanId: e.rentmanId,
            _group: e.group || '',
            _remarks: e.remarks || '',
        }));

        const subRentals = [];
        const purchases = [];
        const miscCosts = [];

        (costs || []).forEach(c => {
            const item = {
                desc: c.desc || '',
                cost: c.cost || 0,
                supplier: '',
                vatIncl: false,
                _rentmanId: c.rentmanId,
                _remark: c.remark || '',
            };
            switch (c.category) {
                case 'sub_rental':
                    subRentals.push(item);
                    break;
                case 'purchase':
                    purchases.push(item);
                    break;
                default:
                    miscCosts.push({ desc: c.desc || '', cost: c.cost || 0, _rentmanId: c.rentmanId });
                    break;
            }
        });

        return {
            projectFields,
            equipmentItems,
            subRentals,
            purchases,
            miscCosts,
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
