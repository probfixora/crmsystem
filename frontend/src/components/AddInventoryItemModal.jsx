import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { 
  X, Save, Package, Tag, Info, ImageIcon, FileText, Briefcase
} from 'lucide-react';

const S = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    padding: '20px'
  },
  modal: {
    background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
  },
  header: {
    padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 },
  body: { padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' },
  section: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionTitle: { 
    fontSize: '14px', fontWeight: 700, color: '#1e293b', 
    display: 'flex', alignItems: 'center', gap: '8px', 
    borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
    fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', background: '#fff',
    boxSizing: 'border-box'
  },
  fileInput: {
    width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed #cbd5e1',
    background: '#f8fafc', fontSize: '13px', cursor: 'pointer'
  },
  footer: {
    padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc',
    display: 'flex', justifyContent: 'flex-end', gap: '12px'
  },
  btnCancel: {
    padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
    background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer'
  },
  btnSave: {
    padding: '10px 24px', borderRadius: '8px', border: 'none',
    background: '#2563EB', color: '#fff', fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px'
  }
};

const CATEGORIES = [
  'Solar Panel', 'Inverter', 'Battery', 'Wire', 'Structure', 
  'Electrical Accessories', 'Safety Equipment', 'Other'
];
const UNITS = ['Piece', 'Box', 'Bundle', 'Roll', 'Meter', 'Set', 'pcs', 'mtr', 'pair', 'set'];

// Pulled Field outside to prevent re-rendering focus loss
const Field = ({ label, req, type="text", keyName, placeholder, f, handleChange }) => (
  <div>
    <label style={S.label}>{label} {req && <span style={{color: '#ef4444'}}>*</span>}</label>
    <input 
      style={S.input} type={type} 
      value={f[keyName]} onChange={e => handleChange(keyName, e.target.value)} 
      placeholder={placeholder} required={req}
    />
  </div>
);

