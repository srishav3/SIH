import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileSearch, 
  Cpu, 
  Activity, 
  Sliders, 
  UserCheck, 
  Eye, 
  Radio,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OfficerDashboard() {
  const { currentUser } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  // Live screening cases
  const [cases, setCases] = useState([
    {
      id: 'CASE-9401',
      userId: 'TFRD8912',
      travellerName: 'Alexander Hayes',
      docType: 'Passport',
      docNumber: 'P7829104',
      issuer: 'GBR',
      riskScore: 88.4,
      aiVerdict: 'FORGERY_DETECTED',
      reasons: ['Tampered MRZ Checksum', 'Hologram Pattern Mismatch', 'Deepfake Photo Artifacts (0.91 prob)'],
      faceMatch: 62.4,
      mrzStatus: 'INVALID',
      timestamp: '2 mins ago',
      status: 'PENDING_REVIEW'
    },
    {
      id: 'CASE-9402',
      userId: 'TAUTHO1234',
      travellerName: 'John Doe',
      docType: 'Passport',
      docNumber: 'IND9082341',
      issuer: 'IND',
      riskScore: 1.2,
      aiVerdict: 'VERIFIED',
      reasons: ['Authentic Holographic Layer', 'Valid MRZ Hash', 'Biometric Match 99.4%'],
      faceMatch: 99.4,
      mrzStatus: 'VALID',
      timestamp: '6 mins ago',
      status: 'CLEARED'
    },
    {
      id: 'CASE-9403',
      userId: 'TZMKWE4421',
      travellerName: 'Elena Rostova',
      docType: 'Visa',
      docNumber: 'V-9930218',
      issuer: 'FRA',
      riskScore: 45.0,
      aiVerdict: 'SUSPICIOUS',
      reasons: ['Secondary Watermark Faded', 'Font Kerning Anomaly on Date of Expiry'],
      faceMatch: 91.0,
      mrzStatus: 'VALID',
      timestamp: '14 mins ago',
      status: 'PENDING_REVIEW'
    }
  ]);

  const handleAction = (caseId, newStatus) => {
    setCases(cases.map(c => c.id === caseId ? { ...c, status: newStatus } : c));
    if (selectedCase && selectedCase.id === caseId) {
      setSelectedCase({ ...selectedCase, status: newStatus });
    }
  };

  const filteredCases = cases.filter(c => 
    c.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.travellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.docNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: 'calc(100vh - 140px)' }}>
      
      {/* Officer Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge-pill badge-purple">Command & Border Control Hub</span>
              <span className="badge-pill badge-cyan">
                <Radio size={12} className="animate-pulse" /> Live Telemetry
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
              Officer Screening Desk — {currentUser?.first_name || 'Inspector'} {currentUser?.last_name}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              AI Fake Identity Interception & Real-Time Document Forensics Suite
            </p>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(129, 140, 248, 0.35)',
            borderRadius: '12px',
            padding: '12px 20px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Officer Badge ID
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#818cf8' }}>
              {currentUser?.user_id || 'OAUTHO5678'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
              High-Security Clearance Level 4
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
            <span>Total Documents Screened</span>
            <Activity size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc' }}>1,842</div>
          <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '4px' }}>+18.4% today</div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
            <span>Fake IDs Intercepted</span>
            <ShieldAlert size={18} color="#fb7185" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fb7185' }}>27</div>
          <div style={{ fontSize: '0.72rem', color: '#fb7185', marginTop: '4px' }}>100% Neural Detection Rate</div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
            <span>Mean AI Screening Latency</span>
            <Cpu size={18} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#a78bfa' }}>128 ms</div>
          <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px' }}>GPU Accelerated Pipeline</div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>
            <span>Active Inspection Queue</span>
            <Sliders size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399' }}>{cases.filter(c => c.status === 'PENDING_REVIEW').length} Cases</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Requires manual officer sign-off</div>
        </div>
      </div>

      {/* Main Content: Inspection Queue & Forensics Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
        
        {/* Left: Screening Queue & Search */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Incoming Screening Stream
            </h2>
            <span className="badge-pill badge-cyan">{filteredCases.length} items</span>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by User ID (T...), Name, or Passport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '14px' }} />
          </div>

          {/* List of cases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredCases.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedCase(item)}
                className="glass-card"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderRadius: '10px',
                  border: selectedCase?.id === item.id ? '2px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: selectedCase?.id === item.id ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.6)'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#f8fafc' }}>
                      {item.travellerName}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                      ID: {item.userId} • {item.docType} #{item.docNumber}
                    </div>
                  </div>
                  <span className={item.riskScore > 60 ? 'badge-pill badge-rose' : item.riskScore > 30 ? 'badge-pill badge-purple' : 'badge-pill badge-emerald'}>
                    Risk: {item.riskScore}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#94a3b8' }}>{item.timestamp}</span>
                  <span style={{
                    fontWeight: '600',
                    color: item.status === 'CLEARED' ? '#34d399' : item.status === 'REJECTED' ? '#fb7185' : '#fbbf24'
                  }}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right: Detailed Forensics Inspector */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <FileSearch size={22} color="#818cf8" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              AI Document Forensics Inspector
            </h2>
          </div>

          {selectedCase ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                      {selectedCase.travellerName}
                    </h3>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                      {selectedCase.userId}
                    </span>
                  </div>
                  <span className={selectedCase.aiVerdict === 'FORGERY_DETECTED' ? 'badge-pill badge-rose' : 'badge-pill badge-emerald'}>
                    {selectedCase.aiVerdict}
                  </span>
                </div>

                {/* Forensics Check Indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', fontSize: '0.8rem' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: '#64748b' }}>MRZ Hash Status</div>
                    <div style={{ color: selectedCase.mrzStatus === 'VALID' ? '#34d399' : '#fb7185', fontWeight: '700' }}>
                      {selectedCase.mrzStatus}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ color: '#64748b' }}>Face Biometric Match</div>
                    <div style={{ color: selectedCase.faceMatch > 90 ? '#34d399' : '#fb7185', fontWeight: '700' }}>
                      {selectedCase.faceMatch}% Confidence
                    </div>
                  </div>
                </div>

                {/* AI Detected Anomalies */}
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>
                    Neural Screening Diagnostics:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#f8fafc' }}>
                    {selectedCase.reasons.map((r, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons for Officer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleAction(selectedCase.id, 'CLEARED')}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', borderColor: '#10b981' }}>
                  <CheckCircle2 size={18} />
                  Approve Clearance
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(selectedCase.id, 'REJECTED')}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', borderColor: '#f43f5e' }}>
                  <XCircle size={18} />
                  Flag Fake & Intercept
                </button>
              </div>

            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px 20px',
              color: '#64748b',
              border: '2px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: '12px'
            }}>
              <Eye size={36} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>
                Select a traveller case from the screening stream to inspect high-resolution neural anomalies and security marks.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
