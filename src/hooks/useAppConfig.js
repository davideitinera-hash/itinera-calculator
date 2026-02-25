import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAppConfig() {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('app_config').select('*');
        if (!error && data) {
            const cfg = {};
            data.forEach(row => { cfg[row.category] = row.config; });
            setConfig(cfg);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const saveCategory = useCallback(async (category, newConfig) => {
        setSaving(true);
        setConfig(prev => ({ ...prev, [category]: newConfig }));
        const { error } = await supabase.from('app_config').update({ config: newConfig }).eq('category', category);
        if (error) {
            console.error('Errore salvataggio:', error);
            await loadConfig();
        }
        setSaving(false);
        return !error;
    }, [loadConfig]);

    return { config, loading, saving, saveCategory, reload: loadConfig };
}
