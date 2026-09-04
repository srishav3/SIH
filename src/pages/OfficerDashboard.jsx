import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  FileSearch,
  Cpu,
  Activity,
  Sliders,
  Eye,
  UserPlus,
  X,
  Loader2,
  Hash,
  Copy,
  Check,
  LayoutDashboard,
  Users,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveTravellerIdentity } from '../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Only alphabets, trimmed + each word capitalised */
function toAlphaTitle(str) {
  return (str || '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Strip all non-digits from aadhaar */
function cleanAadhaar(str) {
  return (str || '').replace(/\D/g, '');
}

// ─── Create New User Modal ────────────────────────────────────────────────────
function CreateUserModal({ onClose, officerUserId }) {
  const EMPTY = {
    fullName: '',
    passportNo: '',
    visaNo: '',
    aadhaarNo: '',
    dob: '',
    gender: '',
    nationality: '',
  };

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { hash } | { error }
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    else if (!/^[a-zA-Z\s]+$/.test(form.fullName.trim())) e.fullName = 'Name must contain only letters';
    if (!form.passportNo.trim()) e.passportNo = 'Passport number is required';
    if (!form.visaNo.trim()) e.visaNo = 'Visa number is required';
    if (!form.aadhaarNo.trim()) e.aadhaarNo = 'Aadhaar number is required';
    else if (cleanAadhaar(form.aadhaarNo).length !== 12) e.aadhaarNo = 'Aadhaar must be 12 digits';
    if (!form.dob) e.dob = 'Date of birth is required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!form.nationality.trim()) e.nationality = 'Nationality is required';
    else if (!/^[a-zA-Z\s]+$/.test(form.nationality.trim())) e.nationality = 'Nationality must contain only letters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setResult(null);

    // Sanitize before saving
    const sanitized = {
      fullName: toAlphaTitle(form.fullName),
      passportNo: form.passportNo.trim().toUpperCase(),
      visaNo: form.visaNo.trim().toUpperCase(),
      aadhaarNo: cleanAadhaar(form.aadhaarNo),   // digits only
      dob: form.dob,                              // already yyyy-mm-dd from <input type="date">
      gender: toAlphaTitle(form.gender),          // capitalised alpha
      nationality: toAlphaTitle(form.nationality),
    };

    const { success, data, error } = await saveTravellerIdentity(sanitized, officerUserId);
    setLoading(false);

    if (success && data) {
      setResult({ hash: data.identity_hash });
    } else {
      setResult({ error: error || 'Unknown error occurred.' });
    }
  };

  const copyHash = () => {
    if (result?.hash) {
      navigator.clipboard.writeText(result.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setForm(EMPTY);
    setErrors({});
    setResult(null);
  };

  // Reuse LoginPage / SignUp styling tokens
  const fieldWrap = { marginBottom: '16px' };

  return (
    /* Backdrop */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal card — light theme identical to .minimal-card */}
      <div
        className="minimal-card"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '36px 32px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
              Register New Traveller
            </h2>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              All fields are required. Identity is stored with SHA-256 hash.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--surface-container)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Success ── */}
        {result?.hash ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="alert-box alert-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Traveller registered successfully.</strong><br />
                Record saved to <code style={{ fontSize: '0.78rem' }}>traveller_identities</code>.
              </div>
            </div>

            {/* Hash display */}
            <div style={{
              background: 'var(--surface-low)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Hash size={13} color="var(--primary)" />
                <span className="input-label" style={{ margin: 0 }}>SHA-256 Identity Hash</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <code style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text)',
                  wordBreak: 'break-all',
                  flex: 1,
                  lineHeight: 1.7,
                }}>
                  {result.hash}
                </code>
                <button
                  type="button"
                  onClick={copyHash}
                  title="Copy hash"
                  style={{
                    background: 'var(--surface-container)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px',
                    cursor: 'pointer',
                    color: copied ? 'var(--success)' : 'var(--text-muted)',
                    display: 'flex',
                    flexShrink: 0,
                    transition: 'color 0.2s',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={handleReset} className="btn-secondary">
                <UserPlus size={15} /> Register Another
              </button>
              <button type="button" onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
                Done
              </button>
            </div>
          </div>

        ) : result?.error ? (
          /* ── Error ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="alert-box alert-danger">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div><strong>Registration failed.</strong><br />{result.error}</div>
            </div>
            <button type="button" onClick={() => setResult(null)} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>
              Try Again
            </button>
          </div>

        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            <div style={fieldWrap}>
              <label className="input-label">Full Name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Rajesh Kumar Sharma"
                className={`input-field${errors.fullName ? ' input-field-error' : ''}`}
              />
              {errors.fullName && <div className="field-error-text">{errors.fullName}</div>}
            </div>

            {/* Passport + Visa */}
            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="input-label">Passport Number</label>
                <input
                  name="passportNo"
                  value={form.passportNo}
                  onChange={handleChange}
                  placeholder="e.g. R1234567"
                  className={`input-field${errors.passportNo ? ' input-field-error' : ''}`}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                />
                {errors.passportNo && <div className="field-error-text">{errors.passportNo}</div>}
              </div>
              <div className="form-group">
                <label className="input-label">Visa Number</label>
                <input
                  name="visaNo"
                  value={form.visaNo}
                  onChange={handleChange}
                  placeholder="e.g. V-9930218"
                  className={`input-field${errors.visaNo ? ' input-field-error' : ''}`}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                />
                {errors.visaNo && <div className="field-error-text">{errors.visaNo}</div>}
              </div>
            </div>

            {/* Aadhaar */}
            <div style={fieldWrap}>
              <label className="input-label">Aadhaar Number</label>
              <input
                name="aadhaarNo"
                value={form.aadhaarNo}
                onChange={handleChange}
                placeholder="12-digit Aadhaar number"
                maxLength={14}
                className={`input-field${errors.aadhaarNo ? ' input-field-error' : ''}`}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
              />
              {errors.aadhaarNo && <div className="field-error-text">{errors.aadhaarNo}</div>}
            </div>

            {/* DOB + Gender */}
            <div className="form-grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="input-label">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  className={`input-field${errors.dob ? ' input-field-error' : ''}`}
                />
                {errors.dob && <div className="field-error-text">{errors.dob}</div>}
              </div>
              <div className="form-group">
                <label className="input-label">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className={`input-field${errors.gender ? ' input-field-error' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <div className="field-error-text">{errors.gender}</div>}
              </div>
            </div>

            {/* Nationality */}
            <div style={{ marginBottom: '24px' }}>
              <label className="input-label">Nationality</label>
              <input
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                placeholder="e.g. Indian"
                className={`input-field${errors.nationality ? ' input-field-error' : ''}`}
              />
              {errors.nationality && <div className="field-error-text">{errors.nationality}</div>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                : <><ShieldCheck size={16} /> Register Traveller</>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────
function OverviewTab({ cases }) {
  const highRisk   = cases.filter((c) => c.riskScore > 60);
  const pending    = highRisk.filter((c) => c.status === 'PENDING_REVIEW').length;
  const cleared    = highRisk.filter((c) => c.status === 'CLEARED').length;
  const rejected   = highRisk.filter((c) => c.status === 'REJECTED').length;

  const statCards = [
    {
      label: 'Total Screened',
      value: cases.length,
      sub: 'live queue count',
      icon: <Activity size={18} color="var(--primary)" />,
      color: 'var(--primary)',
    },
    {
      label: 'High-Risk (>60%)',
      value: highRisk.length,
      sub: '100% neural detection',
      icon: <ShieldAlert size={18} color="var(--danger)" />,
      color: 'var(--danger)',
    },
    {
      label: 'Pending Review',
      value: pending,
      sub: 'awaiting officer sign-off',
      icon: <Sliders size={18} color="var(--warning)" />,
      color: 'var(--warning)',
    },
    {
      label: 'Cleared / Rejected',
      value: `${cleared} / ${rejected}`,
      sub: 'resolved today',
      icon: <ShieldCheck size={18} color="var(--success)" />,
      color: 'var(--success)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {statCards.map((s) => (
          <div key={s.label} className="minimal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </span>
              {s.icon}
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* AI info panel */}
      <div className="minimal-card" style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Cpu size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
            AI Forensics Pipeline
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Mean Latency', value: '128 ms', note: 'GPU accelerated' },
            { label: 'MRZ Check', value: 'Active', note: 'Real-time hash validation' },
            { label: 'Face Match', value: 'Active', note: 'Biometric pipeline' },
            { label: 'Deepfake Scan', value: 'Active', note: 'Neural anomaly detector' },
          ].map((i) => (
            <div key={i.label} style={{
              background: 'var(--surface-low)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{i.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>{i.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>{i.note}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Tab: Screening Queue ──────────────────────────────────────────────────
function ScreeningTab({ cases, setCases }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  const handleAction = (caseId, newStatus) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status: newStatus } : c)));
    if (selectedCase?.id === caseId) {
      setSelectedCase((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Only riskScore > 60
  const filtered = cases
    .filter((c) => c.riskScore > 60)
    .filter(
      (c) =>
        c.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.travellerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.docNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const riskColor = (score) =>
    score > 80 ? 'var(--danger)' : score > 60 ? 'var(--warning)' : 'var(--success)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '24px' }}>

      {/* Queue list */}
      <div className="minimal-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
              Screening Queue
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Showing only risk &gt; 60%
            </p>
          </div>
          <span style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-pill)',
            padding: '2px 10px',
            fontSize: '0.72rem',
            fontWeight: '700',
          }}>
            {filtered.length} items
          </span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search by name, ID or document…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '11px', top: '13px' }} />
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-low)',
          }}>
            <ShieldCheck size={36} color="var(--success)" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>All Clear</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              No high-risk cases currently in the queue.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedCase(item)}
                style={{
                  background: selectedCase?.id === item.id ? 'var(--primary-fixed)' : 'var(--surface-low)',
                  border: selectedCase?.id === item.id
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text)' }}>
                      {item.travellerName}
                    </div>
                    <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {item.userId} · {item.docType} #{item.docNumber}
                    </div>
                  </div>
                  <span style={{
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-pill)',
                    padding: '2px 9px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.riskScore}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{item.timestamp}</span>
                  <span style={{
                    fontWeight: '700',
                    color: item.status === 'CLEARED'
                      ? 'var(--success)'
                      : item.status === 'REJECTED'
                        ? 'var(--danger)'
                        : 'var(--warning)',
                  }}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forensics Inspector */}
      <div className="minimal-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <FileSearch size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
            Forensics Inspector
          </h3>
        </div>

        {selectedCase ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Identity block */}
            <div style={{
              background: 'var(--surface-low)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>
                    {selectedCase.travellerName}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {selectedCase.userId}
                  </div>
                </div>
                <span style={{
                  background: selectedCase.aiVerdict === 'FORGERY_DETECTED'
                    ? 'var(--danger-bg)' : selectedCase.aiVerdict === 'SUSPICIOUS'
                      ? 'var(--warning-bg)' : 'var(--success-bg)',
                  color: selectedCase.aiVerdict === 'FORGERY_DETECTED'
                    ? 'var(--danger)' : selectedCase.aiVerdict === 'SUSPICIOUS'
                      ? 'var(--warning)' : 'var(--success)',
                  border: `1px solid ${selectedCase.aiVerdict === 'FORGERY_DETECTED'
                    ? 'var(--danger-border)' : selectedCase.aiVerdict === 'SUSPICIOUS'
                      ? 'var(--warning-border)' : 'var(--success-border)'}`,
                  borderRadius: 'var(--radius-pill)',
                  padding: '3px 10px',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                }}>
                  {selectedCase.aiVerdict}
                </span>
              </div>

              {/* Risk bar */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Composite Risk Score</span>
                  <span style={{ fontWeight: '700', color: riskColor(selectedCase.riskScore) }}>
                    {selectedCase.riskScore}%
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface-highest)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${selectedCase.riskScore}%`,
                    background: selectedCase.riskScore > 80
                      ? 'var(--danger)' : 'var(--warning)',
                    borderRadius: '99px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>

              {/* MRZ + Face match */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '3px' }}>MRZ Hash Status</div>
                  <div style={{
                    fontWeight: '700', fontSize: '0.85rem',
                    color: selectedCase.mrzStatus === 'VALID' ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {selectedCase.mrzStatus}
                  </div>
                </div>
                <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '3px' }}>Face Biometric</div>
                  <div style={{
                    fontWeight: '700', fontSize: '0.85rem',
                    color: selectedCase.faceMatch > 90 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {selectedCase.faceMatch}% match
                  </div>
                </div>
              </div>

              {/* Anomalies */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Neural Diagnostics
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.7 }}>
                  {selectedCase.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleAction(selectedCase.id, 'CLEARED')}
                className="btn-primary"
                style={{ background: 'var(--success)', borderColor: 'var(--success)', width: '100%' }}
              >
                <CheckCircle2 size={16} /> Approve
              </button>
              <button
                type="button"
                onClick={() => handleAction(selectedCase.id, 'REJECTED')}
                className="btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)', width: '100%' }}
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '56px 20px',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-low)',
          }}>
            <Eye size={32} color="var(--text-dim)" style={{ margin: '0 auto 10px auto' }} />
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Select a case from the queue to begin forensic inspection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Registered Travellers ────────────────────────────────────────────
function RegisteredTab() {
  return (
    <div className="minimal-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
      <Users size={40} color="var(--text-dim)" style={{ margin: '0 auto 14px auto' }} />
      <div style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '6px', fontSize: '1rem' }}>
        Registered Travellers
      </div>
      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '340px', margin: '0 auto', lineHeight: 1.7 }}>
        Travellers registered via the <strong>Create New User</strong> button will appear here once this view is connected to the Supabase <code>traveller_identities</code> table.
      </p>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
  { id: 'screening',  label: 'Screening Queue', icon: ClipboardList },
  { id: 'registered', label: 'Registered Travellers', icon: Users },
];

