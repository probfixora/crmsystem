import React, { useState, useEffect, useCallback } from 'react';
import { edgeFetch, EDGE, supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Layers, UserCheck } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CaseTable from '../components/CaseTable';
import CaseDrawer from '../components/CaseDrawer';
import Footer from '../components/Footer';

const FinalLeads = ({ onLogout }) => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  const fetchCases = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await edgeFetch(EDGE.workflow, { action: 'get_all' });
      // Filter cases created by this sales user
      const mapped = data
        .filter(c => c.created_by === userId || c.createdBy === userId)
        .map(c => ({
          ...c,
          caseId:           c.id || c.case_id || c.caseId,
          trackingId:       c.tracking_id     || c.trackingId,
          customerId:       c.customer_id     || c.customerId,
          customerName:     c.customer_name   || c.customerName,
          currentStage:     c.current_stage   || c.currentStage,
          assignedTeam:     c.assigned_team   || c.assignedTeam,
          phone:            c.phone,
          companyName:      c.company_name    || c.companyName,
          projectType:      c.project_type    || c.projectType,
        }));
      setCases(mapped);
    } catch {
      toast.error('Could not load final leads.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const q = search.toLowerCase();
  const searched = cases.filter(c => {
    return (
      (c.caseId || '').toLowerCase().includes(q)        ||
      (c.trackingId || '').toLowerCase().includes(q)    ||
      (c.customerName || '').toLowerCase().includes(q)  ||
      (c.currentStage || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header title="Final Leads" subtitle="Customers you have sent to Registration" icon={<UserCheck style={{ width: 20, height: 20 }} />} onLogout={onLogout} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: '0 1 360px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-3)' }}>
            {searched.length} Lead{searched.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="main-loading">
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>Loading final leads…</p>
            </div>
          </div>
        ) : (
          <CaseTable cases={searched} onUpdateClick={setSelectedCase} isFinalLeads={true} />
        )}

        {searched.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '13px', marginTop: '24px' }}>
            No leads found.
          </p>
        )}

        <Footer />
      </main>

      {selectedCase && (
        <CaseDrawer
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={() => { fetchCases(); setSelectedCase(null); }}
        />
      )}
    </div>
  );
};

export default FinalLeads;
