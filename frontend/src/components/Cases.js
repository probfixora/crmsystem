import React, { useState, useEffect, useCallback, useRef } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Clock, AlertOctagon, CheckCircle2, Layers, Plus, Keyboard, Filter } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import CaseTable from './CaseTable';
import CaseDrawer from './CaseDrawer';
import Breadcrumbs from './Breadcrumbs';
import Footer from './Footer';

const roleStageMap = {
  admin: [],
  sales: [],
  registration: ['Registration Done', 'Phone Verification Done'],
  banking: ['Bank & Finance'],
  inventory: ['Sent to Store'],
  field_installation: ['Installation Done', 'Plant Activated'],
  subsidy: ['Sent to Subsidy', 'Subsidy Registration Completed'],
};

// Full pipeline order — used to determine if a case has moved PAST my dept's stage
const STAGE_ORDER = [
  'Registration Done',
  'Phone Verification Done',
  'Bank & Finance',
  'Sent to Store',
  'Installation Done',
  'Plant Activated',
  'Sent to Subsidy',
  'Subsidy Registration Completed',
  'Completed',
];

const Cases = ({ onLogout }) => {
  const [searchParams]     = useSearchParams();
  const [cases, setCases]              = useState([]);
  const [loading, setLoading]          = useState(true);
  const [search, setSearch]            = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab]      = useState(searchParams.get('tab') || 'all');
  const [selectedCase, setSelectedCase] = useState(null);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  const navigate   = useNavigate();
  const searchRef  = useRef(null);
  const userRole   = localStorage.getItem('role') || '';

  /* ── Fetch cases ── */
  const fetchCases = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const data = await edgeFetch(EDGE.workflow, { action: 'get_all' });
      const mapped = data.map(c => ({
        ...c,
        caseId:           c.id || c.case_id || c.caseId,
        customerId:       c.customer_id     || c.customerId,
        trackingId:       c.tracking_id     || c.trackingId,
        customerName:     c.customer_name   || c.customerName,
        currentStage:     c.current_stage   || c.currentStage,
        assignedTeam:     c.assigned_team   || c.assignedTeam,
        stageStartTime:   c.stage_start_time || c.stageStartTime,
        delayReason:      c.delay_reason    || c.delayReason,
        delayFlag:        c.delay_flag      || c.delayFlag,
        alternatePhone:   c.alternate_phone  || c.alternatePhone,
        loadRequired:     c.load_required   || c.loadRequired,
        paymentType:      c.payment_type    || c.paymentType,
        createdBy:        c.created_by      || c.createdBy,
        salesPerson:      c.sales_person    || c.salesPerson,
        // Drawer header info row
        phone:            c.phone,
        address:          c.address,
        // Financial
        consumerId:       c.consumer_id     || c.consumerId,
        loanAmount:       c.loan_amount     || c.loanAmount,
        bankName:         c.bank_name       || c.bankName,
        emiAmount:        c.emi_amount      || c.emiAmount,
        downPayment:      c.down_payment    || c.downPayment,
        cashAmount:       c.cash_amount     || c.cashAmount,
        paymentMode:      c.payment_mode    || c.paymentMode,
        assignedTo:       c.assigned_to     || c.assignedTo,
        // Subsidy
        subsidyRefNumber: c.subsidy_ref_number || c.subsidyRefNumber,
        subsidyNote:      c.subsidy_note    || c.subsidyNote,
        // Installation
        siteVisitDate:    c.site_visit_date  || c.siteVisitDate,
        installationNote: c.installation_note || c.installationNote,
        // Dispatch
        dispatchedItems:  c.dispatched_items  || c.dispatchedItems,
        dispatchVehicle:  c.dispatch_vehicle  || c.dispatchVehicle,
        dispatchDriver:   c.dispatch_driver   || c.dispatchDriver,
        dispatchDate:     c.dispatch_date     || c.dispatchDate,
        // Company / project
        companyName:      c.company_name    || c.companyName,
        projectType:      c.project_type    || c.projectType,
        employeeName:     c.employee_name   || c.employeeName,
        employeeId:       c.employee_id     || c.employeeId,
        gstin:            c.gstin,
        // Quotation / system specs (used by dispatch tab to auto-detect items)
        system_specs:     c.system_specs,
      }));
      setCases(mapped);
    } catch {
      toast.error('Could not load cases.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { setSearch(searchParams.get('q') || ''); }, [searchParams]);

  /* ── Delete Case ── */
  const handleDeleteCase = async (caseId) => {
    try {
      await edgeFetch(EDGE.workflow, { action: 'delete', caseId });
      toast.success('Case deleted successfully.');
      fetchCases();
    } catch (err) {
      toast.error(err.message || 'Could not delete case.');
    }
  };

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      // N → open new case (registration role only, if not already typing in an input)
      if (e.key === 'n' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const role = (localStorage.getItem('role') || '').toLowerCase();
        if (role === 'registration' || role === 'admin') {
          e.preventDefault();
          navigate('/create-case');
        }
      }
      // / → focus search
      if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  /* ── Filtering ── */
  const q = search.toLowerCase();
  const myStages = roleStageMap[userRole] || [];
  
  // The first stage index this department is responsible for
  const myFirstStageIdx = myStages.length > 0
    ? Math.min(...myStages.map(s => STAGE_ORDER.indexOf(s)))
    : -1;

  const searched = cases.filter(c => {
    // 1. Text search filter
    const matchesSearch = 
      c.caseId?.toLowerCase().includes(q)        ||
      c.trackingId?.toLowerCase().includes(q)    ||
      c.customerId?.toLowerCase().includes(q)    ||
      c.customerName?.toLowerCase().includes(q)  ||
      c.currentStage?.toLowerCase().includes(q)  ||
      c.phone?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // 2. Visibility filter (Don't show cases that haven't reached this department yet)
    if (userRole === 'admin' || userRole === 'sales') return true;
    if (myFirstStageIdx < 0) return true; // fallback for unknown roles

    const cIdx = STAGE_ORDER.indexOf(c.currentStage);
    // If the case is at a stage index >= my department's first stage, I can see it.
    // Also fallback to true if the stage isn't found in STAGE_ORDER (cIdx === -1)
    return cIdx >= myFirstStageIdx || cIdx === -1;
  });

  // Role-aware tab helpers:
  // "In Progress" = cases currently AT my dept's stage (I have action pending)
  // "Completed" = cases that have moved PAST my last stage (I've handed off)
  // Admin falls back to global status field
  const myLastStageIdx = myStages.length > 0
    ? Math.max(...myStages.map(s => STAGE_ORDER.indexOf(s)))
    : -1;

  const isAtMyStage   = (c) => myStages.includes(c.currentStage);
  const isPastMyStage = (c) => {
    if (userRole === 'admin') return c.status === 'Completed';
    if (myLastStageIdx < 0) return false;
    const cIdx = STAGE_ORDER.indexOf(c.currentStage);
    return cIdx > myLastStageIdx;
  };

  const isInProgress  = (c) => {
    if (userRole === 'admin') return c.status === 'In Progress';
    if (userRole === 'banking') {
      const pt = (c.paymentType || c.payment_type || '').toLowerCase();
      return isAtMyStage(c) && (pt === 'cash' || c.finance_final_status === 'Approved');
    }
    return isAtMyStage(c);
  };

  const tabFiltered = (() => {
    if (activeTab === 'mystage')   return searched.filter(isAtMyStage);
    if (activeTab === 'active')    return searched.filter(isInProgress);
    if (activeTab === 'delayed')   return searched.filter(c => c.status === 'Delayed');
    if (activeTab === 'completed') return searched.filter(isPastMyStage);
    return searched;
  })();

  // Clean 4 tabs: All, In Progress (role-aware), Delayed, Completed (role-aware)
  const tabs = [
    { id: 'all',       label: 'All Customers', icon: Layers,       count: searched.length },
    { id: 'active',    label: 'In Progress',   icon: Clock,        count: searched.filter(isInProgress).length },
    { id: 'delayed',   label: 'Delayed',       icon: AlertOctagon, count: searched.filter(c => c.status === 'Delayed').length },
    { id: 'completed', label: 'Completed',     icon: CheckCircle2, count: searched.filter(isPastMyStage).length },
  ];

  if (loading) return (
    <div className="main-loading">
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>Loading cases…</p>
      </div>
    </div>
  );

  const delayedCount = cases.filter(c => c.status === 'Delayed').length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Breadcrumbs />
        <Header title="Customers" subtitle="Track and manage all solar installation customers" onLogout={onLogout} />

        {/* ── Daily alert banner ── */}
        {delayedCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', marginBottom: '16px', borderRadius: '10px',
            background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 0 3px rgba(244,63,94,0.2)', animation: 'pulseRing 1.8s ease-in-out infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#be123c' }}>
                {delayedCount} customer{delayedCount !== 1 ? 's' : ''} need attention today
              </span>
            </div>
            <button onClick={() => setActiveTab('delayed')} style={{
              fontSize: '12px', fontWeight: 600, color: '#be123c', background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer',
            }}>
              View delayed →
            </button>
          </div>
        )}

        {/* ── Controls row ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {/* Spacer for layout */}
            <div style={{ flex: '1 1 250px' }}></div>
            
            {/* New Case button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(userRole === 'sales') && (
                <button
                  onClick={() => navigate('/create-case')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(37,99,235,0.3)',
                  }}
                >
                  <Plus style={{ width: '16px', height: '16px' }} />
                  New Customer
                  <span className="hide-on-mobile" style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, marginLeft: '4px' }}>N</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
            <Filter style={{ width: '14px', height: '14px', color: 'var(--text-4)', flexShrink: 0, marginRight: '4px' }} />
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '20px',
                  fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  whiteSpace: 'nowrap', flexShrink: 0,
                  background: activeTab === tab.id
                    ? (tab.id === 'delayed' ? '#fff1f2' : tab.id === 'mystage' ? '#eef2ff' : tab.id === 'completed' ? '#ecfdf5' : tab.id === 'active' ? '#fffbeb' : 'var(--brand)')
                    : 'var(--surface)',
                  color: activeTab === tab.id
                    ? (tab.id === 'delayed' ? '#be123c' : tab.id === 'mystage' ? '#4338ca' : tab.id === 'completed' ? '#15803d' : tab.id === 'active' ? '#b45309' : '#fff')
                    : 'var(--text-3)',
                  border: `1px solid ${activeTab === tab.id ? 'transparent' : 'var(--border)'}`,
                  boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {tab.icon && (
                  <tab.icon style={{
                    width: '13px', height: '13px', flexShrink: 0,
                    color: activeTab === tab.id
                      ? (tab.id === 'delayed' ? '#be123c' : tab.id === 'mystage' ? '#4338ca' : tab.id === 'completed' ? '#15803d' : tab.id === 'active' ? '#b45309' : '#fff')
                      : 'var(--text-4)',
                  }} />
                )}
                {tab.label}
                <span style={{
                  fontSize: '11px', fontWeight: 700, minWidth: '20px', textAlign: 'center',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--surface-2)',
                  padding: '1px 6px', borderRadius: '20px',
                  color: activeTab === tab.id ? 'inherit' : 'var(--text-4)',
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* (Keyboard shortcut hint card removed) */}

        <CaseTable cases={tabFiltered} onUpdateClick={setSelectedCase} onDeleteClick={handleDeleteCase} />

        {tabFiltered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: '13px', marginTop: '24px' }}>
            No customers match <strong>"{search || activeTab}"</strong>
          </p>
        )}

        <Footer />
      </main>

      {/* ── Slide-in Drawer ── */}
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

export default Cases;
