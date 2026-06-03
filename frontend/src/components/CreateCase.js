import React, { useState, useEffect } from 'react';
import { supabase, edgeFetch, EDGE } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Send, Plus, Minus, UploadCloud, CheckCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import ManualTypeDropdown from './ManualTypeDropdown';

// Extended to 500kW — supports large commercial/industrial systems
const KW500 = Array.from({ length: 500 }, (_, i) => `${i + 1}kW`);

// Wire specification options (replaces free-text wiring field)
const WIRE_CORE   = ['Copper', 'Aluminium'];
const WIRE_ARMOUR = ['Armoured', 'Unarmoured'];

const BRANDS = [
  'Luminous Solar Panel','Tata Power Solar Panel','Premier Solar Panel','Adani Solar Panel',
  'Luminous Amaze Solar Panel','Havells Solar Panel','INA Solar Panel','Vikram Solar Panel',
  'Credence Solar Panel','MV Solar Panel','Waree Solar Panel',
];
const BLANK_BRANDS = ['INA Solar Panel','Vikram Solar Panel','Credence Solar Panel','MV Solar Panel','Waree Solar Panel'];
const CATEGORIES = ['Off Grid','On Grid','Hybrid','On Grid Commercial'];

const getProductName = (brand, cat) => {
  if (!brand || !cat || BLANK_BRANDS.includes(brand)) return '';
  const short = brand.replace(' Solar Panel','');
  return `${short} ${cat} Solar Panel`;
};

const GTI_MAP = {
  'Luminous Solar Panel':       ['Luminous','Solis Estacon','Sarotech','Sarotech Hybrid'],
  'Adani Solar Panel':          ['Luminous','Solis Estacon','Sarotech','Sarotech Hybrid'],
  'Luminous Amaze Solar Panel': ['Luminous','Solis Estacon','Sarotech','Sarotech Hybrid'],
  'Tata Power Solar Panel':     ['Solis','GoodWe','Sofar','Approved by Tata'],
  'Premier Solar Panel':        ['Luminous','Deye'],
};
const DEFAULT_GTI = ['Luminous','Solis Estacon','Sarotech','Sarotech Hybrid'];
const getGTI = (brand) => GTI_MAP[brand] || DEFAULT_GTI;

const BATTERY_OPTIONS = [
  { label: 'Luminous 150Ah', capacity: 150, price: 15000 },
  { label: 'Luminous 200Ah', capacity: 200, price: 19000 },
  { label: 'Exide 150Ah',    capacity: 150, price: 15000 },
  { label: 'Exide 200Ah',    capacity: 200, price: 19000 },
  { label: 'Sarotech 150Ah', capacity: 150, price: 15000 },
  { label: 'Sarotech 200Ah', capacity: 200, price: 19000 },
];
const BAT_WARR = [
  '0 Years', '2 Years', '4 Years', '5 Years',
  '10 Years', '12 Years', '15 Years', '20 Years', '25 Years',
  '36+24 Months', '60 Months',
];
const STRUCTURES = ['Jindal 80mm','Apollo 80mm'];
const PANEL_WARR = ['25 Years','30 Years'];

const INIT = {
  customerName:'', mobile:'', email:'', address:'',
  reference:'', pinCode:'',
  electricalDivision:'', electricalNo:'', electricalLoad:'',
  category:'', panelBrand:'', productName:'',
  panelUnit:'', panelCount:0, totalWatt:0, totalPrice:0, panelWarranty:'',
  gtiInverter:'', inverterKw:'', inverterWarranty:'',
  batteryOption:'', batteryQty: 0, totalBatCapacity: 0, totalBatPrice: 0, batteryWarranty:'',
  structure:'', bos:'Complete Set',
  wire_core_material:'', wire_armouring:'',  // replaces free-text wiring
  earthing:'', installation:'Added', productPrice:'', recheckPrice:'',
};

