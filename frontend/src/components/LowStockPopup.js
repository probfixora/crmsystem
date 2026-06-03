import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangle, X, Package, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOW_THRESHOLD_PCT = 30;

/**
 * LowStockPopup — Persistent admin/inventory popup for critical low-stock alerts.
 *
 * - Shown only to `admin` and `inventory` roles
 * - Checks every 5 minutes and on mount
 * - Can be dismissed until next 5-minute cycle
 * - Clicking "Manage Inventory" navigates to /inventory-management
 */
export default function LowStockPopup() {
  const [lowItems, setLowItems] = useState([]);
  const [visible, setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const role = (localStorage.getItem('role') || '').toLowerCase();
  const shouldShow = role === 'admin' || role === 'inventory';

  const checkLowStock = useCallback(async () => {
    if (!shouldShow) return;
    try {
      const { data } = await supabase
        .from('inventory')
        .select('id, name, stock, initial_stock, category')
        .order('name', { ascending: true });

      if (!data) return;
      const critical = data.filter(item => {
        if (!item.initial_stock || item.initial_stock === 0) return false;
        const pct = (item.stock / item.initial_stock) * 100;
        return pct <= LOW_THRESHOLD_PCT;
      });

      setLowItems(critical);
      if (critical.length > 0 && !dismissed) {
        setVisible(true);
      }
    } catch {
      // Silent fail — don't disrupt the app
    }
  }, [shouldShow, dismissed]);

  useEffect(() => {
    checkLowStock();
    const interval = setInterval(() => {
      setDismissed(false); // Reset dismissal every 5 min
      checkLowStock();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkLowStock]);

  if (!shouldShow || !visible || lowItems.length === 0) return null;

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  const getPct = (item) => {
    if (!item.initial_stock || item.initial_stock === 0) return 0;
    return Math.round((item.stock / item.initial_stock) * 100);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9000,
      width: 340,
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      border: '1px solid #fecdd3',
      overflow: 'hidden',
      animation: 'slideInUp 0.3s ease',
    }}>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
        borderBottom: '1px solid #fecdd3',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#fef2f2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecdd3' }}>
            <AlertTriangle size={15} color="#ef4444" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#be123c' }}>Low Stock Alert</p>
            <p style={{ fontSize: 11, color: '#f87171' }}>{lowItems.length} item{lowItems.length > 1 ? 's' : ''} need restocking</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#f87171' }}
          title="Dismiss (resets in 5 min)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Items list */}
      <div style={{ maxHeight: 200, overflowY: 'auto', padding: '8px 0' }}>
        {lowItems.slice(0, 5).map(item => {
          const pct = getPct(item);
          return (
            <div key={item.id} style={{
              padding: '8px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #fef2f2',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <Package size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                  {item.category && <p style={{ fontSize: 11, color: '#94a3b8' }}>{item.category}</p>}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: pct <= 10 ? '#dc2626' : '#f59e0b' }}>{pct}%</p>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>{item.stock} left</p>
              </div>
            </div>
          );
        })}
        {lowItems.length > 5 && (
          <p style={{ fontSize: 11.5, color: '#94a3b8', padding: '8px 16px', textAlign: 'center' }}>
            +{lowItems.length - 5} more items
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #fef2f2' }}>
        <button
          onClick={() => { handleDismiss(); navigate('/procurement-portal'); }}
          style={{
            width: '100%', padding: '8px 14px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Package size={13} /> Manage Inventory
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
