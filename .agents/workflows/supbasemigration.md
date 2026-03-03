---
description: Crea una migrazione Supabase seguendo le convenzioni del progetto Itinera (snake_case, FK, indici, RLS)
---

Workflow per creare migrazioni database sicure e consistenti.

Chiedi all'utente cosa serve:

Nuova tabella? Nuova colonna? Modifica esistente?
Quali campi e tipi di dato?
Relazioni con tabelle esistenti (projects, subprojects, equipment_items, cost_entries)?

Verifica lo schema attuale prima di scrivere SQL:

Controlla che la tabella target esista
Controlla che le colonne referenziate esistano
Controlla che non ci siano conflitti di nome

Scrivi la migrazione SQL seguendo le convenzioni Itinera:

Nomi tabelle e colonne: snake_case (es. equipment_items, cost_unit)
Primary key: id UUID DEFAULT gen_random_uuid() PRIMARY KEY
Timestamps: created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
Foreign keys: sempre con REFERENCES tabella(id) e ON DELETE appropriato
Colonne nullable per retrocompatibilità (non rompere dati esistenti)

Aggiungi indici per performance:

Indice su ogni foreign key (es. CREATE INDEX idx_items_project ON equipment_items(project_id))
Indice UNIQUE dove necessario (es. UNIQUE(project_id, rentman_id))

Verifica mentale prima di applicare:

La migrazione è retrocompatibile? (dati esistenti non si rompono?)
Le FK referenziano tabelle che esistono?
I DEFAULT sono sensati?
Serve un backfill per dati esistenti?

Mostra all'utente il SQL completo e chiedi conferma prima di applicare.
Dopo l'applicazione, verifica:

La migrazione è apparsa nella lista migrazioni
Le tabelle/colonne esistono con i tipi corretti
I dati esistenti sono intatti