const BRAND_WATT = {
  'Luminous Solar Panel':550,'Tata Power Solar Panel':545,'Premier Solar Panel':540,
  'Adani Solar Panel':550,'Luminous Amaze Solar Panel':545,'Havells Solar Panel':540,
  'INA Solar Panel':535,'Vikram Solar Panel':540,'Credence Solar Panel':535,
  'MV Solar Panel':545,'Waree Solar Panel':545,
};
const BRAND_PRICE_PER_PANEL = {
  'Luminous Solar Panel':12000,'Tata Power Solar Panel':13000,'Premier Solar Panel':11000,
  'Adani Solar Panel':11500,'Luminous Amaze Solar Panel':12500,'Havells Solar Panel':12000,
  'INA Solar Panel':10500,'Vikram Solar Panel':11000,'Credence Solar Panel':10800,
  'MV Solar Panel':11200,'Waree Solar Panel':11000,
};

const S = {
  page:   { padding:'32px', fontFamily:'Plus Jakarta Sans, Inter, sans-serif', width: '100%', maxWidth: '1000px', margin: '0 auto' },
  hdr:    { background:'linear-gradient(135deg, var(--brand), #0f172a)', borderRadius:'var(--radius-lg)', padding:'24px 32px', marginBottom:24, color:'#fff', display:'flex', alignItems:'center', gap:12, boxShadow:'var(--shadow-lg)' },
  card:   { background:'var(--surface)', borderRadius:'var(--radius-lg)', boxShadow:'var(--shadow-md)', padding:'28px', marginBottom:20, border: '1px solid var(--border)', transition:'transform 0.2s, box-shadow 0.2s' },
  sh:     { fontSize:15, fontWeight:800, color:'var(--text-1)', borderBottom:'1px solid var(--border-2)', paddingBottom:10, marginBottom:20, letterSpacing:0.5 },
  g2:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 },
  g3:     { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20 },
  lbl:    { display:'block', fontSize:12, fontWeight:700, color:'var(--text-2)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.02em' },
  inp:    { width:'100%', padding:'12px 16px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:14, boxSizing:'border-box', outline:'none', background:'var(--surface-2)', transition:'all 0.2s', color:'var(--text-1)' },
  sel:    { width:'100%', padding:'12px 16px', border:'1.5px solid var(--border)', borderRadius:'var(--radius-md)', fontSize:14, boxSizing:'border-box', outline:'none', background:'var(--surface-2)', transition:'all 0.2s', color:'var(--text-1)', cursor:'pointer' },
  ro:     { width:'100%', padding:'12px 16px', border:'1px dashed var(--border)', borderRadius:'var(--radius-md)', fontSize:14, boxSizing:'border-box', background:'rgba(0,0,0,0.02)', color:'var(--text-4)' },
  info:   { fontSize:13, fontWeight:700, color:'var(--brand)', marginTop:6 },
  ctr:    { display:'flex', alignItems:'center', gap:10, marginTop:4 },
  cbtn:   { width:32, height:32, borderRadius:8, border:'none', background:'var(--brand-dim)', color:'var(--brand)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 },
  cnum:   { fontSize:16, fontWeight:800, minWidth:32, textAlign:'center', color:'var(--text-1)' },
  sub:    { width:'100%', padding:'14px', background:'var(--btn-bg)', color:'var(--btn-text)', border:'none', borderRadius:'var(--radius-lg)', fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10, boxShadow:'var(--shadow-md)', transition:'all 0.2s' },
  req:    { color:'var(--rose)' },
};

const Ctr = ({ value, onChange }) => (
  <div style={S.ctr}>
    <button type="button" style={S.cbtn} onClick={() => onChange(Math.max(0, value-1))}><Minus size={12}/></button>
    <span style={S.cnum}>{value}</span>
    <button type="button" style={S.cbtn} onClick={() => onChange(value+1)}><Plus size={12}/></button>
  </div>
);

const F = ({ label, req, children }) => (
  <div>
    <label style={S.lbl}>{label}{req && <span style={S.req}> *</span>}</label>
    {children}
  </div>
);

export default function CreateCase({ onLogout }) {
  const [f, setF]           = useState(INIT);
  const [loading, setLoad]  = useState(false);
  const [docs, setDocs]     = useState({});
  const [occupation, setOccupation] = useState('Job/Service');
  const [wattMappings, setWattMappings] = useState({});

  // Load admin-defined wattage mappings from DB on mount
  useEffect(() => {
    supabase
      .from('wattage_mappings')
      .select('kw_value, watt_value')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          const map = {};
          data.forEach(r => { map[r.kw_value] = r.watt_value; });
          setWattMappings(map);
        }
      })
      .catch(() => {});
  }, []);

  // Document category is based on Electrical Load (not panel unit)
  const getSystemKw = () => parseInt(String(f.electricalLoad).replace(/kW$/i, ''), 10) || 0;

  // ── Solar Loan Documentation Rules ──────────────────────────────────────────
  // Category 1 (1–3 kW): 6 base documents only
  // Category 2 (4 kW+):  6 base + profile documents (Job/Service OR Business)
  const BASE_DOCS_CC = [
    'Electricity Bill (Last 2 Months)',
    'Aadhar Card Copy (Electricity Bill Owner)',
    'PAN Card (Electricity Bill Owner)',
    'Bank Details (Cancelled Cheque / Account Number)',
    'Property Proof (House Tax Receipt / Registry Copy)',
    'Verification 4 Photo (Customer House GPS Pic)',
  ];

  const PROFILE_JOB_DOCS_CC = [
    '3 Months Salary Slip',
    '6 Months Bank Statement',
    'Form 16 of Last 3 Years',
    'Last 3 Year ITR',
  ];

  const PROFILE_BIZ_DOCS_CC = [
    'Last 3 Year ITR',
    '6 Months Bank Statement',
    'GST Certificate',
  ];

  const getMandatoryDocs = () => {
    const kw = getSystemKw();
    if (kw >= 4) {
      const profileDocs = occupation === 'Business' ? PROFILE_BIZ_DOCS_CC : PROFILE_JOB_DOCS_CC;
      return [...BASE_DOCS_CC, ...profileDocs];
    }
    return BASE_DOCS_CC;
  };

  const MANDATORY_DOCS = getMandatoryDocs();

  const getOptionalDocuments = () => [];
  const navigate = useNavigate();

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const onBrand = (brand) => {
    setF(p => ({
      ...p, panelBrand: brand,
      productName: getProductName(brand, p.category),
      gtiInverter: '',
      ...recalc(brand, p.panelUnit),
    }));
  };

  const onCategory = (cat) => {
    setF(p => ({
      ...p, category: cat,
      productName: getProductName(p.panelBrand, cat),
    }));
  };

  const recalc = (brand, unit) => {
    if (!brand || !unit) return {};
    const kw    = parseInt(unit);
    if (!kw) return {};
    const panels = kw * 2;
    const watt   = BRAND_WATT[brand] || 545;
    // Use admin-defined wattage mapping if available, else brand default * kW
    const totalWatt = wattMappings[kw] ? wattMappings[kw] : kw * watt;
    const price  = BRAND_PRICE_PER_PANEL[brand] || 11000;
    return { panelCount: panels, totalWatt, totalPrice: panels * price };
  };

  const onPanelUnit = (unit) => {
    setF(p => ({ ...p, panelUnit: unit, ...recalc(p.panelBrand, unit) }));
  };

  const onPanelCount = (n) => {
    const kw    = parseInt(f.panelUnit) || 0;
    const price = BRAND_PRICE_PER_PANEL[f.panelBrand] || 11000;
    setF(p => ({ ...p, panelCount: n, totalWatt: kw * 1000, totalPrice: n * price }));
  };

  const onBatteryOption = (label) => {
    const opt = BATTERY_OPTIONS.find(o => o.label === label);
    setF(p => {
      const qty = Math.max(1, p.batteryQty || 1); 
      return {
        ...p, batteryOption: label, batteryQty: qty,
        totalBatCapacity: qty * (opt?.capacity || 0),
        totalBatPrice:    qty * (opt?.price    || 0),
      };
    });
  };

  const onBatteryQty = (qty) => {
    const opt = BATTERY_OPTIONS.find(o => o.label === f.batteryOption);
    setF(p => ({
      ...p, batteryQty: qty,
      totalBatCapacity: qty * (opt?.capacity || 0),
      totalBatPrice:    qty * (opt?.price    || 0),
    }));
  };

  const handleFileChange = (e, key) => {
    setDocs({ ...docs, [key]: e.target.files[0] });
  };

  const priceOk = f.productPrice && f.recheckPrice && f.productPrice === f.recheckPrice;
  const showBat = f.category === 'Off Grid' || f.category === 'Hybrid';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.email) { toast.error('Customer Email ID is required!'); return; }
    if (!priceOk) { toast.error('Prices do not match!'); return; }
    
    // Ensure all mandatory docs are uploaded
    for (const doc of MANDATORY_DOCS) {
      if (!docs[doc]) {
        toast.error(`Please upload "${doc}".`);
        return;
      }
    }

    setLoad(true);
    try {
      const uploadedUrls = {};

      toast.loading('Uploading documents...', { id: 'upload' });
      for (const [key, file] of Object.entries(docs)) {
        if (file) {
          const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
          const fileName = `case_docs/${Date.now()}_${sanitizedKey}_${sanitizedFileName}`;
          const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, file);
          if (error) {
            console.error('Upload Error:', error);
            throw new Error(`Upload failed for ${key}: ${error.message} (Bucket might be missing or RLS blocked it)`);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('documents')
              .getPublicUrl(fileName);
            uploadedUrls[key] = publicUrlData.publicUrl;
          }
        }
      }
      toast.dismiss('upload');

      // Parse "5kW" → 5 for all numeric kW fields
      const parseKw = (val) => parseInt(String(val).replace(/kW$/i, ''), 10) || 0;

      const systemSpecs = {
        productCategory:    f.category,
        productBrand:       f.panelBrand,
        productName:        f.productName || f.panelBrand,
        panelUnit:          parseKw(f.panelUnit),
        panelCount:         f.panelCount,
        totalWatt:          f.totalWatt,
        productPrice:       Number(f.productPrice),
        panelWarranty:      f.panelWarranty,
        inverterBrand:      f.gtiInverter,
        inverterKw:         parseKw(f.inverterKw),
        inverterWarranty:   f.inverterWarranty,
        batteryBrand:       f.batteryOption || null,
        batteryCount:       f.batteryQty || 0,
        batteryWarranty:    f.batteryWarranty || null,
        batteryCapacity:    f.totalBatCapacity || 0,
        structure:          f.structure,
        bos:                f.bos,
        wireCoreM:          f.wire_core_material,
        wireArmouring:      f.wire_armouring,
        earthing:           f.earthing,
        installation:       f.installation,
      };

      const payload = {
        action: 'create_case',
        reference: f.reference,
        pinCode: f.pinCode,
        customerName: f.customerName,
        email: f.email,
        phone: f.mobile,
        alternatePhone: '',
        address: f.address,
        loadRequired: parseKw(f.electricalLoad),
        customerOccupation: occupation,
        systemSpecs: systemSpecs,
        documents: uploadedUrls,
      };

      await edgeFetch(EDGE.workflow, payload);
      toast.success(`✅ Case successfully registered!`);
      setF(INIT);
      setDocs({ aadhar: null, pan: null, electricityBill: null, photo: null });
      navigate('/cases');
    } catch (err) { toast.error(err.message || 'Submission failed'); }
    finally { setLoad(false); toast.dismiss('upload'); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)' }}>
        <div style={S.page}>
          <div style={S.hdr}>
            <div style={{ width: 45, height: 45, background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={24} />
            </div>
            <div>
              <div style={{fontSize:21,fontWeight:800}}>New Case Registration</div>
              <div style={{fontSize:13,opacity:.8}}>Register a new solar installation project with technical specs and documents</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ── 1. Customer ── */}
            <div style={S.card}>
              <div style={S.sh}>1. Customer Information</div>
              <div style={{...S.g2, marginBottom:14}}>
                <F label="Customer Name" req>
                  <input style={S.inp} value={f.customerName} onChange={e=>set('customerName',e.target.value)} required />
                </F>
                <F label="Mobile Number" req>
                  <input style={S.inp} type="tel" value={f.mobile} onChange={e=>set('mobile',e.target.value)} required />
                </F>
              </div>
              <div style={{...S.g2, marginBottom:14}}>
                <F label="Email ID" req>
                  <input style={S.inp} type="email" value={f.email} onChange={e=>set('email',e.target.value)} required />
                </F>
                <F label="Installation Address" req>
                  <input style={S.inp} value={f.address} onChange={e=>set('address',e.target.value)} required />
                </F>
              </div>
              <div style={{...S.g2, marginBottom:14}}>
                <F label="PIN Code" req>
                  <input style={S.inp} type="text" value={f.pinCode} onChange={e=>set('pinCode',e.target.value)} required />
                </F>
                <F label="Reference" req>
                  <input style={S.inp} type="text" value={f.reference} onChange={e=>set('reference',e.target.value)} placeholder="Who referred them?" required />
                </F>
              </div>
              <div style={S.g2}>
                <F label="Electrical Division" req>
                  <input style={S.inp} value={f.electricalDivision} onChange={e=>set('electricalDivision',e.target.value)} required />
                </F>
                <F label="Electrical Number" req>
                  <input style={S.inp} value={f.electricalNo} onChange={e=>set('electricalNo',e.target.value)} required />
                </F>
              </div>
            </div>

            {/* ── 2. Technical Specs ── */}
            <div style={S.card}>
              <div style={S.sh}>2. Technical Specifications</div>
              <div style={S.g2}>
                <F label="Electrical Load" req>
                  <ManualTypeDropdown
                    options={KW500}
                    value={f.electricalLoad}
                    onChange={v => set('electricalLoad', v)}
                    placeholder="Select Load"
                    customLabel="Custom Load"
                    required
                    style={S.sel}
                  />
                </F>
                <F label="Product Category" req>
                  <select style={S.sel} value={f.category} onChange={e=>onCategory(e.target.value)} required>
                    <option value="">Select Category</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </F>
              </div>
            </div>

            {/* ── 3. Panel & Brand ── */}
            <div style={S.card}>
              <div style={S.sh}>3. Panel &amp; Brand Details</div>
              <div style={{...S.g2, marginBottom:14}}>
                <F label="Panel Brand" req>
                  <ManualTypeDropdown
                    options={BRANDS}
                    value={f.panelBrand}
                    onChange={v => onBrand(v)}
                    placeholder="Select Brand"
                    customLabel="Custom Brand"
                    required
                    style={S.sel}
                  />
                </F>
                <F label="Product Name">
                  <input style={S.ro} value={f.productName} readOnly placeholder="Auto-filled from brand + category" />
                </F>
              </div>
              <div style={S.g2}>
                <F label="Panel Unit (kW)" req>
                  <ManualTypeDropdown
                    options={KW500}
                    value={f.panelUnit}
                    onChange={v => onPanelUnit(v)}
                    placeholder="Select Panel Unit"
                    customLabel="Custom Panel Unit"
                    required
                    style={S.sel}
                  />
                </F>
                <div>
                  <F label="Number of Panels">
                    <Ctr value={f.panelCount} onChange={onPanelCount} />
                  </F>
                  <div style={S.info}>Total Wattage: {f.totalWatt.toLocaleString()} Watt</div>
                </div>
              </div>
            </div>

            {/* ── 4. Warranty & Inverter ── */}
            <div style={S.card}>
              <div style={S.sh}>4. Warranty &amp; Inverter</div>
              <div style={S.g2}>
                <F label="Panel Warranty">
                  <ManualTypeDropdown
                    options={PANEL_WARR}
                    value={f.panelWarranty}
                    onChange={v => set('panelWarranty', v)}
                    placeholder="Select Warranty"
                    customLabel="Custom Warranty"
                    style={S.sel}
                  />
                </F>
                <F label="GTI Inverter" req>
                  <ManualTypeDropdown
                    options={getGTI(f.panelBrand)}
                    value={f.gtiInverter}
                    onChange={v => set('gtiInverter', v)}
                    placeholder="Select GTI Inverter"
                    customLabel="Custom GTI Inverter"
                    required
                    style={S.sel}
                  />
                </F>
                <F label="Inverter kW" req>
                  <ManualTypeDropdown
                    options={KW500}
                    value={f.inverterKw}
                    onChange={v => set('inverterKw', v)}
                    placeholder="Select kW"
                    customLabel="Custom Inverter kW"
                    required
                    style={S.sel}
                  />
                </F>
                <F label="Inverter Warranty">
                  <input style={S.inp} value={f.inverterWarranty} onChange={e=>set('inverterWarranty',e.target.value)} placeholder="e.g. 2 Years" />
                </F>
              </div>
            </div>

            {/* ── 5. System Components & Extras ── */}
            <div style={S.card}>
              <div style={S.sh}>5. System Components &amp; Extras</div>
              {showBat ? (
                <div style={{...S.g2, marginBottom:14}}>
                  <div>
                    <F label="Battery Brand">
                      <select style={S.sel} value={f.batteryOption} onChange={e=>onBatteryOption(e.target.value)}>
                        <option value="">Select Brand &amp; Capacity</option>
                        {BATTERY_OPTIONS.map(o=><option key={o.label} value={o.label}>{o.label}</option>)}
                      </select>
                    </F>
                    {f.batteryOption && (() => {
                      const opt = BATTERY_OPTIONS.find(o => o.label === f.batteryOption);
                      return (
                        <div style={{marginTop:8, padding:'8px 12px', background:'#eff6ff', borderRadius:8}}>
                          <div style={{fontSize:12, color:'#6b7280', fontWeight:500}}>Price per battery: <strong style={{color:'#1d4ed8'}}>&#8377;{(opt?.price||0).toLocaleString()}</strong></div>
                          <div style={S.info}>Total Capacity: {f.totalBatCapacity} Ah</div>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <F label="Number of Batteries">
                      <Ctr value={f.batteryQty} onChange={onBatteryQty} />
                    </F>
                    <div style={{marginTop:14}}>
                      <F label="Battery Warranty">
                        <ManualTypeDropdown
                          options={BAT_WARR}
                          value={f.batteryWarranty}
                          onChange={v => set('batteryWarranty', v)}
                          placeholder="Select Warranty"
                          customLabel="Custom Warranty"
                          style={S.sel}
                        />
                      </F>
                    </div>
                  </div>
                </div>
              ) : (
                f.category && <div style={{padding:'12px 16px',background:'#f0fdf4',borderRadius:8,color:'#16a34a',fontSize:13,fontWeight:500,marginBottom:14}}>
                  ✅ Battery not required for <strong>{f.category}</strong> systems
                </div>
              )}
              <div style={S.g3}>
                <F label="Structure">
                  <ManualTypeDropdown
                    options={STRUCTURES}
                    value={f.structure}
                    onChange={v => set('structure', v)}
                    placeholder="Select Structure"
                    customLabel="Custom Structure"
                    style={S.sel}
                  />
                </F>
                <F label="BOS (Balance of System)">
                  <input style={S.ro} value={f.bos} readOnly />
                </F>
                <div>
                  <F label="Wire Core Material">
                    <ManualTypeDropdown
                      options={WIRE_CORE}
                      value={f.wire_core_material}
                      onChange={v => set('wire_core_material', v)}
                      placeholder="Select Core"
                      customLabel="Custom Core Material"
                      style={S.sel}
                    />
                  </F>
                  <div style={{marginTop:10}}>
                    <F label="Armouring Protection">
                      <ManualTypeDropdown
                        options={WIRE_ARMOUR}
                        value={f.wire_armouring}
                        onChange={v => set('wire_armouring', v)}
                        placeholder="Select Armouring"
                        style={S.sel}
                      />
                    </F>
                  </div>
                </div>
              </div>
              <div style={{...S.g2, marginTop: 14}}>
                <F label="Earthing">
                  <input style={S.inp} value={f.earthing} onChange={e=>set('earthing',e.target.value)} placeholder="e.g. 2.5 Sq MM copper" />
                </F>
                <F label="Installation & Net Metering">
                  <input style={S.ro} value={f.installation} readOnly />
                </F>
              </div>
            </div>

            {/* ── 6. Pricing ── */}
            <div style={S.card}>
              <div style={S.sh}>6. Pricing</div>
              <div style={{...S.g2, marginBottom:14}}>
                <F label="Final Price Quote (₹)" req>
                  <input style={{...S.inp,fontSize:17,fontWeight:700,color:'#16a34a'}} type="number" min="0"
                    placeholder="Enter final price" value={f.productPrice} onChange={e=>set('productPrice',e.target.value)} required />
                </F>
                <F label="Re-check Price (₹)" req>
                  <input style={{...S.inp,fontSize:17,fontWeight:700,
                    borderColor: f.recheckPrice?(priceOk?'#16a34a':'#ef4444'):'#d1d5db',
                    color: f.recheckPrice?(priceOk?'#16a34a':'#ef4444'):'#111'}}
                    type="number" min="0" placeholder="Re-enter to verify"
                    value={f.recheckPrice} onChange={e=>set('recheckPrice',e.target.value)} required />
                  {f.recheckPrice && <p style={{fontSize:12,marginTop:3,color:priceOk?'#16a34a':'#ef4444'}}>{priceOk?'✓ Match':'⚠ No match'}</p>}
                </F>
              </div>
            </div>

            {/* ── 7. Document Uploads ── */}
            <div style={{...S.card, padding: 0, overflow: 'hidden'}}>
              <div style={{padding: '22px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc'}}>
                <div style={{...S.sh, borderBottom: 'none', paddingBottom: 0, marginBottom: 0}}>7. Document Upload Gate</div>
              </div>
              <div style={{padding: '22px 24px'}}>
                <div style={{ marginBottom: '24px', background: 'var(--color-info-light)', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-xl)', padding: '16px', display: 'flex', gap: '12px' }}>
                  <div style={{ marginTop: '2px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--surface)', borderRadius: '50%', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'var(--color-info)', fontWeight: 800, fontSize: '14px' }}>1</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#1E3A8A', marginBottom: '4px' }}>
                      Customer Profile
                    </label>

                    {/* 1–3 kW: No profile needed */}
                    {getSystemKw() > 0 && getSystemKw() < 4 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', marginTop: '4px' }}>
                        <span style={{ fontSize: '18px' }}>✅</span>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>No Profile Required</p>
                          <p style={{ fontSize: '12px', color: '#4ade80' }}>
                            {getSystemKw()} kW — Only 6 basic documents needed (no profile docs)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 4 kW+: Show profile selection */}
                    {getSystemKw() >= 4 && (
                      <>
                        <p style={{ fontSize: '12px', color: '#1D4ED8', opacity: 0.8, marginBottom: '12px' }}>
                          {getSystemKw()} kW — Profile documents required. Select the customer's occupation:
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {[
                            { key: 'Job/Service', label: '💼 Job / Service' },
                            { key: 'Business',   label: '🏢 Business' },
                          ].map(({ key, label }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setOccupation(key)}
                              style={{
                                padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
                                border: `2px solid ${occupation === key ? 'var(--color-accent)' : '#BFDBFE'}`,
                                background: occupation === key ? 'var(--color-accent)' : 'var(--surface)',
                                color: occupation === key ? '#fff' : '#1E3A8A',
                                fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* No kW selected yet */}
                    {getSystemKw() === 0 && (
                      <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '6px' }}>
                        Select the Electrical Load above to determine profile requirements.
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents Checklist</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-4)' }}>
                    {MANDATORY_DOCS.filter(d => docs[d]).length} / {MANDATORY_DOCS.length} Ready
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Mandatory Documents */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--rose)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Mandatory Documents <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>Required</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {MANDATORY_DOCS.map((docName, idx) => {
                        const isSelected = !!docs[docName];
                        return (
                          <div key={`man-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', borderRadius: 'var(--radius-xl)', border: `1px solid ${isSelected ? '#A7F3D0' : '#fca5a5'}`, background: isSelected ? 'var(--color-accent-light)' : '#fef2f2', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-accent)' : '#fee2e2', color: isSelected ? '#fff' : '#ef4444', boxShadow: isSelected ? 'var(--shadow-sm)' : 'none' }}>
                                  {isSelected ? <CheckCircle style={{ width: '20px', height: '20px' }} /> : <span style={{ fontWeight: 700, fontSize: '12px' }}>{idx + 1}</span>}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#064E3B' : '#7f1d1d' }}>{docName} <span style={{ color: '#ef4444' }}>*</span></span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {isSelected ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={docs[docName].name}>
                                      {docs[docName].name}
                                    </span>
                                    <label style={{ cursor: 'pointer', padding: '6px 12px', background: 'var(--surface)', border: '1px solid #A7F3D0', color: 'var(--color-accent)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700 }}>
                                      Replace
                                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, docName)} accept=".pdf,image/*" />
                                    </label>
                                  </div>
                                ) : (
                                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', color: '#fff', background: '#ef4444', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>
                                    <UploadCloud style={{ width: '16px', height: '16px' }} />
                                    Choose File
                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, docName)} accept=".pdf,image/*" />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Documents */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Additional Documents <span style={{ fontSize: '10px', background: 'var(--surface-2)', color: 'var(--text-4)', padding: '2px 6px', borderRadius: '4px' }}>Optional</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {getOptionalDocuments().map((docName, idx) => {
                        const isSelected = !!docs[docName];
                        return (
                          <div key={`opt-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', borderRadius: 'var(--radius-xl)', border: `1px solid ${isSelected ? '#A7F3D0' : 'var(--border)'}`, background: isSelected ? 'var(--color-accent-light)' : 'var(--surface)', transition: 'all 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--color-accent)' : 'var(--surface-2)', color: isSelected ? '#fff' : 'var(--text-4)', boxShadow: isSelected ? 'var(--shadow-sm)' : 'none' }}>
                                  {isSelected ? <CheckCircle style={{ width: '20px', height: '20px' }} /> : <span style={{ fontWeight: 700, fontSize: '12px' }}>+</span>}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#064E3B' : 'var(--text-2)' }}>{docName}</span>
                              </div>
                              
                              <div>
                                {isSelected ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={docs[docName].name}>
                                      {docs[docName].name}
                                    </span>
                                    <label style={{ cursor: 'pointer', padding: '6px 12px', background: 'var(--surface)', border: '1px solid #A7F3D0', color: 'var(--color-accent)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700 }}>
                                      Replace
                                      <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, docName)} accept=".pdf,image/*" />
                                    </label>
                                  </div>
                                ) : (
                                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--text-1)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>
                                    <UploadCloud style={{ width: '16px', height: '16px' }} />
                                    Choose File
                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, docName)} accept=".pdf,image/*" />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading || !priceOk} style={{...S.sub,opacity:(loading||!priceOk)?0.6:1}}>
              <Send size={16}/>{loading?'Registering Case...':'Submit New Case'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
