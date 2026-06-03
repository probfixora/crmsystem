import React from 'react';

const STAGES = [
  'Registration Done', 'Phone Verification Done', 'Bank & Finance',
  'Sent to Store', 'Installation Done', 'Plant Activated',
  'Subsidy Registration Completed', 'Completed',
];

const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Action type badge config ──────────────────────────────────────────────────
// Maps action_type values → display label + colors.
// Falls back gracefully for entries without action_type (old records default to 'stage_update').
const ACTION_TYPE_CONFIG = {
  stage_update:       { label: 'Stage Updated',   bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  case_created:       { label: 'Registered',       bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  case_deleted:       { label: 'Deleted',           bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#f43f5e' },
  finance_update:     { label: 'Finance Updated',  bg: '#fefce8', text: '#a16207', border: '#fef08a', dot: '#eab308' },
  document_verified:  { label: 'Doc Verified',     bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#16a34a' },
  delay_flagged:      { label: 'Delay Flagged',    bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  delay_cleared:      { label: 'Delay Cleared',    bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  dispatch:           { label: 'Dispatched',        bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', dot: '#8b5cf6' },
  assignment_changed: { label: 'Reassigned',        bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', dot: '#0ea5e9' },
  priority_changed:   { label: 'Priority Changed', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  subsidy_update:     { label: 'Subsidy Updated',  bg: '#fdf4ff', text: '#7e22ce', border: '#f5d0fe', dot: '#a855f7' },
  comment_added:      { label: 'Comment',           bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  system_auto:        { label: 'Auto',              bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', dot: '#94a3b8' },
  details_updated:    { label: 'Details Updated',  bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  download_details:   { label: 'Downloaded PDF',   bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4', dot: '#14b8a6' },
};

const getActionConfig = (actionType) =>
  ACTION_TYPE_CONFIG[actionType] || ACTION_TYPE_CONFIG['stage_update'];

const CaseTimeline = ({ history = [], currentStage }) => {
  if (!history || history.length === 0) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-4)', fontSize: '13px' }}>No history recorded yet.</p>
        <p style={{ color: 'var(--text-5)', fontSize: '11px', marginTop: '6px' }}>
          History is logged each time a stage is updated.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {history.map((entry, idx) => {
          const ts         = entry.created_at || entry.timestamp;
          const dept       = entry.department || '';
          const user       = entry.updated_by || entry.updatedBy || 'Unknown';
          const stage      = entry.stage || '';
          const remarks    = entry.remarks || '';
          const actionType = entry.action_type || 'stage_update';
          const isLast     = idx === history.length - 1;
          const cfg        = getActionConfig(actionType);

          return (
            <div key={idx} style={{ display: 'flex', gap: '12px', paddingBottom: isLast ? 0 : '16px', position: 'relative' }}>
              {/* Connector line */}
              {!isLast && (
                <div style={{
                  position: 'absolute', left: '15px', top: '30px', bottom: 0,
                  width: '2px', background: 'linear-gradient(to bottom, #4338ca33, #e2e8f0)',
                }} />
              )}

              {/* Step dot — color reflects action type for the latest, numbered for older */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: isLast ? `linear-gradient(135deg, ${cfg.dot}, ${cfg.dot}cc)` : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                color: isLast ? '#fff' : '#94a3b8',
                boxShadow: isLast ? `0 0 0 4px ${cfg.border}` : 'none',
                zIndex: 1,
              }}>
                {idx + 1}
              </div>

              {/* Entry card */}
              <div style={{
                flex: 1,
                background: isLast ? cfg.bg : '#f8fafc',
                border: `1px solid ${isLast ? cfg.border : '#e2e8f0'}`,
                borderRadius: '10px', padding: '10px 14px', marginTop: '2px',
              }}>
                {/* Stage label + action type badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', gap: '8px' }}>
                  <p style={{ fontSize: '12.5px', fontWeight: 700, color: isLast ? cfg.text : '#475569', margin: 0 }}>
                    {stage}
                  </p>
                  {/* Action type badge — always visible for clarity */}
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
                    background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {cfg.label}
                  </span>
                </div>

                {/* User · Dept · Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, color: '#6366f1',
                    background: '#eef2ff', padding: '2px 8px', borderRadius: '20px',
                  }}>
                    {user}
                  </span>
                  {dept && (
                    <span style={{
                      fontSize: '11px', color: '#64748b',
                      background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px',
                    }}>
                      {dept}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
                    {formatDate(ts)}
                  </span>
                </div>

                {/* Remarks */}
                {remarks && (
                  <p style={{
                    fontSize: '11.5px', color: '#64748b', fontStyle: 'italic',
                    background: '#fff', padding: '5px 8px', borderRadius: '6px',
                    border: '1px solid #e2e8f0', marginTop: '4px',
                  }}>
                    "{remarks}"
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CaseTimeline;
