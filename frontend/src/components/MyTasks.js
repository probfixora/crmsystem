import React, { useState, useEffect, useCallback } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, AlertTriangle, Inbox, Zap, User, Phone, MapPin } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';
import CaseDrawer from './CaseDrawer';
import Footer from './Footer';

const STAGES = [
  'Registration Done','Phone Verification Done','Bank & Finance',
  'Sent to Store','Installation Done','Plant Activated',
  'Subsidy Registration Completed','Completed',
];

const roleStageMap = {
  admin: STAGES,
  sales: [],
  registration: ['Registration Done', 'Phone Verification Done'],
  banking: ['Bank & Finance'],
  inventory: ['Sent to Store'],
  field_installation: ['Installation Done', 'Plant Activated'],
  subsidy: ['Subsidy Registration Completed'],
};

const stageColors = {
  'Registration Done':              '#6366f1',
  'Banking In Process':             '#f59e0b',
  'Loan Approved / Cash Confirmed': '#f97316',
  'Sent to Store':                  '#8b5cf6',
  'Installation Done':              '#2563EB',
  'Electrical Checked':             '#0ea5e9',
  'Plant Activated':                '#14b8a6',
  'Subsidy Registration Completed': '#ec4899',
  'Completed':                      '#22c55e',
};

const timeInStage = (stageStart) => {
  if (!stageStart) return '';
  const diff = Math.floor((Date.now() - new Date(stageStart)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day';
  return `${diff} days`;
};

const MyTasks = ({ onLogout }) => {
  const [cases, setCases]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const navigate = useNavigate();

  const userRole = localStorage.getItem('role') || '';
  const userName = localStorage.getItem('name') || 'there';
  const myStages = roleStageMap[userRole] || [];

  const fetchCases = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const raw = await edgeFetch(EDGE.workflow, { action: 'get_all' });
      const allMapped = (raw || []).map(c => ({
        ...c,
        caseId:         c.id ?? c.case_id ?? c.caseId,
        customerId:     c.customer_id ?? c.customerId,
        customerName:   c.customer_name ?? c.customerName,
        currentStage:   c.current_stage ?? c.currentStage,
        stageStartTime: c.stage_start_time ?? c.stageStartTime,
        delayReason:    c.delay_reason ?? c.delayReason,
        assignedTo:     c.assigned_to ?? c.assignedTo,
      }));

      // Registration: backend already filtered by created_by — show all returned
      // Others: filter to only their active stage cases
      const myCases = userRole === 'registration' || userRole === 'admin'
        ? allMapped
        : allMapped.filter(c => myStages.includes(c.currentStage));

      setCases(myCases.sort((a, b) => new Date(a.stageStartTime) - new Date(b.stageStartTime)));
    } catch {
      toast.error('Could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, [navigate, userRole, myStages.join(',')]); // eslint-disable-line

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const urgent  = cases.filter(c => c.priority === 'urgent');
  const delayed  = cases.filter(c => c.status === 'Delayed' && c.priority !== 'urgent');
  const normal   = cases.filter(c => c.status !== 'Delayed' && c.priority !== 'urgent');

  const grouped = [
    ...(urgent.length  ? [{ label: '🔴 Urgent',  items: urgent,  color: '#f97316' }] : []),
    ...(delayed.length ? [{ label: '⚠️ Delayed', items: delayed, color: '#f43f5e' }] : []),
    ...(normal.length  ? [{ label: '📋 In Queue', items: normal, color: '#6366f1' }] : []),
  ];

  if (loading) return (
    <div className="main-loading">
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>Loading your tasks…</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Breadcrumbs />
        <Header title="My Tasks" subtitle="Your personal work queue — oldest cases first" onLogout={onLogout} />

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { icon: Inbox,        label: 'Total in queue', val: cases.length,         color: '#6366f1', bg: '#eef2ff' },
            { icon: AlertTriangle, label: 'Urgent',        val: urgent.length,         color: '#c2410c', bg: '#fff7ed' },
            { icon: Clock,        label: 'Delayed',        val: delayed.length,        color: '#be123c', bg: '#fff1f2' },
            { icon: CheckCircle2, label: 'Normal',         val: normal.length,         color: '#15803d', bg: '#ecfdf5' },
          ].map(({ icon: Icon, label, val, color, bg }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', background: bg, border: `1px solid ${color}22` }}>
              <Icon style={{ width: '14px', height: '14px', color }} />
              <span style={{ fontSize: '12.5px', fontWeight: 600, color }}>{val} {label}</span>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {cases.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>You're all caught up!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>
              {userRole === 'registration'
                ? 'No customers assigned to you yet. Create a new customer to get started.'
                : `No customers are currently waiting in your stage (${myStages.join(', ') || 'N/A'}).`
              }
            </p>
          </div>
        )}

        {/* Grouped task cards */}
        {grouped.map(group => (
          <div key={group.label} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '3px', height: '18px', borderRadius: '99px', background: group.color }} />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {group.label} — {group.items.length}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.items.map(c => {
                const stageIdx = STAGES.findIndex(s => s === c.currentStage);
                const pct = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGES.length) * 100) : 0;
                const daysInStage = Math.floor((Date.now() - new Date(c.stageStartTime)) / 86400000);

                return (
                  <div
                    key={c.caseId}
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '16px 20px',
                      boxShadow: 'var(--shadow-sm)',
                      borderLeft: `4px solid ${c.priority === 'urgent' ? '#f97316' : c.status === 'Delayed' ? '#f43f5e' : '#6366f1'}`,
                      transition: 'box-shadow 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                    onClick={() => setSelectedCase(c)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        {/* Case ID + priority */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand)' }}>{c.caseId}</span>
                          {c.priority === 'urgent' && (
                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#fff7ed', color: '#c2410c', padding: '1px 7px', borderRadius: '20px', border: '1px solid #fed7aa' }}>🔴 URGENT</span>
                          )}
                          {c.status === 'Delayed' && (
                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#fff1f2', color: '#be123c', padding: '1px 7px', borderRadius: '20px', border: '1px solid #fecdd3' }}>Delayed</span>
                          )}
                        </div>

                        {/* Customer */}
                        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>{c.customerName}</p>

                        {/* Info row */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {c.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone style={{ width: '11px', height: '11px', color: 'var(--text-5)' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{c.phone}</span>
                            </div>
                          )}
                          {c.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin style={{ width: '11px', height: '11px', color: 'var(--text-5)' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{c.address}</span>
                            </div>
                          )}
                          {c.assignedTo && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User style={{ width: '11px', height: '11px', color: 'var(--text-5)' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{c.assignedTo}</span>
                            </div>
                          )}
                        </div>

                        {/* Delay reason */}
                        {c.delayReason && (
                          <p style={{ fontSize: '11.5px', color: '#be123c', marginTop: '6px', fontStyle: 'italic' }}>
                            ⚠ "{c.delayReason}"
                          </p>
                        )}
                      </div>

                      {/* Right side: stage + time + actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        {/* Stage badge */}
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                          background: `${stageColors[c.currentStage]}18`, color: stageColors[c.currentStage] || 'var(--text-3)',
                          border: `1px solid ${stageColors[c.currentStage]}30`,
                        }}>
                          {c.currentStage}
                        </span>

                        {/* Time in stage */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock style={{ width: '11px', height: '11px', color: daysInStage >= 3 ? '#f43f5e' : 'var(--text-5)' }} />
                          <span style={{ fontSize: '11.5px', color: daysInStage >= 3 ? '#f43f5e' : 'var(--text-4)', fontWeight: daysInStage >= 3 ? 700 : 400 }}>
                            {timeInStage(c.stageStartTime)}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '80px' }}>
                          <div style={{ height: '3px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: stageColors[c.currentStage] || 'var(--brand)', borderRadius: '99px' }} />
                          </div>
                          <p style={{ fontSize: '10px', color: 'var(--text-5)', textAlign: 'right', marginTop: '2px' }}>
                            {stageIdx + 1}/{STAGES.length}
                          </p>
                        </div>

                        {/* Open button */}
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedCase(c); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
                            color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            boxShadow: 'var(--shadow-brand)',
                          }}
                        >
                          <Zap style={{ width: '12px', height: '12px' }} /> Update
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

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

export default MyTasks;