export default function AddInventoryItemModal({ onClose, onAdded }) {
  const [f, setF] = useState({
    name: '', category: '', brand: '', model_number: '', sku: '', hsn_code: '', unit: '',
    stock: '', reserved_quantity: 0, low_stock_threshold: '', reorder_level: '', warehouse_location: '', rack_number: '',
    purchase_price: '', selling_price: '', supplier_name: '', supplier_contact: '', supplier_email: '', purchase_date: '',
    capacity: '', warranty_period: '', technical_specs: '', description: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  
  // File states
  const [files, setFiles] = useState({ image: null, invoice: null, warranty: null, datasheet: null });
  const userName = localStorage.getItem('name') || 'Admin';

  const handleChange = (key, val) => setF(prev => ({ ...prev, [key]: val }));
  const handleFileChange = (key, file) => setFiles(prev => ({ ...prev, [key]: file }));

  const generateSKU = () => {
    if (!f.category || !f.brand) {
      toast.error("Select Category and Brand first to auto-generate SKU");
      return;
    }
    const cat = f.category.substring(0, 3).toUpperCase();
    const brn = f.brand.substring(0, 3).toUpperCase();
    const rnd = Math.floor(1000 + Math.random() * 9000);
    handleChange('sku', `${cat}-${brn}-${rnd}`);
  };

  const uploadFile = async (file, pathPrefix) => {
    if (!file) return '';
    const ext = file.name.split('.').pop();
    const fileName = `${pathPrefix}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('inventory').upload(`documents/${fileName}`, file);
    if (error) {
      toast.error(`Upload failed for ${file.name}`);
      return '';
    }
    const { data: { publicUrl } } = supabase.storage.from('inventory').getPublicUrl(`documents/${fileName}`);
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.category || !f.unit || f.stock === '') {
      toast.error('Please fill all required basic and stock info');
      return;
    }
    setSaving(true);
    try {
      // 1. Upload files if any
      const image_url = await uploadFile(files.image, 'IMG');
      const invoice_url = await uploadFile(files.invoice, 'INV');
      const warranty_url = await uploadFile(files.warranty, 'WAR');
      const datasheet_url = await uploadFile(files.datasheet, 'DOC');

      // 2. Prepare payload
      const payload = {
        item_name: f.name, category: f.category, brand: f.brand, model: f.model_number,
        sku: f.sku, unit: f.unit,
        quantity: Number(f.stock) || 0, initial_stock: Number(f.stock) || 0, 
        reserved_quantity: Number(f.reserved_quantity) || 0,
        min_stock_level: Number(f.low_stock_threshold) || 0,
        location: f.warehouse_location, 
        cost_price: Number(f.purchase_price) || 0, selling_price: Number(f.selling_price) || 0,
        notes: f.description || '',
        is_active: f.is_active
      };

      // 3. Insert inventory
      const { data: invData, error: invError } = await supabase.from('inventory').insert(payload).select().single();
      if (invError) throw invError;

      // 4. Log transaction for opening stock
      if (payload.quantity > 0) {
        await supabase.from('inventory_transactions').insert({
          inventory_id: invData.id, inventory_name: invData.item_name,
          transaction_type: 'stock_in', quantity: payload.quantity,
          stock_before: 0, stock_after: payload.quantity,
          notes: 'Initial Opening Stock Entry', created_by: userName
        });
      }

      toast.success('Inventory item created successfully!');
      if (onAdded) onAdded();
      onClose();
    } catch (err) {
      toast.error('Error creating item: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={S.header}>
          <h2 style={S.title}>Add New Inventory Item</h2>
          <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#64748b'}}>
            <X size={20} />
          </button>
        </div>

        <div style={S.body}>
          {/* 1. Basic Information */}
          <div style={S.section}>
            <div style={S.sectionTitle}><Tag size={16}/> Basic Information</div>
            <div style={S.grid3}>
              <Field label="Product Name" req keyName="name" placeholder="e.g. Solar Panel 540W" f={f} handleChange={handleChange} />
              <div>
                <label style={S.label}>Product Category *</label>
                <select style={S.input} value={f.category} onChange={e=>handleChange('category', e.target.value)} required>
                  <option value="">Select Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Brand / Manufacturer" keyName="brand" placeholder="e.g. Waaree, Havells" f={f} handleChange={handleChange} />
              <Field label="Model Number" keyName="model_number" placeholder="e.g. WR-540-PRO" f={f} handleChange={handleChange} />
              <div>
                <label style={S.label}>SKU Code</label>
                <div style={{display: 'flex', gap: 8}}>
                  <input style={{...S.input, flex: 1}} value={f.sku} onChange={e=>handleChange('sku', e.target.value)} placeholder="Auto or manual" />
                  <button type="button" onClick={generateSKU} style={{padding: '0 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontSize: 12, fontWeight: 600}}>Generate</button>
                </div>
              </div>
              <Field label="HSN Code" keyName="hsn_code" placeholder="Optional" f={f} handleChange={handleChange} />
              <div>
                <label style={S.label}>Unit Type *</label>
                <select style={S.input} value={f.unit} onChange={e=>handleChange('unit', e.target.value)} required>
                  <option value="">Select Unit</option>
                  {UNITS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Stock Information */}
          <div style={S.section}>
            <div style={S.sectionTitle}><Package size={16}/> Stock &amp; Location</div>
            <div style={S.grid3}>
              <Field label="Opening Stock Qty" req type="number" keyName="stock" placeholder="0" f={f} handleChange={handleChange} />
              <Field label="Min Safety Stock Level" type="number" keyName="low_stock_threshold" placeholder="e.g. 10" f={f} handleChange={handleChange} />
              <Field label="Reorder Level" type="number" keyName="reorder_level" placeholder="e.g. 5" f={f} handleChange={handleChange} />
              <Field label="Warehouse Location" keyName="warehouse_location" placeholder="e.g. WH-1 Lucknow" f={f} handleChange={handleChange} />
              <Field label="Rack / Shelf Number" keyName="rack_number" placeholder="e.g. A-12-3" f={f} handleChange={handleChange} />
            </div>
          </div>

          {/* 3. Purchase Information */}
          <div style={S.section}>
            <div style={S.sectionTitle}><Briefcase size={16}/> Purchase Information</div>
            <div style={S.grid3}>
              <Field label="Purchase Price (₹)" type="number" keyName="purchase_price" placeholder="0.00" f={f} handleChange={handleChange} />
              <Field label="Selling Price (₹)" type="number" keyName="selling_price" placeholder="0.00" f={f} handleChange={handleChange} />
              <Field label="Supplier Name" keyName="supplier_name" placeholder="Name of supplier" f={f} handleChange={handleChange} />
              <Field label="Supplier Contact" keyName="supplier_contact" placeholder="Phone number" f={f} handleChange={handleChange} />
              <Field label="Supplier Email" type="email" keyName="supplier_email" placeholder="Email address" f={f} handleChange={handleChange} />
              <Field label="Purchase Date" type="date" keyName="purchase_date" f={f} handleChange={handleChange} />
            </div>
          </div>

          {/* 4. Product Specifications */}
          <div style={S.section}>
            <div style={S.sectionTitle}><Info size={16}/> Specifications &amp; Details</div>
            <div style={S.grid}>
              <Field label="Capacity" keyName="capacity" placeholder="e.g. 540W, 3kW, 150Ah" f={f} handleChange={handleChange} />
              <Field label="Warranty Period" keyName="warranty_period" placeholder="e.g. 10 Years, 25 Years Perf." f={f} handleChange={handleChange} />
              <div style={{gridColumn: '1 / -1'}}>
                <label style={S.label}>Product Description</label>
                <textarea style={{...S.input, minHeight: '60px', resize: 'vertical'}} value={f.description} onChange={e=>handleChange('description', e.target.value)} placeholder="Short description..." />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={S.label}>Technical Specifications</label>
                <textarea style={{...S.input, minHeight: '80px', resize: 'vertical'}} value={f.technical_specs} onChange={e=>handleChange('technical_specs', e.target.value)} placeholder="Voltage, Amperage, Dimensions, etc." />
              </div>
            </div>
          </div>

          {/* 5. Documents */}
          <div style={S.section}>
            <div style={S.sectionTitle}><FileText size={16}/> Documents &amp; Media</div>
            <div style={S.grid}>
              <div>
                <label style={S.label}><ImageIcon size={14} style={{verticalAlign: 'middle', marginRight: 4}}/> Product Image</label>
                <input type="file" accept="image/*" style={S.fileInput} onChange={e=>handleFileChange('image', e.target.files[0])} />
              </div>
              <div>
                <label style={S.label}><FileText size={14} style={{verticalAlign: 'middle', marginRight: 4}}/> Invoice Document</label>
                <input type="file" accept=".pdf,.jpg,.png" style={S.fileInput} onChange={e=>handleFileChange('invoice', e.target.files[0])} />
              </div>
              <div>
                <label style={S.label}><FileText size={14} style={{verticalAlign: 'middle', marginRight: 4}}/> Warranty Document</label>
                <input type="file" accept=".pdf,.jpg,.png" style={S.fileInput} onChange={e=>handleFileChange('warranty', e.target.files[0])} />
              </div>
              <div>
                <label style={S.label}><FileText size={14} style={{verticalAlign: 'middle', marginRight: 4}}/> Technical Datasheet</label>
                <input type="file" accept=".pdf" style={S.fileInput} onChange={e=>handleFileChange('datasheet', e.target.files[0])} />
              </div>
            </div>
          </div>

          {/* 6. Status */}
          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <input type="checkbox" id="isActive" checked={f.is_active} onChange={e=>handleChange('is_active', e.target.checked)} style={{width: 18, height: 18}} />
            <label htmlFor="isActive" style={{fontWeight: 600, color: '#1e293b', cursor: 'pointer'}}>Active / Available</label>
          </div>

        </div>

        <div style={S.footer}>
          <button style={S.btnCancel} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={S.btnSave} onClick={handleSubmit} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Inventory Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
