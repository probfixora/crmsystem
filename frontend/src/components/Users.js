import React, { useState, useEffect } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { BRANDING } from '../config/branding';
import {
  UserPlus, Shield, Trash2, X, Save, UserCheck,
  Key, AlertTriangle, Lock, Search, Mail, User, ChevronRight
} from 'lucide-react';

const inputClass =
  'w-full bg-white border border-[#e2e8f0] rounded-[9px] px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)] transition-all';

// Premium inline input style (used in modals)
const fieldStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px 11px 40px',
  fontSize: '14px', fontWeight: 500,
  color: '#0f172a',
  background: '#f8fafc',
  border: '1.5px solid #e2e8f0',
  borderRadius: '10px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
};
const fieldFocusStyle = {
  ...fieldStyle,
  background: '#ffffff',
  border: '1.5px solid #2563EB',
  boxShadow: '0 0 0 3px rgba(37,99,235,0.12)',
};

const roleMeta = {
  admin:              { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: 'Admin' },
  sales:              { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', label: 'Sales' },
  registration:       { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff', label: 'Registration' },
  banking:            { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: 'Banking & Finance' },
  inventory:          { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3', label: 'Inventory' },
  field_installation: { bg: '#f0f9ff', text: '#075985', border: '#bae6fd', label: 'Field Installation' },
  electrical:         { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Electrical' },
  subsidy:            { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa', label: 'Subsidy' },
  technical:          { bg: '#ecfeff', text: '#155e75', border: '#a5f3fc', label: 'Technical QA' },
  accounts:           { bg: '#f7fee7', text: '#3f6212', border: '#bef264', label: 'Accounts' },
  customer_service:   { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe', label: 'Customer Service' },
  procurement:        { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Procurement' },
};

const getRoleMeta = (role) => roleMeta[role] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: role };

const Users = ({ onLogout }) => {
  const [users, setUsers]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal]   = useState(false);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [profileUser, setProfileUser]     = useState(null); // admin panel side drawer
  const [newPassword, setNewPassword]     = useState('');
  const [formData, setFormData]           = useState({ name: '', email: '', role: 'sales' });
  const [addLoading, setAddLoading]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [focusedField, setFocusedField]   = useState('');

  const loggedInRole = localStorage.getItem('role');

  const fetchUsers = async () => {
    try {
      const data = await edgeFetch(EDGE.admin, { action: 'list_users' });
      setUsers(data);
    } catch {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    const open = showAddModal || showDeleteModal || showResetModal;
    document.body.style.overflow = open ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showAddModal, showDeleteModal, showResetModal]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await edgeFetch(EDGE.admin, { action: 'create_user', ...formData });
      toast.success(`${formData.name} added successfully`);
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'sales' });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to add user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await edgeFetch(EDGE.admin, { action: 'delete_user', userId: selectedUser.id });
      toast.success('User removed successfully');
      setShowDeleteModal(false);
      if (profileUser?.id === selectedUser.id) setProfileUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Could not delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await edgeFetch(EDGE.admin, { action: 'reset_password', userId: selectedUser.id, newPassword });
      toast.success('Password updated successfully');
      setShowResetModal(false);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter
  const q = search.toLowerCase();
  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.role?.toLowerCase().includes(q)
  );

  if (loading) return (
    <div className="main-loading">
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin" style={{ width: '32px', height: '32px', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>Loading team…</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header title="Team" subtitle="Manage user accounts and access permissions" onLogout={onLogout} />

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--text-4)', pointerEvents: 'none' }} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, role…"
              className="input" style={{ paddingLeft: '36px' }}
            />
          </div>
          {loggedInRole === 'admin' && (
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              <UserPlus style={{ width: '14px', height: '14px' }} />
              Add member
            </button>
          )}
        </div>

        {/* Table + Profile panel side by side */}
        <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: profileUser ? '1fr 300px' : '1fr', gap: '16px', alignItems: 'start' }}>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  {loggedInRole === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const rm = getRoleMeta(user.role);
                  const isActive = profileUser?.id === user.id;
                  return (
                    <tr
                      key={user.id}
                      onClick={() => setProfileUser(isActive ? null : user)}
                      style={{ cursor: 'pointer', background: isActive ? '#f0fdf4' : '' }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 700, color: '#fff',
                          }}>
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)' }}>{user.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-4)' }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-2)' }}>
                          {user.employeeId || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 600,
                          background: rm.bg, color: rm.text, border: `1px solid ${rm.border}`, textTransform: 'capitalize',
                        }}>
                          {rm.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="status-dot online" />
                          <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 500 }}>Active</span>
                        </div>
                      </td>
                      {loggedInRole === 'admin' && (
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              title="Reset password"
                              onClick={() => { setSelectedUser(user); setShowResetModal(true); }}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 8px' }}
                            >
                              <Key style={{ width: '13px', height: '13px' }} />
                            </button>
                            <button
                              title="Remove user"
                              onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                              className="btn btn-sm"
                              style={{ padding: '6px 8px', background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                            >
                              <Trash2 style={{ width: '13px', height: '13px' }} />
                            </button>
                            <button
                              title="View profile"
                              onClick={() => setProfileUser(isActive ? null : user)}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 8px' }}
                            >
                              <ChevronRight style={{ width: '13px', height: '13px', transform: isActive ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-4)', fontSize: '13px' }}>
                      {search ? `No members match "${search}"` : 'No team members yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="table-foot">{users.length} member{users.length !== 1 ? 's' : ''} total</div>
          </div>

          {/* ── Profile / Admin Panel ── */}
          {profileUser && (
            <div className="card profile-panel-mobile" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: '20px' }}>
              {/* Header bar */}
              <div style={{
                padding: '20px', background: 'linear-gradient(135deg, #0f1724, #0f2a1a)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px',
                position: 'relative'
              }}>
                <button
                  onClick={() => setProfileUser(null)}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X style={{ width: '16px', height: '16px' }} />
                </button>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', fontWeight: 800, color: '#fff',
                }}>
                  {profileUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: '#fff' }}>{profileUser.name}</p>
                  <span style={{
                    display: 'inline-block', marginTop: '6px',
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: 'rgba(37,99,235,0.12)', color: '#60A5FA', border: '1px solid rgba(37,99,235,0.2)',
                    textTransform: 'capitalize',
                  }}>
                    {profileUser.role}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                  Account details
                </p>
                {[
                  { icon: User,   label: 'Employee ID', value: profileUser.employeeId || 'N/A' },
                  { icon: User,   label: 'Full name',  value: profileUser.name },
                  { icon: Mail,   label: 'Email',      value: profileUser.email },
                  { icon: Shield, label: 'Role',       value: profileUser.role, capitalize: true },
                  { icon: UserCheck, label: 'Status',  value: 'Active' },
                ].map(({ icon: Icon, label, value, capitalize }) => (
                  <div key={label} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: '14px', height: '14px', color: 'var(--brand)' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', marginBottom: '2px' }}>{label}</p>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</p>
                    </div>
                  </div>
                ))}

                {/* Actions */}
                {loggedInRole === 'admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <button
                      onClick={() => {
                        if (window.confirm(`Simulate view as ${profileUser.role}? You can return to Admin later.`)) {
                          localStorage.setItem('simulating', 'true');
                          localStorage.setItem('realRole', localStorage.getItem('role') || 'admin');
                          localStorage.setItem('realName', localStorage.getItem('name') || '');
                          localStorage.setItem('realUserId', localStorage.getItem('userId') || '');
                          localStorage.setItem('role', profileUser.role);
                          localStorage.setItem('name', profileUser.name || '');
                          localStorage.setItem('userId', profileUser.id || '');
                          window.location.href = '/';
                        }
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', marginBottom: '4px' }}
                    >
                      <UserCheck style={{ width: '13px', height: '13px' }} />
                      Open Department View
                    </button>
                    <button
                      onClick={() => { setSelectedUser(profileUser); setShowResetModal(true); }}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Key style={{ width: '13px', height: '13px' }} />
                      Reset password
                    </button>
                    <button
                      onClick={() => { setSelectedUser(profileUser); setShowDeleteModal(true); }}
                      className="btn btn-danger btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Trash2 style={{ width: '13px', height: '13px' }} />
                      Remove member
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Footer />
      </main>

      {/* ── Add Member Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" style={{ alignItems: 'center', padding: '16px' }}>
          <div className="modal-card" style={{ maxWidth: '500px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Gradient Header — compact */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563EB 60%, #3b82f6 100%)',
              padding: '18px 24px',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', left: '30px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                  }}>
                    <UserPlus style={{ width: '17px', height: '17px', color: '#fff' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>Add Team Member</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Create a new employee account</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '7px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', backdropFilter: 'blur(10px)' }}
                >
                  <X style={{ width: '15px', height: '15px' }} />
                </button>
              </div>
            </div>

            {/* Form Body — scrollable */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Auto-generated ID notice */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <Shield style={{ width: '13px', height: '13px', color: '#2563EB', flexShrink: 0 }} />
                  <p style={{ fontSize: '12px', color: '#1d4ed8', lineHeight: 1.4 }}>
                    <strong>Employee ID</strong> will be auto-generated upon creation.
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                    <User style={{ width: '13px', height: '13px', color: '#2563EB' }} />
                    Full Name <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: focusedField === 'name' ? '#2563EB' : '#94a3b8', pointerEvents: 'none', transition: 'color 0.2s' }} />
                    <input
                      type="text" required
                      style={focusedField === 'name' ? fieldFocusStyle : fieldStyle}
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField('')}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                    <Mail style={{ width: '13px', height: '13px', color: '#2563EB' }} />
                    Email Address <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: focusedField === 'email' ? '#2563EB' : '#94a3b8', pointerEvents: 'none', transition: 'color 0.2s' }} />
                    <input
                      type="email" required
                      style={focusedField === 'email' ? fieldFocusStyle : fieldStyle}
                      placeholder={`rahul@${BRANDING.email.split('@')[1] || 'company.com'}`}
                      value={formData.email}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                    {/* Role Selection — Compact 2-col grid */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                    <Shield style={{ width: '13px', height: '13px', color: '#2563EB' }} />
                    Department / Role <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      { value: 'sales',              label: 'Sales',             emoji: '📊', color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
                      { value: 'registration',        label: 'Registration',      emoji: '📋', color: '#7e22ce', bg: '#fdf4ff', border: '#e9d5ff' },
                      { value: 'banking',             label: 'Banking & Finance', emoji: '🏦', color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
                      { value: 'inventory',           label: 'Inventory',         emoji: '📦', color: '#9f1239', bg: '#fff1f2', border: '#fecdd3' },
                      { value: 'field_installation',  label: 'Installation',      emoji: '⚡', color: '#075985', bg: '#f0f9ff', border: '#bae6fd' },
                      { value: 'electrical',          label: 'Electrical',        emoji: '⚡', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                      { value: 'subsidy',             label: 'Subsidy',           emoji: '🌿', color: '#9a3412', bg: '#fff7ed', border: '#fed7aa' },
                      { value: 'technical',           label: 'Technical QA',      emoji: '🔬', color: '#155e75', bg: '#ecfeff', border: '#a5f3fc' },
                      { value: 'accounts',            label: 'Accounts',          emoji: '💰', color: '#3f6212', bg: '#f7fee7', border: '#bef264' },
                      { value: 'customer_service',    label: 'Customer Service',  emoji: '🎧', color: '#5b21b6', bg: '#f5f3ff', border: '#ddd6fe' },
                      { value: 'procurement',         label: 'Procurement',       emoji: '🛒', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                      { value: 'admin',               label: 'Admin',             emoji: '👑', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' },
                    ].map(r => {
                      const isSelected = formData.role === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r.value })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                            border: isSelected ? `2px solid ${r.color}` : '1.5px solid #e2e8f0',
                            background: isSelected ? r.bg : '#fafafa',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? `0 0 0 2px ${r.border}80` : 'none',
                          }}
                        >
                          <span style={{
                            fontSize: '12px', fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? r.color : '#475569',
                            textAlign: 'left', lineHeight: 1.2,
                          }}>{r.label}</span>
                          {isSelected && (
                            <div style={{ marginLeft: 'auto', width: '14px', height: '14px', borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700 }}>✓</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={addLoading}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '12px', borderRadius: '10px', border: 'none', cursor: addLoading ? 'not-allowed' : 'pointer',
                      background: 'linear-gradient(135deg, #2563EB, #1d4ed8)',
                      color: '#fff', fontSize: '14px', fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                      opacity: addLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {addLoading
                      ? <><div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Adding…</>
                      : <><UserPlus style={{ width: '15px', height: '15px' }} /> Add Member</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '12px 20px', borderRadius: '10px',
                      border: '1.5px solid var(--color-border)', background: 'var(--color-surface)',
                      color: 'var(--text-2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ padding: '32px 28px 24px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle style={{ width: '22px', height: '22px', color: '#f43f5e' }} />
              </div>
              <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Remove this member?</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-3)', lineHeight: 1.6, marginBottom: '24px' }}>
                <strong>{selectedUser?.name}</strong>'s account will be permanently deleted. This cannot be undone.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={handleDeleteUser} disabled={actionLoading} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', opacity: actionLoading ? 0.65 : 1 }}>
                  {actionLoading ? 'Removing…' : 'Yes, remove'}
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Reset password</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)' }}>For {selectedUser?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowResetModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }}>
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '16px' }}>
                <Lock style={{ width: '14px', height: '14px', color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.6 }}>
                  This will require <strong>{selectedUser?.name}</strong> to sign in again with the new password.
                </p>
              </div>
              <form onSubmit={handleResetPassword}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <Key style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-4)', pointerEvents: 'none' }} />
                  <input type="password" required className={inputClass} style={{ paddingLeft: '36px' }}
                    placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="modal-footer" style={{ padding: '16px 0 0', marginTop: '4px' }}>
                  <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: actionLoading ? 0.65 : 1 }}>
                    {actionLoading ? <div className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> : <><Save style={{ width: '14px', height: '14px' }} /> Reset password</>}
                  </button>
                  <button type="button" onClick={() => setShowResetModal(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
