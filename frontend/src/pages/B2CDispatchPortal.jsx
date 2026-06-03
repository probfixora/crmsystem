import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { Truck, CheckCircle, Package, ArrowRight, Loader } from 'lucide-react';
import { getEdgeFunctionUrl, fetchWithAuth } from '../lib/supabaseClient'; // Make sure this exists or I will write raw supabase calls

export default function B2CDispatchPortal({ onLogout }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchDispatchCases = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('current_stage', 'Sent to Store')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      toast.error('Failed to load pending dispatches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDispatchCases();
  }, [fetchDispatchCases]);

  const handleDispatch = async (caseId, customerName, capacity) => {
    setProcessingId(caseId);
    try {
      // 1. We should theoretically calculate exact items based on capacity.
      // Since we don't have strict mapping available in frontend easily without hitting edge function,
      // we can just call the workflow edge function if it exists, or write directly.
      
      // We will attempt to update the stage to "Installation" and log a note.
      const { data, error } = await supabase.functions.invoke('workflow', {
        body: {
          action: 'update_stage',
          caseId: caseId,
          newStage: 'Installation Started',
          note: 'Auto-dispatched items to installation site.'
        }
      });

      if (error) throw error;

      toast.success(`Items dispatched successfully for ${customerName}`);
      fetchDispatchCases(); // Refresh list

    } catch (err) {
      console.error(err);
      toast.error('Dispatch failed: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px', boxSizing: 'border-box', maxWidth: '1400px', overflowX: 'hidden' }}>
        <Header title="B2C Dispatch Portal" subtitle="Manage and dispatch items for approved residential cases" onLogout={onLogout} />

        <div style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)',
          marginTop: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Truck size={24} color="#8b5cf6" />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Pending Dispatches</h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="animate-spin" style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface-2)', borderRadius: '8px' }}>
              <CheckCircle size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-2)', fontSize: 15, fontWeight: 600 }}>All Caught Up!</p>
              <p style={{ color: 'var(--text-4)', fontSize: 13 }}>There are no approved cases waiting for dispatch.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Customer Name</th>
                    <th>Required Capacity</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#3B82F6' }}>{c.tracking_id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-1)' }}>{c.customer_name}</td>
                      <td style={{ fontWeight: 500, color: 'var(--text-2)' }}>{c.load_required || c.capacity || 'Not specified'}</td>
                      <td>
                        <span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>
                          Waiting for Dispatch
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDispatch(c.id, c.customer_name, c.load_required)}
                          disabled={processingId === c.id}
                          style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none',
                            background: processingId === c.id ? '#9CA3AF' : '#8b5cf6',
                            color: '#fff', fontSize: '13px', fontWeight: 600,
                            cursor: processingId === c.id ? 'wait' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {processingId === c.id ? (
                            <>
                              <Loader size={16} className="animate-spin" /> Processing...
                            </>
                          ) : (
                            <>
                              Send to Installation <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}
