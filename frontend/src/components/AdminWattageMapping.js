import React, { useState, useEffect } from 'react';
import { supabase, edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Save, X, Bolt, AlertTriangle } from 'lucide-react';

export default function AdminWattageMapping() {
  const [mappings, setMappings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editKw, setEditKw]       = useState('');
  const [editWatt, setEditWatt]   = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [newKw, setNewKw]         = useState('');
  const [newWatt, setNewWatt]     = useState('');
  const [newLabel, setNewLabel]   = useState('');
  const [saving, setSaving]       = useState(false);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wattage_mappings')
        .select('*')
        .eq('is_active', true)
        .order('kw_value', { ascending: true });
      if (error) throw error;
      setMappings(data || []);
    } catch (err) {
      toast.error('Failed to load mappings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMappings(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newKw || !newWatt) { toast.error('kW value and Watt value are required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('wattage_mappings').insert({
        kw_value: Number(newKw),
        watt_value: Number(newWatt),
        label: newLabel || `${newKw}kW System`,
        is_active: true,
      });
      if (error) throw error;
      toast.success(`✅ Added ${newKw}kW → ${Number(newWatt).toLocaleString()}W mapping`);
      setNewKw(''); setNewWatt(''); setNewLabel('');
      fetchMappings();
    } catch (err) {
      toast.error(err.message || 'Failed to add mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editKw || !editWatt) { toast.error('Both kW and Watt are required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('wattage_mappings').update({
        kw_value: Number(editKw),
        watt_value: Number(editWatt),
        label: editLabel,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      toast.success('Mapping updated');
      setEditingId(null);
      fetchMappings();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, kw) => {
    if (!window.confirm(`Delete ${kw}kW mapping?`)) return;
    try {
      const { error } = await supabase.from('wattage_mappings').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Mapping removed');
      fetchMappings();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: '#fef9c3', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bolt size={18} color="#a16207" />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>kW → Watt Conversion Table</h3>
          <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Each row tells the system: "When a customer selects X kW, show Y Watts in the quotation"</p>
        </div>
      </div>

      {/* Info box */}
      <div style={{ padding: '12px 22px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', gap: 8 }}>
        <AlertTriangle size={14} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
          <strong>How it works:</strong> Jab salesperson ya registration team koi system size choose kare (jaise 3kW), toh
          yahan se automatically sahi watt value form mein aa jaati hai. Example: <strong>3kW → 3,300W</strong>.
          Yeh table uss mapping ko control karta hai.
        </p>
      </div>

      {/* Table */}
      <div style={{ padding: '16px 22px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-4)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>kW</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watts</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Label</th>
                <th style={{ textAlign: 'right', padding: '8px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-2)' }}>
                  {editingId === m.id ? (
                    <>
                      <td style={{ padding: '8px 10px' }}>
                        <input type="number" min="1" className="input" value={editKw} onChange={e => setEditKw(e.target.value)} style={{ width: 70, fontSize: 13 }} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input type="number" min="1" className="input" value={editWatt} onChange={e => setEditWatt(e.target.value)} style={{ width: 90, fontSize: 13 }} />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input className="input" value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ width: 160, fontSize: 13 }} />
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <button onClick={() => handleUpdate(m.id)} className="btn btn-primary btn-sm" disabled={saving} style={{ marginRight: 6, padding: '4px 10px' }}>
                          <Save size={12} /> Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
                          <X size={12} />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-1)' }}>{m.kw_value} kW</td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-primary)', fontWeight: 600 }}>{Number(m.watt_value).toLocaleString()} W</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-3)' }}>{m.label || '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <button onClick={() => { setEditingId(m.id); setEditKw(String(m.kw_value)); setEditWatt(String(m.watt_value)); setEditLabel(m.label || ''); }}
                          className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', marginRight: 4 }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(m.id, m.kw_value)} className="btn btn-sm" style={{ padding: '4px 8px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {mappings.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-4)' }}>No mappings found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Add new mapping */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>kW Value</label>
            <input type="number" min="1" max="500" className="input" value={newKw} onChange={e => setNewKw(e.target.value)} placeholder="e.g. 5" style={{ width: 80 }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>Watt Value</label>
            <input type="number" min="1" className="input" value={newWatt} onChange={e => setNewWatt(e.target.value)} placeholder="e.g. 5500" style={{ width: 100 }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>Label (optional)</label>
            <input className="input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. 5kW Standard" style={{ width: 160 }} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px' }}>
            <Plus size={13} /> {saving ? 'Adding…' : 'Add Mapping'}
          </button>
        </form>
      </div>
    </div>
  );
}
