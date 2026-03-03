---
description: Aggiorna il nodo Code n8n per il sync Rentman. Guida step-by-step per modificare fetch, transform, e mapping
---

Workflow per modificare in sicurezza il nodo "Fetch & Transform Dettaglio" nel workflow n8n di sync.

Chiedi all'utente cosa deve cambiare:

Nuovo campo da Rentman? (es. nuovo attributo equipment)
Nuovo endpoint da chiamare? (es. /projects/{id}/subprojects)
Modifica al mapping esistente?
Nuovo tipo di dato nel response? (es. aggiungere subprojects[] al JSON)

Recupera il codice attuale del nodo Code:

Chiedi all'utente di copiare il codice corrente dal nodo n8n
Oppure cerca nei transcript precedenti l'ultima versione nota (attualmente v5.5)

Analizza la struttura esistente prima di modificare:

rentmanGet() helper function → come fa le chiamate API
Sezione fetch equipment: GET /projects/{id}/projectequipment?limit=500
Sezione fetch costs: GET /projects/{id}/costs?limit=200
Sezione transform/mapping → come costruisce il JSON di risposta
Header di sicurezza: verifica openapi nell'header (NON rentman)

Applica le modifiche seguendo questi principi:

Aggiungi nuove chiamate API DOPO quelle esistenti (non riordinare)
Rispetta il rate limit Rentman: max 10 req/sec, usa batch per contact resolution
Ogni nuova chiamata API deve avere try-catch individuale
Se la chiamata fallisce, logga l'errore ma NON bloccare l'intero workflow
Aggiungi il nuovo dato al JSON response mantenendo la struttura esistente

Verifica il JSON response finale:

Struttura attesa: { mode, project, equipment[], costs[], subprojects[] }
Ogni item equipment deve avere: rentmanId, desc, qty, costUnit, coefficient, supplier, subprojectId
Ogni item costs deve avere: rentmanId, desc, qty, costUnit, subprojectId
Nessun campo deve essere undefined (usa null come fallback)

Mostra all'utente il codice completo aggiornato con le differenze evidenziate.
Ricorda all'utente di:

Testare con il webhook Test URL prima di attivare in produzione
Verificare il response nel tab Output del nodo Code in n8n
Controllare che il Calculator riceva e visualizzi i nuovi dati
Aggiornare la versione del workflow (es. da v5.5 a v5.6)
