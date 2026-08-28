import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Plane, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Scan, 
  QrCode, 
  FileCheck, 
  Clock, 
  ArrowUpRight,
  Fingerprint,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordDocumentScan } from '../lib/supabase';

export default function TravellerDashboard() {
  const { currentUser } = useAuth();
  
  // Interactive scanning state
  const [selectedDocType, setSelectedDocType] = useState('Passport');
  const [docNumber, setDocNumber] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanResult, setScanResult] = useState(null);

  // Initial dummy scan history
  const [scanHistory, setScanHistory] = useState([
    {
      id: 'SCN-84920',
      document_type: 'Passport',
      document_number: 'P8923411',
      issuer_country: 'IND',
      tamper_score: 0.2,
      ai_status: 'VERIFIED',
      scanned_at: '2 hours ago'
    },
    {
      id: 'SCN-84912',
      document_type: 'National ID',
      document_number: 'NID-940212',
      issuer_country: 'IND',
      tamper_score: 0.8,
      ai_status: 'VERIFIED',
      scanned_at: '3 days ago'
    }
  ]);

  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!docNumber.trim()) return;

    setIsScanning(true);
    setScanResult(null);
    setScanStep(1);

    // Simulate multi-stage AI Neural screening
    setTimeout(() => setScanStep(2), 700);
    setTimeout(() => setScanStep(3), 1400);

    setTimeout(async () => {
      setIsScanning(false);
      const isClean = Math.random() > 0.15; // 85% clean verification
      const tamperScore = isClean ? (Math.random() * 2.5).toFixed(1) : (75.0 + Math.random() * 20).toFixed(1);
      const status = isClean ? 'VERIFIED' : 'SUSPICIOUS';

      const newScan = {
        user_id: currentUser?.user_id || 'TUSER1234',
        document_type: selectedDocType,
        document_number: docNumber.trim().toUpperCase(),
        issuer_country: 'IND',
        tamper_score: parseFloat(tamperScore),
        ai_status: status,
        hologram_status: isClean ? 'AUTHENTIC' : 'MICRO-TEXTURE ANOMALY',
        mrz_checksum_valid: isClean,
        face_match_score: isClean ? 99.4 : 64.2
      };

      // Save to Supabase / Local storage
      await recordDocumentScan(newScan);

      setScanResult(newScan);
      setScanHistory([
        { ...newScan, id: 'SCN-' + Math.floor(10000 + Math.random() * 90000), scanned_at: 'Just now' },
        ...scanHistory
      ]);
    }, 2200);
  };

  return (
    <div className="container" style={{ padding: '32px 24px', minHeight: 'calc(100vh - 140px)' }}>
      
      {/* Welcome Banner */}
      <div className="glass-panel" style={{ padding: '28px 32px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge-pill badge-cyan">Traveller Clearance Portal</span>
              <span className="badge-pill badge-emerald">
                <CheckCircle2 size={12} /> AI Verified
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
              Welcome back, {currentUser?.first_name || 'Traveller'} {currentUser?.last_name}
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '6px' }}>
              Your digital identity is linked to AuthentiQ neural document screening network.
            </p>
          </div>

          {/* User ID Highlight Card */}
          <div style={{
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '12px',
            padding: '12px 20px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AuthentiQ User ID
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#22d3ee' }}>
              {currentUser?.user_id || 'TXXXXX1234'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <Fingerprint size={12} /> Biometrics Linked
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Screening Tool & Digital ID Pass */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', marginBottom: '32px' }}>
        
        {/* Left: AI Document Upload & Screening Simulator */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Scan size={22} color="#22d3ee" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Submit Document for AI Screening
            </h2>
          </div>

          <form onSubmit={handleStartScan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label className="input-label">Document Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['Passport', 'Visa', 'National ID'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedDocType(type)}
                    className="glass-card"
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedDocType === type ? '2px solid #22d3ee' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedDocType === type ? 'rgba(6, 182, 212, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                      color: selectedDocType === type ? '#22d3ee' : '#94a3b8',
                      fontWeight: '600',
                      fontSize: '0.82rem'
                    }}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="input-label">Document Number / Passport ID</label>
              <input
                type="text"
                className="input-field input-mono"
                placeholder="e.g. Z9876543"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                required
              />
            </div>

            {/* Document Upload Area */}
            <div style={{
              border: '2px dashed rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(10, 15, 29, 0.5)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {isScanning && <div className="scanner-laser"></div>}
              
              <Upload size={28} color="#38bdf8" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#f8fafc' }}>
                {isScanning ? 'AI Neural Analyzer Processing...' : 'Upload Document Scan / Photo'}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Supports High-Res JPG, PNG, PDF with Optical Security Strip
              </p>

              {isScanning && (
                <div style={{ marginTop: '14px', fontSize: '0.8rem', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  {scanStep === 1 && 'Extracting MRZ & Optical Checksums...'}
                  {scanStep === 2 && 'Inspecting Hologram Micro-patterns & UV Watermarks...'}
                  {scanStep === 3 && 'Checking Deepfake Face-Match & Global Watchlists...'}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isScanning || !docNumber.trim()}
              className="btn-primary btn-glow">
              <Sparkles size={18} />
              {isScanning ? 'Running Neural Forensics...' : 'Analyze & Screen Document'}
            </button>

          </form>

          {/* AI Scan Result Box */}
          {scanResult && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '12px',
              background: scanResult.ai_status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
              border: `1px solid ${scanResult.ai_status === 'VERIFIED' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 113, 133, 0.4)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className={scanResult.ai_status === 'VERIFIED' ? 'badge-pill badge-emerald' : 'badge-pill badge-rose'}>
                  {scanResult.ai_status}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Forgery Risk Score: <strong style={{ color: scanResult.tamper_score < 5 ? '#34d399' : '#fb7185' }}>{scanResult.tamper_score}%</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                Document <strong>{scanResult.document_number}</strong> passed MRZ & Holographic checks with a Face Match confidence of <strong>{scanResult.face_match_score}%</strong>.
              </div>
            </div>
          )}
        </div>

        {/* Right: AuthentiQ Digital Identity Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={22} color="#38bdf8" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                  AuthentiQ Travel Pass
                </h2>
              </div>
              <span className="badge-pill badge-cyan">Fast-Track Active</span>
            </div>

            {/* Futuristic ID Pass Card */}
            <div style={{
              background: 'linear-gradient(135deg, #090e1f 0%, #1e1b4b 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 30px rgba(6, 182, 212, 0.2)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    AuthentiQ Global Identity
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                    {currentUser?.first_name} {currentUser?.last_name || ''}
                  </div>
                </div>
                <ShieldCheck size={28} color="#22d3ee" />
              </div>

              <div style={{
                fontSize: '1.4rem',
                fontWeight: '900',
                fontFamily: 'var(--font-mono)',
                color: '#38bdf8',
                letterSpacing: '0.12em',
                marginBottom: '14px'
              }}>
                {currentUser?.user_id || 'TAUTHO1234'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Role Clearance:</span>
                  <div style={{ color: '#f8fafc', fontWeight: '600' }}>Verified Traveller</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>AI Trust Index:</span>
                  <div style={{ color: '#34d399', fontWeight: '700' }}>99.2% (Tier A)</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '14px',
            background: 'rgba(30, 41, 59, 0.5)',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Fingerprint size={20} color="#34d399" />
            <span>Show this pass at airport security e-gates equipped with AuthentiQ optical scanners.</span>
          </div>

        </div>

      </div>

      {/* Verification History Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#22d3ee" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
              Recent Screening Log History
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Live Synchronized</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '10px 12px' }}>Scan ID</th>
                <th style={{ padding: '10px 12px' }}>Document</th>
                <th style={{ padding: '10px 12px' }}>Number</th>
                <th style={{ padding: '10px 12px' }}>Forgery Risk</th>
                <th style={{ padding: '10px 12px' }}>AI Status</th>
                <th style={{ padding: '10px 12px' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {scanHistory.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{item.id}</td>
                  <td style={{ padding: '12px', color: '#f8fafc' }}>{item.document_type}</td>
                  <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{item.document_number}</td>
                  <td style={{ padding: '12px', color: item.tamper_score < 5 ? '#34d399' : '#fb7185', fontWeight: '600' }}>
                    {item.tamper_score}%
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={item.ai_status === 'VERIFIED' ? 'badge-pill badge-emerald' : 'badge-pill badge-rose'}>
                      {item.ai_status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748b', fontSize: '0.78rem' }}>{item.scanned_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
