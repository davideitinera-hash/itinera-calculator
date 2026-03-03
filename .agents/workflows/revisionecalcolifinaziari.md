---
description: Revisione dei calcoli finanziari nel file corrente. Verifica precisione, arrotondamenti, divisione per zero.
---

Audit sistematico dei calcoli monetari per prevenire errori di precisione.

Identifica tutti i calcoli nel file corrente o nel file indicato dall'utente:

Moltiplicazioni (qty × prezzo)
Somme/Subtotali
Percentuali e margini
Divisioni (attenzione: possibile divisione per zero)

Controlla la precisione float per ogni calcolo:

❌ ERRORE se: risultato usato direttamente senza arrotondamento
✅ OK se: Math.round(value * 100) / 100 applicato dopo ogni operazione
❌ ERRORE se: toFixed() usato per arrotondamento (restituisce string)
❌ ERRORE se: confronto === tra valori decimali

Controlla la divisione per zero su ogni calcolo percentuale:

Margine: (vendita - costo) / vendita → cosa succede se vendita = 0?
Ricarico: (vendita - costo) / costo → cosa succede se costo = 0?
Ogni divisione DEVE avere un guard: divisore === 0 ? 0 : risultato

Controlla la formattazione di ogni valore visualizzato:

Valuta → Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
Percentuali → max 1 decimale, con simbolo %
Mai visualizzare NaN, undefined, null → fallback a 0 o —

Controlla i useMemo:

Ogni calcolo derivato da array di dati DEVE essere in useMemo
Le dipendenze del useMemo sono corrette? (non mancano variabili?)

Genera un report con:

N calcoli trovati
N problemi di precisione float
N divisioni senza guard per zero
N valori non formattati correttamente
Codice correttivo per ogni problema trovato
