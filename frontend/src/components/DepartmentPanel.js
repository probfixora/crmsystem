import React, { useState } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { CheckSquare, Square, IndianRupee, Calendar, FileText, Hash } from 'lucide-react';

/* ── Sub-components ── */

const ChecklistItem = ({ item, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
      background: item.checked ? '#f0fdf4' : '#f8fafc',
      border: `1px solid ${item.checked ? '#bbf7d0' : '#e2e8f0'}`,
      marginBottom: '6px', transition: 'all 0.15s',
    }}
  >
    {item.checked
      ? <CheckSquare style={{ width: '15px', height: '15px', color: 'var(--color-primary)', flexShrink: 0, marginTop: '1px' }} />
      : <Square      style={{ width: '15px', height: '15px', color: '#cbd5e1', flexShrink: 0, marginTop: '1px' }} />
    }
    <div style={{ flex: 1 }}>
      <p style={{
        fontSize: '13px', fontWeight: item.checked ? 600 : 400,
        color: item.checked ? '#065f46' : '#334155',
        textDecoration: item.checked ? 'line-through' : 'none',
        marginBottom: item.checked && item.checkedBy ? '2px' : 0,
      }}>
        {item.item}
      </p>
      {item.checked && item.checkedBy && (
        <p style={{ fontSize: '10.5px', color: '#6ee7b7' }}>
          ✓ {item.checkedBy}
        </p>
      )}
    </div>
  </div>
);

const FieldInput = ({ label, icon: Icon, type = 'text', value, onChange, placeholder, prefix }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '7px' }}>
      {Icon && <Icon style={{ width: '13px', height: '13px', color: '#94a3b8' }} />}
      {label}
    </label>
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8' }}>
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input"
        style={{ paddingLeft: prefix ? '26px' : undefined }}
      />
    </div>
  </div>
);

