import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppConfig } from '../hooks/useAppConfig';
import { supabase } from '../lib/supabaseClient';
import { useResponsive } from '../hooks/useResponsive';
import Breadcrumb from './Breadcrumb';

//  UI Components 
const Card = ({ title, desc, children }) => (
  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1B3A5C' }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{desc}</div>}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
    {children}
  </div>
);
const Input = ({ value, onChange, type = 'text', placeholder = '', style = {} }) => (
  <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} placeholder={placeholder}
    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', ...style }} />
);
const ColorInput = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} style={{ width: 36, height: 36, border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
    <Input value={value} onChange={onChange} placeholder="#1B3A5C" style={{ width: 120 }} />
  </div>
);
const Btn = ({ children, onClick, color = '#2E86AB', small = false, disabled = false }) => (
  <button onClick={onClick} disabled={disabled} style={{ background: disabled ? '#cbd5e1' : color, color: '#fff', border: 'none', borderRadius: 6, padding: small ? '5px 12px' : '8px 16px', fontSize: small ? 11 : 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer' }}>{children}</button>
);
const DangerBtn = ({ children, onClick, small = true }) => <Btn onClick={onClick} color="#ef4444" small={small}>{children}</Btn>;
const SaveIndicator = ({ saving }) => saving ? <span style={{ fontSize: 11, color: '#2E86AB', fontWeight: 600 }}>Salvataggio...</span> : null;
const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
    <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? '#2E86AB' : '#cbd5e1', cursor: 'pointer', padding: 2, transition: 'background 0.2s' }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'transform 0.2s', transform: value ? 'translateX(18px)' : 'translateX(0)' }} />
    </div>
    <span style={{ fontSize: 12, color: '#475569' }}>{label}</span>
  </div>
);

function GeneralSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Card title="Generali" desc="Nome azienda, colori, valuta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Nome Azienda"><Input value={form.companyName} onChange={v => set('companyName', v)} /></Field>
        <Field label="Valuta"><Input value={form.currency} onChange={v => set('currency', v)} /></Field>
        <Field label="Simbolo Valuta"><Input value={form.currencySymbol} onChange={v => set('currencySymbol', v)} /></Field>
        <Field label="Lingua"><Input value={form.language} onChange={v => set('language', v)} /></Field>
        <Field label="Colore Primario"><ColorInput value={form.primaryColor} onChange={v => set('primaryColor', v)} /></Field>
        <Field label="Colore Accento"><ColorInput value={form.accentColor} onChange={v => set('accentColor', v)} /></Field>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={() => onSave('general', form)}>Salva Generali</Btn><SaveIndicator saving={saving} />
      </div>
    </Card>
  );
}

function FuelSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <Card title="Carburante" desc="Prezzo gasolio per calcolo trasporto">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Prezzo Diesel (euro/litro)"><Input type="number" value={form.dieselPricePerLiter} onChange={v => setForm(p => ({ ...p, dieselPricePerLiter: v }))} /></Field>
        <Field label="Ultimo Aggiornamento"><Input type="date" value={form.lastUpdated} onChange={v => setForm(p => ({ ...p, lastUpdated: v }))} /></Field>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={() => onSave('fuel', form)}>Salva Carburante</Btn><SaveIndicator saving={saving} />
      </div>
    </Card>
  );
}

function EditableListSection({ title, desc, category, data, onSave, saving, columns, newItem }) {
  const [items, setItems] = useState(data?.items || []);
  useEffect(() => { if (data?.items) setItems(data.items); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const updateItem = (idx, field, val) => setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const addItem = () => setItems(prev => [...prev, { ...newItem }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const moveItem = (idx, dir) => { const arr = [...items]; const t = idx + dir; if (t < 0 || t >= arr.length) return;[arr[idx], arr[t]] = [arr[t], arr[idx]]; setItems(arr); };
  return (
    <Card title={title} desc={desc}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>#</th>
            {columns.map(col => <th key={col.key} style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>{col.label}</th>)}
            <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontSize: 10 }}>Azioni</th>
          </tr></thead>
          <tbody>{items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '6px 8px', color: '#94a3b8', fontSize: 11 }}>{idx + 1}</td>
              {columns.map(col => <td key={col.key} style={{ padding: '4px 6px' }}>
                {col.type === 'color' ? <ColorInput value={item[col.key]} onChange={v => updateItem(idx, col.key, v)} /> :
                  col.type === 'checkbox' ? <input type="checkbox" checked={!!item[col.key]} onChange={e => updateItem(idx, col.key, e.target.checked)} /> :
                    <Input type={col.type || 'text'} value={item[col.key]} onChange={v => updateItem(idx, col.key, v)} placeholder={col.placeholder || ''} style={{ fontSize: 12, padding: '6px 8px' }} />}
              </td>)}
              <td style={{ padding: '4px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: idx === 0 ? 0.3 : 1 }}></button>
                <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: idx === items.length - 1 ? 0.3 : 1 }}></button>
                <DangerBtn onClick={() => removeItem(idx)}></DangerBtn>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={addItem} color="#16a34a" small>+ Aggiungi</Btn>
        <Btn onClick={() => onSave(category, { ...data, items })}>Salva {title}</Btn>
        <SaveIndicator saving={saving} />
      </div>
    </Card>
  );
}

function OvertimeSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Card title="Moltiplicatori Ore" desc="Coefficienti per straordinario, festivo, notturno">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
        <Field label="Ordinario"><Input type="number" value={form.ordinario} onChange={v => set('ordinario', v)} /></Field>
        <Field label="Straordinario"><Input type="number" value={form.straordinario} onChange={v => set('straordinario', v)} /></Field>
        <Field label="Festivo"><Input type="number" value={form.festivo} onChange={v => set('festivo', v)} /></Field>
        <Field label="Notturno"><Input type="number" value={form.notturno} onChange={v => set('notturno', v)} /></Field>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={() => onSave('overtime', form)}>Salva Moltiplicatori</Btn><SaveIndicator saving={saving} />
      </div>
    </Card>
  );
}

function DefaultsSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const fields = [
    { key: 'whCount', label: 'Magazzinieri (n)' }, { key: 'whRate', label: 'Costo/ora Magazzino' },
    { key: 'whHLoad', label: 'Ore Carico' }, { key: 'whHUnload', label: 'Ore Scarico' },
    { key: 'planHours', label: 'Ore Pianificazione' }, { key: 'planRate', label: 'Costo/ora Pianificazione' },
    { key: 'mealCost', label: 'Costo Pasto' }, { key: 'mealsDay', label: 'Pasti/Giorno' },
    { key: 'workDays', label: 'Giorni Lavoro' }, { key: 'hotelNights', label: 'Notti Hotel' },
    { key: 'hotelCost', label: 'Costo Hotel/Notte' }, { key: 'contingencyPct', label: 'Contingency %' },
    { key: 'paymentDays', label: 'Giorni Pagamento' }, { key: 'interestRate', label: 'Tasso Interesse %' },
    { key: 'totalWorkDays', label: 'Giorni Lavoro Totali' },
  ];
  return (
    <Card title="Valori Predefiniti" desc="Default per nuovi progetti">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {fields.map(f => <Field key={f.key} label={f.label}><Input type="number" value={form[f.key]} onChange={v => set(f.key, v)} /></Field>)}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={() => onSave('defaults', form)}>Salva Default</Btn><SaveIndicator saving={saving} />
      </div>
    </Card>
  );
}

function StaffRolesSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || { internal: [], external: [] });
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const updateRole = (type, idx, field, val) => setForm(prev => ({ ...prev, [type]: prev[type].map((r, i) => i === idx ? { ...r, [field]: field === 'defaultRate' ? Number(val) : val } : r) }));
  const addRole = (type) => setForm(prev => ({ ...prev, [type]: [...prev[type], { role: '', defaultRate: 15 }] }));
  const removeRole = (type, idx) => setForm(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  const renderRoleTable = (type, label) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>{label}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}>
          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>Ruolo</th>
          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>Tariffa Default</th>
          <th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontSize: 10 }}>Azioni</th>
        </tr></thead>
        <tbody>{(form[type] || []).map((r, idx) => (
          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '4px 6px' }}><Input value={r.role} onChange={v => updateRole(type, idx, 'role', v)} style={{ fontSize: 12, padding: '6px 8px' }} /></td>
            <td style={{ padding: '4px 6px' }}><Input type="number" value={r.defaultRate} onChange={v => updateRole(type, idx, 'defaultRate', v)} style={{ fontSize: 12, padding: '6px 8px', width: 100 }} /></td>
            <td style={{ padding: '4px 6px', textAlign: 'center' }}><DangerBtn onClick={() => removeRole(type, idx)}>✕</DangerBtn></td>
          </tr>
        ))}</tbody>
      </table>
      <Btn onClick={() => addRole(type)} color="#16a34a" small>+ Aggiungi</Btn>
    </div>
  );
  return (
    <Card title="Ruoli Personale" desc="Ruoli e tariffe per staff interno ed esterno">
      {renderRoleTable('internal', 'Staff Interno')}
      {renderRoleTable('external', 'Staff Esterno')}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn onClick={() => onSave('staffRoles', form)}>Salva Ruoli</Btn><SaveIndicator saving={saving} />
      </div>
    </Card>
  );
}

