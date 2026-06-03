import React, { useState, useEffect } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, User } from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'Sent to Sales',                  label: 'Sales Review',  color: '#6366f1' },
  { key: 'Registration Done',              label: 'Registration',  color: '#8b5cf6' },
  { key: 'Phone Verification Done',        label: 'Verification',  color: '#d946ef' },
  { key: 'Bank & Finance',                 label: 'Banking',       color: '#0ea5e9' },
  { key: 'Sent to Store',                  label: 'Inventory',     color: '#f59e0b' },
  { key: 'Installation Started',           label: 'Installation',  color: '#10b981' },
  { key: 'Govt Approvals Pending',         label: 'Govt Approval', color: '#84cc16' },
  { key: 'Plant Activated',                label: 'Plant Active',  color: '#059669' },
  { key: 'QA Verified',                    label: 'QA Check',      color: '#0d9488' },
  { key: 'Accounts Verified',              label: 'Accounting',    color: '#2563eb' },
  { key: 'Sent to Subsidy',                label: 'Subsidy',       color: '#facc15' },
  { key: 'Subsidy Registration Completed', label: 'Subsidy Done',  color: '#84cc16' },
  { key: 'Post-Installation Service',      label: 'Completed',     color: '#16a34a' },
];

const StatusBadge = ({ status }) => {
  const cfg = {
    'Completed':   { bg: '#f0fdf4', color: '#16a34a', icon: CheckCircle2, label: 'Completed' },
    'In Progress': { bg: '#eff6ff', color: '#3b82f6', icon: Clock,         label: 'In Progress' },
    'Delayed':     { bg: '#fef2f2', color: '#ef4444', icon: AlertTriangle, label: 'Delayed' },
    'Processing':  { bg: '#fffbeb', color: '#f59e0b', icon: Clock,         label: 'Processing' },
    'Sent to Registration': { bg: '#fffbeb', color: '#f59e0b', icon: Clock, label: 'Processing' },
    'Approved':    { bg: '#f0fdf4', color: '#16a34a', icon: CheckCircle2, label: 'Approved' },
    'Rejected':    { bg: '#fef2f2', color: '#ef4444', icon: AlertTriangle, label: 'Rejected' },
  };
  const c = cfg[status] || cfg['In Progress'];
  const Icon = c.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      background: c.bg, color: c.color, fontSize: '11px', fontWeight: 700,
    }}>
      <Icon style={{ width: '10px', height: '10px' }} />
      {c.label}
    </span>
  );
};