/* ── Main DepartmentPanel ── */
const DepartmentPanel = ({ caseData, onRefresh }) => {
  const role    = localStorage.getItem('role');

  // Local state for department fields
  const [loanAmount,          setLoanAmount]          = useState(caseData?.loanAmount          || '');
  const [siteVisitDate,       setSiteVisitDate]       = useState(caseData?.siteVisitDate ? caseData.siteVisitDate.slice(0, 10) : '');
  const [installationNote,    setInstallationNote]    = useState(caseData?.installationNote    || '');
  const [subsidyRefNumber,    setSubsidyRefNumber]    = useState(caseData?.subsidyRefNumber    || '');
  const [subsidyPhase1Amount, setSubsidyPhase1Amount] = useState(caseData?.subsidyPhase1Amount || '');
  const [subsidyPhase2Amount, setSubsidyPhase2Amount] = useState(caseData?.subsidyPhase2Amount || '');
  const [subsidyNote,         setSubsidyNote]         = useState(caseData?.subsidyNote         || '');
  const [saving, setSaving] = useState(false);

  const [checklist, setChecklist] = useState(
    role === 'banking'   ? (caseData?.bankingChecklist    || []) :
    role === 'electrical'? (caseData?.electricalChecklist || []) : []
  );

  const handleSave = async (body) => {
    setSaving(true);
    try {
      const caseId = caseData.id || caseData.case_id || caseData.caseId;
      await edgeFetch(EDGE.workflow, { action: 'update_details', caseId, ...body });
      toast.success('Saved!');
      onRefresh();
    } catch {
      toast.error('Could not save. Try again.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (itemId) => {
    const listName = role === 'banking' ? 'bankingChecklist' : 'electricalChecklist';
    const caseId = caseData.id || caseData.case_id || caseData.caseId;
    try {
      const updated = await edgeFetch(EDGE.workflow, { action: 'toggle_checklist', caseId, listName, itemId });
      setChecklist(updated);
      onRefresh();
    } catch { toast.error('Could not update checklist.'); }
  };

  const SectionHead = ({ title, sub }) => (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</p>
      {sub && <p style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>{sub}</p>}
    </div>
  );

  /* ── BANKING ── */
  if (role === 'banking' || (role === 'admin' && ['Banking In Process', 'Loan Approved / Cash Confirmed'].includes(caseData.currentStage))) {
    return (
      <div>
        <SectionHead title="Banking Details" sub="Required documents and loan information" />

        <FieldInput
          label="Approved Loan Amount (₹)"
          icon={IndianRupee}
          type="number"
          value={loanAmount}
          onChange={e => setLoanAmount(e.target.value)}
          placeholder="e.g. 180000"
        />
        <button onClick={() => handleSave({ loanAmount: Number(loanAmount) })} disabled={saving} style={{
          padding: '8px 16px', borderRadius: '8px', border: 'none',
          background: '#6366f1', color: '#fff', fontSize: '12.5px', fontWeight: 600,
          cursor: 'pointer', marginBottom: '24px', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving…' : 'Save loan amount'}
        </button>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
          <SectionHead title="Document Checklist" sub="Click to mark items as verified" />
          {checklist.length === 0
            ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>No checklist found. Reopen this case.</p>
            : checklist.map(item => (
                <ChecklistItem key={item._id} item={item} onToggle={() => handleToggle(item._id)} />
              ))
          }
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px' }}>
            {checklist.filter(i => i.checked).length} / {checklist.length} items verified
          </p>
        </div>
      </div>
    );
  }

  /* ── ELECTRICAL ── */
  if (role === 'electrical') {
    return (
      <div>
        <SectionHead title="Electrical Inspection Checklist" sub="Mark each item after inspection" />
        {checklist.length === 0
          ? <p style={{ fontSize: '13px', color: '#94a3b8' }}>No checklist found. Reopen this case.</p>
          : checklist.map(item => (
              <ChecklistItem key={item._id} item={item} onToggle={() => handleToggle(item._id)} />
            ))
        }
        <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: checklist.every(i => i.checked) ? '#f0fdf4' : '#f8fafc', border: `1px solid ${checklist.every(i => i.checked) ? '#bbf7d0' : '#e2e8f0'}` }}>
          <p style={{ fontSize: '12.5px', fontWeight: 600, color: checklist.every(i => i.checked) ? '#065f46' : '#64748b' }}>
            {checklist.filter(i => i.checked).length} / {checklist.length} checks complete
            {checklist.every(i => i.checked) && ' ✓ Ready for Plant Activation'}
          </p>
        </div>
      </div>
    );
  }

  /* ── INSTALLATION ── */
  if (role === 'installation') {
    return (
      <div>
        <SectionHead title="Installation Details" sub="Record site visit and installation info" />

        <FieldInput
          label="Site Visit Date"
          icon={Calendar}
          type="date"
          value={siteVisitDate}
          onChange={e => setSiteVisitDate(e.target.value)}
        />

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '7px' }}>
            <FileText style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
            Installation Notes
          </label>
          <textarea
            value={installationNote}
            onChange={e => setInstallationNote(e.target.value)}
            placeholder="e.g. Roof type: RCC flat. Panel orientation: South. Special notes…"
            style={{
              width: '100%', minHeight: '90px', resize: 'vertical',
              padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '10px', outline: 'none', color: '#0f172a', lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
        </div>

        <button onClick={() => handleSave({ siteVisitDate, installationNote })} disabled={saving} style={{
          padding: '10px', width: '100%', borderRadius: '10px', border: 'none',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving…' : 'Save installation details'}
        </button>
      </div>
    );
  }

  /* ── SUBSIDY ── */
  if (role === 'subsidy') {
    return (
      <div>
        <SectionHead title="Subsidy Registration" sub="Complete government subsidy registration for this case" />

        {/* Status indicator */}
        <div style={{ padding: '12px 14px', borderRadius: '10px', background: caseData?.currentStage === 'Subsidy Registration Completed' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${caseData?.currentStage === 'Subsidy Registration Completed' ? '#bbf7d0' : '#fde68a'}`, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: caseData?.currentStage === 'Subsidy Registration Completed' ? '#16a34a' : '#f59e0b', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: caseData?.currentStage === 'Subsidy Registration Completed' ? '#065f46' : '#92400e' }}>
            {caseData?.currentStage === 'Subsidy Registration Completed' ? 'Subsidy Registration Completed ✓' : 'Subsidy registration pending'}
          </p>
        </div>

        <FieldInput label="Government Reference Number" icon={Hash} value={subsidyRefNumber} onChange={e => setSubsidyRefNumber(e.target.value)} placeholder="e.g. GOV-2026-XXXXX" />

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '7px' }}>
            <FileText style={{ width: '13px', height: '13px', color: '#94a3b8' }} /> Subsidy Notes
          </label>
          <textarea
            value={subsidyNote} onChange={e => setSubsidyNote(e.target.value)}
            placeholder="Application status, portal notes, pending docs…"
            style={{ width: '100%', minHeight: '80px', resize: 'vertical', padding: '10px 12px', fontSize: '13px', fontFamily: 'inherit', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', color: '#0f172a', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </div>

        <button onClick={() => handleSave({ subsidyRefNumber, subsidyNote })} disabled={saving} style={{
          padding: '10px', width: '100%', borderRadius: '10px', border: 'none',
          background: '#f1f5f9', color: '#334155',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1, marginBottom: '12px',
        }}>
          {saving ? 'Saving…' : 'Save details'}
        </button>

        <button
          onClick={() => handleSave({ newStage: 'Subsidy Registration Completed', remarks: `Subsidy registered. Ref: ${subsidyRefNumber}` })}
          disabled={saving}
          style={{
            padding: '12px', width: '100%', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #059669)', color: '#fff',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1,
            boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
          }}
        >
          ✓ Mark Subsidy Registration Completed
        </button>
        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
          This will automatically mark the entire case as <strong>Completed</strong>.
        </p>
      </div>
    );
  }

  /* ── ADMIN / OTHER ── show all info read-only ── */
  return (
    <div>
      <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Case Summary (All Departments)</p>

      {[
        { label: 'Assigned To',         value: caseData.assignedTo || '—' },
        { label: 'Loan Amount',          value: caseData.loanAmount ? `₹${Number(caseData.loanAmount).toLocaleString('en-IN')}` : '—' },
        { label: 'Site Visit Date',      value: caseData.siteVisitDate ? new Date(caseData.siteVisitDate).toLocaleDateString('en-IN') : '—' },
        { label: 'Subsidy Ref. Number',  value: caseData.subsidyRefNumber || '—' },
        { label: 'Subsidy Phase 1',      value: caseData.subsidyPhase1Amount ? `₹${Number(caseData.subsidyPhase1Amount).toLocaleString('en-IN')}` : '—' },
        { label: 'Subsidy Phase 2',      value: caseData.subsidyPhase2Amount ? `₹${Number(caseData.subsidyPhase2Amount).toLocaleString('en-IN')}` : '—' },
        { label: 'Banking Docs Verified', value: caseData.bankingChecklist ? `${caseData.bankingChecklist.filter(i => i.checked).length}/${caseData.bankingChecklist.length}` : '—' },
        { label: 'Electrical Checks',     value: caseData.electricalChecklist ? `${caseData.electricalChecklist.filter(i => i.checked).length}/${caseData.electricalChecklist.length}` : '—' },
      ].map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>{label}</span>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

export default DepartmentPanel;
