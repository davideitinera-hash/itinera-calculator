---
trigger: always_on
---

## 🛡️ 3. REGOLE CRITICHE DI UI/UX E REACT

- **MAI TESTO RAW NEI LAYOUT:** Non inserire mai lunghi testi descrittivi in formato testuale libero dentro griglie, flexbox o bottoni. Se serve spiegare qualcosa, usa ESCLUSIVAMENTE componenti isolati (es. `InfoTooltip` basato su React State) per non alterare le dimensioni degli elementi padre.
- **PROTEZIONE DEL DOM:** Quando crei menu a tendina, tooltip o popover, usa sempre `absolute`, z-index elevati (es. `z-[99999]`) e assicurati che i contenitori padre NON abbiano `overflow-hidden`. Preferisci il Conditional Rendering di React (`{isVisible && ...}`) rispetto al CSS per nascondere elementi complessi.
- **COSTI SCALARI (SCALAR COSTS):** Qualsiasi costo a livello di progetto (Ammortamento, PM, Logistica) DEVE usare il componente `<DebouncedInput>`. NON usare mai un `<input>` standard per evitare re-render a cascata e chiamate API inutili.

## 💾 4. REGOLE SUPABASE E DATABASE

- **MAPPING RIGOROSO:** Rispetta sempre il confine: il frontend React ragiona in `camelCase` (es. `costUnit`), il database Supabase ragiona rigorosamente in `snake_case` (es. `cost_unit`). Assicurati SEMPRE di mappare correttamente i campi nelle funzioni di `INSERT` e `UPDATE` per evitare "Silent Failures".
- **ISOLAMENTO SOTTOPROGETTI:** I costi generali di progetto (Scalari) vanno calcolati e sommati ESCLUSIVAMENTE nei totali grezzi (raw totals / `calcItems`) quando `selectedSubprojectId === null`. NON iniettarli mai negli array dei `visibleItems` delle viste specifiche dei sottoprogetti.