const PipelineBar = ({ pipeline, compact = false }) => {
  if (!pipeline || pipeline.length === 0) return null;

  const completedIndex = pipeline.findIndex(p => p.key === 'Post-Installation Service' && p.reached);
  const currentIdx = pipeline.findIndex(p => p.current);
  const displayStages = compact ? pipeline.filter((_, i) => i % 2 === 0 || i === pipeline.length - 1) : pipeline;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'nowrap', overflow: 'hidden' }}>
      {pipeline.map((stage, i) => {
        const isCompleted = stage.completed || (stage.reached && !stage.current && i < (currentIdx >= 0 ? currentIdx : pipeline.length));
        const isCurrent   = stage.current;
        const isReached   = stage.reached;
        const isFinal     = stage.key === 'Post-Installation Service' && stage.reached;

        const bgColor = isFinal     ? '#16a34a'
                      : (isCurrent || isCompleted) ? stage.color
                      : '#f1f5f9';
        const textColor = (isCurrent || isCompleted || isFinal) ? '#fff' : '#cbd5e1';
        const fontWeight = (isCurrent || isCompleted || isFinal) ? 700 : 500;

        return (
          <React.Fragment key={stage.key}>
            <div
              title={stage.key}
              style={{
                flex: compact ? '0 0 auto' : 1,
                minWidth: compact ? 'auto' : 0,
                padding: compact ? '3px 6px' : '4px 6px',
                borderRadius: '4px',
                background: bgColor,
                textAlign: 'center',
                fontSize: compact ? '9px' : '10px',
                fontWeight,
                color: textColor,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'all 0.2s ease',
                border: isCurrent ? `1.5px solid ${stage.color}` : '1.5px solid transparent',
                boxShadow: isCurrent ? `0 0 0 2px ${stage.color}22` : 'none',
              }}
            >
              {compact ? stage.label.slice(0, 4) : stage.label}
            </div>
            {i < pipeline.length - 1 && (
              <ChevronRight style={{
                width: '10px', height: '10px', flexShrink: 0,
                color: isReached ? '#94a3b8' : '#e2e8f0',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const LeadCard = ({ lead }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.08)' : 'var(--shadow-card)',
        borderColor: expanded ? 'var(--color-primary)' : undefined,
      }}
      onClick={() => setExpanded(v => !v)}
      onMouseEnter={e => { if (!expanded) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)'; }}
      onMouseLeave={e => { if (!expanded) e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: expanded ? '12px' : 0 }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'var(--color-primary-light)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <User style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.customerName}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-4)', fontFamily: 'monospace', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>{lead.quotationId}</span>
            {lead.trackingId && (
              <>
                <span style={{ color: 'var(--text-5)' }}>|</span>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{lead.trackingId}</span>
              </>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <StatusBadge status={lead.caseStatus} />
          <span style={{
            fontSize: '10px', color: 'var(--text-4)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease', display: 'inline-block',
          }}>▶</span>
        </div>
      </div>

      {/* Collapsed: compact pipeline */}
      {!expanded && (
        <div style={{ marginTop: '10px' }}>
          <PipelineBar pipeline={lead.pipeline} compact />
        </div>
      )}

      {/* Expanded: full pipeline + details */}
      {expanded && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-4)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Current Stage: <span style={{ color: 'var(--color-primary)' }}>{lead.currentStage}</span>
            </p>
            <PipelineBar pipeline={lead.pipeline} />
          </div>

          <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--text-4)', fontWeight: 600, marginBottom: '2px' }}>CREATED</p>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>
                {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {lead.stageIndex >= 0 && (
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-4)', fontWeight: 600, marginBottom: '2px' }}>PROGRESS</p>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>
                  {lead.stageIndex + 1} / {PIPELINE_STAGES.length} stages
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LeadTracker = ({ userId, userName, userRole }) => {
  const [leads, setLeads]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all'); // all | active | completed | delayed

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const body = { action: 'lead_tracking' };
        if (userId)   body.userId   = userId;
        if (userName) body.userName = userName;
        if (userRole) body.userRole = userRole;
        const data = await edgeFetch(EDGE.analytics, body);
        setLeads(data || []);
      } catch (err) {
        console.error('Lead tracking error:', err);
        toast.error('Could not load lead tracking data.');
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, userName, userRole]);

  const filtered = leads.filter(l => {
    if (filter === 'active')    return l.caseStatus === 'In Progress' || l.caseStatus === 'Processing' || l.caseStatus === 'Submitted' || l.caseStatus === 'Sent to Registration';
    if (filter === 'completed') return l.caseStatus === 'Completed' || l.caseStatus === 'Approved';
    if (filter === 'delayed')   return l.caseStatus === 'Delayed' || l.caseStatus === 'Rejected';
    return true;
  });

  const counts = {
    all:       leads.length,
    active:    leads.filter(l => l.caseStatus === 'In Progress' || l.caseStatus === 'Processing' || l.caseStatus === 'Submitted' || l.caseStatus === 'Sent to Registration').length,
    completed: leads.filter(l => l.caseStatus === 'Completed'   || l.caseStatus === 'Approved').length,
    delayed:   leads.filter(l => l.caseStatus === 'Delayed'     || l.caseStatus === 'Rejected').length,
  };

  const tabs = [
    { key: 'all',       label: 'All Leads',  count: counts.all },
    { key: 'active',    label: 'Active',     count: counts.active },
    { key: 'completed', label: 'Completed',  count: counts.completed },
    { key: 'delayed',   label: 'Delayed',    count: counts.delayed },
  ];

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
      ))}
    </div>
  );

  return (
    <div>
      {/* Pipeline Legend */}
      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--color-border)',
        borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Lead Pipeline Flow
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', rowGap: '4px' }}>
          {PIPELINE_STAGES.map((s, i) => (
            <React.Fragment key={s.key}>
              <span style={{
                fontSize: '10px', fontWeight: 600, padding: '2px 8px',
                borderRadius: '4px', background: `${s.color}18`, color: s.color,
              }}>{s.label}</span>
              {i < PIPELINE_STAGES.length - 1 && (
                <ChevronRight style={{ width: '10px', height: '10px', color: '#cbd5e1' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding: '5px 12px', borderRadius: '999px', border: '1px solid',
              borderColor: filter === t.key ? 'var(--color-primary)' : 'var(--color-border)',
              background: filter === t.key ? 'var(--color-primary)' : 'transparent',
              color: filter === t.key ? '#fff' : 'var(--text-3)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
            <span style={{
              fontSize: '10px', fontWeight: 700,
              background: filter === t.key ? 'rgba(255,255,255,0.25)' : 'var(--surface-2)',
              color: filter === t.key ? '#fff' : 'var(--text-4)',
              padding: '1px 5px', borderRadius: '999px',
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Lead Cards */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'var(--surface-2)', borderRadius: '12px',
          border: '1px dashed var(--color-border)',
        }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '6px' }}>No leads yet</p>
          <p style={{ fontSize: '12px', color: 'var(--text-4)' }}>
            {filter === 'all' ? 'Your leads will appear here once you start processing cases.' : `No ${filter} leads found.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(lead => (
            <LeadCard key={lead.id || lead.caseId} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LeadTracker;