function SuppliersSection() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [actionMsg, setActionMsg] = useState('');
  const [form, setForm] = useState({
    name: '', category: 'other', contact_person: '', email: '', phone: '',
    website: '', address: '', vat_number: '', payment_terms: '', rating: 3,
    notes: '', specializations: [], is_active: true,
  });
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState({ transactions: [], events: [], summary: null });
  const [detailLoading, setDetailLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');

  const CATEGORIES = [
    { value: 'rental', label: 'Noleggio' },
    { value: 'catering', label: 'Catering' },
    { value: 'transport', label: 'Trasporti' },
    { value: 'staffing', label: 'Personale' },
    { value: 'floral', label: 'Floreale' },
    { value: 'lighting', label: 'Illuminazione' },
    { value: 'audio_video', label: 'Audio/Video' },
    { value: 'print', label: 'Stampa' },
    { value: 'venue', label: 'Location' },
    { value: 'other', label: 'Altro' },
  ];

  const loadSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('name');
    if (data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => { loadSuppliers(); }, []);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };
  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({ name: '', category: 'other', contact_person: '', email: '', phone: '', website: '', address: '', vat_number: '', payment_terms: '', rating: 3, notes: '', specializations: [], is_active: true });
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (s) => {
    setForm({
      name: s.name || '', category: s.category || 'other', contact_person: s.contact_person || '',
      email: s.email || '', phone: s.phone || '', website: s.website || '', address: s.address || '',
      vat_number: s.vat_number || '', payment_terms: s.payment_terms || '', rating: s.rating || 3,
      notes: s.notes || '', specializations: s.specializations || [], is_active: s.is_active !== false,
    });
    setEditId(s.id);
    setShowForm(true);
  };

  const saveSupplier = async () => {
    if (!form.name.trim()) { showMsg('Il nome e obbligatorio'); return; }
    try {
      if (editId) {
        const { error } = await supabase.from('suppliers').update({
          name: form.name, category: form.category, contact_person: form.contact_person,
          email: form.email, phone: form.phone, website: form.website, address: form.address,
          vat_number: form.vat_number, payment_terms: form.payment_terms, rating: form.rating,
          notes: form.notes, specializations: form.specializations, is_active: form.is_active,
        }).eq('id', editId);
        if (error) throw error;
        showMsg('Fornitore aggiornato');
      } else {
        const { error } = await supabase.from('suppliers').insert({
          name: form.name, category: form.category, contact_person: form.contact_person,
          email: form.email, phone: form.phone, website: form.website, address: form.address,
          vat_number: form.vat_number, payment_terms: form.payment_terms, rating: form.rating,
          notes: form.notes, specializations: form.specializations, is_active: form.is_active,
        });
        if (error) throw error;
        showMsg('Fornitore creato');
      }
      resetForm();
      loadSuppliers();
    } catch (err) {
      showMsg('Errore: ' + (err.message || err));
    }
  };

  const deleteSupplier = async (id) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setConfirmDelete(null);
      showMsg('Fornitore eliminato');
      loadSuppliers();
    } catch (err) {
      showMsg('Errore eliminazione: ' + (err.message || err));
    }
  };

  const loadDetail = async (supplier) => {
    setDetailId(supplier.id);
    setTxSearch('');
    setDetailLoading(true);
    try {
      const name = supplier.name;
      const [txRes, evRes, sumRes] = await Promise.all([
        supabase.from('supplier_transactions').select('*').ilike('supplier', name).order('event_date', { ascending: false }),
        supabase.from('supplier_events').select('*').ilike('supplier', name).order('event_date', { ascending: false }),
        supabase.from('supplier_summary').select('*').ilike('supplier', name).single(),
      ]);
      setDetail({
        transactions: txRes.data || [],
        events: evRes.data || [],
        summary: sumRes.data || null,
      });
    } catch (err) {
      console.error('[Suppliers] Detail load error:', err);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => { setDetailId(null); setDetail({ transactions: [], events: [], summary: null }); };

  const filtered = suppliers.filter(s => {
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.contact_person || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const catLabel = (v) => CATEGORIES.find(c => c.value === v)?.label || v;

  return (
    <Card title="Fornitori" desc="Gestione anagrafica fornitori e partner">
      {actionMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#16a34a', marginBottom: 12, fontWeight: 600 }}>{actionMsg}</div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Btn onClick={() => { resetForm(); setShowForm(true); }} color="#16a34a">+ Nuovo Fornitore</Btn>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome o contatto..."
          style={{ flex: 1, minWidth: 180, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}>
          <option value="all">Tutte le categorie</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 12 }}>{editId ? 'Modifica Fornitore' : 'Nuovo Fornitore'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Nome *"><Input value={form.name} onChange={v => updateField('name', v)} placeholder="Nome azienda" /></Field>
            <Field label="Categoria">
              <select value={form.category} onChange={e => updateField('category', e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Contatto"><Input value={form.contact_person} onChange={v => updateField('contact_person', v)} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={v => updateField('email', v)} /></Field>
            <Field label="Telefono"><Input value={form.phone} onChange={v => updateField('phone', v)} /></Field>
            <Field label="Sito Web"><Input value={form.website} onChange={v => updateField('website', v)} /></Field>
            <Field label="Indirizzo"><Input value={form.address} onChange={v => updateField('address', v)} /></Field>
            <Field label="P.IVA"><Input value={form.vat_number} onChange={v => updateField('vat_number', v)} /></Field>
            <Field label="Condizioni Pagamento"><Input value={form.payment_terms} onChange={v => updateField('payment_terms', v)} placeholder="es. 30gg DFFM" /></Field>
            <Field label="Rating">
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => updateField('rating', n)}
                    style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: n <= form.rating ? '#f59e0b' : '#e2e8f0' }}>★</button>
                ))}
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{form.rating}/5</span>
              </div>
            </Field>
            <Field label="Attivo">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => updateField('is_active', e.target.checked)} />
                Fornitore attivo
              </label>
            </Field>
          </div>
          <Field label="Note">
            <textarea value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={2}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </Field>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Btn onClick={saveSupplier}>{editId ? 'Aggiorna' : 'Crea Fornitore'}</Btn>
            <Btn onClick={resetForm} color="#64748b">Annulla</Btn>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Caricamento...</div> : filtered.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, padding: 20, textAlign: 'center' }}>
          {suppliers.length === 0 ? 'Nessun fornitore. Clicca "+ Nuovo Fornitore" per iniziare.' : 'Nessun risultato con i filtri attuali.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Nome</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Categoria</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Contatto</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Email / Tel</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Rating</th>
                <th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Stato</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>{filtered.map(s => (
              <tr key={s.id} onClick={() => loadDetail(s)} style={{ borderBottom: '1px solid #f1f5f9', opacity: s.is_active === false ? 0.5 : 1, cursor: 'pointer', background: detailId === s.id ? '#f0f7ff' : 'transparent' }}>
                <td style={{ padding: '8px', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ background: '#eff6ff', color: '#2E86AB', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{catLabel(s.category)}</span>
                </td>
                <td style={{ padding: '8px', color: '#475569' }}>{s.contact_person || '—'}</td>
                <td style={{ padding: '8px', color: '#475569' }}>
                  <div>{s.email || '—'}</div>
                  {s.phone && <div style={{ fontSize: 10, color: '#94a3b8' }}>{s.phone}</div>}
                </td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#f59e0b', fontSize: 14, letterSpacing: 1 }}>{stars(s.rating || 0)}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <span style={{ background: s.is_active !== false ? '#dcfce7' : '#fef2f2', color: s.is_active !== false ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                    {s.is_active !== false ? 'Attivo' : 'Inattivo'}
                  </span>
                </td>
                <td style={{ padding: '8px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(s)}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: '#2E86AB' }}>Modifica</button>
                    <button onClick={() => setConfirmDelete(s.id)}
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>Elimina</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {detailId && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1B3A5C' }}>
              {suppliers.find(s => s.id === detailId)?.name || '—'} — Scheda Fornitore
            </div>
            <button onClick={closeDetail} style={{ background: '#e2e8f0', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 11, cursor: 'pointer', color: '#64748b' }}>Chiudi</button>
          </div>

          {detailLoading ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Caricamento dati...</div> : (
            <>
              {detail.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Spesa Totale', value: (detail.summary.total_spend || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }), color: '#dc2626' },
                    { label: 'N. Ordini', value: detail.summary.total_items || 0, color: '#2E86AB' },
                    { label: 'Eventi Serviti', value: detail.summary.total_events || 0, color: '#7c3aed' },
                    { label: 'Ordine Medio', value: (detail.summary.avg_order_value || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }), color: '#f59e0b' },
                  ].map((kpi, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>{kpi.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: kpi.color, marginTop: 4 }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {detail.events.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Breakdown per Evento</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {detail.events.map((ev, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: '#1B3A5C' }}>{ev.project_name}</div>
                        <div style={{ color: '#64748b' }}>{ev.client_name} — {ev.event_date ? new Date(ev.event_date).toLocaleDateString('it-IT') : '—'}</div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontWeight: 700, color: '#dc2626' }}>{(ev.event_spend || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</span>
                          <span style={{ color: '#94a3b8', marginLeft: 6 }}>({ev.items} voci)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {detail.transactions.length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Storico Transazioni</div>
                  <input value={txSearch || ''} onChange={e => setTxSearch(e.target.value)} placeholder="Cerca per descrizione, evento, stand, codice commessa..."
                    style={{ width: '100%', padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, marginBottom: 8 }} />
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Evento</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Commessa</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Stand</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Descrizione</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Tipo</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Qty</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Costo Unit.</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Totale</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 9, textTransform: 'uppercase' }}>Data</th>
                        </tr>
                      </thead>
                      <tbody>{detail.transactions.filter(t => {
                        if (!txSearch) return true;
                        const s = txSearch.toLowerCase();
                        return (t.description || '').toLowerCase().includes(s) ||
                          (t.project_name || '').toLowerCase().includes(s) ||
                          (t.stand_name || '').toLowerCase().includes(s) ||
                          (t.project_code || '').toLowerCase().includes(s) ||
                          (t.category || '').toLowerCase().includes(s);
                      }).map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{t.project_name}</td>
                          <td style={{ padding: '6px 8px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>{t.project_code || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{t.stand_name || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{t.description || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <span style={{ background: t.source === 'equipment' ? '#eff6ff' : '#fef3c7', color: t.source === 'equipment' ? '#2E86AB' : '#d97706', padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600 }}>
                              {t.source === 'equipment' ? 'Materiale' : 'Costo'}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{t.quantity || 1}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(t.unit_cost || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{(t.total_cost || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</td>
                          <td style={{ padding: '6px 8px', color: '#94a3b8' }}>{t.event_date ? new Date(t.event_date).toLocaleDateString('it-IT') : '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}

              {detail.transactions.length === 0 && !detailLoading && (
                <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>Nessuna transazione trovata per questo fornitore.</div>
              )}
            </>
          )}
        </div>
      )}

      {confirmDelete && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Conferma eliminazione di: {suppliers.find(s => s.id === confirmDelete)?.name || '—'}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Questa azione e irreversibile.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => deleteSupplier(confirmDelete)} color="#dc2626">Conferma Eliminazione</Btn>
            <Btn onClick={() => setConfirmDelete(null)} color="#64748b">Annulla</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

function PricingSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || { markupRules: [], seasonalRules: [], volumeDiscounts: [], applyMarkupAuto: false, applySeasonalAuto: false, applyVolumeAuto: false });
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const updateArr = (arrKey, idx, field, val) => setForm(prev => ({ ...prev, [arrKey]: prev[arrKey].map((item, i) => i === idx ? { ...item, [field]: val } : item) }));
  const removeArr = (arrKey, idx) => setForm(prev => ({ ...prev, [arrKey]: prev[arrKey].filter((_, i) => i !== idx) }));
  return (
    <Card title="Listino Prezzi / Markup" desc="Regole di pricing per tipo evento, stagione, volume">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Markup per Tipo Evento</div>
        <Toggle value={form.applyMarkupAuto} onChange={v => setForm(p => ({ ...p, applyMarkupAuto: v }))} label="Applica automaticamente" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>TIPO EVENTO</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>MARKUP %</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ETICHETTA</th><th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10 }}></th></tr></thead>
          <tbody>{(form.markupRules || []).map((r, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '4px 6px' }}><Input value={r.eventType} onChange={v => updateArr('markupRules', idx, 'eventType', v)} style={{ fontSize: 12 }} /></td><td style={{ padding: '4px 6px' }}><Input type="number" value={r.markupPct} onChange={v => updateArr('markupRules', idx, 'markupPct', v)} style={{ fontSize: 12, width: 80 }} /></td><td style={{ padding: '4px 6px' }}><Input value={r.label} onChange={v => updateArr('markupRules', idx, 'label', v)} style={{ fontSize: 12 }} /></td><td style={{ textAlign: 'center' }}><DangerBtn onClick={() => removeArr('markupRules', idx)}></DangerBtn></td></tr>))}</tbody>
        </table>
        <Btn onClick={() => setForm(p => ({ ...p, markupRules: [...p.markupRules, { eventType: '', markupPct: 0, label: '' }] }))} color="#16a34a" small>+ Regola</Btn>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Stagionalita</div>
        <Toggle value={form.applySeasonalAuto} onChange={v => setForm(p => ({ ...p, applySeasonalAuto: v }))} label="Applica automaticamente" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>NOME</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>MESI (es: 5,6,7)</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ADJUST %</th><th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10 }}></th></tr></thead>
          <tbody>{(form.seasonalRules || []).map((r, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '4px 6px' }}><Input value={r.name} onChange={v => updateArr('seasonalRules', idx, 'name', v)} style={{ fontSize: 12 }} /></td><td style={{ padding: '4px 6px' }}><Input value={(r.months || []).join(',')} onChange={v => updateArr('seasonalRules', idx, 'months', v.split(',').map(Number).filter(n => !isNaN(n)))} style={{ fontSize: 12 }} /></td><td style={{ padding: '4px 6px' }}><Input type="number" value={r.adjustPct} onChange={v => updateArr('seasonalRules', idx, 'adjustPct', v)} style={{ fontSize: 12, width: 80 }} /></td><td style={{ textAlign: 'center' }}><DangerBtn onClick={() => removeArr('seasonalRules', idx)}></DangerBtn></td></tr>))}</tbody>
        </table>
        <Btn onClick={() => setForm(p => ({ ...p, seasonalRules: [...p.seasonalRules, { name: '', months: [], adjustPct: 0 }] }))} color="#16a34a" small>+ Stagione</Btn>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Sconti Volume</div>
        <Toggle value={form.applyVolumeAuto} onChange={v => setForm(p => ({ ...p, applyVolumeAuto: v }))} label="Applica automaticamente" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>DA</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>A</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>SCONTO %</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ETICHETTA</th><th style={{ textAlign: 'center', fontSize: 10 }}></th></tr></thead>
          <tbody>{(form.volumeDiscounts || []).map((r, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '4px 6px' }}><Input type="number" value={r.minAmount} onChange={v => updateArr('volumeDiscounts', idx, 'minAmount', v)} style={{ fontSize: 12, width: 80 }} /></td><td style={{ padding: '4px 6px' }}><Input type="number" value={r.maxAmount} onChange={v => updateArr('volumeDiscounts', idx, 'maxAmount', v)} style={{ fontSize: 12, width: 80 }} /></td><td style={{ padding: '4px 6px' }}><Input type="number" value={r.discountPct} onChange={v => updateArr('volumeDiscounts', idx, 'discountPct', v)} style={{ fontSize: 12, width: 80 }} /></td><td style={{ padding: '4px 6px' }}><Input value={r.label} onChange={v => updateArr('volumeDiscounts', idx, 'label', v)} style={{ fontSize: 12 }} /></td><td style={{ textAlign: 'center' }}><DangerBtn onClick={() => removeArr('volumeDiscounts', idx)}></DangerBtn></td></tr>))}</tbody>
        </table>
        <Btn onClick={() => setForm(p => ({ ...p, volumeDiscounts: [...p.volumeDiscounts, { minAmount: 0, maxAmount: 0, discountPct: 0, label: '' }] }))} color="#16a34a" small>+ Fascia</Btn>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Btn onClick={() => onSave('pricing', form)}>Salva Listino</Btn><SaveIndicator saving={saving} /></div>
    </Card>
  );
}

function CustomFieldsSection() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ field_name: '', field_label: '', field_type: 'text', entity_type: 'project', options: [], default_value: '', is_required: false });
  const [optionsText, setOptionsText] = useState('');
  const loadFields = async () => { setLoading(true); const { data } = await supabase.from('custom_fields').select('*').order('sort_order'); if (data) setFields(data); setLoading(false); };
  useEffect(() => { loadFields(); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const saveField = async () => { if (!form.field_name || !form.field_label) return; const toSave = { ...form, options: form.field_type === 'select' ? optionsText.split('\n').filter(Boolean).map(o => o.trim()) : [] }; await supabase.from('custom_fields').insert(toSave); setForm({ field_name: '', field_label: '', field_type: 'text', entity_type: 'project', options: [], default_value: '', is_required: false }); setOptionsText(''); setShowAdd(false); loadFields(); };
  const deleteField = async (id) => { if (!window.confirm('Eliminare questo campo?')) return; await supabase.from('custom_fields').delete().eq('id', id); loadFields(); };
  const toggleActive = async (id, current) => { await supabase.from('custom_fields').update({ is_active: !current }).eq('id', id); loadFields(); };
  const TYPE_LABELS = { text: 'Testo', number: 'Numero', date: 'Data', select: 'Dropdown', checkbox: 'Checkbox', link: 'Link', textarea: 'Testo lungo', email: 'Email', phone: 'Telefono', currency: 'Valuta' };
  const ENTITY_LABELS = { project: 'Progetto', supplier: 'Fornitore', equipment: 'Attrezzatura' };
  return (
    <Card title="Campi Personalizzati" desc="Crea campi custom - testo, numeri, dropdown, date...">
      <Btn onClick={() => setShowAdd(true)} color="#16a34a">+ Nuovo Campo</Btn>
      {showAdd && (<div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Nome interno"><Input value={form.field_name} onChange={v => set('field_name', v)} placeholder="nome_snake_case" /></Field>
          <Field label="Etichetta"><Input value={form.field_label} onChange={v => set('field_label', v)} placeholder="Etichetta visibile" /></Field>
          <Field label="Tipo campo"><select value={form.field_type} onChange={e => set('field_type', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Entita"><select value={form.entity_type} onChange={e => set('entity_type', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>{Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Valore default"><Input value={form.default_value} onChange={v => set('default_value', v)} /></Field>
          <Field label="Obbligatorio"><Toggle value={form.is_required} onChange={v => set('is_required', v)} label="Richiesto" /></Field>
        </div>
        {form.field_type === 'select' && <Field label="Opzioni (una per riga)"><textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={4} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} /></Field>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><Btn onClick={saveField}>Crea Campo</Btn><Btn onClick={() => setShowAdd(false)} color="#64748b">Annulla</Btn></div>
      </div>)}
      {loading ? <div style={{ color: '#94a3b8', marginTop: 12 }}>Caricamento...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 16 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ETICHETTA</th><th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>NOME</th><th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>TIPO</th><th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ENTITA</th><th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10 }}>STATO</th><th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10 }}>AZIONI</th></tr></thead>
          <tbody>{fields.map(f => (<tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: f.is_active ? 1 : 0.5 }}><td style={{ padding: '8px', fontWeight: 600 }}>{f.field_label}</td><td style={{ padding: '8px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{f.field_name}</td><td style={{ padding: '8px' }}>{TYPE_LABELS[f.field_type] || f.field_type}</td><td style={{ padding: '8px' }}>{ENTITY_LABELS[f.entity_type] || f.entity_type}</td><td style={{ padding: '8px', textAlign: 'center' }}><span onClick={() => toggleActive(f.id, f.is_active)} style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: f.is_active ? '#dcfce7' : '#fef2f2', color: f.is_active ? '#16a34a' : '#dc2626' }}>{f.is_active ? 'Attivo' : 'Off'}</span></td><td style={{ padding: '8px', textAlign: 'center' }}><button onClick={() => deleteField(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}></button></td></tr>))}</tbody>
        </table>
      )}
    </Card>
  );
}

function CalculationsSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const setNested = (path, val) => { setForm(prev => { const c = JSON.parse(JSON.stringify(prev)); const k = path.split('.'); let o = c; for (let i = 0; i < k.length - 1; i++) { if (!o[k[i]]) o[k[i]] = {}; o = o[k[i]]; } o[k[k.length - 1]] = val; return c; }); };
  return (
    <Card title="Formule e Calcoli" desc="Personalizza ammortamenti, overhead, contingency">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Ammortamento</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Metodo"><select value={form.depreciation?.method} onChange={e => setNested('depreciation.method', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}><option value="usage">Per utilizzo</option><option value="linear">Lineare</option><option value="mixed">Misto</option></select></Field>
          <Field label="Anni (se lineare)"><Input type="number" value={form.depreciation?.linearYears} onChange={v => setNested('depreciation.linearYears', v)} /></Field>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Overhead</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Metodo"><select value={form.overheadAllocation?.method} onChange={e => setNested('overheadAllocation.method', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}><option value="percentage">% fatturato</option><option value="fixed">Fisso</option></select></Field>
          <Field label="% fatturato"><Input type="number" value={form.overheadAllocation?.percentageOfRevenue} onChange={v => setNested('overheadAllocation.percentageOfRevenue', v)} /></Field>
          <Field label="Fisso per evento"><Input type="number" value={form.overheadAllocation?.fixedAmountPerEvent} onChange={v => setNested('overheadAllocation.fixedAmountPerEvent', v)} /></Field>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Trasporto</div>
        <Field label="Calcolo km"><select value={form.transportCalculation?.method} onChange={e => setNested('transportCalculation.method', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, maxWidth: 300 }}><option value="oneway">Solo andata</option><option value="roundtrip">Andata e ritorno (x2)</option></select></Field>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Contributi Staff</div>
        <Toggle value={form.staffCalculation?.includeContributions} onChange={v => setNested('staffCalculation.includeContributions', v)} label="Includi contributi su staff interno" />
        {form.staffCalculation?.includeContributions && <Field label="% Contributi"><Input type="number" value={form.staffCalculation?.contributionPct} onChange={v => setNested('staffCalculation.contributionPct', v)} style={{ maxWidth: 120 }} /></Field>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Btn onClick={() => onSave('calculations', form)}>Salva Formule</Btn><SaveIndicator saving={saving} /></div>
    </Card>
  );
}

function AlertsSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || { rules: [] });
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const updateRule = (idx, field, val) => setForm(prev => ({ ...prev, rules: prev.rules.map((r, i) => i === idx ? { ...r, [field]: val } : r) }));
  const addRule = () => setForm(prev => ({ ...prev, rules: [...prev.rules, { id: 'new_' + Date.now(), label: '', condition: 'marginPct', operator: '<', value: 0, severity: 'warning', message: '', enabled: true }] }));
  const removeRule = (idx) => setForm(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== idx) }));
  const SEV_COLORS = { danger: '#ef4444', warning: '#f59e0b', success: '#16a34a', info: '#3b82f6' };
  return (
    <Card title="Notifiche e Alert" desc="Soglie configurabili per avvisi automatici">
      {(form.rules || []).map((r, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <Toggle value={r.enabled} onChange={v => updateRule(idx, 'enabled', v)} label="" />
          <Input value={r.label} onChange={v => updateRule(idx, 'label', v)} placeholder="Nome" style={{ width: 120, fontSize: 12 }} />
          <select value={r.condition} onChange={e => updateRule(idx, 'condition', e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11 }}><option value="marginPct">Margine %</option><option value="contingencyPct">Contingency %</option><option value="transportPctOfRevenue">Trasporto %</option><option value="staffPctOfRevenue">Staff %</option></select>
          <select value={r.operator} onChange={e => updateRule(idx, 'operator', e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, width: 50 }}><option value="<">&lt;</option><option value=">">&gt;</option><option value="=">=</option></select>
          <Input type="number" value={r.value} onChange={v => updateRule(idx, 'value', v)} style={{ width: 60, fontSize: 12 }} />
          <select value={r.severity} onChange={e => updateRule(idx, 'severity', e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, color: SEV_COLORS[r.severity] }}><option value="danger">Critico</option><option value="warning">Avviso</option><option value="success">Positivo</option><option value="info">Info</option></select>
          <Input value={r.message} onChange={v => updateRule(idx, 'message', v)} placeholder="Messaggio..." style={{ flex: 1, fontSize: 12, minWidth: 120 }} />
          <DangerBtn onClick={() => removeRule(idx)}></DangerBtn>
        </div>
      ))}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}><Btn onClick={addRule} color="#16a34a" small>+ Regola</Btn><Btn onClick={() => onSave('alerts', form)}>Salva Alert</Btn><SaveIndicator saving={saving} /></div>
    </Card>
  );
}

function TaxSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const setNested = (path, val) => { setForm(prev => { const c = JSON.parse(JSON.stringify(prev)); const k = path.split('.'); let o = c; for (let i = 0; i < k.length - 1; i++) { if (!o[k[i]]) o[k[i]] = {}; o = o[k[i]]; } o[k[k.length - 1]] = val; return c; }); };
  const updateVat = (idx, field, val) => setForm(prev => ({ ...prev, vatRates: prev.vatRates.map((r, i) => i === idx ? { ...r, [field]: val } : r) }));
  return (
    <Card title="Tasse e Fiscalita" desc="IVA, ritenute, reverse charge, split payment">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Aliquote IVA</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '2px solid #e2e8f0' }}><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ALIQUOTA %</th><th style={{ padding: '6px 8px', textAlign: 'left', color: '#64748b', fontSize: 10 }}>ETICHETTA</th><th style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b', fontSize: 10 }}>DEFAULT</th></tr></thead>
          <tbody>{(form.vatRates || []).map((r, idx) => (<tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '4px 6px' }}><Input type="number" value={r.value} onChange={v => updateVat(idx, 'value', v)} style={{ width: 80, fontSize: 12 }} /></td><td style={{ padding: '4px 6px' }}><Input value={r.label} onChange={v => updateVat(idx, 'label', v)} style={{ fontSize: 12 }} /></td><td style={{ padding: '4px 6px', textAlign: 'center' }}><input type="radio" checked={r.isDefault} onChange={() => setForm(prev => ({ ...prev, vatRates: prev.vatRates.map((vr, i) => ({ ...vr, isDefault: i === idx })) }))} /></td></tr>))}</tbody>
        </table>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div><Toggle value={form.withholdingTax?.enabled} onChange={v => setNested('withholdingTax.enabled', v)} label="Ritenuta su esterni" />{form.withholdingTax?.enabled && <Field label="Aliquota %"><Input type="number" value={form.withholdingTax?.rate} onChange={v => setNested('withholdingTax.rate', v)} style={{ width: 80 }} /></Field>}</div>
        <div><Toggle value={form.reverseCharge?.enabled} onChange={v => setNested('reverseCharge.enabled', v)} label="Reverse Charge (UE)" /></div>
        <div><Toggle value={form.splitPayment?.enabled} onChange={v => setNested('splitPayment.enabled', v)} label="Split Payment (PA)" /></div>
        <div><Toggle value={form.stampDuty?.enabled} onChange={v => setNested('stampDuty.enabled', v)} label="Marca da Bollo" />{form.stampDuty?.enabled && <div style={{ display: 'flex', gap: 8 }}><Field label="Soglia"><Input type="number" value={form.stampDuty?.threshold} onChange={v => setNested('stampDuty.threshold', v)} style={{ width: 80 }} /></Field><Field label="Importo"><Input type="number" value={form.stampDuty?.amount} onChange={v => setNested('stampDuty.amount', v)} style={{ width: 80 }} /></Field></div>}</div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}><Btn onClick={() => onSave('tax', form)}>Salva Tasse</Btn><SaveIndicator saving={saving} /></div>
    </Card>
  );
}

