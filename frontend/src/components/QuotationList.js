import React, { useState, useEffect } from 'react';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Search, FileText, Download, CheckCircle, Clock, XCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const QuotationList = ({ onLogout }) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchQuotations = async () => {
    try {
      const data = await edgeFetch(EDGE.quotation, { action: 'list' });
      setQuotations(data || []);
    } catch (error) {
      toast.error('Error fetching quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const payload = { action: 'update_status', id, status: newStatus.toLowerCase() };
      if (newStatus.toLowerCase() === 'approved' || newStatus.toLowerCase() === 'submitted') {
        payload.currentDepartment = 'Sales';
      }
      await edgeFetch(EDGE.quotation, payload);
      setQuotations(prev => prev.map(q => (q.id === id || q._id === id) 
        ? { ...q, status: newStatus.toLowerCase(), current_department: (newStatus.toLowerCase() === 'approved' || newStatus.toLowerCase() === 'submitted') ? 'Sales' : q.current_department } 
        : q));
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update status failed:', error);
      toast.error(`Error updating status: ${error.message}`);
    }
  };

  const filteredQuotations = quotations.filter(q => {
    const custName = q.customer_name || q.customer?.name || '';
    const qId = q.quotation_id || q.quotationId || '';
    const matchesSearch = custName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          qId.toLowerCase().includes(searchTerm.toLowerCase());
    const qStatus = q.status || '';
    const matchesStatus = statusFilter === 'All' || qStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const statusConfig = {
    Submitted:   { bg: 'var(--color-info-light)',    color: 'var(--color-info)',    border: '#BFDBFE', Icon: Clock },
    Processing:  { bg: 'var(--color-warning-light)', color: '#D97706',             border: '#FDE68A', Icon: Clock },
    Approved:    { bg: 'var(--color-accent-light)',   color: '#059669',             border: '#A7F3D0', Icon: CheckCircle },
    'Registration Completed': { bg: 'var(--color-accent-light)', color: '#059669',  border: '#A7F3D0', Icon: CheckCircle },
    Rejected:    { bg: 'var(--color-danger-light)',   color: '#DC2626',             border: '#FECACA', Icon: XCircle },
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';
    const c = statusConfig[normalizedStatus] || statusConfig[status] || { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', Icon: Clock };
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 12px', borderRadius: 'var(--radius-pill)',
        fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color,
        border: `1px solid ${c.border}`,
      }}>
        <c.Icon style={{ width: '12px', height: '12px' }} />
        {normalizedStatus === 'Registration completed' ? 'Approved' : normalizedStatus}
      </span>
    );
  };

  const filterTabs = ['All', 'Submitted', 'Processing', 'Approved', 'Rejected'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header title="Quotations" subtitle="Track and manage all solar quotations" onLogout={onLogout} />

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '0 1 360px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search customer or ID…"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="input" style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {filterTabs.map(tab => (
              <button key={tab} onClick={() => setStatusFilter(tab)}
                style={{
                  padding: '6px 16px', borderRadius: 'var(--radius-pill)',
                  fontSize: '13px', fontWeight: statusFilter === tab ? 600 : 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                  border: `1px solid ${statusFilter === tab ? 'transparent' : 'var(--color-border)'}`,
                  background: statusFilter === tab ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: statusFilter === tab ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Quotation ID</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Customer</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Price</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>Loading quotations…</td></tr>
                ) : filteredQuotations.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                    <FileText style={{ width: '32px', height: '32px', margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    No quotations found
                  </td></tr>
                ) : filteredQuotations.map(q => (
                  <tr key={q.id || q._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                        {q.quotation_id || q.quotationId}
                      </span>
                    </td>
                    <td>
                      <div style={{ whiteSpace: 'nowrap' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>
                          {q.customer_name || q.customer?.name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {q.customer_mobile || q.customer?.mobile}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(q.created_at || q.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
                        ₹{Number(q.product_price || q.otherDetails?.productPrice || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>{getStatusBadge(q.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <a
                          href={q.pdf_url || q.pdfUrl || `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/Quotations/Quotation_${q.quotation_id || q.quotationId}.pdf`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '7px 10px' }}
                          title="Download PDF"
                        >
                          <Download style={{ width: '14px', height: '14px' }} />
                        </a>
                        <select
                          value={q.status ? q.status.toLowerCase() : ''}
                          onChange={e => handleUpdateStatus(q.id || q._id, e.target.value)}
                          className="input"
                          style={{
                            width: 'auto', padding: '6px 12px', fontSize: '12px',
                            fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          {q.status?.toLowerCase() === 'draft' && <option value="draft">Draft</option>}
                          <option value="submitted">Submitted</option>
                          <option value="processing">Processing</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''} total</div>
        </div>

        <Footer />
      </main>
    </div>
  );
};

export default QuotationList;
