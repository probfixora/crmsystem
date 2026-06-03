import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { Users, ChevronRight, ArrowLeft, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

const DEPT_COLORS = {
  sales:              { bg: '#eff6ff', color: '#3b82f6', border: '#bfdbfe' },
  registration:       { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  banking:            { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  inventory:          { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' },
  field_installation: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  electrical:         { bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' },
  subsidy:            { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' },
};

const StatChip = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', flex: 1 }}>
    <p style={{ fontSize: '18px', fontWeight: 800, color: color || 'var(--text-1)', lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: '10px', color: 'var(--text-4)', marginTop: '2px', fontWeight: 500 }}>{label}</p>
  </div>
);

const MemberRow = ({ member, deptColor, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
      border: '1px solid var(--color-border)', background: 'var(--color-surface)',
      transition: 'all 0.15s ease',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = deptColor; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
  >
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
      background: `${deptColor}20`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: deptColor,
    }}>
      {member.name?.[0]?.toUpperCase() || 'U'}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
      <p style={{ fontSize: '11px', color: 'var(--text-4)' }}>{member.employeeId}</p>
    </div>
    <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{member.todayActions}</p>
        <p style={{ fontSize: '9px', color: 'var(--text-4)', fontWeight: 600 }}>TODAY</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{member.monthActions}</p>
        <p style={{ fontSize: '9px', color: 'var(--text-4)', fontWeight: 600 }}>MONTH</p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{member.totalCasesTouched}</p>
        <p style={{ fontSize: '9px', color: 'var(--text-4)', fontWeight: 600 }}>TOTAL</p>
      </div>
    </div>
    <ChevronRight style={{ width: '16px', height: '16px', color: 'var(--text-4)', flexShrink: 0 }} />
  </div>
);

const DeptCard = ({ dept, onMemberClick }) => {
  const [expanded, setExpanded] = useState(false);
  const colors = DEPT_COLORS[dept.dept] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };

  return (
    <div style={{
      border: `1px solid ${expanded ? colors.color : 'var(--color-border)'}`,
      borderRadius: '14px', overflow: 'hidden',
      background: 'var(--color-surface)',
      boxShadow: expanded ? '0 4px 24px rgba(0,0,0,0.08)' : 'var(--shadow-card)',
      transition: 'all 0.2s ease',
    }}>
      {/* Card Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '18px 20px', cursor: 'pointer',
          background: expanded ? colors.bg : 'transparent',
          transition: 'background 0.2s ease',
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: colors.bg, border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users style={{ width: '20px', height: '20px', color: colors.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>{dept.label}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-4)' }}>{dept.memberCount} team member{dept.memberCount !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginRight: '12px' }}>
          <StatChip label="In Queue" value={dept.queueCount} color={dept.queueCount > 0 ? colors.color : undefined} />
          <StatChip label="Members" value={dept.memberCount} />
        </div>
        <span style={{
          fontSize: '12px', color: colors.color, fontWeight: 700,
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease', display: 'inline-block',
        }}>▶</span>
      </div>

      {/* Expanded Member List */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 10px' }}>
            Team Members
          </p>
          {dept.members.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', textAlign: 'center', padding: '20px', background: 'var(--surface-2)', borderRadius: '10px' }}>
              No active members in this department
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dept.members.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  deptColor={colors.color}
                  onClick={() => onMemberClick(m, dept)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DepartmentPortal = ({ onLogout }) => {
  const navigate   = useNavigate();
  const [depts, setDepts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    edgeFetch(EDGE.analytics, { action: 'dept_overview' })
      .then(data => setDepts(data || []))
      .catch(() => toast.error('Could not load department data.'))
      .finally(() => setLoading(false));
  }, []);

  const card = (style = {}) => ({
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: '20px', ...style,
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px', maxWidth: '1400px', boxSizing: 'border-box' }}>
        <Header title="Department Portal" subtitle="Overview of all departments and team members" roleBadge="Admin" onLogout={onLogout} />

        {/* Summary bar */}
        {!loading && depts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total Departments', val: depts.length, icon: TrendingUp, color: '#6366f1' },
              { label: 'Total Team Members', val: depts.reduce((s, d) => s + d.memberCount, 0), icon: Users, color: '#10b981' },
              { label: 'Cases in Queue', val: depts.reduce((s, d) => s + d.queueCount, 0), icon: Clock, color: '#f59e0b' },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} style={{ ...card(), display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '20px', height: '20px', color }} />
                </div>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{val}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', marginTop: '3px' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '14px' }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {depts.map(dept => (
              <DeptCard
                key={dept.dept}
                dept={dept}
                onMemberClick={(member, dept) =>
                  navigate(`/department-portal/${member.id}`, { state: { member, dept } })
                }
              />
            ))}
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
};

export default DepartmentPortal;
