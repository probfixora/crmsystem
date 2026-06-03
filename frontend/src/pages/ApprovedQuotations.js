import React, { useState, useEffect } from 'react';
import { supabase, edgeFetch, EDGE } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'react-hot-toast';
import { Search, UploadCloud, X, CheckCircle, UserCheck } from 'lucide-react';

// ── Solar Loan Document Rules ─────────────────────────────────────────────────
const BASE_DOCS = [
  'Electricity Bill (Last 2 Months)',
  'Aadhar Card Copy (Electricity Bill Owner)',
  'PAN Card (Electricity Bill Owner)',
  'Bank Details (Cancelled Cheque / Account Number)',
  'Property Proof (House Tax Receipt / Registry Copy)',
  'Verification 4 Photo (Customer House GPS Pic)',
];
const PROFILE_JOB_DOCS = [
  '3 Months Salary Slip',
  '6 Months Bank Statement',
  'Form 16 of Last 3 Years',
  'Last 3 Year ITR',
];
const PROFILE_BIZ_DOCS = [
  'Last 3 Year ITR',
  '6 Months Bank Statement',
  'GST Certificate',
];

// Parse Electrical Load kW — e.g. "3kW" → 3
const getKw = (q) => {
  if (q.electrical_load) return parseInt(String(q.electrical_load).replace(/kW$/i, ''), 10) || 0;
  if (q.total_watt) return Math.round(q.total_watt / 1000);
  return 0;
};

const getRequiredDocuments = (kw, profile) => {
  if (kw <= 3) return BASE_DOCS;
  return [...BASE_DOCS, ...(profile === 'Business' ? PROFILE_BIZ_DOCS : PROFILE_JOB_DOCS)];
};
// ─────────────────────────────────────────────────────────────────────────────