function BrandingSection({ config, onSave }) {
  const cat = config?.branding || {};
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    logo: cat.logo || '',
    companyFullName: cat.companyFullName || '',
    tagline: cat.tagline || '',
    website: cat.website || '',
    email: cat.email || '',
    phone: cat.phone || '',
    pec: cat.pec || '',
    vatNumber: cat.vatNumber || '',
    fiscalCode: cat.fiscalCode || '',
    sdi: cat.sdi || '',
    registeredOffice: cat.registeredOffice || '',
    operationalOffice: cat.operationalOffice || '',
    iban: cat.iban || '',
    swift: cat.swift || '',
    bankName: cat.bankName || '',
    pdfHeaderColor: cat.pdfHeaderColor || '#1B3A5C',
    pdfAccentColor: cat.pdfAccentColor || '#2E86AB',
    pdfFooterText: cat.pdfFooterText || '',
    pdfWatermark: cat.pdfWatermark || false,
    pdfWatermarkText: cat.pdfWatermarkText || 'BOZZA',
    quoteLegalNotes: cat.quoteLegalNotes || '',
    quotePaymentTerms: cat.quotePaymentTerms || '',
  });

  const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const uploadLogo = async (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Il file non deve superare 2MB'); return; }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      alert('Formato non supportato. Usa PNG, JPG, SVG o WebP');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true, cacheControl: '0' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(path);
      const urlWithCacheBust = publicUrl + '?v=' + Date.now();
      updateField('logo', urlWithCacheBust);
    } catch (err) {
      alert('Errore upload: ' + (err.message || err));
    }
    setUploading(false);
  };

  const removeLogo = async () => {
    try {
      const files = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.svg', 'logo.webp'];
      await supabase.storage.from('branding').remove(files);
      updateField('logo', '');
    } catch (err) {
      console.error('[Branding] Remove logo error:', err);
    }
  };

  const handleSave = () => {
    onSave('branding', form);
  };

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginTop: 20, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>{children}</div>
  );

  const Row = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>{children}</div>
  );

  return (
    <Card title="Branding / Azienda" desc="Logo, dati aziendali e personalizzazione PDF">
      <SectionTitle>Logo Aziendale</SectionTitle>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 120, height: 120, border: '2px dashed #e2e8f0', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8fafc', overflow: 'hidden', flexShrink: 0,
        }}>
          {form.logo ? (
            <img src={form.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>Nessun logo</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{
            display: 'inline-block', background: '#2E86AB', color: '#fff', padding: '6px 14px',
            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {uploading ? 'Caricamento...' : 'Carica Logo'}
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={e => uploadLogo(e.target.files[0])} style={{ display: 'none' }} />
          </label>
          {form.logo && (
            <button onClick={removeLogo} style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6,
              padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#dc2626',
            }}>Rimuovi Logo</button>
          )}
          <span style={{ fontSize: 10, color: '#94a3b8' }}>PNG, JPG, SVG o WebP. Max 2MB.</span>
        </div>
      </div>

      <SectionTitle>Dati Aziendali</SectionTitle>
      <Row>
        <Field label="Ragione Sociale"><Input value={form.companyFullName} onChange={v => updateField('companyFullName', v)} placeholder="Itinera Pro S.r.l." /></Field>
        <Field label="Tagline"><Input value={form.tagline} onChange={v => updateField('tagline', v)} placeholder="Event Production & Design" /></Field>
      </Row>
      <Row>
        <Field label="Sito Web"><Input value={form.website} onChange={v => updateField('website', v)} placeholder="www.itinerapro.com" /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={v => updateField('email', v)} placeholder="info@itinerapro.com" /></Field>
      </Row>
      <Row>
        <Field label="Telefono"><Input value={form.phone} onChange={v => updateField('phone', v)} placeholder="+39 ..." /></Field>
        <Field label="PEC"><Input value={form.pec} onChange={v => updateField('pec', v)} placeholder="itinera@pec.it" /></Field>
      </Row>
      <Row>
        <Field label="P.IVA"><Input value={form.vatNumber} onChange={v => updateField('vatNumber', v)} placeholder="IT12345678901" /></Field>
        <Field label="Codice Fiscale"><Input value={form.fiscalCode} onChange={v => updateField('fiscalCode', v)} /></Field>
      </Row>
      <Row>
        <Field label="Codice SDI"><Input value={form.sdi} onChange={v => updateField('sdi', v)} placeholder="XXXXXXX" /></Field>
        <div></div>
      </Row>
      <Row>
        <Field label="Sede Legale"><Input value={form.registeredOffice} onChange={v => updateField('registeredOffice', v)} /></Field>
        <Field label="Sede Operativa"><Input value={form.operationalOffice} onChange={v => updateField('operationalOffice', v)} /></Field>
      </Row>

      <SectionTitle>Coordinate Bancarie</SectionTitle>
      <Row>
        <Field label="IBAN"><Input value={form.iban} onChange={v => updateField('iban', v)} placeholder="IT..." /></Field>
        <Field label="SWIFT/BIC"><Input value={form.swift} onChange={v => updateField('swift', v)} /></Field>
      </Row>
      <Row>
        <Field label="Banca"><Input value={form.bankName} onChange={v => updateField('bankName', v)} /></Field>
        <div></div>
      </Row>

      <SectionTitle>Personalizzazione PDF</SectionTitle>
      <Row>
        <Field label="Colore Header PDF">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={form.pdfHeaderColor} onChange={e => updateField('pdfHeaderColor', e.target.value)}
              style={{ width: 36, height: 30, border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer' }} />
            <Input value={form.pdfHeaderColor} onChange={v => updateField('pdfHeaderColor', v)} />
          </div>
        </Field>
        <Field label="Colore Accento PDF">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="color" value={form.pdfAccentColor} onChange={e => updateField('pdfAccentColor', e.target.value)}
              style={{ width: 36, height: 30, border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer' }} />
            <Input value={form.pdfAccentColor} onChange={v => updateField('pdfAccentColor', v)} />
          </div>
        </Field>
      </Row>
      <Field label="Testo Footer PDF"><Input value={form.pdfFooterText} onChange={v => updateField('pdfFooterText', v)} /></Field>
      <Row>
        <Field label="Watermark">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={form.pdfWatermark} onChange={e => updateField('pdfWatermark', e.target.checked)} />
            Mostra watermark sulle bozze
          </label>
        </Field>
        <Field label="Testo Watermark"><Input value={form.pdfWatermarkText} onChange={v => updateField('pdfWatermarkText', v)} placeholder="BOZZA" /></Field>
      </Row>

      <SectionTitle>Testi Preventivo</SectionTitle>
      <Field label="Note Legali Preventivo">
        <textarea value={form.quoteLegalNotes} onChange={e => updateField('quoteLegalNotes', e.target.value)}
          rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </Field>
      <Field label="Condizioni di Pagamento">
        <textarea value={form.quotePaymentTerms} onChange={e => updateField('quotePaymentTerms', e.target.value)}
          rows={2} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </Field>

      <div style={{ marginTop: 20 }}>
        <Btn onClick={handleSave} color="#16a34a">Salva Branding</Btn>
      </div>
    </Card>
  );
}


function UnitsSection({ data, onSave, saving }) {
  const [form, setForm] = useState(data || {});
  useEffect(() => { if (data) setForm(data); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Card title="Unita di Misura e Formati" desc="Sistema metrico, formato numeri, data, valuta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Sistema"><select value={form.system} onChange={e => set('system', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}><option value="metric">Metrico</option><option value="imperial">Imperiale</option></select></Field>
        <Field label="Formato Data"><select value={form.dateFormat} onChange={e => set('dateFormat', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}><option value="DD/MM/YYYY">GG/MM/AAAA</option><option value="MM/DD/YYYY">MM/GG/AAAA</option><option value="YYYY-MM-DD">AAAA-MM-GG</option></select></Field>
        <Field label="Formato Ora"><select value={form.timeFormat} onChange={e => set('timeFormat', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}><option value="24h">24 ore</option><option value="12h">12 ore (AM/PM)</option></select></Field>
        <Field label="Sep. Decimale"><Input value={form.decimalSeparator} onChange={v => set('decimalSeparator', v)} style={{ width: 60 }} /></Field>
        <Field label="Sep. Migliaia"><Input value={form.thousandSeparator} onChange={v => set('thousandSeparator', v)} style={{ width: 60 }} /></Field>
        <Field label="Decimali"><Input type="number" value={form.numberDecimals} onChange={v => set('numberDecimals', v)} style={{ width: 60 }} /></Field>
        <Field label="Posizione Valuta"><select value={form.currencyPosition} onChange={e => set('currencyPosition', e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}><option value="before">Prima</option><option value="after">Dopo</option></select></Field>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}><Btn onClick={() => onSave('units', form)}>Salva Formati</Btn><SaveIndicator saving={saving} /></div>
    </Card>
  );
}

function AuditLogSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter !== 'all') query = query.eq('action', filter);
    if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);

    const { data } = await query;
    if (data) setLogs(data);
    setLoading(false);
  }, [page, filter, entityFilter]);

  useEffect(() => { loadLogs(); }, [loadLogs]); // eslint-disable-line react-hooks/set-state-in-effect

  const ACTION_BADGE = {
    INSERT: { bg: '#dcfce7', color: '#16a34a', label: 'Creato' },
    UPDATE: { bg: '#fef3c7', color: '#d97706', label: 'Modificato' },
    DELETE: { bg: '#fef2f2', color: '#dc2626', label: 'Eliminato' },
  };

  const ENTITY_LABELS = {
    projects: 'Progetto',
    subprojects: 'Sottoprogetto',
    equipment_items: 'Materiale',
    cost_entries: 'Costo Extra',
    staff_entries: 'Personale',
    transport_legs: 'Trasporto',
    profiles: 'Utente',
    suppliers: 'Fornitore',
    app_config: 'Configurazione',
  };

  const formatDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('it-IT') + ' ' + dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card title="Audit Log" desc="Cronologia delle modifiche al sistema">
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Azione:</span>
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
            <option value="all">Tutte</option>
            <option value="INSERT">Creazioni</option>
            <option value="UPDATE">Modifiche</option>
            <option value="DELETE">Eliminazioni</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Entita:</span>
          <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(0); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
            <option value="all">Tutte</option>
            <option value="projects">Progetti</option>
            <option value="subprojects">Sottoprogetti</option>
            <option value="equipment_items">Materiali</option>
            <option value="cost_entries">Costi Extra</option>
            <option value="staff_entries">Personale</option>
            <option value="transport_legs">Trasporti</option>
            <option value="profiles">Utenti</option>
            <option value="suppliers">Fornitori</option>
            <option value="app_config">Configurazione</option>
          </select>
        </div>
        <button onClick={() => { setFilter('all'); setEntityFilter('all'); setPage(0); }}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: 'pointer', background: '#f8fafc', color: '#64748b' }}>
          Reset filtri
        </button>
      </div>

      {loading ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Caricamento...</div> : logs.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, padding: 20, textAlign: 'center' }}>Nessun evento trovato</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Data</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Utente</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Azione</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Elemento</th>
              </tr>
            </thead>
            <tbody>{logs.map(l => {
              const badge = ACTION_BADGE[l.action] || { bg: '#f1f5f9', color: '#333', label: l.action };
              return (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', color: '#64748b', whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{l.user_name || '—'}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '8px', color: '#475569' }}>{ENTITY_LABELS[l.entity_type] || l.entity_type}</td>
                  <td style={{ padding: '8px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.entity_name || '—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
          style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: page === 0 ? 'default' : 'pointer', background: page === 0 ? '#f8fafc' : '#fff', color: page === 0 ? '#cbd5e1' : '#2E86AB' }}>
          Precedente
        </button>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Pagina {page + 1}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={logs.length < PAGE_SIZE}
          style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, cursor: logs.length < PAGE_SIZE ? 'default' : 'pointer', background: logs.length < PAGE_SIZE ? '#f8fafc' : '#fff', color: logs.length < PAGE_SIZE ? '#cbd5e1' : '#2E86AB' }}>
          Successiva
        </button>
      </div>
    </Card>
  );
}

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [resetPwUser, setResetPwUser] = useState(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const showMsg = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sessione scaduta. Effettua di nuovo il login.');
    return session;
  };

  const updateRole = async (userId, role) => {
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', userId);
    if (err) { showMsg('Errore aggiornamento ruolo'); return; }
    showMsg('Ruolo aggiornato');
    loadUsers();
  };

  const updateName = async (userId, name) => {
    await supabase.from('profiles').update({ full_name: name }).eq('id', userId);
  };

  const createUser = async () => {
    if (!newEmail || !newPassword || newPassword.length < 6) {
      setError('Email e password (min 6 caratteri) obbligatori');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const session = await getSession();
      const response = await fetch(
        'https://vzuxutnrslptszqsxtbv.supabase.co/functions/v1/create-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            full_name: newName || newEmail.split('@')[0],
            role: newRole,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Errore nella creazione utente');
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('editor'); setShowAdd(false);
      showMsg(result.message || 'Utente creato con successo');
      setTimeout(loadUsers, 500);
    } catch (err) {
      setError(err.message || 'Errore nella creazione utente');
    }
    setCreating(false);
  };

  const deleteUser = async (userId) => {
    try {
      const session = await getSession();
      const response = await fetch(
        'https://vzuxutnrslptszqsxtbv.supabase.co/functions/v1/manage-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'delete', user_id: userId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Errore eliminazione');
      setConfirmDelete(null);
      showMsg('Utente eliminato');
      loadUsers();
    } catch (err) {
      showMsg(err.message || 'Errore eliminazione');
    }
  };

  const resetPassword = async (userId) => {
    if (!resetPwValue || resetPwValue.length < 6) {
      showMsg('La password deve avere almeno 6 caratteri');
      return;
    }
    try {
      const session = await getSession();
      const response = await fetch(
        'https://vzuxutnrslptszqsxtbv.supabase.co/functions/v1/manage-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'reset_password', user_id: userId, new_password: resetPwValue }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Errore reset password');
      setResetPwUser(null);
      setResetPwValue('');
      showMsg('Password aggiornata');
    } catch (err) {
      showMsg(err.message || 'Errore reset password');
    }
  };

  const ROLE_COLORS = { admin: '#dc2626', editor: '#2E86AB', viewer: '#64748b' };

  return (
    <Card title="Gestione Utenti" desc="Aggiungi utenti e gestisci ruoli">
      {actionMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#16a34a', marginBottom: 12, fontWeight: 600 }}>{actionMsg}</div>
      )}

      {!showAdd ? (
        <div style={{ marginBottom: 16 }}>
          <Btn onClick={() => setShowAdd(true)} color="#16a34a">+ Aggiungi Utente</Btn>
        </div>
      ) : (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 12 }}>Nuovo Utente</div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Nome"><Input value={newName} onChange={v => setNewName(v)} placeholder="Mario Rossi" /></Field>
            <Field label="Email *"><Input type="email" value={newEmail} onChange={v => setNewEmail(v)} placeholder="mario@itinerapro.com" /></Field>
            <Field label="Password *"><Input type="password" value={newPassword} onChange={v => setNewPassword(v)} placeholder="Minimo 6 caratteri" /></Field>
            <Field label="Ruolo">
              <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Btn onClick={createUser} disabled={creating}>{creating ? 'Creazione...' : 'Crea Utente'}</Btn>
            <Btn onClick={() => { setShowAdd(false); setError(''); }} color="#64748b">Annulla</Btn>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>L'utente ricevera un'email di conferma prima di poter accedere.</div>
        </div>
      )}

      {loading ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Caricamento...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Nome</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Ruolo</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Data</th>
              <th style={{ padding: '8px', textAlign: 'right', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>{users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px' }}>
                <input value={u.full_name || ''} onChange={e => { const v = e.target.value; setUsers(p => p.map(x => x.id === u.id ? { ...x, full_name: v } : x)); }}
                  onBlur={() => updateName(u.id, u.full_name)}
                  style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 600, width: '100%', boxSizing: 'border-box' }} />
              </td>
              <td style={{ padding: '8px' }}>
                <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: ROLE_COLORS[u.role] || '#333', cursor: 'pointer' }}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td style={{ padding: '8px', color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString('it-IT')}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setResetPwUser(u.id); setResetPwValue(''); }}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: '#2E86AB' }}
                    title="Reset password">Password</button>
                  <button onClick={() => setConfirmDelete(u.id)}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}
                    title="Elimina utente">Elimina</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}

      {resetPwUser && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1B3A5C', marginBottom: 8 }}>Reset Password per: {users.find(u => u.id === resetPwUser)?.full_name || '—'}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="password" value={resetPwValue} onChange={e => setResetPwValue(e.target.value)} placeholder="Nuova password (min 6 caratteri)"
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} />
            <Btn onClick={() => resetPassword(resetPwUser)}>Salva</Btn>
            <Btn onClick={() => { setResetPwUser(null); setResetPwValue(''); }} color="#64748b">Annulla</Btn>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Conferma eliminazione di: {users.find(u => u.id === confirmDelete)?.full_name || '—'}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Questa azione e' irreversibile. L'utente non potra' piu' accedere.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={() => deleteUser(confirmDelete)} color="#dc2626">Conferma Eliminazione</Btn>
            <Btn onClick={() => setConfirmDelete(null)} color="#64748b">Annulla</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

