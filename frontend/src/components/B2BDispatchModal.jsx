import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { X, Save, Building, Package, Hash } from 'lucide-react';

const B2BDispatchModal = ({ onClose, onSave, items = [] }) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [clientName, setClientName] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userName = localStorage.getItem('name') || 'Admin';

  const selectedItem = items.find(i => i.id === selectedItemId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItemId || !quantity || !clientName) {
      toast.error('Please fill all required fields');
      return;
    }

    if (selectedItem && quantity > (selectedItem.quantity || selectedItem.stock)) {
      toast.error('Cannot dispatch more than available quantity!');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Deduct quantity from inventory
      const { error: updateError } = await supabase
        .from('inventory')
        .update({
          quantity: (selectedItem.quantity || selectedItem.stock) - Number(quantity)
        })
        .eq('id', selectedItemId);

      if (updateError) throw updateError;

      // 2. Log transaction
      const { error: txnError } = await supabase
        .from('inventory_transactions')
        .insert([{
          inventory_id: selectedItemId,
          inventory_name: selectedItem.item_name || selectedItem.name,
          transaction_type: 'stock_out',
          quantity: -Number(quantity),
          stock_before: selectedItem.quantity || selectedItem.stock,
          stock_after: (selectedItem.quantity || selectedItem.stock) - Number(quantity),
          dispatch_type: 'b2b',
          b2b_client_name: clientName,
          notes: referenceNote || `B2B dispatch to ${clientName}`,
          created_by: userName || 'Admin'
        }]);

      if (txnError) throw txnError;

      toast.success('B2B dispatch successful');
      onSave();
    } catch (err) {
      console.error(err);
      toast.error('Failed to process B2B dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              B2B Order Dispatch
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569' }}>
              Dispatch items directly to business partners
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', padding: '8px',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          <form id="b2b-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                B2B Client Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
                <input
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Adani Solar Projects"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#1e293b',
                    outline: 'none', fontSize: '14px', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                Select Inventory Item <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Package size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#1e293b',
                    outline: 'none', fontSize: '14px', boxSizing: 'border-box',
                    appearance: 'none'
                  }}
                >
                  <option value="" disabled>Choose an item...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.item_name || item.name} ({item.sku}) - {item.quantity || item.stock} available
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                Dispatch Quantity <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9CA3AF' }} />
                <input
                  required
                  type="number"
                  min="1"
                  max={selectedItem?.quantity || selectedItem?.stock || 9999}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#1e293b',
                    outline: 'none', fontSize: '14px', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                Reference Note / PO Number
              </label>
              <input
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder="e.g. PO-2026-881"
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', color: '#1e293b',
                  outline: 'none', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          padding: '16px 24px', borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #cbd5e1', background: '#fff',
              color: '#475569', fontSize: '14px', fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="b2b-form"
            disabled={isSubmitting}
            style={{
              padding: '8px 20px', borderRadius: '8px',
              border: 'none', background: '#3B82F6',
              color: '#fff', fontSize: '14px', fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <Save size={16} />
            {isSubmitting ? 'Dispatching...' : 'Confirm Dispatch'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default B2BDispatchModal;