const ApprovedQuotations = ({ onLogout }) => {
  const [quotations, setQuotations]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [selectedQuotation, setSelected]    = useState(null);
  const [profile, setProfile]               = useState('Job/Service');
  const [uploadingDoc, setUploadingDoc]     = useState(null);
  const [sendingToReg, setSendingToReg]     = useState(false);
  const [verifiedDocs, setVerifiedDocs]     = useState([]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const data = await edgeFetch(EDGE.quotation, { action: 'list' });
      setQuotations((data || []).filter(q => q.status === 'Approved' && q.current_department === 'Sales'));
    } catch {
      toast.error('Failed to load approved quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotations(); }, []);

  const filtered = quotations.filter(q =>
    (q.customer_name  || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.quotation_id   || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.customer_mobile|| '').includes(searchTerm)
  );

  const openModal = (q) => {
    setSelected(q);
    setProfile(q.customer_occupation === 'Business' ? 'Business' : 'Job/Service');
    setVerifiedDocs([]);
  };

  // Derived
  const kw          = selectedQuotation ? getKw(selectedQuotation) : 0;
  const isAbove4kw  = kw >= 4;
  const reqDocs     = selectedQuotation ? getRequiredDocuments(kw, profile) : [];
  const uploaded    = reqDocs.filter(d => selectedQuotation?.documents?.[d]).length;
  const verified    = reqDocs.filter(d => verifiedDocs.includes(d)).length;
  const isComplete  = reqDocs.length > 0 && uploaded === reqDocs.length && verified === reqDocs.length;

  const handleProfileChange = async (p) => {
    setProfile(p);
    try {
      await edgeFetch(EDGE.quotation, { action: 'update_status', id: selectedQuotation.id, customer_occupation: p });
      setSelected(prev => ({ ...prev, customer_occupation: p }));
    } catch { toast.error('Failed to save profile'); }
  };

  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoc(docName);
    try {
      const ext      = file.name.split('.').pop();
      const fileName = `${selectedQuotation.quotation_id}_${docName.replace(/\s+/g,'_')}_${Date.now()}.${ext}`;
      const filePath = `${selectedQuotation.quotation_id}/${fileName}`;
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      const newDocs = { ...(selectedQuotation.documents || {}), [docName]: urlData.publicUrl };
      await edgeFetch(EDGE.quotation, { action: 'update_status', id: selectedQuotation.id, documents: newDocs });
      setSelected(prev => ({ ...prev, documents: newDocs }));
      toast.success(`${docName} uploaded!`);
      fetchQuotations();
    } catch { toast.error(`Error uploading ${docName}`); }
    finally  { setUploadingDoc(null); }
  };

  const toggleVerifyDoc = (docName) => {
    setVerifiedDocs(prev => 
      prev.includes(docName) ? prev.filter(d => d !== docName) : [...prev, docName]
    );
  };

  const handleSendToReg = async () => {
    setSendingToReg(true);
    try {
      const res = await edgeFetch(EDGE.quotation, { action: 'send_to_registration', id: selectedQuotation.id });
      if (res.success) {
        toast.success(`Case ${res.caseId} created — sent to Registration!`);
        setSelected(null);
        fetchQuotations();
      }
    } catch (err) { toast.error('Failed: ' + err.message); }
    finally { setSendingToReg(false); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header
          title="Approved Customers"
          subtitle="Upload required documents to convert a quotation into a Case"
          icon={<UserCheck style={{ width: 20, height: 20 }} />}
          onLogout={onLogout}
        />

        {/* ── Toolbar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 1 360px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name, ID or mobile…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Quotation ID</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
                      Loading approved customers…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '56px', color: 'var(--color-text-muted)' }}>
                      <UserCheck style={{ width: '32px', height: '32px', margin: '0 auto 12px', display: 'block', opacity: 0.35 }} />
                      No approved customers found
                    </td>
                  </tr>
                ) : filtered.map((q, idx) => (
                  <tr key={q.id}>
                    <td style={{ color: 'var(--text-4)', fontWeight: 500 }}>{idx + 1}</td>
                    <td>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px', whiteSpace: 'nowrap' }}>
                        {q.customer_name}
                      </p>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {q.customer_mobile || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                        {q.quotation_id}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-green">
                        <CheckCircle style={{ width: '11px', height: '11px' }} />
                        Approved
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        id={`upload-btn-${q.id}`}
                        onClick={() => openModal(q)}
                        className={`btn ${Object.keys(q.documents || {}).length > 0 ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        {Object.keys(q.documents || {}).length > 0 ? (
                          <><UserCheck style={{ width: '13px', height: '13px' }} /> Verify Documents</>
                        ) : (
                          <><UploadCloud style={{ width: '13px', height: '13px' }} /> Upload / Verify</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot">
            {filtered.length} approved customer{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        <Footer />
      </main>

      {/* ── Document Upload Modal ── */}
      {selectedQuotation && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div
            className="modal-card animate-scale-in"
            style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>
                  Document Upload Gate
                </h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                    {selectedQuotation.quotation_id}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                    {selectedQuotation.customer_name}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: isAbove4kw ? 'var(--color-danger-light)' : 'var(--color-accent-light)', color: isAbove4kw ? 'var(--color-danger)' : 'var(--color-accent)' }}>
                    {kw} kW {isAbove4kw ? '· Profile Required' : '· Basic Docs Only'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                    {uploaded}/{reqDocs.length} uploaded
                  </span>
                </div>
              </div>
              <button
                id="close-modal-btn"
                onClick={() => setSelected(null)}
                className="btn btn-ghost"
                style={{ padding: '6px', borderRadius: '50%', flexShrink: 0 }}
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>

              {/* Profile Selector — 4kW+ only */}
              {isAbove4kw && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  background: 'var(--color-info-light)',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E3A8A', marginBottom: '10px' }}>
                    Select Customer Profile
                    <span style={{ marginLeft: '8px', fontSize: '11px', background: 'var(--color-danger-light)', color: 'var(--color-danger)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                      {kw} kW — Profile docs required
                    </span>
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { key: 'Job/Service', label: '💼 Job / Service', count: PROFILE_JOB_DOCS.length },
                      { key: 'Business',   label: '🏢 Business',      count: PROFILE_BIZ_DOCS.length },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        type="button"
                        id={`profile-${key.replace(/\//g, '-')}`}
                        onClick={() => handleProfileChange(key)}
                        className={profile === key ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                      >
                        {label}
                        <span style={{ opacity: 0.75, fontWeight: 500 }}>(+{count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1–3 kW info */}
              {!isAbove4kw && kw > 0 && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'var(--color-accent-light)', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, color: '#065F46' }}>
                  ✅ {kw} kW system — Only 6 basic documents required
                </div>
              )}

              {/* Section Labels */}
              {isAbove4kw && (
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                  📋 Base Documents
                </p>
              )}

              {/* Base Docs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: isAbove4kw ? '20px' : '0' }}>
                {BASE_DOCS.map((doc, idx) => (
                  <DocRow
                    key={doc} idx={idx} docName={doc}
                    isUploaded={!!(selectedQuotation.documents?.[doc])}
                    isUploading={uploadingDoc === doc}
                    isVerified={verifiedDocs.includes(doc)}
                    fileUrl={selectedQuotation.documents?.[doc]}
                    onUpload={handleFileUpload}
                    onVerify={() => toggleVerifyDoc(doc)}
                    badge={null}
                  />
                ))}
              </div>

              {/* Profile Docs */}
              {isAbove4kw && (
                <>
                  <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: '10px' }}>
                    {profile === 'Business' ? '🏢 Business Profile Documents' : '💼 Job / Service Profile Documents'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(profile === 'Business' ? PROFILE_BIZ_DOCS : PROFILE_JOB_DOCS).map((doc, idx) => (
                      <DocRow
                        key={doc} idx={BASE_DOCS.length + idx} docName={doc}
                        isUploaded={!!(selectedQuotation.documents?.[doc])}
                        isUploading={uploadingDoc === doc}
                        isVerified={verifiedDocs.includes(doc)}
                        fileUrl={selectedQuotation.documents?.[doc]}
                        onUpload={handleFileUpload}
                        onVerify={() => toggleVerifyDoc(doc)}
                        badge={profile === 'Business' ? 'BUSINESS' : 'JOB/SERVICE'}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: isComplete ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {isComplete
                  ? '✅ All documents ready!'
                  : `⏳ ${reqDocs.length - uploaded} document(s) remaining`}
              </span>
              <button
                id="send-to-registration-btn"
                disabled={!isComplete || sendingToReg}
                onClick={handleSendToReg}
                className={isComplete && !sendingToReg ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ cursor: !isComplete || sendingToReg ? 'not-allowed' : 'pointer', opacity: !isComplete ? 0.55 : 1 }}
              >
                {sendingToReg ? 'Processing…' : 'Send to Registration →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Reusable Document Row ─────────────────────────────────────────────────────
const DocRow = ({ idx, docName, isUploaded, isUploading, isVerified, fileUrl, onUpload, onVerify, badge }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${isVerified ? '#A7F3D0' : isUploaded ? '#FDE68A' : badge ? '#BFDBFE' : 'var(--color-border)'}`,
    background: isVerified ? 'var(--color-accent-light)' : isUploaded ? '#FFFBEB' : badge ? 'var(--color-info-light)' : 'var(--color-surface)',
    transition: 'all 0.2s ease',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isVerified ? 'var(--color-accent)' : isUploaded ? '#F59E0B' : badge ? 'var(--color-info)' : 'var(--surface-2)',
        color: (isUploaded || badge) ? '#fff' : 'var(--text-4)',
        fontSize: '11px', fontWeight: 700,
      }}>
        {isVerified ? <CheckCircle style={{ width: '14px', height: '14px' }} /> : idx + 1}
      </div>
      <span style={{ fontSize: '13.5px', fontWeight: 500, color: isVerified ? '#065F46' : isUploaded ? '#92400E' : 'var(--text-2)' }}>
        {docName}
      </span>
      {badge && (
        <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '2px 7px' }}>
          {badge}
        </span>
      )}
    </div>

    <div style={{ flexShrink: 0, marginLeft: '12px' }}>
      {isUploaded ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={onVerify} className={`btn ${isVerified ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ padding: '5px 10px', fontSize: '12px' }}>
            {isVerified ? 'Verified ✅' : 'Verify'}
          </button>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost btn-sm" style={{ padding: '5px 10px', fontSize: '12px' }}>
            View
          </a>
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', fontSize: '12px' }}>
            Replace
            <input type="file" style={{ display: 'none' }} onChange={e => onUpload(e, docName)} accept=".pdf,image/*" />
          </label>
        </div>
      ) : (
        <label
          className="btn btn-primary btn-sm"
          style={{ cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          {isUploading ? (
            'Uploading…'
          ) : (
            <><UploadCloud style={{ width: '13px', height: '13px' }} />Upload</>
          )}
          {!isUploading && <input type="file" style={{ display: 'none' }} onChange={e => onUpload(e, docName)} accept=".pdf,image/*" />}
        </label>
      )}
    </div>
  </div>
);

export default ApprovedQuotations;
