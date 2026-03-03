---
description: Debug e verifica del sync Rentman-Calculator. Controlla webhook, dati DB, e confronta con risposta n8n
---

Debug Sync Rentman
Questo workflow guida il debug sistematico di problemi di sincronizzazione tra Rentman e il Calculator.

Chiedi all'utente quale progetto Rentman ha problemi di sync (nome progetto o Rentman ID).
Controlla le notifiche pending nel database Supabase:

Tabella pending_sync_notifications
Filtra per acknowledged = false
Verifica che il webhook sia arrivato (se non ci sono record, il problema è nel webhook n8n, non nel frontend)

Verifica i dati equipment nel database:

Tabella equipment_items filtrata per project_id
Controlla i campi critici: description, qty, coefficient, cost_unit, supplier, rentman_id, subproject_id
Segnala eventuali valori NULL inattesi

Verifica i costi aggiuntivi nel database:

Tabella cost_entries filtrata per project_id
Controlla: description, quantity, cost_unit, rentman_id

Verifica i sottoprogetti nel database:

Tabella subprojects filtrata per project_id
Controlla: name, rentman_subproject_id, in_financial

Confronta il numero di items nel DB con quelli attesi da Rentman:

Se mancano items → problema nel workflow n8n (fetch o transform)
Se items presenti ma dati sbagliati → problema nel mapping dei campi
Se coefficient = NULL → verificare che il workflow faccia la chiamata a /factors

Genera un report con:

Stato webhook: ✅ ricevuto / ❌ non ricevuto
Equipment: N items (N con coefficiente, N con fornitore, N con sottoprogetto)
Costi: N items
Sottoprogetti: N totali (N in_financial = true)
Eventuali anomalie trovate

Suggerisci azioni correttive basate sulle anomalie trovate.
