---
description: Debug problemi di importazione PDF preventivi. Analizza parsing, mapping colonne, e valori estratti
---

Workflow per diagnosticare e risolvere problemi nell'importazione di preventivi da file PDF.

Chiedi all'utente:

Quale PDF causa problemi? (chiedi di caricarlo o descrivere il contenuto)
Che tipo di errore vede? (nessun dato importato, dati sbagliati, crash, colonne invertite)
Il PDF è generato da Rentman, da un fornitore, o manualmente?

Analizza il file pdfParser.js (in src/utils/):

Come viene inizializzato pdfjs-dist?
Il worker CDN è configurato correttamente?
Come viene estratto il testo dalle pagine?
Come vengono identificate le righe della tabella?

Identifica il pattern di parsing:

Il parser cerca separatori specifici (tab, spazi multipli, pipe)?
Come distingue header da dati?
Come mappa le colonne (posizione fissa? regex? keyword matching?)

Testa il parsing sul PDF problematico:

Estrai il testo raw da ogni pagina
Logga ogni riga estratta con console.log('[PDF Parser] Row:', row)
Identifica dove il parsing fallisce (riga specifica? formato numerico? caratteri speciali?)

Problemi comuni e soluzioni:

Numeri italiani (1.234,56): il parser gestisce virgola come decimale?
Colonne non allineate: il PDF ha colonne con larghezze variabili?
Righe multi-linea: una descrizione va a capo e viene trattata come 2 righe?
Pagine multiple: il parser itera su tutte le pagine o solo la prima?
Header ripetuto: nelle pagine successive l'header della tabella viene reimportato come dato?

Applica fix seguendo il principio Best-Effort:

Se una riga fallisce il parsing, skippa e continua con le successive
Logga le righe skippate per debugging
Al termine dell'import, mostra: "Importate N righe su M totali. K righe ignorate."

Verifica il risultato dopo il fix:

I numeri sono corretti (non invertiti migliaia/decimali)?
Le quantità sono numeri interi dove atteso?
I costi unitari hanno 2 decimali?
La somma dei totali riga corrisponde al totale del PDF?
