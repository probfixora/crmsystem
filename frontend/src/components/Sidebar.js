import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANDING } from '../config/branding';

/* ── Icon map — Tabler Icons class names ─────────────────────────────────── */
const ICONS = {
  'Dashboard':           'ti ti-layout-dashboard',
  'Finance':             'ti ti-report-money',
  'All Customers':       'ti ti-users',
  'Quotation List':      'ti ti-file-invoice',
  'Team':                'ti ti-users-group',
  'Create Case':         'ti ti-circle-plus',
  'Customers':           'ti ti-users',
  'Quotation Form':      'ti ti-file-plus',
  'Approved Customer':   'ti ti-user-check',
  'Final Leads':         'ti ti-rocket',
  'Departments':         'ti ti-building',
  'Reports':             'ti ti-chart-bar',
  'Tracking':            'ti ti-map-pin',
  'ERP Tasks':           'ti ti-checklist',
  'Inventory':           'ti ti-package',
  'Procurement':         'ti ti-building-warehouse',
  'Dispatch':            'ti ti-truck-delivery',
  'Capacity Mapping':    'ti ti-bolt',
  'Technical QA':        'ti ti-microscope',
  'Accounts':            'ti ti-calculator',
  'CRM Tasks':           'ti ti-heart-handshake',
  'Audit Log':           'ti ti-shield-lock',
};

/* ── Admin navigation structure ─────────────────────────────────────────── */
const NAV = {
  admin: [
    { group: 'Overview', items: [
      { name: 'Dashboard',        path: '/admin-dashboard' },
      { name: 'Finance',          path: '/finance-tracking' },
    ]},
    { group: 'Management', items: [
      { name: 'All Customers',    path: '/cases' },
      { name: 'Quotation List',   path: '/quotations' },
      { name: 'Team',             path: '/users' },
    ]},
    { group: 'ERP', items: [
      { name: 'Procurement',      path: '/procurement-portal' },
      { name: 'Dispatch',         path: '/b2c-dispatch' },
      { name: 'Audit Log',        path: '/audit-log' },
    ]},
    { group: 'Apps', items: [
      { name: 'Departments',      path: '/department-portal' },
      { name: 'Tracking',         path: '/track', external: true },
    ]},
  ],
};

/* ── Role-based navigation builder ──────────────────────────────────────── */
const getRoleGroups = (role) => {
  const dashMap = {
    sales:            '/sales-dashboard',
    registration:     '/registration-dashboard',
    banking:          '/banking-dashboard',
    inventory:        '/inventory-dashboard',
    field_installation: '/installation-dashboard',
    electrical:       '/electrical-dashboard',
    subsidy:          '/subsidy-dashboard',
    technical:        '/technical-dashboard',
    accounts:         '/accounts-dashboard',
    customer_service: '/customer-service-dashboard',
    procurement:      '/procurement-portal',
  };

  if (role === 'sales') {
    return [
      { group: 'Overview', items: [
        { name: 'Dashboard',         path: '/sales-dashboard' },
        { name: 'Tracking',          path: '/track', external: true },
      ]},
      { group: 'Quotations', items: [
        { name: 'Quotation Form',    path: '/quotation-form' },
        { name: 'Quotation List',    path: '/quotations' },
        { name: 'Approved Customer', path: '/approved-quotations' },
        { name: 'Final Leads',       path: '/final-leads' },
      ]},
    ];
  }

  if (role === 'technical') {
    return [{ group: 'Workspace', items: [
      { name: 'Dashboard',  path: '/technical-dashboard' },
      { name: 'Customers',  path: '/cases' },
    ]}];
  }

  if (role === 'accounts') {
    return [{ group: 'Workspace', items: [
      { name: 'Dashboard',  path: '/accounts-dashboard' },
      { name: 'Customers',  path: '/cases' },
      { name: 'Finance',    path: '/finance-tracking' },
    ]}];
  }

  if (role === 'customer_service') {
    return [{ group: 'Workspace', items: [
      { name: 'Dashboard',  path: '/customer-service-dashboard' },
      { name: 'Customers',  path: '/cases' },
    ]}];
  }

  if (role === 'inventory') {
    return [{ group: 'Workspace', items: [
      { name: 'Dashboard',  path: dashMap[role] || '/admin-dashboard' },
      { name: 'Customers',  path: '/cases' },
      { name: 'Dispatch',   path: '/b2c-dispatch' },
    ]}];
  }

  if (role === 'procurement') {
    return [{ group: 'Workspace', items: [
      { name: 'Dashboard',  path: '/procurement-portal' },
      { name: 'Customers',  path: '/cases' },
      { name: 'Procurement',path: '/procurement-portal' },
    ]}];
  }

  // All other operational roles: Dashboard + Customers (+ extras per role)
  const items = [
    { name: 'Dashboard', path: dashMap[role] || '/admin-dashboard' },
    { name: 'Customers', path: '/cases' },
  ];
  if (role === 'registration') {
    items.splice(1, 0, { name: 'Create Case', path: '/create-case' });
  }
  if (role === 'banking') {
    items.push({ name: 'Finance', path: '/finance-tracking' });
  }
  // All roles get Customers access
  return [{ group: 'Workspace', items }];
};

