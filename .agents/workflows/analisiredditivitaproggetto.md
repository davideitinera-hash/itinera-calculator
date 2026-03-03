---
description: Analisi redditività progetto. Estrae dati da Supabase, calcola margini per sezione e genera report
---

Workflow per analizzare la redditività complessiva di un progetto evento.

Chiedi all'utente il nome o ID del progetto da analizzare.
Estrai tutti i dati dal database Supabase:

projects → dati generali progetto (nome, codice commessa, cliente)
equipment_items → noleggi (con costo, coefficiente, prezzo vendita)
cost_entries → costi aggiuntivi / acquisti
subprojects → sottoprogetti e flag in_financial

Filtra per in_financial:

Identifica quali sottoprogetti sono inclusi nei calcoli finanziari
Separa items per sottoprogetto
Segnala items senza sottoprogetto assegnato

Calcola i margini per sezione:

Noleggi: Σ(qty × costo_unitario × coefficiente) vs Σ(qty × prezzo_vendita)
Acquisti/Costi: Σ(qty × costo_unitario) vs Σ(qty × prezzo_vendita)
Per ogni sezione: margine €, margine %, classificazione (🟢🟠🔴)

Calcola i margini per sottoprogetto:

Per ogni sottoprogetto con in_financial = true:

Totale costi (equipment + costs)
Totale vendite
Margine % e classificazione colore

Calcola i totali progetto:

Totale costi complessivo
Totale vendite complessivo
Margine complessivo € e %
Ricarico complessivo %

Genera il report in formato chiaro:

   📊 PROGETTO: [Nome] — [Codice Commessa]

   RIEPILOGO PER SEZIONE:

- Noleggi: Costo €X | Vendita €Y | Margine Z%
- Acquisti: Costo €X | Vendita €Y | Margine Z%

   RIEPILOGO PER SOTTOPROGETTO:

- [Nome SP1]: Costo €X | Vendita €Y | Margine Z%

   TOTALE PROGETTO: Costo €X | Vendita €Y | Margine Z% [🟢/🟠/🔴]

Segnala anomalie:

Righe con prezzo vendita = 0 (dimenticato?)
Sottoprogetti esclusi dai finanziari (conferma intenzionale?)
Margini negativi per sezione o sottoprogetto
Equipment senza coefficiente (possibile problema sync)
