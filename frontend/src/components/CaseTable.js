import React, { useState } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Edit3, User, Phone, CheckCircle2, FolderOpen, Clock, Copy, ChevronRight, AlertTriangle } from 'lucide-react';

// ── Escalation level config ───────────────────────────────────────────────────
// Maps escalation_level 0-3 → display. 0 = no badge shown.
const ESCALATION_CONFIG = {
  3: { label: 'Critical', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  2: { label: 'Urgent',   bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  1: { label: 'Watch',   bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
};

const EscalationBadge = ({ c }) => {
  const level = c.escalation_level;
  if (!level) return null;
  const cfg = ESCALATION_CONFIG[level];
  if (!cfg) return null;

  const role = (localStorage.getItem('role') || '').toLowerCase();
  const userName = (localStorage.getItem('name') || '').toLowerCase();
  
  // Legacy stage mapper
  const mapLegacyStage = (s) => {
    if (s === 'Sent to Registration') return 'Sent to Sales';
    if (s === 'Inventory Processed' || s === 'Dispatch to Customer') return 'Installation Started';
    if (s === 'Installation Done') return 'Plant Activated';
    return s;
  };
  
  const currentStage = mapLegacyStage(c.current_stage || c.currentStage);
  
  // Fallback map in case stageToRole is not yet evaluated
  const deptMap = {
    'Sent to Sales': 'sales',
    'Registration Done': 'registration',
    'Phone Verification Done': 'registration',
    'Bank & Finance': 'banking',
    'Sent to Store': 'inventory',
    'Installation Started': 'field_installation',
    'Govt Approvals Pending': 'registration',
    'Plant Activated': 'field_installation',
    'QA Verified': 'technical',
    'Accounts Verified': 'accounts',
    'Sent to Subsidy': 'subsidy',
    'Subsidy Registration Completed': 'subsidy',
    'Completed': 'customer_service'
  };
  const deptInCharge = deptMap[currentStage];
  
  const isDeptInCharge = deptInCharge === role;
  const caseSalesPerson = (c.salesPerson || c.sales_person || '').toLowerCase();
  const isSalesPerson = Boolean(userName && caseSalesPerson && caseSalesPerson === userName);
  const isAdmin = role === 'admin';

  if (!isDeptInCharge && !isSalesPerson && !isAdmin) return null;

  const deptName = deptInCharge ? (deptInCharge.charAt(0).toUpperCase() + deptInCharge.slice(1).replace('_', ' ')) : 'Unknown Dept';
  const assignedSales = c.salesPerson || c.sales_person || 'Unknown Sales Person';
  const delayReason = c.delayReason || c.delay_reason || 'No specific reason provided';
  const delayBy = c.markedDelayedBy || c.marked_delayed_by || '';
  
  const tooltipText = `Pending at: ${deptName}\nEmployee: ${assignedSales}\n${delayBy ? `Marked by: ${delayBy}\n` : ''}Reason: ${delayReason}`;

  return (
    <span 
      title={tooltipText}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        fontSize: '10px', fontWeight: 700, padding: '2px 7px',
        borderRadius: '20px', background: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
        flexShrink: 0,
        cursor: 'help'
      }}
    >
      <AlertTriangle style={{ width: '9px', height: '9px' }} />
      {cfg.label}
    </span>
  );
};

// Legacy stage mapper for general functions
const mapLegacyStage = (s) => {
  if (s === 'Sent to Registration') return 'Sent to Sales';
  if (s === 'Inventory Processed' || s === 'Dispatch to Customer') return 'Installation Started';
  if (s === 'Installation Done') return 'Plant Activated';
  return s;
};

// Full pipeline order
const STAGES = [
  'Sent to Sales', 'Registration Done', 'Phone Verification Done', 'Bank & Finance',
  'Sent to Store', 'Installation Started', 'Govt Approvals Pending', 'Plant Activated',
  'QA Verified', 'Accounts Verified', 'Sent to Subsidy', 'Subsidy Registration Completed', 'Post-Installation Service',
];

// Which role owns write access at each stage
const stageToRole = {
  'Sent to Sales':                  'sales',
  'Registration Done':              'registration',
  'Phone Verification Done':        'registration',
  'Bank & Finance':                 'banking',
  'Sent to Store':                  'inventory',
  'Installation Started':           'field_installation',
  'Govt Approvals Pending':         'registration', // electrical also has access via canUpdateCase
  'Plant Activated':                'field_installation',
  'QA Verified':                    'technical_qa',
  'Accounts Verified':              'accountant',
  'Sent to Subsidy':                'subsidy',
  'Subsidy Registration Completed': 'subsidy',
  'Post-Installation Service':      'customer_service'
};

// The last stage each role is responsible for
const roleLastStage = {
  sales:              'Sent to Sales',
  registration:       'Phone Verification Done',
  electrical:         'Govt Approvals Pending',
  banking:            'Bank & Finance',
  inventory:          'Sent to Store',
  field_installation: 'Plant Activated',
  technical_qa:       'QA Verified',
  accountant:         'Accounts Verified',
  subsidy:            'Subsidy Registration Completed',
  customer_service:   'Post-Installation Service'
};

const canUpdateCase = (c) => {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  if (role === 'admin') return true;
  const stage = mapLegacyStage(c.current_stage || c.currentStage);
  if (stage === 'Govt Approvals Pending' && (role === 'registration' || role === 'electrical')) return true;
  return stageToRole[stage] === role;
};

// Returns department-relative status from THIS user's perspective
const getDeptStatus = (c) => {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  if (role === 'admin') return null; // admin sees global status

  const currentStage  = mapLegacyStage(c.current_stage || c.currentStage);
  const currentIdx    = STAGES.indexOf(currentStage);
  const myLastStage   = roleLastStage[role];
  const myLastIdx     = myLastStage ? STAGES.indexOf(myLastStage) : -1;

  // Case is at one of my stages — "In Progress" (I need to act)
  if (stageToRole[currentStage] === role || (currentStage === 'Govt Approvals Pending' && role === 'electrical')) {
    if (c.status === 'Delayed') {
      return { label: 'Delayed',      color: '#be123c', bg: '#fff1f2', border: '#fecdd3', icon: 'alert' };
    }
    return { label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: 'clock' };
  }

  // Case has moved PAST my last stage — my job is done
  if (myLastIdx >= 0 && currentIdx > myLastIdx) {
    return { label: 'Completed', color: '#15803d', bg: '#ecfdf5', border: '#bbf7d0', icon: 'check' };
  }

  // Case is before my stage (shouldn't normally happen but handle gracefully)
  if (role === 'sales') {
    return { label: 'Sent to Registration', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: 'check' };
  }
  return { label: 'Pending', color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: 'clock' };
};

const daysInStage = (stageStartTime) => {
  if (!stageStartTime) return null;
  const days = Math.floor((Date.now() - new Date(stageStartTime)) / 86400000);
  if (days === 0) return 'Started today';
  if (days === 1) return '1 day';
  return `${days} days`;
};

// Copy Tracking ID to clipboard
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy Tracking ID"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px 4px', borderRadius: '4px',
        color: copied ? '#059669' : '#94a3b8',
        transition: 'color 0.15s',
        display: 'inline-flex', alignItems: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = '#94a3b8'; }}
    >
      <Copy style={{ width: '11px', height: '11px' }} />
    </button>
  );
};

