---
description: Crea una nuova sezione/tab nel Calculator con tabella dati, totali e formattazione Itinera standard
---

Workflow per aggiungere una nuova sezione al preventivatore Itinera Events.

Chiedi all'utente:

Nome della sezione (es. "Trasporti", "Personale", "Catering")
Quali colonne servono (es. descrizione, quantità, costo unitario, prezzo vendita)
Se la sezione ha dati da Rentman (sync) o solo input manuale

Cerca nel codebase se esiste già una sezione simile da usare come riferimento. Usa la sezione "Noleggi" o "Acquisti" come template base.
Crea il componente seguendo le convenzioni Itinera:

File: src/components/[NomeSezione]Section.jsx
Named export: export function [NomeSezione]Section({ ... })
Usa useMemo per tutti i calcoli derivati (totali, margini, subtotali)
Formatta importi con Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
Bordo verde (border-green-500) su tutti gli input di prezzo di vendita
Colori margine: verde >= 15%, arancione 0-14.9%, rosso < 0%

Gestisci i calcoli nel componente:

Totale costo = somma (qty × costo_unitario) per ogni riga
Totale vendita = somma (qty × prezzo_vendita) per ogni riga
Margine = ((vendita - costo) / vendita) × 100
SEMPRE gestire divisione per zero → ritorna 0
Arrotonda a 2 decimali dopo ogni operazione

Aggiungi la colonna subproject se la sezione ha dati sincronizzati:

Mostra il nome del sottoprogetto per ogni riga
Rispetta il flag in_financial nei calcoli totali

Integra nel layout principale:

Aggiungi il tab nel selettore sezioni
Passa i dati dal componente padre
Aggiorna i totali generali del progetto includendo la nuova sezione

Verifica mentale prima di completare:

Array vuoto → la tabella mostra "Nessun elemento" (non crash)
Valori null/undefined → mostra — o € 0,00
100+ righe → performance accettabile (useMemo)
Responsive su tablet (min-width dei campi)
