import React, { useState, useEffect } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DashboardCards from '../components/DashboardCards';
import {
  CheckCircle2, AlertTriangle, Save, Landmark,
  FileText, RefreshCw, Phone,
  Zap, Clock, Edit3, X, Building2, BadgeCheck, CreditCard,
  Banknote, ChevronRight, FolderOpen
} from 'lucide-react';

/* ── Status helpers ── */
const statusColor = (s) =>
  s === 'Approved' || s === 'Form Accepted' || s === 'Loan Approved' ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' } :
  s === 'Rejected' ? { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' } :
  { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };

const StatusPill = ({ status }) => {
  const c = statusColor(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {(status === 'Approved' || status === 'Form Accepted' || status === 'Loan Approved') ? <BadgeCheck size={12} /> : status === 'Rejected' ? <X size={12} /> : <Clock size={12} />}
      {status}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   LOAN STAGE TRACKER — 3-stage visual progress bar
═══════════════════════════════════════════════════════════ */
const LOAN_STAGES = ['Form Submitted to Bank', 'Form Accepted', 'Loan Approved'];

const LoanStageTracker = ({ currentStatus, caseId, onSave }) => {
  const [saving, setSaving] = useState(false);
  const currentIdx = LOAN_STAGES.indexOf(currentStatus);

  const handleAdvance = async (stage) => {
    setSaving(true);
    try {
      await edgeFetch(EDGE.workflow, {
        action: 'update_finance', caseId,
        financeFormStatus: stage,
        financeFinalStatus: stage === 'Loan Approved' ? 'Approved' : 'Pending',
        remarks: `Loan stage updated: ${stage}`,
      });
      if (stage === 'Loan Approved') {
        await edgeFetch(EDGE.workflow, {
          action: 'update_stage', caseId,
          newStage: 'Sent to Store',
          remarks: 'Loan approved — moving to Inventory / Store stage',
        });
        toast.success('🎉 Loan Approved! Case moved to Inventory.');
      } else {
        toast.success(`Stage updated: ${stage}`);
      }
      onSave();
    } catch (err) { toast.error(err.message || 'Failed to update loan stage'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: '#1e3a8a', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Loan Processing Stages
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', marginBottom: '16px' }}>
        {LOAN_STAGES.map((stage, idx) => {
          const done = currentIdx >= idx;
          const active = currentIdx === idx;
          return (
            <React.Fragment key={stage}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                  background: done ? '#2563eb' : '#dbeafe', color: done ? '#fff' : '#93c5fd',
                  border: active ? '3px solid #1d4ed8' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : idx + 1}
                </div>
                <p style={{ fontSize: '10px', fontWeight: 600, color: done ? '#1d4ed8' : '#93c5fd', marginTop: '6px', textAlign: 'center', maxWidth: '70px' }}>
                  {stage}
                </p>
              </div>
              {idx < LOAN_STAGES.length - 1 && (
                <div style={{ flex: 0, width: '24px', height: '2px', background: currentIdx > idx ? '#2563eb' : '#bfdbfe', marginTop: '14px' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {LOAN_STAGES.map((stage, idx) => {
          if (currentIdx >= idx) return null;
          if (idx > currentIdx + 1) return null;
          return (
            <button key={stage} onClick={() => handleAdvance(stage)} disabled={saving}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 600,
                opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              {saving ? '...' : <ChevronRight size={12} />}
              Mark: {stage}
            </button>
          );
        })}
        {currentIdx === LOAN_STAGES.length - 1 && (
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> Loan Fully Approved
          </span>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FINANCE TABLE ROW — Premium tracker row per case
═══════════════════════════════════════════════════════════ */
const FinanceTableRow = ({ caseObj, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [formData, setFormData] = useState({
    paymentType: caseObj.payment_type || '',
    cashAmount: caseObj.cash_amount || '',
    paymentMode: caseObj.payment_mode || '',
    loanAmount: caseObj.loan_amount || '',
    bankName: caseObj.bank_name || '',
    financeFormStatus: caseObj.finance_form_status || 'Form Submitted to Bank',
    financeFinalStatus: caseObj.finance_final_status || 'Pending',
    financeNotes: caseObj.finance_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const pType = (formData.paymentType || '').toLowerCase();
      let remarks = 'Updated financial details.';
      if (pType === 'cash' && formData.paymentMode) {
        remarks = `Cash payment confirmed via ${formData.paymentMode}`;
      }
      await edgeFetch(EDGE.workflow, { action: 'update_finance', caseId: (caseObj.id || caseObj.case_id), remarks, ...formData });
      
      toast.success('Finance details updated. Check Customers tab if ready.');
      setIsEditing(false);
      onSave();
    } catch { toast.error('Failed to update finance details'); }
    finally { setSaving(false); }
  };

  const loadExpanded = async () => {
    const next = !showExpanded;
    setShowExpanded(next);
    if (next && historyData.length === 0) {
      setLoadingHistory(true);
      try {
        const res = await edgeFetch(EDGE.workflow, { action: 'get_one', caseId: (caseObj.id || caseObj.case_id) });
        setHistoryData(res.history || []);
      } catch { toast.error('Failed to load history'); }
      finally { setLoadingHistory(false); }
    }
  };

  const tdStyle = { padding: '16px 20px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };
  const payType = (formData.paymentType || '').toLowerCase();

  return (
    <>
      <tr style={{ background: isEditing ? 'var(--surface-2)' : 'transparent', transition: 'background 0.2s' }}
          onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background = 'transparent'; }}>

        {/* Customer Info */}
        <td style={tdStyle}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '14px', marginBottom: '4px' }}>{caseObj.customer_name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-4)', display: 'flex', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} /> {caseObj.phone}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={11} /> {caseObj.load_required || '?'} kW</span>
          </div>
        </td>

        {/* Payment Type */}
        <td style={tdStyle}>
          {isEditing ? (
            <select name="paymentType" value={formData.paymentType} onChange={handleChange} className="input" style={{ width: '120px', padding: '8px', fontSize: '13px' }}>
              <option value="">Select…</option>
              <option value="cash">Cash</option>
              <option value="loan">Bank Loan</option>
            </select>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
              background: payType === 'cash' ? '#f0fdf4' : payType === 'loan' ? '#eff6ff' : '#f8fafc',
              color: payType === 'cash' ? '#16a34a' : payType === 'loan' ? '#2563eb' : '#64748b',
              border: `1px solid ${payType === 'cash' ? '#bbf7d0' : payType === 'loan' ? '#bfdbfe' : '#e2e8f0'}`,
            }}>
              {payType === 'cash' ? <Banknote size={12} /> : payType === 'loan' ? <Building2 size={12} /> : <CreditCard size={12} />}
              {payType ? payType.toUpperCase() : 'PENDING'}
            </span>
          )}
        </td>

        {/* Cash Mode / Loan Amount */}
        <td style={tdStyle}>
          {isEditing && payType === 'cash' ? (
            <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="input" style={{ width: '150px', padding: '8px', fontSize: '13px' }}>
              <option value="">Select mode…</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
              <option value="UPI">UPI</option>
              <option value="Physical Cash">Physical Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          ) : isEditing && payType === 'loan' ? (
            <input type="number" name="loanAmount" value={formData.loanAmount} onChange={handleChange} className="input" style={{ width: '130px', padding: '8px', fontSize: '13px' }} placeholder="₹ Amount" />
          ) : payType === 'cash' ? (
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
              {formData.paymentMode || <span style={{ color: 'var(--text-4)', fontStyle: 'italic' }}>Mode not set</span>}
            </span>
          ) : payType === 'loan' ? (
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-1)' }}>₹{Number(formData.loanAmount || 0).toLocaleString('en-IN')}</div>
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: '12px' }}>—</span>
          )}
        </td>

        {/* Status */}
        <td style={{ ...tdStyle, maxWidth: '200px' }}>
          {payType === 'loan' ? (
            <StatusPill status={formData.financeFormStatus || 'Pending'} />
          ) : payType === 'cash' && formData.paymentMode ? (
            <StatusPill status="Approved" />
          ) : (
            <span style={{ color: 'var(--text-4)', fontSize: '12px' }}>—</span>
          )}
        </td>

        {/* Actions */}
        <td style={tdStyle}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isEditing ? (
              <>
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm" style={{ padding: '6px 14px', fontSize: '12.5px' }}>
                  <Edit3 size={14} /> Edit
                </button>
                {payType === 'cash' && formData.paymentMode && (
                  <button
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await edgeFetch(EDGE.workflow, {
                          action: 'update_stage',
                          caseId: caseObj.id || caseObj.case_id,
                          newStage: 'Sent to Store',
                          remarks: 'Cash confirmed — moving to Inventory / Store stage',
                        });
                        toast.success('🎉 Payment Approved! Case moved to Inventory.');
                        onSave();
                      } catch {
                        toast.error('Failed to move to Store');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '6px 14px', fontSize: '12.5px', background: '#059669', borderColor: '#059669' }}
                  >
                    {saving ? '...' : <CheckCircle2 size={14} />} Approve
                  </button>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm" style={{ padding: '6px 14px', fontSize: '12.5px' }}>
                  {saving ? '...' : <Save size={14} />} Save
                </button>
                <button onClick={() => setIsEditing(false)} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}><X size={16} /></button>
              </div>
            )}
            <button onClick={loadExpanded} className="btn btn-ghost btn-sm" style={{ padding: '6px 14px', fontSize: '12.5px', background: showExpanded ? 'var(--brand-dim)' : 'transparent', color: showExpanded ? 'var(--brand)' : 'var(--text-2)' }}>
              <Clock size={14} /> {showExpanded ? 'Hide' : payType === 'loan' ? 'Loan Stages' : 'History'}
            </button>
          </div>
        </td>
      </tr>

      {/* Loan Stage Tracker Row (expanded for loan cases) */}
      {showExpanded && payType === 'loan' && (
        <tr style={{ background: '#f0f7ff' }}>
          <td colSpan={5} style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <LoanStageTracker
              currentStatus={formData.financeFormStatus}
              caseId={(caseObj.id || caseObj.case_id)}
              onSave={() => { setShowExpanded(false); onSave(); }}
            />
          </td>
        </tr>
      )}

      {/* History Row (for cash cases) */}
      {showExpanded && payType !== 'loan' && (
        <tr style={{ background: '#f8fafc' }}>
          <td colSpan={5} style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} /> Cash Payment History
            </h4>
            {loadingHistory ? (
              <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading...</p>
            ) : historyData.filter(h => h.action_type === 'finance_update').length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-4)', fontStyle: 'italic' }}>No payment history records found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...historyData]
                  .filter(h => h.action_type === 'finance_update')
                  .reverse()
                  .slice(0, 5)
                  .map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-2)', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-4)', minWidth: '140px' }}>{new Date(h.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <span style={{ fontWeight: 600, minWidth: '100px' }}>{h.updated_by}</span>
                    <span>{h.remarks}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   BANKING DASHBOARD — Finance Command Center
═══════════════════════════════════════════════════════════ */
const BankingDashboard = ({ onLogout }) => {
  const navigate = useNavigate(); // eslint-disable-line no-unused-vars
  const [cases, setCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await edgeFetch(EDGE.workflow, { action: 'get_all' });
      setAllCases(data);
      // Show cases in Bank & Finance that are either unassigned OR cash (loans go to FinanceTracking)
      const triageCases = data.filter(c => {
        const stage = c.current_stage || '';
        const pt = (c.payment_type || '').toLowerCase();
        return stage === 'Bank & Finance' && pt !== 'loan';
      });
      setCases(triageCases);
    } catch { toast.error('Failed to load triage cases'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const STAGE_ORDER = [
    'Registration Done',
    'Phone Verification Done',
    'Bank & Finance',
    'Sent to Store',
    'Installation Done',
    'Plant Activated',
    'Subsidy Registration Completed',
    'Completed',
  ];
  const bankIdx = STAGE_ORDER.indexOf('Bank & Finance');

  const totalProjects  = allCases.length;
  const inProcess      = allCases.filter(c => STAGE_ORDER.indexOf(c.current_stage || '') === bankIdx).length;
  const completed      = allCases.filter(c => STAGE_ORDER.indexOf(c.current_stage || '') > bankIdx || c.status === 'Completed').length;
  const redFlag        = allCases.filter(c => c.status === 'Delayed').length;

  const overviewStats = {
    totalCases: totalProjects,
    inProgressCases: inProcess,
    completedCases: completed,
    delayedCases: redFlag,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px', maxWidth: '1400px', boxSizing: 'border-box' }}>
        {/* Simulation banner is rendered globally by App.js */}

        <Header title="Finance Command Center" subtitle="Manage loan approvals, cash confirmations, and case status" roleBadge="Banking" onLogout={onLogout} />

        {/* ── Overview KPI Cards ── */}
        <DashboardCards stats={overviewStats} role="banking" />

        <div style={{ background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Payment Method Triage</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Assign payment methods to incoming cases.</p>
          
          {loading ? (
            <p>Loading...</p>
          ) : cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 32px', border: '1px dashed var(--color-border)', borderRadius: '14px' }}>
              <FolderOpen size={32} color="var(--text-4)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>No pending cases</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>All incoming cases have been assigned a payment method.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    {['Customer Info', 'Payment Type', 'Amount / Mode', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => <FinanceTableRow key={c.id || c.case_id} caseObj={c} onSave={loadData} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
};

export default BankingDashboard;