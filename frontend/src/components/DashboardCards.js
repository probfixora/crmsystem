import React from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Card definitions per role ────────────────────────────────────────── */
const defaultCardDefs = [
  { title: 'Total Projects',  key: 'totalCases',      icon: 'ti ti-folders',      label: 'All time',         colorClass: 'stat-card--blue'  },
  { title: 'In Progress',     key: 'inProgressCases', icon: 'ti ti-clock',        label: 'Active work',      colorClass: 'stat-card--amber' },
  { title: 'Completed',       key: 'completedCases',  icon: 'ti ti-circle-check', label: 'Fulfilled',        colorClass: 'stat-card--green' },
  { title: 'Needs Attention', key: 'delayedCases',    icon: 'ti ti-alert-circle', label: 'Flagged today',    colorClass: 'stat-card--red'   },
];

const salesCardDefs = [
  { title: 'Total Quotations', key: 'totalCases',      icon: 'ti ti-folders',      label: 'All time',              colorClass: 'stat-card--blue'   },
  { title: 'In Process',       key: 'inProgressCases', icon: 'ti ti-clock',        label: 'Being worked on',        colorClass: 'stat-card--amber'  },
  { title: 'Sent to Reg',      key: 'completedCases',  icon: 'ti ti-circle-check', label: 'Sent to Registration',   colorClass: 'stat-card--green'  },
  { title: 'Rejected',         key: 'delayedCases',    icon: 'ti ti-alert-circle', label: 'Needs follow-up',        colorClass: 'stat-card--red'    },
];

const navMap = {
  totalCases: '/cases', inProgressCases: '/cases?tab=active',
  completedCases: '/cases?tab=completed', delayedCases: '/cases?tab=delayed',
};
const salesNav = {
  totalCases: '/quotation-list', inProgressCases: '/quotation-list',
  completedCases: '/approved-quotations', delayedCases: '/quotation-list',
};

/* ── Trend arrow helper ──────────────────────────────────────────────── */
const getTrend = (stats, prevStats, key) => {
  const cur  = stats?.[key] ?? 0;
  const prev = prevStats?.[key];
  if (prev === undefined || prev === null) return { text: null, cls: 'neutral' };
  const diff = cur - prev;
  if (diff > 0) return { text: `+${diff} this week`, cls: 'positive' };
  if (diff < 0) return { text: `${diff} this week`, cls: 'negative' };
  return { text: null, cls: 'neutral' };
};

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD CARDS
═══════════════════════════════════════════════════════════════════════ */
const DashboardCards = ({ stats, role, prevStats }) => {
  const navigate = useNavigate();
  const cardDefs = role === 'sales' ? salesCardDefs : defaultCardDefs;
  const nav      = role === 'sales' ? salesNav : navMap;

  return (
    <div
      className="dash-cards-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px',
        marginBottom: '24px',
      }}
    >
      {cardDefs.map(({ title, key, icon, label, colorClass }) => {
        const trend  = getTrend(stats, prevStats, key);
        const value  = stats?.[key] ?? 0;

        return (
          <div
            key={key}
            onClick={() => navigate(nav[key])}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(nav[key])}
            aria-label={`${title}: ${value}`}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-card)',
              padding: '24px',
              height: '160px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
            }}
          >
            {/* Top row: Label and Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-4)', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Geist, sans-serif' }}>
                {title}
              </span>
              <i className={icon} style={{ fontSize: '20px', color: key === 'totalCases' ? 'var(--color-primary)' : 'var(--text-4)' }} />
            </div>

            {/* Bottom row: Value and Trend */}
            <div>
              <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-1)', fontFamily: 'Geist, sans-serif', lineHeight: 1 }}>
                {value.toLocaleString()}
              </p>
              {trend.text && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 700, marginTop: '8px', color: trend.cls === 'positive' ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                  {trend.cls === 'positive' ? (
                    <i className="ti ti-trending-up" style={{ fontSize: '18px' }} />
                  ) : trend.cls === 'negative' ? (
                    <i className="ti ti-trending-down" style={{ fontSize: '18px' }} />
                  ) : null}
                  <span>{trend.text}</span>
                </div>
              )}
              {!trend.text && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, marginTop: '8px', color: 'var(--text-4)' }}>
                  <i className="ti ti-clock" style={{ fontSize: '16px' }} />
                  <span>Updated Just Now</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardCards;
