---
description: evisione pre-commit del codice. Controlla errori comuni, pattern vietati, e robustezza prima del deploy
---

Code Review Pre-Commit
Checklist sistematica prima di committare o deployare codice.

Identifica i file modificati tramite git diff --name-only o chiedi all'utente quali file ha modificato.
Per ogni file modificato, controlla i Pattern Vietati:

❌ any type in TypeScript
❌ var keyword
❌ window.print() per PDF
❌ Default exports (deve essere named export)
❌ CSS inline per layout (deve usare Tailwind)
❌ Mutazione diretta dello stato (state.push(), state[i] = ...)
❌ Indici array come key in .map() → deve usare ID univoco
❌ Chiamate Supabase fuori da /services
❌ console.log senza tag di contesto (deve essere console.log('[Modulo]', ...))
❌ Placeholder tipo // ... rest of code o // TODO senza ticket

Controlla l'error handling:

Ogni fetch, supabase.from(), e operazione async ha un try-catch?
I catch hanno messaggi contestuali (non solo console.error(e))?
Le funzioni restituiscono valori sensati in caso di errore (non undefined)?

Controlla i calcoli finanziari (se presenti):

Arrotondamento a 2 decimali dopo ogni operazione?
Gestione divisione per zero?
useMemo per calcoli derivati?

Controlla il sync Rentman (se il file tocca dati sincronizzati):

I campi Rentman sono read-only nel frontend?
I campi manuali sono preservati durante re-sync?
Il rentman_id è usato come chiave di riconciliazione?

Controlla l'UX:

Stati vuoti gestiti (array vuoto → messaggio, non crash)?
Loading states presenti per operazioni async?
Valori null → fallback visuale (— o € 0,00)?

Genera un summary:

N file controllati
N problemi trovati (per severità: critico/warning/info)
Lista azioni correttive ordinate per priorità
