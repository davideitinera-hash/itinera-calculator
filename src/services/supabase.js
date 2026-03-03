/**
 * Centralized Supabase Service Layer
 * Regola #6: Tutte le query Supabase passano per /services/supabase.js
 */
import { supabase } from '../lib/supabaseClient';

// ═══ SUPPLIERS ═══

/**
 * Carica la lista dei fornitori attivi, ordinati per nome.
 * @returns {Promise<Array>} Lista fornitori [{id, name, category}] o array vuoto in caso di errore.
 */
export const fetchSuppliers = async () => {
    try {
        const { data, error } = await supabase
            .from('suppliers')
            .select('id, name, category')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('[Supabase Service] fetchSuppliers error:', error.message);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('[Supabase Service] fetchSuppliers unexpected error:', err);
        return [];
    }
};

/**
 * Aggiunge un nuovo fornitore al database.
 * @param {string} name - Nome del fornitore (minimo 5 caratteri, validato dal chiamante).
 * @param {string} [category='other'] - Categoria del fornitore.
 * @returns {Promise<Object|null>} Il fornitore creato {id, name, category} o null in caso di errore.
 */
export const addSupplier = async (name, category = 'other') => {
    try {
        const trimmed = (name || '').trim();
        if (!trimmed) {
            console.warn('[Supabase Service] addSupplier: nome vuoto, skip.');
            return null;
        }

        const { data, error } = await supabase
            .from('suppliers')
            .insert({ name: trimmed, category })
            .select('id, name, category')
            .single();

        if (error) {
            console.error('[Supabase Service] addSupplier error:', error.message);
            return null;
        }

        console.log('[Supabase Service] Fornitore aggiunto:', data.name);
        return data;
    } catch (err) {
        console.error('[Supabase Service] addSupplier unexpected error:', err);
        return null;
    }
};

// ═══ SYNC SUBPROJECTS ═══

/**
 * Sincronizza i sottoprogetti Rentman con Supabase via Bulk Upsert.
 * 1 SELECT + 1 UPSERT, indipendentemente dal numero di sottoprogetti.
 *
 * @param {string} projectId - UUID del progetto Supabase
 * @param {Array} rentmanSubprojects - Array subprojects[] dal webhook n8n
 * @returns {Promise<Object>} Mappa { rentmanSubprojectId: supabaseUUID }
 */
export const syncSubprojects = async (projectId, rentmanSubprojects) => {
    try {
        if (!projectId) {
            console.warn('[Sync Service] syncSubprojects: projectId mancante, skip.');
            return {};
        }
        if (!Array.isArray(rentmanSubprojects) || rentmanSubprojects.length === 0) {
            console.log('[Sync Service] syncSubprojects: nessun sottoprogetto da sincronizzare.');
            return {};
        }

        // 1. Scarica TUTTI i sottoprogetti esistenti per questo progetto (1 sola query)
        const { data: existingSp, error: fetchError } = await supabase
            .from('subprojects')
            .select('id, rentman_subproject_id')
            .eq('project_id', projectId);

        if (fetchError) throw fetchError;

        // 2. Prepara il payload per Bulk Upsert
        const existingList = existingSp || [];
        const upsertPayload = rentmanSubprojects.map((sp, index) => {
            const existing = existingList.find(
                e => e.rentman_subproject_id === sp.rentmanId
            );
            return {
                ...(existing ? { id: existing.id } : {}),
                project_id: projectId,
                rentman_subproject_id: sp.rentmanId,
                name: (sp.name || '').trim(),
                location: sp.location || null,
                in_financial: sp.inFinancial ?? true,
                sort_order: index,
                updated_at: new Date().toISOString(),
            };
        });

        // 3. Esegui Bulk Upsert (1 sola chiamata DB!)
        const { data: upsertedData, error: upsertError } = await supabase
            .from('subprojects')
            .upsert(upsertPayload, { onConflict: 'id' })
            .select('id, rentman_subproject_id');

        if (upsertError) throw upsertError;

        // 4. Costruisci e ritorna la mappa rentmanId → supabase UUID
        const subprojectMap = {};
        (upsertedData || []).forEach(sp => {
            subprojectMap[sp.rentman_subproject_id] = sp.id;
        });

        console.log(`[Sync Service] ✅ ${Object.keys(subprojectMap).length} sottoprogetti sincronizzati`);
        return subprojectMap;

    } catch (error) {
        console.error('[Sync Service] Errore in syncSubprojects:', error);
        throw error; // Propaga al chiamante per mostrare errore in UI
    }
};