/* ── Role display label ──────────────────────────────────────────────────── */
const getRoleLabel = (role) => {
  if (role === 'field_installation') return 'Installation';
  if (role === 'admin')              return 'Admin';
  if (role === 'sales')              return 'Sales';
  if (role === 'technical')          return 'Technical QA';
  if (role === 'accounts')           return 'Accounts';
  if (role === 'customer_service')   return 'Customer Service';
  if (role === 'procurement')        return 'Procurement';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/* ── Role accent color ───────────────────────────────────────────────────── */
const ROLE_COLORS = {
  admin:              '#2563EB',
  sales:              '#7C3AED',
  registration:       '#0EA5E9',
  banking:            '#F59E0B',
  inventory:          '#10B981',
  field_installation: '#F97316',
  electrical:         '#EF4444',
  subsidy:            '#EC4899',
  technical:          '#06B6D4',
  accounts:           '#84CC16',
  customer_service:   '#A78BFA',
  procurement:        '#3B82F6',
};

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const Sidebar = ({ onLogout }) => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [userName, setUserName] = useState(localStorage.getItem('name') || 'User');
  const [userRole, setUserRole] = useState((localStorage.getItem('role') || 'user').toLowerCase());
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials   = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const groups     = userRole === 'admin' ? NAV.admin : getRoleGroups(userRole);
  const roleColor  = ROLE_COLORS[userRole] || '#2563EB';
  const roleLabel  = getRoleLabel(userRole);

  /* ── Sync profile from DB on mount ──────────────────────────────────── */
  useEffect(() => {
    const isSimulating = localStorage.getItem('simulating') === 'true';
    if (isSimulating) {
      setUserRole((localStorage.getItem('role') || 'user').toLowerCase());
      setUserName(localStorage.getItem('name') || 'User');
      return;
    }

    const syncProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .single();
        if (profile) {
          if (profile.name) { localStorage.setItem('name', profile.name); setUserName(profile.name); }
          if (profile.role) { localStorage.setItem('role', profile.role); setUserRole(profile.role.toLowerCase()); }
        }
      } catch { /* silent fail */ }
    };
    syncProfile();
  }, []);

  /* ── Close mobile sidebar on route change ──────────────────────────── */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* ── Listen for custom event from Header to open menu ──────────────── */
  useEffect(() => {
    const handleOpen = () => setMobileOpen(true);
    window.addEventListener('openMobileMenu', handleOpen);
    return () => window.removeEventListener('openMobileMenu', handleOpen);
  }, []);

  /* ── Nav item click handler ─────────────────────────────────────────── */
  const handleNav = (item) => {
    if (item.external) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
    setMobileOpen(false);
  };

  /* ── Sidebar inner content (shared between desktop & mobile) ─────────── */
  const SidebarContent = () => (
    <>
      {/* Logo / Brand */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px', width: '100%' }}
          onClick={() => navigate('/')}
          title="Go to dashboard"
        >
          <img src="/logo.png" alt={BRANDING.name} style={{ width: '180px', height: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Role badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: 'var(--radius-pill)',
          background: `${roleColor}15`,
          border: `1px solid ${roleColor}30`,
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: roleColor, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: roleColor }}>
            {roleLabel} Portal
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {groups.map(({ group, items }, gi) => (
          <div key={group}>
            {gi > 0 && <div style={{ height: '1px', background: 'var(--color-border)', margin: '6px 10px' }} />}
            <p className="nav-section-label">{group}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {items.map((item) => {
                const isActive  = !item.external && location.pathname === item.path;
                const iconCls   = ICONS[item.name] || 'ti ti-point';
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNav(item)}
                    className={`nav-item${isActive ? ' active' : ''}`}
                    title={item.name}
                  >
                    {item.name === 'Tracking' ? (
                      <MapPin style={{ width: '15px', height: '15px', flexShrink: 0, opacity: 0.85 }} />
                    ) : (
                      <i className={iconCls} style={{ fontSize: '15px', width: '18px', textAlign: 'center', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1 }}>{item.name}</span>
                    {item.external && (
                      <i className="ti ti-external-link" style={{
                        fontSize: '11px', opacity: 0.45, flexShrink: 0,
                        transition: 'opacity 0.15s',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Support + Profile */}
      <div style={{ padding: '8px 6px 12px', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => { navigate('/support'); setMobileOpen(false); }}
          className={`nav-item${location.pathname === '/support' ? ' active' : ''}`}
          style={{ marginBottom: '6px' }}
          title="Support"
        >
          <i className="ti ti-headset" style={{ fontSize: '15px', width: '18px', textAlign: 'center' }} />
          <span>Support</span>
        </button>

        {/* User Profile card */}
        <div
          onClick={() => { navigate('/profile'); setMobileOpen(false); }}
          title="View profile"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)', cursor: 'pointer',
            transition: 'background 0.15s ease', marginTop: '2px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
        >
          {/* Avatar */}
          <div style={{
            width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
            background: roleColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff',
            letterSpacing: '0.5px',
          }}>
            {initials}
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '12.5px', fontWeight: 600, color: 'var(--text-1)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
            }}>
              {userName}
            </p>
            <span style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--text-4)', textTransform: 'capitalize' }}>
              {roleLabel}
            </span>
          </div>

          {/* Logout button */}
          <button
            onClick={e => { e.stopPropagation(); onLogout(); }}
            title="Sign out"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-4)', padding: '5px',
              borderRadius: 'var(--radius-xs)',
              transition: 'all 0.15s ease', display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)'; e.currentTarget.style.background = 'var(--color-danger-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'none'; }}
          >
            <LogOut style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile: Slide-in sidebar drawer ─────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 150,
              background: 'hsla(222,47%,5%,0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.2s ease both',
            }}
          />

          {/* Drawer panel */}
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 160,
            width: '260px',
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--color-border)',
            borderLeft: 'none',
            borderRadius: '0 var(--radius-xl) var(--radius-xl) 0',
            boxShadow: 'var(--shadow-xl)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'var(--surface-2)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              title="Close menu"
            >
              <i className="ti ti-x" style={{ fontSize: '14px' }} />
            </button>

            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Mobile Bottom Navigation ─────────────────────────────────────── */}
      <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
        {groups.flatMap(g => g.items).filter(i => !i.external).map((item) => {
          const isActive = location.pathname === item.path;
          const iconCls  = ICONS[item.name] || 'ti ti-point';
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="mobile-nav-icon-wrap">
                <i className={iconCls} style={{ fontSize: '19px' }} />
              </div>
              <span className="mobile-nav-label">
                {item.name
                  .replace('Dashboard', 'Home')
                  .replace('All Customers', 'Clients')
                  .replace('Quotation Form', 'Quote')
                  .replace('Quotation List', 'Quotes')
                  .replace('Approved Customer', 'Approved')
                  .replace('Create Case', 'New')
                  .replace('Finance', 'Finance')
                }
              </span>
            </button>
          );
        })}

        {/* Tracking shortcut (external) — shown in bottom nav for sales/admin */}
        {groups.flatMap(g => g.items).some(i => i.external && i.name === 'Tracking') && (
          <button
            className="mobile-nav-btn"
            onClick={() => window.open('/track', '_blank', 'noopener,noreferrer')}
            aria-label="Tracking"
          >
            <div className="mobile-nav-icon-wrap">
              <i className="ti ti-map-pin" style={{ fontSize: '19px' }} />
            </div>
            <span className="mobile-nav-label">Track</span>
          </button>
        )}

        {/* Profile tab */}
        <button
          onClick={() => navigate('/profile')}
          className={`mobile-nav-btn ${location.pathname === '/profile' ? 'active' : ''}`}
          aria-label="Profile"
          aria-current={location.pathname === '/profile' ? 'page' : undefined}
        >
          <div
            className="mobile-nav-icon-wrap"
            style={{
              background: location.pathname === '/profile' ? roleColor : undefined,
              borderRadius: 'var(--radius-md)',
              width: '36px', height: '28px',
            }}
          >
            <span style={{
              fontSize: '11px', fontWeight: 800, color: location.pathname === '/profile' ? '#fff' : 'currentColor',
            }}>
              {initials}
            </span>
          </div>
          <span className="mobile-nav-label">Profile</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
