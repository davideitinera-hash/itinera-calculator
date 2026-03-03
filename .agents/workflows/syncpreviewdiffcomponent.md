---
description: Crea o aggiorna il componente di preview/diff per il sync Rentman con confronto visuale prima dell'import
---

Sync Preview / Diff Component
Workflow per implementare l'anteprima visuale dei cambiamenti prima di importare dati da Rentman.

Identifica il tipo di dato da confrontare:

Equipment items (noleggi)
Cost entries (costi aggiuntivi / acquisti)
Subprojects (sottoprogetti)

Recupera i dati da confrontare:

Dati correnti: query Supabase per il project_id, filtrati per rentman_id IS NOT NULL
Dati nuovi: payload JSON dal webhook Rentman (passato come prop)

Calcola il diff per ogni item usando rentman_id come chiave:

🟢 Nuovi: item con rentman_id presente nei dati Rentman ma assente nel DB
🟡 Modificati: item con stesso rentman_id ma valori diversi (confronta campo per campo)
🔴 Rimossi: item con rentman_id nel DB ma assente nei dati Rentman
⚪ Invariati: item identici (non mostrare o mostrare in grigio)

Costruisci la tabella di preview:

Header: Descrizione | Qta | Costo Unit. | Coefficiente | Fornitore | Stato
Righe nuove: sfondo bg-green-50, badge "NUOVO" verde
Righe modificate: sfondo bg-yellow-50, badge "MODIFICATO" arancione

Mostra i valori cambiati con: vecchio (barrato) → nuovo (grassetto)

Righe rimosse: sfondo bg-red-50, badge "RIMOSSO" rosso, testo barrato
MAI modificare campi manuali (quelli senza rentman_id o marcati come manual)

Aggiungi i controlli:

Conteggio: "N nuovi, N modificati, N rimossi"
Bottone "Conferma Import" (verde, primario)
Bottone "Annulla" (grigio, secondario)
Checkbox opzionale: "Mostra anche invariati"

Implementa la logica di import al click di "Conferma":

Nuovi → INSERT in Supabase
Modificati → UPDATE solo campi Rentman (preserva campi manuali!)
Rimossi → marca come rimossi (soft delete) o rimuovi (chiedi all'utente)
Mostra progress bar durante l'operazione
Al termine: messaggio di successo con conteggio operazioni