const CaseTable = ({ cases, onUpdateClick, onRefresh, isFinalLeads }) => {

  if (cases.length === 0) {
    return (
      <div className="table-wrap">
        <div style={{ padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
          }}>
            <FolderOpen style={{ width: '24px', height: '24px', color: 'var(--text-5)' }} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>No customers found</p>
          <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>No records match your current filter.</p>
        </div>
      </div>
    );
  }

  const headers = isFinalLeads ? 
    ['Quotation ID', 'Customer', 'Customer ID', 'Status', 'Time in Stage', 'Action'] : 
    ['Tracking ID', 'Customer', 'Customer ID', 'Status', 'Time in Stage', 'Action'];

  return (
    <>
      {/* ── DESKTOP TABLE ── */}
      <div className="table-wrap hide-on-mobile">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                {headers.map(h => (
                  <th key={h} style={{
                    padding: '11px 20px',
                    fontSize: '11px', fontWeight: 700,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    textAlign: h === 'Action' ? 'right' : 'left',
                    whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => {
                const trackingId = isFinalLeads ? (c.reference || c.tracking_id || c.trackingId || c.caseId || c.case_id || '—') : (c.tracking_id || c.trackingId || c.caseId || c.case_id || '—');
                const customerId = c.customer_id || c.customerId || '—';
                const deptSt    = getDeptStatus(c);
                const dayLabel  = daysInStage(c.stageStartTime || c.stage_start_time);
                const canUpdate = canUpdateCase(c);
                const isCompleted = (c.current_stage || c.currentStage) === 'Post-Installation Service' || c.status === 'Completed';

                return (
                  <tr
                    key={c._id || i}
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border-2)' : 'none',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {/* Tracking ID + Escalation badge */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
                            color: 'var(--color-primary)', letterSpacing: '0.02em',
                          }}>
                            {trackingId}
                          </span>
                          {trackingId !== '—' && <CopyButton text={trackingId} />}
                        </div>
                        <EscalationBadge c={c} />
                      </div>
                    </td>

                    {/* Customer Name + Phone */}
                    <td style={{ padding: '14px 20px', minWidth: '160px' }}>
                      <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px' }}>
                        {c.customerName}
                      </p>
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone style={{ width: '11px', height: '11px', color: 'var(--text-4)', flexShrink: 0 }} />
                          <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>{c.phone}</span>
                        </div>
                      )}
                    </td>

                    {/* Customer ID */}
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'monospace', fontSize: '11.5px',
                        color: 'var(--text-3)', letterSpacing: '0.01em',
                      }}>
                        {customerId === trackingId ? '—' : customerId}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px' }}>
                      {(() => {
                        const deptSt = getDeptStatus(c);
                        const icon =
                          deptSt?.icon === 'check' ? <CheckCircle2 style={{ width: '11px', height: '11px' }} /> :
                          deptSt?.icon === 'alert' ? <span style={{ fontSize: '11px' }}>⚠</span> :
                          <Clock style={{ width: '11px', height: '11px' }} />;
                        const label    = deptSt?.label || c.status;
                        const bg       = deptSt?.bg    || (isCompleted ? '#ecfdf5' : c.status === 'Delayed' ? '#fff1f2' : '#eff6ff');
                        const color    = deptSt?.color  || (isCompleted ? '#15803d' : c.status === 'Delayed' ? '#be123c' : '#1d4ed8');
                        const border   = deptSt?.border || (isCompleted ? '#bbf7d0' : c.status === 'Delayed' ? '#fecdd3' : '#bfdbfe');
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            fontSize: '11.5px', fontWeight: 600, padding: '4px 10px',
                            borderRadius: '20px', background: bg, color, border: `1px solid ${border}`,
                          }}>
                            {icon}
                            {label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Time in Stage */}
                    <td style={{ padding: '14px 20px' }}>
                      {dayLabel && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock style={{ width: '12px', height: '12px', color: '#94a3b8', flexShrink: 0 }} />
                          <span style={{
                            fontSize: '12px',
                            color: c.status === 'Delayed' ? '#be123c' : '#64748b',
                            fontWeight: c.status === 'Delayed' ? 600 : 400,
                          }}>
                            {dayLabel}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      {canUpdate ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUpdateClick(c); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                            background: 'var(--color-primary)', color: '#fff',
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: 'var(--shadow-brand)',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.transform = ''; }}
                        >
                          <Edit3 style={{ width: '13px', height: '13px' }} />
                          Update
                        </button>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: 600 }}>
                          <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                          Done
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11.5px', color: 'var(--text-4)' }}>{cases.length} customer{cases.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── MOBILE CARDS (hidden on desktop via .mobile-only CSS) ── */}
      <div className="mobile-only" style={{ flexDirection: 'column', gap: '12px' }}>
        {cases.map((c, i) => {
          const trackingId = isFinalLeads ? (c.reference || c.tracking_id || c.trackingId || c.caseId || c.case_id || '—') : (c.tracking_id || c.trackingId || c.caseId || c.case_id || '—');
          const customerId = c.customer_id || c.customerId || '—';
          const deptSt    = getDeptStatus(c);
          const dayLabel  = daysInStage(c.stageStartTime || c.stage_start_time);
          const canUpdate = canUpdateCase(c);
          const isCompleted = (c.current_stage || c.currentStage) === 'Post-Installation Service' || c.status === 'Completed';

          return (
            <div
              key={`mob-${c._id || i}`}
              onClick={() => canUpdate ? onUpdateClick(c) : undefined}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '10px',
                cursor: canUpdate ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s ease, transform 0.15s ease',
              }}
              onMouseEnter={e => { if (canUpdate) { e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.transform = ''; }}
            >
              {/* Top row: Tracking ID + Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase' }}>{isFinalLeads ? 'Quotation ID:' : 'Tracking ID:'}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {trackingId}
                    </span>
                    {trackingId !== '—' && <CopyButton text={trackingId} />}
                  </div>
                  {customerId !== trackingId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-4)', fontWeight: 700, textTransform: 'uppercase' }}>Customer ID:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--text-3)' }}>
                        {customerId}
                      </span>
                    </div>
                  )}
                </div>
                {/* Status badge - mobile */}
                {(() => {
                  const deptSt = getDeptStatus(c);
                  const label  = deptSt?.label || c.status;
                  const bg     = deptSt?.bg    || (isCompleted ? '#ecfdf5' : c.status === 'Delayed' ? '#fff1f2' : '#eff6ff');
                  const color  = deptSt?.color  || (isCompleted ? '#15803d' : c.status === 'Delayed' ? '#be123c' : '#1d4ed8');
                  const border = deptSt?.border || (isCompleted ? '#bbf7d0' : c.status === 'Delayed' ? '#fecdd3' : '#bfdbfe');
                  return (
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
                      background: bg, color, border: `1px solid ${border}`,
                    }}>
                      {label}
                    </span>
                  );
                })()}

              </div>

              {/* Customer name + phone + escalation badge */}
                <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{c.customerName}</p>
                  <EscalationBadge c={c} />
                </div>
                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone style={{ width: '11px', height: '11px', color: 'var(--text-4)' }} />
                    <span style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>{c.phone}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-2)', paddingTop: '10px' }}>
                {dayLabel ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock style={{ width: '12px', height: '12px', color: 'var(--text-4)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{dayLabel}</span>
                  </div>
                ) : <span />}

                {isCompleted ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontSize: '12.5px', fontWeight: 600 }}>
                    <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                    Done
                  </div>
                ) : canUpdate ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onUpdateClick(c); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                      background: 'var(--color-primary)', color: '#fff',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      boxShadow: 'var(--shadow-brand)',
                    }}
                  >
                    <Edit3 style={{ width: '13px', height: '13px' }} />
                    Update
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontSize: '12.5px', fontWeight: 600 }}>
                    <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                    Done
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {cases.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '8px 0' }}>
            {cases.length} customer{cases.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </>
  );
};

export default CaseTable;
