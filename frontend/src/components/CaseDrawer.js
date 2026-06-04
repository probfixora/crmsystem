import React, { useState, useEffect, useRef } from 'react';
import { edgeFetch, EDGE, supabase } from '../lib/supabaseClient';
import { BRANDING } from '../config/branding';
import toast from 'react-hot-toast';
import {
  X, ArrowRight, MessageSquare, AlertTriangle, CheckCircle2,
  User, Phone, MapPin, Zap, FileText, ClipboardList, UserCheck, History,
  Package, Plus, Trash2, IndianRupee, FileCheck, AlertOctagon,
  Printer, Star, Clock, Navigation, Download,
  Microscope, Calculator, Headphones, Link as LinkIcon, Send
} from 'lucide-react';
import CaseTimeline from './CaseTimeline';

// Normalize Supabase snake_case row → camelCase the rest of the app expects
const normalizeCase = (c) => ({
  ...c,
  caseId: c.id ?? c.case_id ?? c.caseId,
  trackingId: c.tracking_id ?? c.trackingId,
  customerId: c.customer_id ?? c.customerId,
  customerName: c.customer_name ?? c.customerName,
  currentStage: c.current_stage ?? c.currentStage,
  assignedTeam: c.assigned_team ?? c.assignedTeam,
  assignedTo: c.assigned_to ?? c.assignedTo,
  loadRequired: c.load_required ?? c.loadRequired,
  paymentType: c.payment_type ?? c.paymentType,
  delayReason: c.delay_reason ?? c.delayReason,
  markedDelayedBy: c.marked_delayed_by ?? c.markedDelayedBy,
  markedDelayedAt: c.marked_delayed_at ?? c.markedDelayedAt,
  documents: c.documents || {},
  documentStatuses: (c.document_statuses ?? c.documentStatuses) || {},
  downPayment: c.down_payment ?? c.downPayment,
  cashAmount: c.cash_amount ?? c.cashAmount,
  paymentMode: c.payment_mode ?? c.paymentMode,
  loanAmount: c.loan_amount ?? c.loanAmount,
  emiAmount: c.emi_amount ?? c.emiAmount,
  bankName: c.bank_name ?? c.bankName,
  subsidyRefNumber: c.subsidy_ref_number ?? c.subsidyRefNumber,
  subsidyPhase1Amount: c.subsidy_phase1_amount ?? c.subsidyPhase1Amount,
  subsidyPhase2Amount: c.subsidy_phase2_amount ?? c.subsidyPhase2Amount,
  subsidyNote: c.subsidy_note ?? c.subsidyNote,
});

const STAGES = [
  'Sent to Sales', 'Registration Done', 'Phone Verification Done', 'Bank & Finance',
  'Sent to Store', 'Installation Started', 'Govt Approvals Pending', 'Plant Activated',
  'QA Verified', 'Accounts Verified', 'Sent to Subsidy', 'Subsidy Registration Completed', 'Post-Installation Service',
];

// Maps each stage to the department that OWNS write access at that stage
const stageToRole = {
  'Sent to Sales':                  'sales',
  'Registration Done':              'registration',
  'Phone Verification Done':        'registration',
  'Bank & Finance':                 'banking',
  'Sent to Store':                  'inventory',
  'Installation Started':           'field_installation',
  'Govt Approvals Pending':         'registration',
  'Plant Activated':                'field_installation',
  'QA Verified':                    'technical',
  'Accounts Verified':              'accounts',
  'Sent to Subsidy':                'subsidy',
  'Subsidy Registration Completed': 'subsidy',
  'Post-Installation Service':      'customer_service'
};

const stageToDeptLabel = {
  'registration':       'Registration Department',
  'banking':            'Banking & Finance Department',
  'inventory':          'Inventory / Store Department',
  'field_installation': 'Installation Department',
  'subsidy':            'Subsidy Department',
  'technical':          'Technical QA Department',
  'accounts':           'Accounts Department',
  'customer_service':   'Customer Service Department',
  'procurement':        'Procurement Department',
  'admin':              'Admin',
};

const getTabs = (role) => {
  const tabs = [
    { id: 'update', icon: Zap,      label: 'Update'    },
    { id: 'docs',   icon: FileText, label: 'Documents' },
  ];
  // History is ADMIN-ONLY — shows who changed what and when
  if (role === 'admin') {
    tabs.push({ id: 'history', icon: History, label: 'History' });
  }
  if (role === 'banking' || role === 'admin') {
    tabs.push({ id: 'finance', icon: ClipboardList, label: 'Finance' });
  }
  if (role === 'inventory' || role === 'admin') {
    tabs.push({ id: 'dispatch', icon: Package, label: 'Dispatch' });
  }
  if (role === 'subsidy' || role === 'admin') {
    tabs.push({ id: 'subsidy', icon: FileCheck, label: 'Subsidy' });
  }
  // Work Order / Job Sheet — visible to all (useful for printing)
  tabs.push({ id: 'work_order', icon: Printer, label: 'Job Sheet' });
  // Customer Feedback — admin only, shown on all cases (reads existing feedback)
  if (role === 'admin') {
    tabs.push({ id: 'feedback',          icon: Star,        label: 'Feedback' });
    tabs.push({ id: 'send_to_customer',  icon: LinkIcon,    label: 'Customer Portal' });
  }
  // Technical QA tab
  if (role === 'technical_qa' || role === 'admin') {
    tabs.push({ id: 'technical_qa', icon: Microscope, label: 'Technical QA' });
  }
  // Accounts tab
  if (role === 'accountant' || role === 'admin') {
    tabs.push({ id: 'accounts', icon: Calculator, label: 'Accounts' });
  }
  // Customer Service tab
  if (role === 'customer_service' || role === 'admin') {
    tabs.push({ id: 'customer_service', icon: Headphones, label: 'CRM' });
  }
  return tabs;
};