function CostCategoriesSection({ config, onSave }) {
  const cats = config?.costCategories?.items || [];
  const [items, setItems] = useState(cats);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ label: '', value: '', icon: '', color: '#6b7280', hasVat: false, hasSupplier: false });

  useEffect(() => { setItems(config?.costCategories?.items || []); }, [config]); // eslint-disable-line react-hooks/set-state-in-effect

  const updateField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const openEdit = (idx) => {
    setEditIdx(idx);
    setForm({ ...items[idx] });
  };

  const openNew = () => {
    setEditIdx('new');
    setForm({ label: '', value: '', icon: '📦', color: '#6b7280', hasVat: false, hasSupplier: false });
  };

  const saveItem = () => {
    if (!form.label.trim()) return;
    const val = form.value || form.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const item = { ...form, value: val };
    let newItems;
    if (editIdx === 'new') {
      newItems = [...items, item];
    } else {
      newItems = items.map((it, i) => i === editIdx ? item : it);
    }
    setItems(newItems);
    setEditIdx(null);
    onSave('costCategories', { items: newItems });
  };

  const removeItem = (idx) => {
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
    onSave('costCategories', { items: newItems });
  };

  const moveItem = (idx, dir) => {
    const newItems = [...items];
    const target = idx + dir;
    if (target < 0 || target >= newItems.length) return;
    [newItems[idx], newItems[target]] = [newItems[target], newItems[idx]];
    setItems(newItems);
    onSave('costCategories', { items: newItems });
  };

  const ICONS = ['🏗️', '🛒', '📊', '⚠️', '📎', '🍽️', '🎵', '💐', '🚛', '💡', '🎨', '📦', '🔧', '🎪', '📋', '🏠', '🔌', '🖨️'];

  return (
    <Card title="Categorie Costo" desc="Gestisci le categorie per i costi extra dei progetti">
      <div style={{ marginBottom: 16 }}>
        <Btn onClick={openNew} color="#16a34a">+ Nuova Categoria</Btn>
      </div>

      {editIdx !== null && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A5C', marginBottom: 12 }}>{editIdx === 'new' ? 'Nuova Categoria' : 'Modifica Categoria'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Nome *"><Input value={form.label} onChange={v => updateField('label', v)} placeholder="es. Catering" /></Field>
            <Field label="Codice (auto)"><Input value={form.value} onChange={v => updateField('value', v)} placeholder="auto-generato" /></Field>
            <Field label="Colore">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color} onChange={e => updateField('color', e.target.value)} style={{ width: 36, height: 30, border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer' }} />
                <Input value={form.color} onChange={v => updateField('color', v)} />
              </div>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 8 }}>
            <Field label="Icona">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ICONS.map(ic => (
                  <button key={ic} onClick={() => updateField('icon', ic)}
                    style={{ fontSize: 18, background: form.icon === ic ? '#dbeafe' : 'transparent', border: form.icon === ic ? '2px solid #2E86AB' : '1px solid #e2e8f0', borderRadius: 6, width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ic}</button>
                ))}
              </div>
            </Field>
            <Field label="Opzioni">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>
                <input type="checkbox" checked={form.hasVat} onChange={e => updateField('hasVat', e.target.checked)} /> Gestisce IVA
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={form.hasSupplier} onChange={e => updateField('hasSupplier', e.target.checked)} /> Ha fornitore
              </label>
            </Field>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Btn onClick={saveItem}>{editIdx === 'new' ? 'Aggiungi' : 'Aggiorna'}</Btn>
            <Btn onClick={() => setEditIdx(null)} color="#64748b">Annulla</Btn>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>Nessuna categoria. Clicca "+ Nuova Categoria".</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10, textTransform: 'uppercase', width: 40 }}>Ord.</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Categoria</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Codice</th>
              <th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>IVA</th>
              <th style={{ padding: '8px', textAlign: 'center', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Fornitore</th>
              <th style={{ padding: '8px', textAlign: 'right', color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Azioni</th>
            </tr>
          </thead>
          <tbody>{items.map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{ border: 'none', background: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#e2e8f0' : '#94a3b8', fontSize: 10 }}>▲</button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} style={{ border: 'none', background: 'none', cursor: i === items.length - 1 ? 'default' : 'pointer', color: i === items.length - 1 ? '#e2e8f0' : '#94a3b8', fontSize: 10 }}>▼</button>
                </div>
              </td>
              <td style={{ padding: '8px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{it.icon}</span>
                  <span style={{ fontWeight: 600, color: it.color || '#333' }}>{it.label}</span>
                </span>
              </td>
              <td style={{ padding: '8px', color: '#94a3b8', fontFamily: 'monospace', fontSize: 11 }}>{it.value}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{it.hasVat ? '✅' : '—'}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{it.hasSupplier ? '✅' : '—'}</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => openEdit(i)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: '#2E86AB' }}>Modifica</button>
                  <button onClick={() => removeItem(i)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>Elimina</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Card>
  );
}

const SECTIONS = [
  { id: 'general', label: 'Generali' },
  { id: 'fuel', label: 'Carburante' },
  { id: 'routes', label: 'Percorsi' },
  { id: 'vehicles', label: 'Veicoli' },
  { id: 'overtime', label: 'Ore/Turni' },
  { id: 'eventTypes', label: 'Tipi Evento' },
  { id: 'statuses', label: 'Stati Progetto' },
  { id: 'defaults', label: 'Valori Default' },
  { id: 'staffRoles', label: 'Ruoli Staff' },
  { id: 'divider1', label: '--- Avanzate ---', divider: true },
  { id: 'costCategories', label: 'Categorie Costo' },
  { id: 'suppliers', label: 'Fornitori' },
  { id: 'pricing', label: 'Listino/Markup' },
  { id: 'customFields', label: 'Campi Custom' },
  { id: 'calculations', label: 'Formule Calcolo' },
  { id: 'alerts', label: 'Alert e Soglie' },
  { id: 'tax', label: 'Tasse/Fiscalita' },
  { id: 'divider2', label: '--- Sistema ---', divider: true },
  { id: 'branding', label: 'Branding/Azienda' },
  { id: 'units', label: 'Unita/Formati' },
  { id: 'users', label: 'Utenti' },
  { id: 'audit', label: 'Audit Log' },
];

export default function SettingsPage({ onBack }) {
  const { profile } = useAuth();
  const { config, loading, saving, saveCategory } = useAppConfig();
  const { isMobile, isTablet } = useResponsive();
  const [activeSection, setActiveSection] = useState('general');
  const [saveMsg, setSaveMsg] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleSave = async (category, data) => {
    const ok = await saveCategory(category, data);
    setSaveMsg(ok ? 'Salvato!' : 'Errore');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  if (profile?.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}></div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1B3A5C' }}>Accesso Negato</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Solo admin.</div>
          <button onClick={onBack} style={{ marginTop: 16, padding: '8px 20px', background: '#2E86AB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Torna ai progetti</button>
        </div>
      </div>
    );
  }
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}><div style={{ fontSize: 13, color: '#94a3b8' }}>Caricamento impostazioni...</div></div>;

  const renderSection = () => {
    switch (activeSection) {
      case 'general': return <GeneralSection data={config.general} onSave={handleSave} saving={saving} />;
      case 'fuel': return <FuelSection data={config.fuel} onSave={handleSave} saving={saving} />;
      case 'routes': return <EditableListSection title="Percorsi" desc="Rotte predefinite per il trasporto" category="routes" data={config.routes} onSave={handleSave} saving={saving} columns={[{ key: 'name', label: 'Nome Percorso' }, { key: 'km', label: 'Km', type: 'number' }, { key: 'tolls', label: 'Pedaggi', type: 'number' }]} newItem={{ name: 'Nuovo Percorso', km: 0, tolls: 0 }} />;
      case 'vehicles': return <EditableListSection title="Veicoli" desc="Tipi di veicolo" category="vehicles" data={config.vehicles} onSave={handleSave} saving={saving} columns={[{ key: 'name', label: 'Nome' }, { key: 'cons', label: 'Consumo L/100km', type: 'number' }, { key: 'vol', label: 'Volume m3', type: 'number' }, { key: 'payload', label: 'Portata kg', type: 'number' }]} newItem={{ name: 'Nuovo Veicolo', cons: 10, vol: 10, payload: 1000 }} />;
      case 'overtime': return <OvertimeSection data={config.overtime} onSave={handleSave} saving={saving} />;
      case 'eventTypes': return <EditableListSection title="Tipi Evento" desc="Categorie progetti" category="eventTypes" data={config.eventTypes} onSave={handleSave} saving={saving} columns={[{ key: 'icon', label: 'Icona' }, { key: 'value', label: 'Codice' }, { key: 'label', label: 'Etichetta' }]} newItem={{ icon: '', value: 'NewType', label: 'Nuovo Tipo' }} />;
      case 'statuses': return <EditableListSection title="Stati Progetto" desc="Stati e colori" category="projectStatuses" data={config.projectStatuses} onSave={handleSave} saving={saving} columns={[{ key: 'value', label: 'Codice' }, { key: 'label', label: 'Etichetta' }, { key: 'bgColor', label: 'Sfondo', type: 'color' }, { key: 'textColor', label: 'Testo', type: 'color' }]} newItem={{ value: 'new', label: 'Nuovo', bgColor: '#f1f5f9', textColor: '#475569' }} />;
      case 'defaults': return <DefaultsSection data={config.defaults} onSave={handleSave} saving={saving} />;
      case 'staffRoles': return <StaffRolesSection data={config.staffRoles} onSave={handleSave} saving={saving} />;
      case 'costCategories': return <CostCategoriesSection config={config} onSave={handleSave} />;
      case 'suppliers': return <SuppliersSection supplierCategories={config.supplierCategories} />;
      case 'pricing': return <PricingSection data={config.pricing} onSave={handleSave} saving={saving} />;
      case 'customFields': return <CustomFieldsSection />;
      case 'calculations': return <CalculationsSection data={config.calculations} onSave={handleSave} saving={saving} />;
      case 'alerts': return <AlertsSection data={config.alerts} onSave={handleSave} saving={saving} />;
      case 'tax': return <TaxSection data={config.tax} onSave={handleSave} saving={saving} />;
      case 'branding': return <BrandingSection config={config} onSave={handleSave} />;
      case 'units': return <UnitsSection data={config.units} onSave={handleSave} saving={saving} />;
      case 'users': return <UsersSection />;
      case 'audit': return <AuditLogSection />;
      default: return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86AB 100%)', padding: '12px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}> Progetti</button>
          <div><div style={{ fontSize: 16, fontWeight: 800 }}>IMPOSTAZIONI</div><div style={{ fontSize: 10, opacity: 0.8 }}>Configurazione Itinera Calculator</div></div>
        </div>
        {isMobile && <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}>{sidebarOpen ? '✕' : '☰ Menu'}</button>}
        {saveMsg && <div style={{ fontSize: 13, fontWeight: 600 }}>{saveMsg}</div>}
      </div>
      <div style={{ padding: isMobile ? '4px 12px' : '4px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', maxWidth: 1400, margin: '0 auto' }}>
        <Breadcrumb items={[
          { label: 'Dashboard', onClick: onBack },
          { label: 'Impostazioni' },
          { label: SECTIONS.find(s => s.id === activeSection)?.label || '' }
        ]} />
      </div>
      <div style={{ display: isMobile ? 'block' : 'flex', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ width: isMobile ? '100%' : 200, padding: '12px 8px', borderRight: isMobile ? 'none' : '1px solid #e2e8f0', background: '#fff', minHeight: isMobile ? 'auto' : 'calc(100vh - 52px)', display: isMobile && !sidebarOpen ? 'none' : 'block', position: isMobile ? 'relative' : 'static', zIndex: 10 }}>
          {SECTIONS.map(s => s.divider ? (
            <div key={s.id} style={{ padding: '12px 8px 4px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.5 }}>{s.label}</div>
          ) : (
            <button key={s.id} onClick={() => { setActiveSection(s.id); if (isMobile) setSidebarOpen(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: 1, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeSection === s.id ? '#eef6fb' : 'transparent', color: activeSection === s.id ? '#1B3A5C' : '#64748b', transition: 'all 0.15s' }}>{s.label}</button>
          ))}
        </div>
        <div style={{ flex: 1, padding: isMobile ? '12px' : isTablet ? '16px' : '20px' }}>{renderSection()}</div>
      </div>
    </div>
  );
}