export default function OfficerDashboard() {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab]       = useState('overview');
  const [showCreateUser, setShowCreateUser] = useState(false);
  // No default entries — starts empty; only real scan entries populate this
  const [cases, setCases] = useState([]);

  const riskColor = (score) =>
    score > 80 ? 'var(--danger)' : score > 60 ? 'var(--warning)' : 'var(--success)';

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: 'calc(100vh - 140px)' }}>

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          officerUserId={currentUser?.user_id}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
            Officer Dashboard
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {currentUser?.first_name || 'Inspector'} {currentUser?.last_name} ·{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              {currentUser?.user_id || 'OAUTHO0001'}
            </span>
            {' '}· High-Security Clearance Level 4
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateUser(true)}
          className="btn-primary"
          style={{ gap: '8px', whiteSpace: 'nowrap' }}
        >
          <UserPlus size={16} />
          Create New User
        </button>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: 'var(--surface-container)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '4px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          // Show count badge on Screening tab
          const badgeCount = tab.id === 'screening'
            ? cases.filter((c) => c.riskScore > 60 && c.status === 'PENDING_REVIEW').length
            : null;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`portal-tab-btn${isActive ? ' active' : ''}`}
              style={{ flex: '1 1 auto' }}
            >
              <Icon size={15} />
              {tab.label}
              {badgeCount !== null && badgeCount > 0 && (
                <span className="tab-badge" style={{
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--danger-bg)',
                  color: isActive ? '#fff' : 'var(--danger)',
                  borderColor: isActive ? 'rgba(255,255,255,0.3)' : 'var(--danger-border)',
                }}>
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="fade-in" key={activeTab}>
        {activeTab === 'overview'   && <OverviewTab cases={cases} />}
        {activeTab === 'screening'  && <ScreeningTab cases={cases} setCases={setCases} />}
        {activeTab === 'registered' && <RegisteredTab />}
      </div>

    </div>
  );
}