const CaseDrawer = ({ caseData, onClose, onRefresh }) => {
  const [activeTab, setActiveTab]       = useState('update');
  const [newStage, setNewStage]         = useState('');
  const [remarks, setRemarks]           = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [delayReason, setDelayReason]   = useState('');
  const [delayLoading, setDelayLoading] = useState(false);
  const [docStatuses, setDocStatuses]   = useState({});
  const [history, setHistory]           = useState([]);

  const role    = localStorage.getItem('role');
  const TABS    = getTabs(role);

  // normalized must be declared FIRST — other derived values depend on it
  const normalized = normalizeCase(caseData || {});

  // Compute whether this user's role owns the current stage (write access)
  const ownerRole = stageToRole[normalized.currentStage] || '';
  const canUpdate = role === 'admin' || ownerRole === role || (role === 'electrical' && normalized.currentStage === 'Govt Approvals Pending');
  const ownerDept = stageToDeptLabel[ownerRole] || 'Another Department';

  const [financeLoading, setFinanceLoading] = useState(false);
  const [fData, setFData] = useState({
    paymentType: '',
    downPayment: '',
    cashAmount: '',
    paymentMode: '',
    loanAmount: '',
    emiAmount: '',
    bankName: ''
  });

  // Dispatch Tab State
  const [inventoryList, setInventoryList] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([]);
  const [dispatchDetails, setDispatchDetails] = useState({ vehicleNumber: '', driverName: '', notes: '' });
  const [dispatchLoading, setDispatchLoading] = useState(false);

  // Subsidy Tab State
  const [subsidyLoading, setSubsidyLoading] = useState(false);
  const [subsidyData, setSubsidyData] = useState({
    subsidyRefNumber: '',
    subsidyNote: ''
  });

  // ── Geo-location state (field_installation only) ────────────────────────────
  const [geoLocation, setGeoLocation]   = useState(null);   // { lat, lng, accuracy }
  const [geoLoading, setGeoLoading]     = useState(false);
  const [geoError, setGeoError]         = useState('');

  // ── Feedback state (admin, completed cases) ─────────────────────────────────
  const [feedbackList, setFeedbackList]     = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedback, setNewFeedback]         = useState({ rating: 0, feedback_text: '', installation_quality: 0, team_behavior: 0, timeline_satisfaction: 0 });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [printLoading, setPrintLoading]       = useState(false);
  const printRef = useRef(null);

  // ── New ERP department tab states ───────────────────────────────────────────
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [technicalSaving, setTechnicalSaving] = useState(false);
  const [accountsNotes, setAccountsNotes]   = useState('');
  const [accountsSaving, setAccountsSaving] = useState(false);
  const [crmNote, setCrmNote]               = useState('');
  const [crmSaving, setCrmSaving]           = useState(false);
  const [portalLink, setPortalLink]         = useState('');
  const [portalGenerating, setPortalGenerating] = useState(false);

  // ── Delay risk detection ─────────────────────────────────────────────────────
  // Show amber warning if case has been at current stage > 2 days (client-side)
  const stageStartTime = normalized.stage_start_time || caseData?.stage_start_time;
  const daysAtStage = stageStartTime
    ? Math.floor((Date.now() - new Date(stageStartTime).getTime()) / 86400000)
    : 0;
  const isDelayRisk = daysAtStage >= 2 && normalized.status !== 'Completed' && normalized.status !== 'Delayed';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Compute next stage from normalized (already declared above)
  useEffect(() => {
    if (!caseData) return;
    const idx = STAGES.findIndex(s => s.toLowerCase() === normalized.currentStage?.toLowerCase());
    if (idx >= 0 && idx < STAGES.length - 1) setNewStage(STAGES[idx + 1]);
    
    setDocStatuses(normalized.documentStatuses || {});
    setFData({
      paymentType: normalized.paymentType ? (normalized.paymentType.toLowerCase() === 'loan' ? 'Loan' : 'Cash') : '',
      downPayment: normalized.downPayment || '',
      cashAmount: normalized.cashAmount || '',
      paymentMode: normalized.paymentMode || '',
      loanAmount: normalized.loanAmount || '',
      emiAmount: normalized.emiAmount || '',
      bankName: normalized.bankName || ''
    });

    setSubsidyData({
      subsidyRefNumber: normalized.subsidyRefNumber || '',
      subsidyNote: normalized.subsidyNote || ''
    });
    // Reset geo on case change
    setGeoLocation(null);
    setGeoError('');
  }, [caseData]); // eslint-disable-line

  // Fetch case history for timeline tab
  useEffect(() => {
    const cId = caseData?.id || caseData?.case_id || caseData?.caseId;
    if (!cId) return;
    edgeFetch(EDGE.workflow, { action: 'get_one', caseId: cId })
      .then(res => setHistory(res.history || []))
      .catch(() => {});
  }, [caseData?.id, caseData?.case_id, caseData?.caseId]);

  const [customerDocs, setCustomerDocs] = useState([]);
  useEffect(() => {
    if (activeTab !== 'docs') return;
    const cId = caseData?.id || caseData?.case_id || caseData?.caseId;
    if (!cId) return;
    supabase.from('customer_uploaded_docs').select('*').eq('case_id', cId)
      .then(({ data }) => setCustomerDocs(data || []))
      .catch(console.error);
  }, [activeTab, caseData?.id, caseData?.case_id, caseData?.caseId]);

  // Fetch inventory for dispatch tab + auto-populate items from system_specs / quotations
  useEffect(() => {
    if (activeTab !== 'dispatch') return;
    if (inventoryList.length > 0) return; // already loaded
    const caseId = caseData?.id || caseData?.case_id || caseData?.caseId;
    edgeFetch(EDGE.workflow, { action: 'get_inventory', caseId })
      .then(res => {
        // New response: { inventory: [...], quotationSpecs: {...} | null }
        const invList = res.inventory || res || [];
        const specs   = res.quotationSpecs || null;
        setInventoryList(invList);

        if (!specs || !invList || invList.length === 0) return;

        // Safe parse if specs is still a string
        let s = specs;
        if (typeof s === 'string') { try { s = JSON.parse(s); } catch { return; } }

        const autoItems = [];
        const match = (keywords, qty) => {
          if (!qty || qty <= 0) return;
          const kws = keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean);
          const found = invList.find(inv =>
            kws.some(kw => inv.name.toLowerCase().includes(kw))
          );
          if (found) autoItems.push({ id: found.id, quantity: qty, _name: found.name, _unit: found.unit, _auto: true });
        };

        // Solar Panels — panelUnit is e.g. "5kW", panelCount is number of panels
        const panelKw    = String(s.panelUnit || '').replace(/[^0-9.]/g, '');
        const panelCount = Number(s.panelCount) || 0;
        if (panelCount > 0) {
          match([`solar panel ${panelKw}kw`, `solar panel`, String(s.productName || '').split(' ')[0].toLowerCase()], panelCount);
        }

        // Inverter — inverterKw is e.g. "5kW"
        const invKw = String(s.inverterKw || '').replace(/[^0-9.]/g, '');
        if (invKw && s.inverterBrand) {
          match([`inverter ${invKw}kw`, `${String(s.inverterBrand).toLowerCase()} inverter`, 'inverter'], 1);
        }

        // Battery — batteryBrand e.g. "Luminous 200Ah", batteryCount is number
        const batCount = Number(s.batteryCount) || 0;
        const batCap   = Number(s.batteryCapacity) || 0;
        if (batCount > 0) {
          // batteryBrand may already include capacity e.g. "Luminous 200Ah"
          const batBrandLower = String(s.batteryBrand || '').toLowerCase();
          const batCapStr     = batCap > 0 ? String(batCap) : batBrandLower.replace(/[^0-9]/g, '');
          match([`battery ${batCapStr}ah`, batBrandLower, 'battery'], batCount);
        }

        // Structure — e.g. "Apollo 80mm"
        if (s.structure && String(s.structure).trim()) {
          const structStr = String(s.structure).toLowerCase();
          const mm = structStr.replace(/[^0-9]/g, '') || '';
          match([`structure ${mm}mm`, 'apollo structure', 'structure'], 1);
        }

        // Wiring / Cable
        if (s.wiring && String(s.wiring).trim()) {
          const wireSize = String(s.wiring).replace(/[^0-9]/g, '');
          match([`wiring ${wireSize}`, `cable ${wireSize}`, 'ac wiring', 'wiring'], 1);
        }

        // Earthing
        if (s.earthing && String(s.earthing).trim()) {
          match(['earthing', 'earth'], 1);
        }

        // BOS
        if (s.bos && String(s.bos).trim()) {
          match(['bos', 'balance of system'], 1);
        }

        // Net Metering
        if (s.installation && String(s.installation).trim() && String(s.installation).toLowerCase() !== 'none') {
          match(['net metering', 'metering'], 1);
        }

        if (autoItems.length > 0) setDispatchItems(autoItems);
      })
      .catch(err => console.error('Failed to fetch inventory', err));
  }, [activeTab]); // eslint-disable-line

  // Fetch feedback when feedback tab is opened (admin only)
  useEffect(() => {
    if (activeTab !== 'feedback') return;
    const cId = caseData?.id || caseData?.case_id || caseData?.caseId;
    if (!cId) return;
    setFeedbackLoading(true);
    edgeFetch(EDGE.workflow, { action: 'get_feedback', caseId: cId })
      .then(res => setFeedbackList(res || []))
      .catch(() => setFeedbackList([]))
      .finally(() => setFeedbackLoading(false));
  }, [activeTab]); // eslint-disable-line

  // ── Geo-location capture handler ─────────────────────────────────────────────
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGeoLoading(false);
        toast.success('Location captured successfully!');
      },
      (err) => {
        setGeoError('Could not access location. Please allow location permission or skip.');
        setGeoLoading(false);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  };

  // ── Admin feedback submission ────────────────────────────────────────────────
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (newFeedback.rating === 0) { toast.error('Please select a rating.'); return; }
    const cId = caseData?.id || caseData?.case_id || caseData?.caseId;
    setFeedbackSubmitting(true);
    try {
      await edgeFetch(EDGE.workflow, {
        action: 'submit_feedback',
        caseId: cId,
        customerName: normalized.customerName,
        rating: newFeedback.rating,
        feedback_text: newFeedback.feedback_text,
        installation_quality: newFeedback.installation_quality || newFeedback.rating,
        team_behavior: newFeedback.team_behavior || newFeedback.rating,
        timeline_satisfaction: newFeedback.timeline_satisfaction || newFeedback.rating,
        submitted_by: 'admin',
      });
      toast.success('Feedback recorded!');
      setNewFeedback({ rating: 0, feedback_text: '', installation_quality: 0, team_behavior: 0, timeline_satisfaction: 0 });
      // Refresh feedback list
      const res = await edgeFetch(EDGE.workflow, { action: 'get_feedback', caseId: cId });
      setFeedbackList(res || []);
    } catch (err) {
      toast.error(err.message || 'Failed to submit feedback.');
    } finally { setFeedbackSubmitting(false); }
  };

  const stageIdx = STAGES.findIndex(s => s.toLowerCase() === normalized.currentStage?.toLowerCase());
  const pct      = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGES.length) * 100) : 0;
  const caseId   = caseData?.id || caseData?.case_id || caseData?.caseId;

  const isRegStage = normalized.currentStage === 'Registration Done' || normalized.currentStage === 'Phone Verification Done';
  const isBankingStage = normalized.currentStage === 'Bank & Finance';
  const docs = normalized.documents || {};
  
  const allDocsObj = { ...docs };
  (customerDocs || []).forEach(d => { allDocsObj[d.doc_name] = d.doc_url; });
  
  const visibleDocsList = Object.keys(allDocsObj).filter(docName => {
    if (role === 'admin' || role === 'registration' || role === 'sales') return true;
    const name = docName.toLowerCase();
    if (role === 'banking') return name.includes('pan') || name.includes('aadhar') || name.includes('bank') || name.includes('cheque') || name.includes('electricity') || name.includes('finance') || name.includes('loan') || name.includes('receipt') || name.includes('bill') || name.includes('salary') || name.includes('statement') || name.includes('form') || name.includes('itr') || name.includes('gst');
    if (role === 'field_installation' || role === 'inventory') return name.includes('photo') || name.includes('gps') || name.includes('site') || name.includes('layout') || name.includes('structure') || name.includes('property');
    if (role === 'accountant') return name.includes('bank') || name.includes('cheque');
    return false;
  });

  const unverifiedDocs = visibleDocsList.filter(d => (docStatuses[d] || 'Yellow') !== 'Green');
  const hasDocError = (isRegStage || isBankingStage) && unverifiedDocs.length > 0;

  const pType = (normalized.paymentType || '').toLowerCase();
  const isFinanceApproved = pType === 'loan' 
    ? (normalized.finance_form_status === 'Loan Approved' || normalized.finance_form_status === 'Approved' || normalized.finance_final_status === 'Approved')
    : (pType === 'cash' && normalized.paymentMode && normalized.paymentMode.trim() !== '');
  const hasFinanceError = isBankingStage && !isFinanceApproved;

  /* ── Handlers ── */
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) { toast.error('Please add a handoff note.'); return; }

    // ── Client-side Gates ────────────────────────────────────────────────
    if (hasDocError) return;
    if (hasFinanceError) return;
    // ─────────────────────────────────────────────────────────────────────

    setUpdateLoading(true);
    try {
      await edgeFetch(EDGE.workflow, { action: 'update_stage', caseId, newStage, remarks });
      toast.success('Stage updated!');
      onClose(); onRefresh();
    } catch (err) {
      toast.error(err.message || 'Update failed.');
    } finally { setUpdateLoading(false); }
  };

  const handleMarkDelayed = async (unmark = false) => {
    if (!unmark && !delayReason.trim()) { toast.error('Enter a delay reason.'); return; }
    setDelayLoading(true);
    try {
      await edgeFetch(EDGE.workflow, { action: 'mark_delayed', caseId, reason: delayReason, unmark });
      toast.success(unmark ? 'Delay removed.' : 'Case marked delayed.');
      onClose(); onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed.');
    } finally { setDelayLoading(false); }
  };

  const handleDocStatusChange = async (docName, status) => {
    const newStatuses = { ...docStatuses, [docName]: status };
    setDocStatuses(newStatuses);
    try {
      await edgeFetch(EDGE.workflow, { action: 'update_details', caseId, documentStatuses: newStatuses });
      toast.success(`Document marked as ${status}`);
    } catch(err) {
      toast.error('Failed to update status');
    }
  };

  const handleSubsidyUpdate = async (e) => {
    e.preventDefault();
    setSubsidyLoading(true);
    try {
      await edgeFetch(EDGE.workflow, { action: 'update_details', caseId, ...subsidyData });
      toast.success('Subsidy details updated!');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Update failed.');
    } finally { setSubsidyLoading(false); }
  };

  const handleFinanceUpdate = async (e) => {
    e.preventDefault();
    setFinanceLoading(true);
    try {
      await edgeFetch(EDGE.workflow, { action: 'update_finance', caseId, ...fData });
      toast.success('Finance details updated!');
      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Update failed.');
    } finally { setFinanceLoading(false); }
  };

  const handleAddDispatchItem = () => {
    setDispatchItems([...dispatchItems, { id: '', quantity: 1 }]);
  };

  const handleDispatchItemChange = (index, field, value) => {
    const newItems = [...dispatchItems];
    newItems[index][field] = value;
    setDispatchItems(newItems);
  };

  const handleRemoveDispatchItem = (index) => {
    setDispatchItems(dispatchItems.filter((_, i) => i !== index));
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    if (dispatchItems.length === 0) {
      toast.error('Add at least one item to dispatch.');
      return;
    }
    // Validate
    for (const item of dispatchItems) {
      if (!item.id || item.quantity <= 0) {
        toast.error('Ensure all selected items have a valid quantity.');
        return;
      }
    }

    setDispatchLoading(true);
    try {
      await edgeFetch(EDGE.workflow, {
        action: 'dispatch_materials',
        caseId,
        items: dispatchItems,
        vehicleNumber: dispatchDetails.vehicleNumber,
        driverName: dispatchDetails.driverName,
        notes: dispatchDetails.notes
      });
      toast.success('Materials dispatched and inventory deducted successfully!');
      
      // Auto-update stage if currently in Sent to Store
      if (normalized.currentStage === 'Sent to Store') {
         await edgeFetch(EDGE.workflow, { action: 'update_stage', caseId, newStage: 'Installation Started', remarks: 'Materials dispatched, moved to Installation' });
      }

      onClose();
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Dispatch failed.');
    } finally { setDispatchLoading(false); }
  };

  // ── PDF Download ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setPrintLoading(true);

    const trackId   = normalized.trackingId || normalized.id || normalized.caseId || '—';
    const today     = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    const deptLabel = role === 'admin' ? 'Admin' : (role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '));
    const fmt       = v => (v && !isNaN(v)) ? `₹${Number(v).toLocaleString('en-IN')}` : (v || '—');
    const hasVal    = v => v !== null && v !== undefined && String(v).trim() !== '';

    const secHdr = (t) =>
      `<tr><td colspan="4" style="background:#0f1724;color:#fff;padding:10px 14px;font-size:14px;font-weight:700;letter-spacing:0.07em;border:none">${t}</td></tr>`;

    const row2 = (l1, v1, l2 = '', v2 = '') =>
      `<tr>
        <td style="padding:10px 14px;font-weight:700;color:#334155;font-size:13px;width:18%;background:#f8fafc;border:1px solid #cbd5e1">${l1}</td>
        <td style="padding:10px 14px;color:#000;font-size:14px;font-weight:500;width:32%;border:1px solid #cbd5e1">${hasVal(v1) ? v1 : '—'}</td>
        <td style="padding:10px 14px;font-weight:700;color:#334155;font-size:13px;width:18%;background:#f8fafc;border:1px solid #cbd5e1">${l2}</td>
        <td style="padding:10px 14px;color:#000;font-size:14px;font-weight:500;width:32%;border:1px solid #cbd5e1">${hasVal(v2) ? v2 : (l2 ? '—' : '')}</td>
      </tr>`;

    const isAdmin   = role === 'admin';
    const isBank    = ['admin','banking'].includes(role);
    const isReg     = ['admin','registration','banking','sales'].includes(role);
    const isInst    = ['admin','field_installation'].includes(role);
    const isInv     = ['admin','inventory'].includes(role);
    const isSub     = ['admin','subsidy'].includes(role);

    // Customer section
    const customerSection = `
      ${secHdr('CUSTOMER INFORMATION')}
      ${row2('Tracking ID', `<strong>${trackId}</strong>`, 'Customer ID', normalized.customerId)}
      ${row2('Customer Name', `<strong>${normalized.customerName}</strong>`, 'Status', normalized.status)}
      ${row2('Current Stage', normalized.currentStage, 'Assigned Team', normalized.assignedTeam || '—')}
      ${isReg || isInst ? row2('Phone', normalized.phone, 'Alternate Phone', normalized.alternatePhone || '—') : ''}
      ${isReg || isInst ? row2('Address', normalized.address, 'Load Required', normalized.loadRequired ? normalized.loadRequired + ' kW' : '—') : ''}
      ${isReg ? row2('Payment Type', normalized.paymentType, 'Consumer ID', normalized.consumerId || '—') : ''}
      ${isReg ? row2('Company', normalized.companyName || '—', 'Project Type', normalized.projectType || '—') : ''}
      ${isReg ? row2('Sales Person', normalized.salesPerson || '—', 'GSTIN', normalized.gstin || 'N/A') : ''}
    `;

    // Finance section
    const financeSection = isBank ? `
      ${secHdr('FINANCIAL DETAILS')}
      ${row2('Payment Type', normalized.paymentType, 'Down Payment', fmt(normalized.downPayment))}
      ${row2('Loan Amount', fmt(normalized.loanAmount), 'Monthly EMI', fmt(normalized.emiAmount))}
      ${row2('Approved Bank', normalized.bankName || '—', 'Cash Amount', fmt(normalized.cashAmount))}
    ` : '';

    // Installation section
    const installSection = isInst ? `
      ${secHdr('INSTALLATION DETAILS')}
      ${row2('Site Visit Date', normalized.siteVisitDate || '—', 'Load Required', normalized.loadRequired ? normalized.loadRequired + ' kW' : '—')}
      ${row2('Installation Note', normalized.installationNote || '—', '', '')}
    ` : '';

    // Dispatch section with items table
    let dispatchSection = '';
    if (isInv) {
      const items = normalized.dispatchedItems;
      let itemsBody = '';
      if (Array.isArray(items) && items.length > 0) {
        itemsBody = items.map((it, i) =>
          `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
            <td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:13px;text-align:center">${i+1}</td>
            <td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:13px">${it.name || it.item || '—'}</td>
            <td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:13px;text-align:center">${it.quantity ?? '—'}</td>
            <td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:13px">${it.unit || '—'}</td>
            <td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:13px">${it.notes || '—'}</td>
          </tr>`
        ).join('');
      } else {
        itemsBody = `<tr><td colspan="5" style="padding:12px;color:#64748b;font-size:13px;border:1px solid #cbd5e1;text-align:center">No dispatch items recorded.</td></tr>`;
      }
      dispatchSection = `
        ${secHdr('DISPATCH DETAILS')}
        ${row2('Dispatch Date', normalized.dispatchDate || '—', 'Vehicle Number', normalized.dispatchVehicle || '—')}
        ${row2('Driver Name', normalized.dispatchDriver || '—', '', '')}
        ${secHdr('DISPATCH MATERIALS')}
        <tr><td colspan="4" style="padding:0;border:none">
          <table style="width:100%;border-collapse:collapse">
            <tr style="background:#1e293b;color:#fff">
              <th style="padding:9px 12px;border:1px solid #334155;font-size:13px;width:5%">Sr.</th>
              <th style="padding:9px 12px;border:1px solid #334155;font-size:13px">Item Description</th>
              <th style="padding:9px 12px;border:1px solid #334155;font-size:13px;text-align:center">Qty</th>
              <th style="padding:9px 12px;border:1px solid #334155;font-size:13px">Unit</th>
              <th style="padding:9px 12px;border:1px solid #334155;font-size:13px">Notes</th>
            </tr>
            ${itemsBody}
          </table>
        </td></tr>
      `;
    }

    // Subsidy section
    const subsidySection = isSub ? `
      ${secHdr('SUBSIDY DETAILS')}
      ${row2('Consumer ID', normalized.consumerId || '—', 'Subsidy Ref. No.', normalized.subsidyRefNumber || '—')}
      ${row2('Subsidy Note', normalized.subsidyNote || '—', '', '')}
    ` : '';

    const statusColor = normalized.status === 'Completed' ? '#065f46' : normalized.status === 'Delayed' ? '#991b1b' : '#3730a3';
    const statusBg    = normalized.status === 'Completed' ? '#d1fae5' : normalized.status === 'Delayed' ? '#fee2e2' : '#e0e7ff';

    const printHTML = `<!DOCTYPE html><html><head>
      <title>${BRANDING.name} — ${trackId}</title>
      <meta charset="UTF-8"/>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;background:#fff}
        .page{max-width:850px;margin:auto;padding:20px}
        .hdr{background:linear-gradient(135deg,#0f1724 0%,#0f2a1a 100%);color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-radius:6px}
        .hdr-left h1{font-size:26px;font-weight:800;letter-spacing:-0.01em}
        .hdr-left p{font-size:14px;color:rgba(255,255,255,0.7);margin-top:4px}
        .hdr-right{text-align:right}
        .hdr-right .tid{font-family:monospace;font-size:18px;font-weight:700;color:#93c5fd}
        .hdr-right .dt{font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px}
        .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700;background:${statusBg};color:${statusColor};margin-top:8px}
        .dept{display:inline-block;padding:6px 16px;background:#ede9fe;color:#5b21b6;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:0.05em;margin-bottom:18px}
        table.info{width:100%;border-collapse:collapse;margin-bottom:0}
        .footer{font-size:11px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:14px;margin-top:24px;display:flex;justify-content:space-between}
        @media print{body{padding:0}.page{padding:12px}}
      </style></head>
      <body><div class="page">
        <div class="hdr">
          <div class="hdr-left">
            <h1>&#9728; ${BRANDING.name} CRM</h1>
            <p>Official Case Document</p>
          </div>
          <div class="hdr-right">
            <div class="tid">${trackId}</div>
            <div class="dt">Generated: ${today}</div>
            <div class="badge">${normalized.status || 'In Progress'}</div>
          </div>
        </div>
        <div class="dept">&#128203; Downloaded by: ${deptLabel}</div>
        <table class="info">
          ${customerSection}
          ${financeSection}
          ${installSection}
          ${dispatchSection}
          ${subsidySection}
        </table>
        <div class="footer">
          <span>&#9888; Confidential — Authorized for ${deptLabel} only. Do not share.</span>
          <span>${BRANDING.name} CRM &nbsp;·&nbsp; ${today}</span>
        </div>
      </div></body></html>`;

    const win = window.open('', '_blank', 'width=920,height=750');
    if (win) {
      win.document.write(printHTML);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
    } else {
      toast.error('Popup blocked — allow popups for this site and try again.');
    }
    setPrintLoading(false);
    toast.success('PDF ready — use Ctrl+P → Save as PDF');
  };

  const isCompleted = normalized.status === 'Completed' || normalized.currentStage === 'Completed';

  /* ── Render ── */
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(3px)', zIndex: 9998,
          animation: 'fadeIn 0.2s ease both',
        }}
      />

      {/* Drawer panel */}
      <div className="glass-panel" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '500px', maxWidth: '100%',
        background: 'var(--surface)', zIndex: 9999, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.18)',
        animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) both',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg, #0f1724 0%, #0f2a1a 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#60A5FA', letterSpacing: '0.05em' }}>
                {normalized.trackingId || normalized.caseId}
              </span>
              {normalized.customerId && normalized.customerId !== (normalized.trackingId || normalized.caseId) && (
                <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: '#a78bfa', letterSpacing: '0.04em', display: 'block', marginTop: '2px' }}>
                  Customer ID: {normalized.customerId}
                </span>
              )}
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>
                {normalized.customerName}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Download PDF button */}
              <button
                onClick={handleDownloadPDF}
                disabled={printLoading}
                title="Download case details as PDF"
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px', cursor: printLoading ? 'wait' : 'pointer',
                  background: 'rgba(99,102,241,0.25)', color: '#a5b4fc',
                  fontSize: '11.5px', fontWeight: 600, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.45)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = '#a5b4fc'; }}
              >
                <Download style={{ width: '12px', height: '12px' }} />
                {printLoading ? 'Preparing…' : 'PDF'}
              </button>
              <button onClick={onClose} style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.7)' }} />
              </button>
            </div>
          </div>

          {/* Customer info row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            {[
              { Icon: Phone,  val: normalized.phone },
              { Icon: MapPin, val: normalized.address },
              { Icon: Zap,    val: normalized.loadRequired ? `${normalized.loadRequired} kW${normalized.paymentType ? ' · ' + normalized.paymentType : ''}` : null },
            ].filter(item => item.val).map(({ Icon, val }) => (
              <div key={val} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon style={{ width: '11px', height: '11px', color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.55)' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Status + progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
              background: normalized.status === 'Delayed' ? 'rgba(244,63,94,0.2)' : normalized.status === 'Completed' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
              color:      normalized.status === 'Delayed' ? '#fda4af'              : normalized.status === 'Completed' ? '#6ee7b7'              : '#a5b4fc',
            }}>
              {normalized.status}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: '99px', transition: 'width 0.6s' }} />
              </div>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', display: 'block' }}>
                Stage {stageIdx + 1} of {STAGES.length} — {normalized.currentStage}
              </span>
            </div>
          </div>

          {/* Assigned to */}
          {normalized.assignedTo && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User style={{ width: '11px', height: '11px', color: 'rgba(255,255,255,0.3)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                Assigned to <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{normalized.assignedTo}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '5px', padding: '12px 6px', border: 'none', cursor: 'pointer',
                  background: isActive ? '#fff' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  fontSize: '12px', fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-primary)' : '#94a3b8',
                  transition: 'all 0.15s',
                }}
              >
                <tab.icon style={{ width: '13px', height: '13px' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* UPDATE TAB */}
          {activeTab === 'update' && (
            <div>
              {/* READ-ONLY BANNER — shown when this role doesn't own the current stage */}
              {!canUpdate && !isCompleted && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '18px 20px', borderRadius: '14px', marginBottom: '20px',
                  background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                  border: '1px solid #fde68a',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#fff' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                      View-Only Access
                    </p>
                    <p style={{ fontSize: '12.5px', color: '#b45309', lineHeight: 1.5 }}>
                      This customer is currently with <strong>{ownerDept}</strong>. 
                      Your department has completed its tasks for this record. 
                      Updates can only be made by the assigned department.
                    </p>
                  </div>
                </div>
              )}

              {/* Stage info (always visible) */}
              {!isCompleted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '6px' }}>Current stage</p>
                    <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', background: '#fff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      {normalized.currentStage}
                    </span>
                  </div>
                  {canUpdate && (
                    <>
                      <ArrowRight style={{ width: '16px', height: '16px', color: '#cbd5e1', flexShrink: 0 }} />
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontSize: '10.5px', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '6px' }}>Moving to</p>
                        <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '6px 10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                          {newStage}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Delay Risk Banner (shown when 2+ days at stage but not yet flagged) ── */}
              {isDelayRisk && canUpdate && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                  background: '#fffbeb', border: '1px solid #fde68a',
                }}>
                  <Clock style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <p style={{ fontSize: '12.5px', fontWeight: 700, color: '#92400e', marginBottom: '2px' }}>
                      Delay Risk — {daysAtStage} day{daysAtStage !== 1 ? 's' : ''} at this stage
                    </p>
                    <p style={{ fontSize: '11.5px', color: '#b45309', lineHeight: 1.4 }}>
                      This case has been in <strong>{normalized.currentStage}</strong> for {daysAtStage} days. Consider flagging a delay if progress is blocked.
                    </p>
                  </div>
                </div>
              )}

              {isCompleted ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 style={{ width: '40px', height: '40px', color: 'var(--color-primary)', margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>Customer Completed</p>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>This project has been fully processed.</p>
                </div>
              ) : canUpdate ? (
                <>
                  <form onSubmit={handleUpdateSubmit}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      <FileText style={{ width: '13px', height: '13px', color: '#94a3b8' }} />
                      Handoff note for next team (required)
                    </label>
                    <textarea
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      required
                      placeholder="What was completed? What should the next department know?"
                      className="input"
                      style={{ minHeight: '100px', resize: 'vertical' }}
                    />
                    {hasDocError && (
                      <div style={{ marginTop: '14px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 500 }}>
                        <AlertOctagon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        Document not verified kindly verify first then proceed
                      </div>
                    )}
                    {hasFinanceError && (
                      <div style={{ marginTop: '14px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontSize: '13px', fontWeight: 500 }}>
                        <AlertOctagon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        Finance not approved! Update and approve the Loan or Cash details to proceed.
                      </div>
                    )}

                    {/* ── Geo-location capture (field_installation only) ──────────────────────── */}
                    {role === 'field_installation' && (
                      <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                        <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Navigation style={{ width: '13px', height: '13px' }} />
                          Site Location (Optional)
                        </p>
                        {geoLocation ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                              <p style={{ fontSize: '12px', fontWeight: 600, color: '#075985', marginBottom: '2px' }}>
                                ✓ Location captured ({geoLocation.accuracy}m accuracy)
                              </p>
                              <a
                                href={`https://maps.google.com/?q=${geoLocation.lat},${geoLocation.lng}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none' }}
                              >
                                {geoLocation.lat}, {geoLocation.lng} ↗
                              </a>
                            </div>
                            <button
                              type="button" onClick={() => { setGeoLocation(null); setGeoError(''); }}
                              style={{ fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                            >Clear</button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={handleCaptureLocation}
                              disabled={geoLoading}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '7px',
                                padding: '8px 14px', borderRadius: '8px',
                                background: geoLoading ? '#e0f2fe' : '#0ea5e9',
                                color: geoLoading ? '#075985' : '#fff',
                                border: 'none', fontSize: '12.5px', fontWeight: 600,
                                cursor: geoLoading ? 'wait' : 'pointer',
                              }}
                            >
                              <Navigation style={{ width: '13px', height: '13px' }} />
                              {geoLoading ? 'Getting location…' : 'Capture GPS Location'}
                            </button>
                            {geoError && <p style={{ fontSize: '11px', color: '#dc2626', marginTop: '6px' }}>{geoError}</p>}
                            <p style={{ fontSize: '10.5px', color: '#64748b', marginTop: '6px' }}>Location is appended to handoff remarks for field records.</p>
                          </>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <button type="submit" disabled={updateLoading || hasDocError || hasFinanceError} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', opacity: (hasDocError || hasFinanceError) ? 0.6 : 1, cursor: (hasDocError || hasFinanceError) ? 'not-allowed' : 'pointer' }}>
                        {updateLoading
                          ? <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Updating…</>
                          : <>{normalized.currentStage === 'Registration Done' ? 'Document Verified & Move to Next Stage' : 'Confirm & move to next stage'} <ArrowRight style={{ width: '14px', height: '14px' }} /></>
                        }
                      </button>
                    </div>
                  </form>

                  {/* Delay section */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '18px' }}>
                    <p style={{ fontSize: '11.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Delay flag</p>
                    {normalized.status === 'Delayed' ? (
                      <div style={{ padding: '12px 14px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                          <AlertTriangle style={{ width: '14px', height: '14px', color: '#ea580c', flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412', marginBottom: '3px' }}>Currently marked as Delayed</p>
                            {normalized.delayReason && <p style={{ fontSize: '12px', color: '#c2410c', fontStyle: 'italic' }}>"{normalized.delayReason}"</p>}
                            {normalized.markedDelayedBy && <p style={{ fontSize: '11px', color: '#c2410c', opacity: 0.75, marginTop: '2px' }}>— by {normalized.markedDelayedBy}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleMarkDelayed(true)} disabled={delayLoading} className="btn" style={{ background: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0', width: 'fit-content', padding: '6px 12px', fontSize: '12px' }}>
                          <CheckCircle2 style={{ width: '13px', height: '13px' }} /> Remove delay flag
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setShowDelayForm(v => !v)} className="btn" style={{
                          color: showDelayForm ? '#ea580c' : '#b45309',
                          background: showDelayForm ? '#fff7ed' : 'transparent',
                          borderColor: showDelayForm ? '#fed7aa' : 'transparent',
                          width: 'fit-content', padding: '6px 12px', fontSize: '12px'
                        }}>
                          <AlertTriangle style={{ width: '13px', height: '13px' }} />
                          {showDelayForm ? 'Cancel' : 'Flag as Delayed'}
                        </button>
                        {showDelayForm && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea
                              value={delayReason} onChange={e => setDelayReason(e.target.value)}
                              placeholder="Reason for delay…"
                              className="input"
                              style={{ minHeight: '72px', resize: 'vertical' }}
                            />
                            <button onClick={() => handleMarkDelayed(false)} disabled={delayLoading || !delayReason.trim()} className="btn btn-primary" style={{ background: 'var(--amber)', color: '#fff', border: 'none', opacity: (delayLoading || !delayReason.trim()) ? 0.55 : 1 }}>
                              Confirm delay
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'docs' && (
            <div>
              <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Uploaded Documents</p>
              
              {(() => {
                const allDocsObjLocal = { ...(normalized.documents || {}) };
                (customerDocs || []).forEach(d => {
                  allDocsObjLocal[d.doc_name] = d.doc_url;
                });
                const docsLocal = Object.entries(allDocsObjLocal);
                const visibleDocs = docsLocal.filter(([docName]) => visibleDocsList.includes(docName));

                if (docs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <FileText style={{ width: '32px', height: '32px', color: '#cbd5e1', margin: '0 auto 12px' }} />
                      <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>No documents uploaded yet.</p>
                    </div>
                  );
                }

                if (visibleDocs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <FileText style={{ width: '32px', height: '32px', color: '#cbd5e1', margin: '0 auto 12px' }} />
                      <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Documents are masked for your department.</p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {visibleDocs.map(([docName, docUrl]) => {
                      const status = docStatuses[docName] || 'Yellow';
                      const statusColors = {
                        Red: { bg: '#fee2e2', text: '#ef4444', border: '#fecaca' },
                        Yellow: { bg: '#fef3c7', text: '#f59e0b', border: '#fde68a' },
                        Green: { bg: '#dcfce7', text: '#10b981', border: '#bbf7d0' }
                      };
                      return (
                        <div key={docName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', border: `1px solid ${statusColors[status].border}`, borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusColors[status].text, boxShadow: `0 0 0 3px ${statusColors[status].bg}` }} />
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>{docName}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <select
                              value={status}
                              onChange={(e) => handleDocStatusChange(docName, e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: `1px solid ${statusColors[status].border}`, background: statusColors[status].bg, color: statusColors[status].text, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                            >
                              <option value="Yellow">Pending</option>
                              <option value="Green">Verified</option>
                              <option value="Red">Rejected</option>
                            </select>
                            <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: '#f1f5f9', color: '#334155', fontSize: '12px', fontWeight: 600, borderRadius: '6px', textDecoration: 'none', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background='#e2e8f0'} onMouseOut={e => e.target.style.background='#f1f5f9'}>
                              View
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div>
              <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Full stage history</p>
              <CaseTimeline
                caseId={normalized.caseId}
                history={history}
                currentStage={normalized.currentStage}
              />
            </div>
          )}

          {/* FINANCE TAB */}
          {activeTab === 'finance' && (
            <div>
              <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Financial Details</p>
              
              <form onSubmit={handleFinanceUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Payment Type</label>
                    <select
                      value={fData.paymentType}
                      onChange={e => setFData({ ...fData, paymentType: e.target.value })}
                      className="input"
                    >
                      <option value="" disabled>Select</option>
                      <option value="Cash">Cash</option>
                      <option value="Loan">Loan</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Down Payment (₹)</label>
                    <input
                      type="number"
                      value={fData.downPayment}
                      onChange={e => setFData({ ...fData, downPayment: e.target.value })}
                      placeholder="0"
                      className="input"
                    />
                  </div>
                </div>

                {fData.paymentType === 'Cash' && (
                  <div style={{ display: 'flex', gap: '12px', padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Cash Amount (₹)</label>
                      <input
                        type="number"
                        value={fData.cashAmount}
                        onChange={e => setFData({ ...fData, cashAmount: e.target.value })}
                        placeholder="Total cash to pay"
                        className="input"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>Payment Mode</label>
                      <select
                        value={fData.paymentMode}
                        onChange={e => setFData({ ...fData, paymentMode: e.target.value })}
                        className="input"
                      >
                        <option value="">Select mode...</option>
                        <option value="Cash">Cash (Physical)</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>
                  </div>
                )}

                {fData.paymentType === 'Loan' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>Loan Amount (₹)</label>
                        <input
                          type="number"
                          value={fData.loanAmount}
                          onChange={e => setFData({ ...fData, loanAmount: e.target.value })}
                          placeholder="Amount financed"
                          className="input"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>Monthly EMI (₹)</label>
                        <input
                          type="number"
                          value={fData.emiAmount}
                          onChange={e => setFData({ ...fData, emiAmount: e.target.value })}
                          placeholder="Monthly payment"
                          className="input"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>Approved Bank Name</label>
                      <input
                        type="text"
                        value={fData.bankName}
                        onChange={e => setFData({ ...fData, bankName: e.target.value })}
                        placeholder="e.g. HDFC, SBI"
                        className="input"
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" disabled={financeLoading} className="btn btn-primary">
                    {financeLoading ? 'Saving...' : 'Save Financial Details'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* DISPATCH TAB */}
          {activeTab === 'dispatch' && (
            <div>
              <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Dispatch Materials</p>
              
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📦 Items to Dispatch</span>
                  <button onClick={handleAddDispatchItem} type="button" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                    <Plus size={13} /> Add Extra Item
                  </button>
                </h4>
                {dispatchItems.some(i => i._auto) && (
                  <p style={{ fontSize: '11px', color: '#16a34a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    ✅ Auto-detected from quotation — adjust quantity if needed
                  </p>
                )}

                {dispatchItems.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                    No items detected. Click "+ Add Extra Item" to add manually.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 32px', gap: '8px', padding: '4px 2px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>Qty</span>
                      <span />
                    </div>
                    {dispatchItems.map((item, idx) => {
                      const invItem = inventoryList.find(i => i.id === item.id);
                      const itemName = invItem?.name || item._name || 'Unknown Item';
                      const itemUnit = invItem?.unit || item._unit || '';
                      const itemStock = invItem?.stock ?? '?';
                      return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 32px', gap: '8px', alignItems: 'center', background: '#fff', borderRadius: '8px', padding: '8px 10px', border: '1px solid #e2e8f0' }}>
                          {item._auto ? (
                            <div>
                              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{itemName}</span>
                              <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '6px' }}>Stock: {itemStock} {itemUnit}</span>
                            </div>
                          ) : (
                            <select
                              value={item.id}
                              onChange={(e) => handleDispatchItemChange(idx, 'id', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', width: '100%' }}
                            >
                              <option value="">Select Item...</option>
                              {inventoryList.map(inv => (
                                <option key={inv.id} value={inv.id} disabled={inv.stock <= 0}>
                                  {inv.name} (Stock: {inv.stock} {inv.unit})
                                </option>
                              ))}
                            </select>
                          )}
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleDispatchItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                            style={{ padding: '6px 8px', fontSize: '12.5px', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'center', width: '100%' }}
                          />
                          <button
                            onClick={() => handleRemoveDispatchItem(idx)}
                            type="button"
                            style={{ padding: '5px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleDispatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Vehicle Number</label>
                    <input
                      type="text"
                      value={dispatchDetails.vehicleNumber}
                      onChange={e => setDispatchDetails({ ...dispatchDetails, vehicleNumber: e.target.value })}
                      placeholder="e.g. MH 12 AB 1234"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Driver Name</label>
                    <input
                      type="text"
                      value={dispatchDetails.driverName}
                      onChange={e => setDispatchDetails({ ...dispatchDetails, driverName: e.target.value })}
                      placeholder="Driver Name"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Dispatch Notes</label>
                  <textarea
                    value={dispatchDetails.notes}
                    onChange={e => setDispatchDetails({ ...dispatchDetails, notes: e.target.value })}
                    placeholder="Any specific instructions for delivery?"
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" disabled={dispatchLoading || dispatchItems.length === 0} style={{
                    flex: 1, padding: '11px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    color: '#fff', fontSize: '13.5px', fontWeight: 600, cursor: (dispatchLoading || dispatchItems.length === 0) ? 'not-allowed' : 'pointer',
                    opacity: (dispatchLoading || dispatchItems.length === 0) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                    {dispatchLoading ? 'Dispatching...' : 'Confirm Dispatch & Deduct Inventory'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUBSIDY TAB */}
          {activeTab === 'subsidy' && (
            <div>
              <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Subsidy Registration</p>

              {/* Status indicator */}
              <div style={{
                padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
                background: normalized.status === 'Completed' ? '#f0fdf4' : normalized.currentStage === 'Sent to Subsidy' ? '#eff6ff' : '#fffbeb',
                border: `1px solid ${ normalized.status === 'Completed' ? '#86efac' : normalized.currentStage === 'Sent to Subsidy' ? '#bfdbfe' : '#fde68a'}`,
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                  background: normalized.status === 'Completed' ? '#16a34a' : normalized.currentStage === 'Sent to Subsidy' ? '#3b82f6' : '#f59e0b' }} />
                <p style={{ fontSize: '13px', fontWeight: 600,
                  color: normalized.status === 'Completed' ? '#166534' : normalized.currentStage === 'Sent to Subsidy' ? '#1e40af' : '#92400e' }}>
                  {normalized.status === 'Completed'
                    ? '✓ Subsidy Registration Completed'
                    : normalized.currentStage === 'Sent to Subsidy'
                    ? '🔵 Case received — start subsidy registration'
                    : 'Subsidy registration pending'}
                </p>
              </div>

              <form onSubmit={handleSubsidyUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Government Reference Number</label>
                  <input
                    type="text"
                    value={subsidyData.subsidyRefNumber}
                    onChange={e => setSubsidyData({ ...subsidyData, subsidyRefNumber: e.target.value })}
                    placeholder="e.g. GOV-2026-XXXXX"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Subsidy Notes</label>
                  <textarea
                    value={subsidyData.subsidyNote}
                    onChange={e => setSubsidyData({ ...subsidyData, subsidyNote: e.target.value })}
                    placeholder="Application status, portal notes, pending docs…"
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  {/* Save details only */}
                  <button type="submit" disabled={subsidyLoading} style={{
                    padding: '11px', borderRadius: '10px', border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#334155',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: subsidyLoading ? 0.6 : 1,
                  }}>
                    {subsidyLoading ? 'Saving...' : 'Save Details'}
                  </button>

                  {/* Mark Subsidy Registration Completed */}
                  <button
                    type="button"
                    disabled={subsidyLoading || normalized.status === 'Completed'}
                    onClick={async () => {
                      setSubsidyLoading(true);
                      try {
                        // Save details first
                        await edgeFetch(EDGE.workflow, { action: 'update_details', caseId, ...subsidyData });
                        // Then trigger the stage completion (auto-completes the case)
                        await edgeFetch(EDGE.workflow, {
                          action: 'update_stage',
                          caseId,
                          newStage: 'Subsidy Registration Completed',
                          remarks: `Subsidy registration completed. Ref: ${subsidyData.subsidyRefNumber || 'N/A'}`,
                        });
                        toast.success('Subsidy registration completed! Case marked as Completed.');
                        onClose(); onRefresh();
                      } catch (err) {
                        toast.error(err.message || 'Failed to complete subsidy registration.');
                      } finally { setSubsidyLoading(false); }
                    }}
                    style={{
                      padding: '12px', borderRadius: '10px', border: 'none',
                      background: normalized.status === 'Completed' ? '#d1fae5' : 'linear-gradient(135deg, #16a34a, #059669)',
                      color: normalized.status === 'Completed' ? '#065f46' : '#fff',
                      fontSize: '13px', fontWeight: 700, cursor: normalized.status === 'Completed' ? 'default' : 'pointer',
                      opacity: subsidyLoading ? 0.6 : 1,
                      boxShadow: normalized.status === 'Completed' ? 'none' : '0 4px 14px rgba(22,163,74,0.3)',
                    }}
                  >
                    {normalized.status === 'Completed' ? '✓ Already Completed' : '✓ Mark Subsidy Registration Completed'}
                  </button>
                  <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                    This will automatically mark the entire case as <strong>Completed</strong>.
                  </p>
                </div>
              </form>
            </div>
          )}
          {/* WORK ORDER / JOB SHEET TAB */}
          {activeTab === 'work_order' && (
            <div id="work-order-print-area">
              {/* Print button — hidden in actual print via CSS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }} className="no-print">
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '8px 16px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                  }}
                >
                  <Printer style={{ width: '14px', height: '14px' }} />
                  Print Job Sheet
                </button>
              </div>

              {/* ── JOB SHEET PRINTABLE CONTENT ── */}
              <div style={{ fontFamily: 'DM Sans, Inter, sans-serif' }}>

                {/* Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '16px 20px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0f1724 0%, #0f2a1a 100%)',
                  marginBottom: '16px',
                }}>
                  <div>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{BRANDING.name}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Work Order / Installation Job Sheet</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#60A5FA', fontFamily: 'monospace' }}>{normalized.caseId}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      Issued: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Customer Info */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Customer Information</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Customer Name', val: normalized.customerName },
                      { label: 'Phone', val: normalized.phone },
                      ...(normalized.customerId && normalized.customerId !== (normalized.trackingId || normalized.tracking_id || caseData?.tracking_id) 
                        ? [{ label: 'Customer ID', val: normalized.customerId }] 
                        : []),
                      { label: 'Tracking ID', val: normalized.trackingId || normalized.tracking_id || caseData?.tracking_id || '—' },
                      { label: 'Address', val: normalized.address },
                      { label: 'System Load', val: `${normalized.loadRequired || '—'} kW` },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installation Details */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Installation Details</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Current Stage', val: normalized.currentStage },
                      { label: 'Payment Type', val: normalized.paymentType },
                      { label: 'Assigned To', val: normalized.assignedTo || '—' },
                      { label: 'Assigned Team', val: normalized.assignedTeam || '—' },
                      { label: 'Site Visit Date', val: (normalized.siteVisitDate || caseData?.site_visit_date) ? new Date(normalized.siteVisitDate || caseData?.site_visit_date).toLocaleDateString('en-IN') : '—' },
                      { label: 'Status', val: normalized.status },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <p style={{ fontSize: '10px', color: '#16a34a', fontWeight: 600, marginBottom: '2px' }}>{label}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#14532d' }}>{val || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installation Checklist */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Installation Checklist</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      'Site survey completed and approved',
                      'Panels mounted and secured on roof structure',
                      'Inverter installed and wired correctly',
                      'DC & AC cable routing completed',
                      'Earth bonding and lightning protection done',
                      'Net meter / bidirectional meter installed',
                      'System powered ON and test run completed',
                      'Customer briefed on usage and maintenance',
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '16px', height: '16px', border: '1.5px solid #cbd5e1', borderRadius: '3px', flexShrink: 0, background: '#fff' }} />
                        <span style={{ fontSize: '12.5px', color: '#334155' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technician Signature Block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {['Lead Technician', 'Customer Signature'].map(label => (
                    <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                      <p style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, marginBottom: '32px' }}>{label}</p>
                      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                        <p style={{ fontSize: '10px', color: '#94a3b8' }}>Signature &amp; Date</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  {BRANDING.name} • {normalized.caseId} • This document is computer-generated.
                </p>
              </div>
            </div>
          )}

          {/* CUSTOMER FEEDBACK TAB (admin only) */}
          {activeTab === 'feedback' && (
            <div>
              <p style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Customer Feedback</p>

              {feedbackLoading ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '13px', color: '#64748b' }}>Loading feedback…</p>
                </div>
              ) : (
                <>
                  {/* Existing feedback entries */}
                  {feedbackList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      {feedbackList.map((fb, i) => (
                        <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1,2,3,4,5].map(n => (
                                <Star key={n} style={{ width: '14px', height: '14px', fill: n <= fb.rating ? '#f59e0b' : 'none', color: n <= fb.rating ? '#f59e0b' : '#e2e8f0' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(fb.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                          {fb.feedback_text && <p style={{ fontSize: '12.5px', color: '#334155', fontStyle: 'italic' }}>'{fb.feedback_text}'</p>}
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                            {[['Install', fb.installation_quality], ['Team', fb.team_behavior], ['Timeline', fb.timeline_satisfaction]].map(([k, v]) => v ? (
                              <span key={k} style={{ fontSize: '11px', color: '#64748b' }}>{k}: <strong style={{ color: '#0f172a' }}>{v}/5</strong></span>
                            ) : null)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                      <Star style={{ width: '28px', height: '28px', color: '#cbd5e1', margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '13px', color: '#64748b' }}>No feedback recorded yet.</p>
                    </div>
                  )}

                  {/* Add new feedback form */}
                  <div style={{ background: '#fffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>Record Feedback</p>
                    <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Overall Rating *</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[1,2,3,4,5].map(n => (
                            <button key={n} type="button" onClick={() => setNewFeedback(f => ({ ...f, rating: n }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                              <Star style={{ width: '24px', height: '24px', fill: n <= newFeedback.rating ? '#f59e0b' : 'none', color: n <= newFeedback.rating ? '#f59e0b' : '#cbd5e1', transition: 'all 0.1s' }} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        {[['Installation Quality', 'installation_quality'], ['Team Behavior', 'team_behavior'], ['Timeline', 'timeline_satisfaction']].map(([label, field]) => (
                          <div key={field}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>{label}</label>
                            <select value={newFeedback[field] || ''} onChange={e => setNewFeedback(f => ({ ...f, [field]: Number(e.target.value) }))}
                              style={{ width: '100%', padding: '6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                              <option value="">Select</option>
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} / 5</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>Feedback Notes</label>
                        <textarea
                          value={newFeedback.feedback_text}
                          onChange={e => setNewFeedback(f => ({ ...f, feedback_text: e.target.value }))}
                          placeholder="Customer comments, suggestions, or complaints..."
                          rows={3}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                      <button type="submit" disabled={feedbackSubmitting || newFeedback.rating === 0} className="btn btn-primary"
                        style={{ opacity: (feedbackSubmitting || newFeedback.rating === 0) ? 0.6 : 1 }}>
                        {feedbackSubmitting ? 'Saving…' : 'Save Feedback'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TECHNICAL QA TAB */}
          {activeTab === 'technical_qa' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Technical QA Review</p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>Record technical inspection notes, system checks, and QA observations for this installation.</p>
              </div>

              {/* System Spec Summary */}
              {normalized.system_specs && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Specifications</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {Object.entries(normalized.system_specs || {}).slice(0, 8).map(([k, v]) => v ? (
                      <div key={k} style={{ fontSize: 12 }}>
                        <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}: </span>
                        <strong style={{ color: '#0f172a' }}>{String(v)}</strong>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* Inspection checklist */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Inspection Checklist</p>
                {[
                  'Panel orientation and tilt verified',
                  'Wiring and cable routing inspected',
                  'Inverter installation and settings verified',
                  'Earthing and grounding confirmed',
                  'System output tested and within spec',
                  'Net meter installation verified',
                ].map(item => (
                  <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="checkbox" style={{ width: 14, height: 14, accentColor: 'var(--color-primary)' }} />
                    <span style={{ fontSize: 12.5, color: '#334155' }}>{item}</span>
                  </label>
                ))}
              </div>

              {/* QA Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>QA Notes & Observations</label>
                <textarea
                  value={technicalNotes}
                  onChange={e => setTechnicalNotes(e.target.value)}
                  placeholder="Record technical findings, issues found, or sign-off notes…"
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }}
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={technicalSaving || !technicalNotes.trim()}
                style={{ marginTop: 12, opacity: technicalSaving ? 0.7 : 1 }}
                onClick={async () => {
                  setTechnicalSaving(true);
                  try {
                    await supabase.from('case_history').insert({
                      case_id: normalized.caseId,
                      stage: normalized.currentStage,
                      action_type: 'technical_qa_note',
                      updated_by: localStorage.getItem('name') || 'Technical QA',
                      department: 'technical',
                      notes: technicalNotes,
                    });
                    toast.success('QA notes saved to case history');
                    setTechnicalNotes('');
                  } catch (err) {
                    toast.error(err.message);
                  } finally { setTechnicalSaving(false); }
                }}
              >
                {technicalSaving ? 'Saving…' : '💾 Save QA Notes'}
              </button>
            </div>
          )}

          {/* ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Accounts & Payment Verification</p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>Verify payment receipts, track outstanding balances, and log financial clearance.</p>
              </div>

              {/* Payment Summary */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Summary</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                  {[
                    ['Payment Type', normalized.paymentType || '—'],
                    ['Payment Mode', normalized.paymentMode || '—'],
                    ['Down Payment', normalized.downPayment ? `₹${Number(normalized.downPayment).toLocaleString('en-IN')}` : '—'],
                    ['Loan Amount', normalized.loanAmount ? `₹${Number(normalized.loanAmount).toLocaleString('en-IN')}` : '—'],
                    ['EMI Amount', normalized.emiAmount ? `₹${Number(normalized.emiAmount).toLocaleString('en-IN')}` : '—'],
                    ['Bank', normalized.bankName || '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ fontSize: 12 }}>
                      <span style={{ color: '#64748b' }}>{label}: </span>
                      <strong style={{ color: '#0f172a' }}>{val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accounts Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Accounts Notes & Clearance Log</label>
                <textarea
                  value={accountsNotes}
                  onChange={e => setAccountsNotes(e.target.value)}
                  placeholder="Payment confirmed, outstanding amount, invoice number, or financial clearance notes…"
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }}
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={accountsSaving || !accountsNotes.trim()}
                style={{ marginTop: 12, opacity: accountsSaving ? 0.7 : 1 }}
                onClick={async () => {
                  setAccountsSaving(true);
                  try {
                    await supabase.from('case_history').insert({
                      case_id: normalized.caseId,
                      stage: normalized.currentStage,
                      action_type: 'accounts_note',
                      updated_by: localStorage.getItem('name') || 'Accounts',
                      department: 'accounts',
                      notes: accountsNotes,
                    });
                    toast.success('Accounts note saved');
                    setAccountsNotes('');
                  } catch (err) {
                    toast.error(err.message);
                  } finally { setAccountsSaving(false); }
                }}
              >
                {accountsSaving ? 'Saving…' : '💾 Save Note'}
              </button>
            </div>
          )}

          {/* CUSTOMER SERVICE / CRM TAB */}
          {activeTab === 'customer_service' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Customer Service — CRM Log</p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>Log follow-up calls, complaints, escalations, and customer communication history.</p>
              </div>

              {/* Customer Contact Info */}
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#5b21b6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Contact</p>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div><span style={{ color: '#64748b' }}>Name: </span><strong>{normalized.customerName || '—'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Phone: </span><strong>{normalized.phone || '—'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Email: </span><strong>{normalized.email || '—'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Address: </span><strong>{normalized.address || '—'}</strong></div>
                </div>
              </div>

              {/* CRM Note */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Log Interaction / Note</label>
                <textarea
                  value={crmNote}
                  onChange={e => setCrmNote(e.target.value)}
                  placeholder="Call outcome, complaint details, follow-up action, or escalation reason…"
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }}
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={crmSaving || !crmNote.trim()}
                style={{ marginTop: 12, opacity: crmSaving ? 0.7 : 1 }}
                onClick={async () => {
                  setCrmSaving(true);
                  try {
                    await supabase.from('case_history').insert({
                      case_id: normalized.caseId,
                      stage: normalized.currentStage,
                      action_type: 'crm_interaction',
                      updated_by: localStorage.getItem('name') || 'Customer Service',
                      department: 'customer_service',
                      notes: crmNote,
                    });
                    toast.success('CRM interaction logged');
                    setCrmNote('');
                  } catch (err) {
                    toast.error(err.message);
                  } finally { setCrmSaving(false); }
                }}
              >
                {crmSaving ? 'Saving…' : '🎧 Log Interaction'}
              </button>
            </div>
          )}

          {/* CUSTOMER PORTAL TAB (Admin Only) */}
          {activeTab === 'send_to_customer' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Customer Portal — Approval Link</p>
                <p style={{ fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>Generate a secure, one-time link for the customer to review their quotation and approve or decline online.</p>
              </div>

              {/* Customer info */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recipient</p>
                <div style={{ fontSize: 13 }}>
                  <div><span style={{ color: '#475569' }}>Name: </span><strong>{normalized.customerName}</strong></div>
                  <div style={{ marginTop: 4 }}><span style={{ color: '#475569' }}>Email: </span><strong>{normalized.email || 'Not on file'}</strong></div>
                </div>
              </div>

              {portalLink ? (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>✅ Portal Link Generated (valid 7 days)</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      readOnly
                      value={portalLink}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', fontSize: 12, outline: 'none' }}
                    />
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { navigator.clipboard.writeText(portalLink); toast.success('Link copied!'); }}
                    >
                      Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
                    Share this link with the customer via WhatsApp or email. They can approve the quotation and upload documents without logging in.
                  </p>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={portalGenerating}
                  style={{ width: '100%', justifyContent: 'center', opacity: portalGenerating ? 0.7 : 1 }}
                  onClick={async () => {
                    setPortalGenerating(true);
                    try {
                      const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
                      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                      const { error } = await supabase.from('customer_portal_tokens').insert({
                        case_id: normalized.caseId,
                        token,
                        customer_name: normalized.customerName,
                        customer_email: normalized.email || '',
                        expires_at: expiresAt,
                      });
                      if (error) throw error;
                      const link = `${window.location.origin}/customer-portal?token=${token}`;
                      setPortalLink(link);
                      // Log to case history
                      await supabase.from('case_history').insert({
                        case_id: normalized.caseId,
                        stage: normalized.currentStage,
                        action_type: 'portal_link_generated',
                        updated_by: localStorage.getItem('name') || 'Admin',
                        department: 'admin',
                        notes: 'Customer portal link generated and sent for quotation approval.',
                      });
                      toast.success('Portal link generated!');
                    } catch (err) {
                      toast.error(err.message || 'Failed to generate link');
                    } finally { setPortalGenerating(false); }
                  }}
                >
                  <LinkIcon size={14} />
                  {portalGenerating ? 'Generating…' : '🔗 Generate Customer Portal Link'}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CaseDrawer;
