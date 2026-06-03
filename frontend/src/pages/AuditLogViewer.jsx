import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { Shield, Search, RefreshCw, Download, ChevronDown } from 'lucide-react';

const ACTION_COLORS = {
  stage_updated:          { bg: '#eff6ff', text: '#1d4ed8' },
  mark_delayed:           { bg: '#fff7ed', text: '#c2410c' },
  unmark_delayed:         { bg: '#f0fdf4', text: '#15803d' },
  document_verified:      { bg: '#f5f3ff', text: '#5b21b6' },
  technical_qa_note:      { bg: '#ecfeff', text: '#155e75' },
  accounts_note:          { bg: '#f7fee7', text: '#3f6212' },
  crm_interaction:        { bg: '#fdf4ff', text: '#7e22ce' },
  portal_link_generated:  { bg: '#fef9c3', text: '#a16207' },
  customer_approved:      { bg: '#f0fdf4', text: '#15803d' },
  customer_declined:      { bg: '#fff1f2', text: '#be123c' },
  finance_updated:        { bg: '#fffbeb', text: '#92400e' },
  dispatch_materials:     { bg: '#e0f2fe', text: '#075985' },
};

const getActionMeta = (type) =>
  ACTION_COLORS[type] || { bg: '#f1f5f9', text: '#475569' };

const DEPT_LABELS = {
  admin:            '👑 Admin',
  sales:            '📊 Sales',
  registration:     '📋 Registration',
  banking:          '🏦 Banking',
  inventory:        '📦 Inventory',
  field_installation: '⚡ Installation',
  subsidy:          '🌿 Subsidy',
  technical:        '🔬 Technical QA',
  accounts:         '💰 Accounts',
  customer_service: '🎧 Customer Service',
  procurement:      '🛒 Procurement',
  customer:         '👤 Customer',
};

export default function AuditLogViewer({ onLogout }) {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(0);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('case_history')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterDept)   query = query.eq('department', filterDept);
      if (filterAction) query = query.eq('action', filterAction);
      if (dateFrom)     query = query.gte('created_at', dateFrom);
      if (dateTo)       query = query.lte('created_at', dateTo + 'T23:59:59Z');

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      toast.error('Failed to load audit log: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filterDept, filterAction, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(log =>
    !search ||
    log.case_id?.toLowerCase().includes(search.toLowerCase()) ||
    log.changed_by?.toLowerCase().includes(search.toLowerCase()) ||
    log.notes?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const rows = [
      ['Timestamp', 'Case ID', 'Action', 'Department', 'By', 'Stage', 'Notes'],
      ...filtered.map(l => [
        new Date(l.created_at || l.timestamp).toLocaleString('en-IN'),
        l.case_id || '',
        l.action || l.action_type || '',
        l.department || '',
        l.changed_by || l.updated_by || '',
        l.to_status || l.stage || '',
        (l.notes || '').replace(/"/g, '""'),
      ].map(v => `"${v}"`))
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported as CSV');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header title="Audit Log" subtitle="Immutable record of all system actions and changes" onLogout={onLogout} />

        {/* Security notice */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Shield size={18} color="#818cf8" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            <strong style={{ color: '#a5b4fc' }}>Immutable Audit Trail</strong> — All entries are read-only and cannot be deleted or modified. Tamper-evident log for compliance and security review. Admin access only.
          </p>
        </div>

        {/* Filters */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          {/* Search */}
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} size={13} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Case ID, user, action, notes…"
                className="input" style={{ paddingLeft: 32, width: '100%' }}
              />
            </div>
          </div>

          {/* Department filter */}
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>Department</label>
            <select className="input" value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(0); }}>
              <option value="">All Departments</option>
              {Object.entries(DEPT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Action filter */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>Action Type</label>
            <select className="input" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(0); }}>
              <option value="">All Actions</option>
              {Object.keys(ACTION_COLORS).map(k => (
                <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>From</label>
            <input type="date" className="input" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} />
          </div>
          <div style={{ flex: '1 1 130px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-4)', marginBottom: 4, textTransform: 'uppercase' }}>To</label>
            <input type="date" className="input" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button onClick={fetchLogs} className="btn btn-ghost btn-sm" title="Refresh"><RefreshCw size={14} /></button>
            <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {/* Log Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div className="animate-spin" style={{ width: 28, height: 28, border: '2px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-4)', fontSize: 13 }}>Loading audit log…</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 150 }}>Timestamp</th>
                      <th style={{ width: 120 }}>Case ID</th>
                      <th style={{ width: 160 }}>Action</th>
                      <th style={{ width: 140 }}>Department</th>
                      <th style={{ width: 120 }}>By</th>
                      <th style={{ width: 140 }}>Stage</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((log) => {
                      const { bg, text } = getActionMeta(log.action_type);
                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize: 11, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                            {log.created_at || log.timestamp ? new Date(log.created_at || log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                              {log.case_id || '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                              background: bg, color: text, textTransform: 'capitalize',
                              whiteSpace: 'nowrap', display: 'inline-block',
                            }}>
                              {(log.action || log.action_type || '—').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {DEPT_LABELS[log.department] || log.department || '—'}
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                            {log.changed_by || log.updated_by || '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            {log.to_status || log.stage || log.new_stage || '—'}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-4)' }}>
                          No audit log entries found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
                  Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + filtered.length} entries (page {page + 1})
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    style={{ opacity: page === 0 ? 0.4 : 1 }}
                  >
                    ← Prev
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={filtered.length < PAGE_SIZE}
                    onClick={() => setPage(p => p + 1)}
                    style={{ opacity: filtered.length < PAGE_SIZE ? 0.4 : 1 }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}
