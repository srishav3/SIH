import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Upload, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText, 
  Award, 
  Copy, 
  Check, 
  Printer, 
  Search, 
  Eye, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Edit3, 
  KeyRound, 
  Info 
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchUserApplications, saveDocumentApplication } from '../lib/supabase';
import { checkImageQuality, classifyDocument, extractDocumentData } from '../lib/imageVerifier';

// Standard QR Code Image Component (100% compliant with Google Lens & Camera scanners)
function ScannableQRCode({ payload, size = 180 }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1.5,
      width: size * 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [payload, size]);

  if (!qrDataUrl) {
    return (
      <div style={{
        width: `${size}px`,
        height: `${size}px`,
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        Generating QR...
      </div>
    );
  }

  return (
    <div style={{
      padding: '10px',
      background: '#ffffff',
      borderRadius: 'var(--radius-sm)',
      display: 'inline-block',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
      border: '1px solid var(--border)',
      textAlign: 'center'
    }}>
      <img
        src={qrDataUrl}
        alt="Verification QR Code"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'block'
        }}
      />
    </div>
  );
}

export default function TravellerDashboard() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  const userId = currentUser?.user_id || 'TUSER10001';
  const userName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 'Traveller';
  const userEmail = currentUser?.email || 'traveller@authentiq.gov.in';

  // Active Main Tab: 'upload' | 'status' | 'certificate'
  const [activeTab, setActiveTab] = useState('upload');

  // Page 1 Wizard Step: 0 = Intro, 1 = Passport, 2 = Visa, 3 = National ID, 4 = DL, 5 = Review & Submit
  const [uploadStep, setUploadStep] = useState(0);

  // Applications list
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Status Filter on Page 2: 'ALL' | 'UNDER_REVIEW' | 'PASSED' | 'REJECTED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected application for Certificate view (Tab 3) & Image Modal
  const [selectedCertAppId, setSelectedCertAppId] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // User ID copy state
  const [copiedUserId, setCopiedUserId] = useState(false);

  // User ID Notice Popup Modal: ONLY opens when navigated from SignUpPage, NOT from SignIn
  const [showUserIdModal, setShowUserIdModal] = useState(() => {
    try {
      const isFromSignUp = Boolean(
        location.state?.fromSignUp || 
        sessionStorage.getItem('authentiq_just_signed_up') === 'true'
      );
      if (isFromSignUp) {
        sessionStorage.removeItem('authentiq_just_signed_up');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const handleDismissUserIdModal = () => {
    setShowUserIdModal(false);
  };

  // ----------------------------------------------------
  // Page 1: 4 Document Slots State & Form Fields
  // ----------------------------------------------------
  
  // 1. Passport (Compulsory)
  const [passportImg, setPassportImg] = useState('');
  const [passportFileName, setPassportFileName] = useState('');
  const [passportName, setPassportName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportNationality, setPassportNationality] = useState('Indian (IND)');
  const [passportDob, setPassportDob] = useState('');
  const [passportDoe, setPassportDoe] = useState('');
  const [passportGender, setPassportGender] = useState('Male');
  const [passportPlaceOfIssue, setPassportPlaceOfIssue] = useState('');
  const [passportDoi, setPassportDoi] = useState('');

  // 2. Visa Document (Compulsory)
  const [visaImg, setVisaImg] = useState('');
  const [visaFileName, setVisaFileName] = useState('');
  const [visaName, setVisaName] = useState('');
  const [visaNumber, setVisaNumber] = useState('');
  const [visaType, setVisaType] = useState('Tourist / Transit');
  const [visaEntryType, setVisaEntryType] = useState('Multiple Entry');
  const [visaNationality, setVisaNationality] = useState('Indian (IND)');
  const [visaDob, setVisaDob] = useState('');
  const [visaDoi, setVisaDoi] = useState('');
  const [visaDoe, setVisaDoe] = useState('');
  const [visaGender, setVisaGender] = useState('Male');

  // 3. National ID (Indian Aadhaar Card) (Compulsory)
  const [nationalIdImg, setNationalIdImg] = useState('');
  const [nationalIdFileName, setNationalIdFileName] = useState('');
  const [nationalIdName, setNationalIdName] = useState('');
  const [nationalIdNumber, setNationalIdNumber] = useState('');
  const [nationalIdDob, setNationalIdDob] = useState('');
  const [nationalIdGender, setNationalIdGender] = useState('Male');
  const [nationalIdGuardian, setNationalIdGuardian] = useState('');
  const [nationalIdAddress, setNationalIdAddress] = useState('');
  const [nationalIdPincode, setNationalIdPincode] = useState('');

  // 4. Driving License (Indian DL) (Optional)
  const [dlImg, setDlImg] = useState('');
  const [dlFileName, setDlFileName] = useState('');
  const [dlName, setDlName] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [dlDob, setDlDob] = useState('');
  const [dlBloodGroup, setDlBloodGroup] = useState('O+');
  const [dlVehicleClass, setDlVehicleClass] = useState('LMV, MCWG');
  const [dlDoi, setDlDoi] = useState('');
  const [dlDoe, setDlDoe] = useState('');
  const [dlRto, setDlRto] = useState('');

  // Form submitting / validation feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState('');
  const [uploadSuccessApp, setUploadSuccessApp] = useState(null);
  
  // Per-document verification states: verifying, error, ready (unlocks fields after OCR)
  const [passportVerifying, setPassportVerifying] = useState(false);
  const [passportDocError, setPassportDocError] = useState('');
  const [passportReady, setPassportReady] = useState(false);

  const [visaVerifying, setVisaVerifying] = useState(false);
  const [visaDocError, setVisaDocError] = useState('');
  const [visaReady, setVisaReady] = useState(false);

  const [nationalIdVerifying, setNationalIdVerifying] = useState(false);
  const [nationalIdDocError, setNationalIdDocError] = useState('');
  const [nationalIdReady, setNationalIdReady] = useState(false);

  const [dlVerifying, setDlVerifying] = useState(false);
  const [dlDocError, setDlDocError] = useState('');
  const [dlReady, setDlReady] = useState(false);

  // Load user applications on mount (Strictly user-submitted, no mock data)
  useEffect(() => {
    async function load() {
      setLoadingApps(true);
      try {
        const data = await fetchUserApplications(userId);
        setApplications(data || []);
        if (data && data.length > 0) {
          const firstPassed = data.find(a => a.status === 'PASSED') || data[0];
          setSelectedCertAppId(firstPassed.id);
        }
      } catch (err) {
        console.error('Error loading applications:', err);
      } finally {
        setLoadingApps(false);
      }
    }
    load();
  }, [userId]);

  /**
   * Generic file reader helper with AI checks + OCR autofill.
   * @param file - The File object from the input
   * @param setImg - State setter for the image data URL
   * @param setFileName - State setter for the filename display
   * @param expectedType - Document type string for AI classification
   * @param fileInputId - DOM ID of the file input, for resetting on error
   * @param setVerifying - Per-doc setter: controls the loading state
   * @param setDocError - Per-doc setter: shows inline error below upload box
   * @param setReady - Per-doc setter: unlocks form fields after OCR completes
   * @param autofillFn - Callback to auto-fill form fields with OCR data
   */
  const handleFileChange = async (
    file, setImg, setFileName, expectedType,
    fileInputId, setVerifying, setDocError, setReady, autofillFn
  ) => {
    if (!file) return;
    setDocError('');
    setStepError('');
    setReady(false);

    // Only allow image formats
    if (!file.type.startsWith('image/')) {
      setDocError('Only image files are allowed (JPG, PNG, WEBP, etc.). Please re-upload.');
      const input = document.getElementById(fileInputId);
      if (input) input.value = '';
      return;
    }

    setVerifying(true);
    setFileName('Verifying...');

    // Helper to reset file input so user can re-select the same file
    const resetFileInput = () => {
      const input = document.getElementById(fileInputId);
      if (input) input.value = '';
    };

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        
        // 1. Check Blur (OpenCV)
        const qualityResult = await checkImageQuality(dataUrl, 100);
        if (qualityResult.isBlurry) {
          setDocError('Reupload: Image is too blurry or damaged. Please upload a clearer photo.');
          setFileName('');
          setImg('');
          resetFileInput();
          setVerifying(false);
          return;
        }

        // 2. Classify Document (Groq Vision)
        if (expectedType) {
          const classificationResult = await classifyDocument(dataUrl, expectedType);
          if (!classificationResult.isAccepted) {
            setDocError(`Reupload: AI rejected this as a valid ${expectedType}. Reason: ${classificationResult.reason}`);
            setFileName('');
            setImg('');
            resetFileInput();
            setVerifying(false);
            return;
          }
        }
        
        // 3. All checks passed - attach the image, keep verifying state for OCR step
        setFileName('Extracting data...');
        setImg(dataUrl);

        // 4. Run OCR to auto-fill fields, then unlock them
        if (autofillFn) {
          try {
            const ocrType = expectedType === 'Aadhaar or National ID' ? 'Aadhaar' :
                            expectedType === 'Driving License' ? 'DrivingLicense' : expectedType;
            const extracted = await extractDocumentData(dataUrl, ocrType);
            autofillFn(extracted);
          } catch (ocrErr) {
            console.warn('OCR autofill failed silently:', ocrErr);
          }
        }

        // 5. Done - unlock fields
        setFileName(file.name);
        setVerifying(false);
        setReady(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setDocError('An error occurred during image verification. Please try again.');
      setFileName('');
      setImg('');
      resetFileInput();
      setVerifying(false);
    }
  };



  // Step Validation & Forward Navigation
  const handleNextFromPassport = (e) => {
    if (e) e.preventDefault();
    setStepError('');
    if (!passportImg) {
      setStepError('Passport copy is compulsory. Please attach your passport image.');
      return;
    }
    if (!passportNumber.trim()) {
      setStepError('Please enter your Passport Number.');
      return;
    }
    setUploadStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromVisa = (e) => {
    if (e) e.preventDefault();
    setStepError('');
    if (!visaImg) {
      setStepError('Visa document is compulsory. Please attach your visa image.');
      return;
    }
    if (!visaNumber.trim()) {
      setStepError('Please enter your Visa Number.');
      return;
    }
    setUploadStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromNationalId = (e) => {
    if (e) e.preventDefault();
    setStepError('');
    if (!nationalIdImg) {
      setStepError('National ID (Aadhaar) copy is compulsory. Please attach your Aadhaar card image.');
      return;
    }
    if (!nationalIdNumber.trim()) {
      setStepError('Please enter your Aadhaar / National ID Card Number.');
      return;
    }
    setUploadStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextFromDl = (e) => {
    if (e) e.preventDefault();
    setStepError('');
    setUploadStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Application Submission (from Step 5)
  const handleSubmitApplication = async () => {
    setStepError('');
    setIsSubmitting(true);

    try {
      const payload = {
        user_id: userId,
        applicant_name: passportName.trim() || userName,
        
        // 1. Passport Details
        passport_image: passportImg,
        passport_name: passportName.trim() || userName,
        passport_number: passportNumber.trim().toUpperCase(),
        passport_nationality: passportNationality,
        passport_dob: passportDob,
        passport_doe: passportDoe,
        passport_gender: passportGender,
        passport_place_of_issue: passportPlaceOfIssue,
        passport_doi: passportDoi,

        // 2. Visa Details
        visa_image: visaImg,
        visa_name: visaName.trim() || passportName.trim() || userName,
        visa_number: visaNumber.trim().toUpperCase(),
        visa_type: visaType,
        visa_entry_type: visaEntryType,
        visa_nationality: visaNationality,
        visa_dob: visaDob || passportDob,
        visa_doi: visaDoi,
        visa_doe: visaDoe,
        visa_gender: visaGender,

        // 3. National ID Details
        national_id_image: nationalIdImg,
        national_id_name: nationalIdName.trim() || passportName.trim() || userName,
        national_id_number: nationalIdNumber.trim().toUpperCase(),
        national_id_dob: nationalIdDob || passportDob,
        national_id_gender: nationalIdGender,
        national_id_guardian: nationalIdGuardian,
        national_id_address: nationalIdAddress,
        national_id_pincode: nationalIdPincode,

        // 4. Driving License Details (Optional)
        driving_license_image: dlImg || '',
        driving_license_name: dlName.trim(),
        driving_license_number: dlNumber.trim().toUpperCase(),
        driving_license_dob: dlDob,
        driving_license_blood_group: dlBloodGroup,
        driving_license_vehicle_class: dlVehicleClass,
        driving_license_doi: dlDoi,
        driving_license_doe: dlDoe,
        driving_license_rto: dlRto,

        status: 'PASSED'
      };

      const result = await saveDocumentApplication(payload);
      const saved = result.data;

      setApplications(prev => [saved, ...prev.filter(a => a.id !== saved.id)]);
      setSelectedCertAppId(saved.id);
      setUploadSuccessApp(saved);

      // Reset form fields
      setPassportImg('');
      setPassportFileName('');
      setPassportName('');
      setPassportNumber('');
      setPassportDob('');
      setPassportDoe('');
      setPassportPlaceOfIssue('');
      setPassportDoi('');

      setVisaImg('');
      setVisaFileName('');
      setVisaName('');
      setVisaNumber('');
      setVisaDob('');
      setVisaDoi('');
      setVisaDoe('');

      setNationalIdImg('');
      setNationalIdFileName('');
      setNationalIdName('');
      setNationalIdNumber('');
      setNationalIdDob('');
      setNationalIdGuardian('');
      setNationalIdAddress('');
      setNationalIdPincode('');

      setDlImg('');
      setDlFileName('');
      setDlName('');
      setDlNumber('');
      setDlDob('');
      setDlDoi('');
      setDlDoe('');
      setDlRto('');

      setUploadStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission error:', err);
      setStepError('Failed to submit application. Please check your network connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered applications list on Page 2
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const matchesFilter = 
        statusFilter === 'ALL' ? true :
        statusFilter === 'PASSED' ? app.status === 'PASSED' :
        statusFilter === 'UNDER_REVIEW' ? app.status === 'UNDER_REVIEW' :
        statusFilter === 'REJECTED' ? app.status === 'REJECTED' : true;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (app.id && app.id.toLowerCase().includes(q)) ||
        (app.passport_number && app.passport_number.toLowerCase().includes(q)) ||
        (app.national_id_number && app.national_id_number.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [applications, statusFilter, searchQuery]);

  // Selected Certificate Application on Page 3
  const currentCertApp = useMemo(() => {
    if (selectedCertAppId) {
      const found = applications.find(a => a.id === selectedCertAppId);
      if (found) return found;
    }
    return applications.find(a => a.status === 'PASSED') || applications[0] || null;
  }, [applications, selectedCertAppId]);

  // QR Code payload (Google Lens / Camera Scannable)
  const qrPayloadString = useMemo(() => {
    if (!currentCertApp) return `AuthentiQ Identity Verification | User ID: ${userId} | Status: PASSED`;
    const certId = currentCertApp.certificate_id || `AUTH-CERT-${userId.slice(-6)}`;
    const validUntil = currentCertApp.valid_until || '27 Aug 2027';
    return `AuthentiQ Digital Verification Certificate
Certificate ID: ${certId}
Applicant: ${currentCertApp.applicant_name || userName}
User ID: ${userId}
Status: PASSED & VERIFIED
Passport No: ${currentCertApp.passport_number || 'VERIFIED'}
National ID (Aadhaar): ${currentCertApp.national_id_number || 'VERIFIED'}
Visa No: ${currentCertApp.visa_number || 'VERIFIED'}
Valid Till: ${validUntil}
Authority: AuthentiQ Screening Portal`;
  }, [currentCertApp, userId, userName]);

  // Copy User ID Helper
  const handleCopyUserId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
    }
  };

  const passedCount = applications.filter(a => a.status === 'PASSED').length;
  const underReviewCount = applications.filter(a => a.status === 'UNDER_REVIEW').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 72px)', background: 'var(--bg)' }}>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* =========================================================
            LEFT SIDEBAR (FULL HEIGHT, PREMIUM DESIGN)
            ========================================================= */}
        <aside style={{
          width: '280px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          flexShrink: 0,
          boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
        }}>
          
          <div style={{ marginBottom: '40px', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px', height: '32px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-fixed-dim))',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '800', fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(0,0,128,0.2)'
              }}>Q</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1.2 }}>
                  AuthentiQ
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Traveller Portal
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '8px' }}>
              Navigation
            </div>
            
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => { setActiveTab('upload'); setUploadStep(0); }}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: activeTab === 'upload' ? '600' : '500' }}>
              <Upload size={18} strokeWidth={activeTab === 'upload' ? 2.5 : 2} />
              <span>New Application</span>
            </button>

            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: activeTab === 'status' ? '600' : '500' }}>
              <FileText size={18} strokeWidth={activeTab === 'status' ? 2.5 : 2} />
              <span>Applications</span>
              <span className="tab-badge" style={{ marginLeft: 'auto', background: activeTab === 'status' ? 'var(--primary)' : 'var(--surface-container)', color: activeTab === 'status' ? '#fff' : 'var(--text)' }}>
                {applications.length}
              </span>
            </button>

            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
              onClick={() => setActiveTab('certificate')}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '12px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: activeTab === 'certificate' ? '600' : '500' }}>
              <Award size={18} strokeWidth={activeTab === 'certificate' ? 2.5 : 2} />
              <span>Certificates</span>
              {passedCount > 0 && (
                <span className="tab-badge" style={{
                  marginLeft: 'auto',
                  background: activeTab === 'certificate' ? 'var(--primary)' : 'var(--success-bg)',
                  color: activeTab === 'certificate' ? '#fff' : 'var(--success)'
                }}>
                  {passedCount}
                </span>
              )}
            </button>
          </div>

          <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--surface-low)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userName}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userEmail}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '10px', marginTop: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.04em', fontWeight: '700' }}>User ID</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text)' }}>{userId.slice(0, 12)}...</span>
              </div>
              <button onClick={handleCopyUserId} className="btn-subtle" style={{ padding: '4px 6px' }} title="Copy ID">
                {copiedUserId ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================
            MAIN CONTENT AREA (FULL BLEED, DYNAMIC WIDTH)
            ========================================================= */}
        <main style={{ flex: 1, padding: '40px 56px', overflowY: 'auto', background: 'var(--bg)' }}>
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top Page Header */}
            <div style={{ marginBottom: '8px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
                Identity & Document Verification Portal
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Complete your profile and manage your verification status.
              </p>
            </div>
        {/* =========================================================
            PAGE 1: STEP-BY-STEP UPLOAD WIZARD
            ========================================================= */}
        {activeTab === 'upload' && (
          <div>
            
            {/* Success Alert */}
            {uploadSuccessApp && (
              <div className="alert-box alert-success" style={{ marginBottom: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Application Submitted Successfully!</strong> Application Reference ID: <code style={{ fontWeight: '700' }}>{uploadSuccessApp.id}</code>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    className="btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '0.76rem' }}>
                    Check Status
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCertAppId(uploadSuccessApp.id);
                      setActiveTab('certificate');
                    }}
                    className="btn-primary"
                    style={{ padding: '5px 10px', fontSize: '0.76rem' }}>
                    View Certificate
                  </button>
                </div>
              </div>
            )}

            {/* Error Alert - only for stepError now, doc errors are inline */}
            {stepError && (
              <div className="alert-box alert-danger" style={{ marginBottom: '20px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <div>{stepError}</div>
              </div>
            )}

            {/* =========================================================
                STEP 0: INTRO / NEW APPLICATION
                ========================================================= */}
            {uploadStep === 0 && (
              <div className="doc-section-card fade-in" style={{ textAlign: 'center', padding: '60px 40px', marginTop: '20px' }}>
                <div style={{ width: '64px', height: '64px', background: 'var(--primary-fixed)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'var(--primary)' }}>
                  <ShieldCheck size={32} />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text)', marginBottom: '12px' }}>
                  Border Crossing Document Verification
                </h2>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
                  Do you want to verify your identity and travel documents for crossing the border? This will start a new secure application process.
                </p>
                <button
                  type="button"
                  onClick={() => setUploadStep(1)}
                  className="btn-primary"
                  style={{ padding: '12px 32px', fontSize: '0.95rem', gap: '8px' }}>
                  <span>Yes, Start New Application</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

            {uploadStep >= 1 && (
              <>
                {/* Wizard Step Progress Indicator */}
            <div className="wizard-progress-bar">
              <div
                className={`wizard-step-node ${uploadStep === 1 ? 'active' : uploadStep > 1 ? 'completed' : ''}`}
                onClick={() => setUploadStep(1)}>
                <span className="wizard-step-num">{uploadStep > 1 ? '✓' : '1'}</span>
                <span>1. Passport</span>
              </div>

              <span className="wizard-arrow">→</span>

              <div
                className={`wizard-step-node ${uploadStep === 2 ? 'active' : uploadStep > 2 ? 'completed' : ''}`}
                onClick={() => { if (passportImg && passportNumber) setUploadStep(2); }}>
                <span className="wizard-step-num">{uploadStep > 2 ? '✓' : '2'}</span>
                <span>2. Visa Document</span>
              </div>

              <span className="wizard-arrow">→</span>

              <div
                className={`wizard-step-node ${uploadStep === 3 ? 'active' : uploadStep > 3 ? 'completed' : ''}`}
                onClick={() => { if (visaImg && visaNumber) setUploadStep(3); }}>
                <span className="wizard-step-num">{uploadStep > 3 ? '✓' : '3'}</span>
                <span>3. National ID (Aadhaar)</span>
              </div>

              <span className="wizard-arrow">→</span>

              <div
                className={`wizard-step-node ${uploadStep === 4 ? 'active' : uploadStep > 4 ? 'completed' : ''}`}
                onClick={() => { if (nationalIdImg && nationalIdNumber) setUploadStep(4); }}>
                <span className="wizard-step-num">{uploadStep > 4 ? '✓' : '4'}</span>
                <span>4. Driving License</span>
              </div>

              <span className="wizard-arrow">→</span>

              <div
                className={`wizard-step-node ${uploadStep === 5 ? 'active' : ''}`}
                onClick={() => { if (nationalIdImg && nationalIdNumber) setUploadStep(5); }}>
                <span className="wizard-step-num">5</span>
                <span>5. Review & Submit</span>
              </div>
            </div>



            {/* =========================================================
                STEP 1: PASSPORT BLOCK (COMPULSORY)
                ========================================================= */}
            {uploadStep === 1 && (
              <div className="doc-section-card fade-in">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--primary-fixed)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0
                    }}>🛂</div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                        Step 1 of 4 — Passport Information
                      </h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Upload your Passport photo page and fill details below
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-compulsory">Required</span>
                </div>

                {/* Passport Image Upload Box */}
                <div
                  className="doc-upload-box"
                  onClick={() => !passportVerifying && document.getElementById('passport-file-input').click()}>
                  <input
                    id="passport-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(
                        e.target.files[0],
                        setPassportImg,
                        setPassportFileName,
                        'Passport',
                        'passport-file-input',
                        setPassportVerifying,
                        setPassportDocError,
                        setPassportReady,
                        (d) => {
                          if (d.name) setPassportName(d.name);
                          if (d.passportNumber) setPassportNumber(d.passportNumber);
                          if (d.nationality) setPassportNationality(d.nationality);
                          if (d.dob) setPassportDob(d.dob);
                          if (d.doi) setPassportDoi(d.doi);
                          if (d.doe) setPassportDoe(d.doe);
                          if (d.gender) setPassportGender(d.gender);
                          if (d.placeOfIssue) setPassportPlaceOfIssue(d.placeOfIssue);
                        }
                      )}
                    disabled={passportVerifying}
                  />
                  {passportImg ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                      <img
                        src={passportImg}
                        alt="Passport Preview"
                        style={{ height: '76px', borderRadius: '4px', objectFit: 'contain', border: '1px solid var(--border)' }}
                      />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>
                          {passportFileName}
                        </div>
                        {passportReady
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>✓ Verified & Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>⏳ {passportFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {passportVerifying ? (
                        <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>⏳ {passportFileName}</div>
                      ) : (
                        <Upload size={22} style={{ color: 'var(--text-dim)', margin: '0 auto 6px auto' }} />
                      )}
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>
                        Click to Upload Passport Photo Page
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Supports JPG, PNG, WEBP
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline error below upload box */}
                {passportDocError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)', borderRadius: 'var(--radius-sm)', marginTop: '10px', marginBottom: '6px' }}>
                    <AlertCircle size={15} style={{ color: 'var(--danger, #ef4444)', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--danger, #ef4444)', fontWeight: '500' }}>{passportDocError}</span>
                  </div>
                )}

                {/* Passport Text Boxes Grid — locked until OCR done */}
                <div style={{ opacity: passportReady ? 1 : 0.45, pointerEvents: passportReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!passportReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span>
                      <span>{passportVerifying ? 'AI is verifying and extracting data from your document...' : 'Upload and verify your document above to unlock these fields.'}</span>
                    </div>
                  )}
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Full Name (as on Passport) *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={passportName}
                      onChange={(e) => setPassportName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">Passport Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. Z9824102"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value.toUpperCase())}
                      className="input-field"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">Nationality *</label>
                    <input
                      type="text"
                      placeholder="e.g. Indian (IND)"
                      value={passportNationality}
                      onChange={(e) => setPassportNationality(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Date of Birth (DOB) *</label>
                    <input
                      type="date"
                      value={passportDob}
                      onChange={(e) => setPassportDob(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">Gender *</label>
                    <select
                      value={passportGender}
                      onChange={(e) => setPassportGender(e.target.value)}
                      className="input-field">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="input-label">Place of Issue</label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi / Mumbai"
                      value={passportPlaceOfIssue}
                      onChange={(e) => setPassportPlaceOfIssue(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="input-label">Date of Issue</label>
                    <input
                      type="date"
                      value={passportDoi}
                      onChange={(e) => setPassportDoi(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">Date of Expiry *</label>
                    <input
                      type="date"
                      value={passportDoe}
                      onChange={(e) => setPassportDoe(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                </div>

                {/* Step 1 Navigation Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleNextFromPassport}
                    className="btn-primary"
                    style={{ padding: '10px 20px', gap: '8px' }}>
                    <span>Next: Visa Document</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            )}

            {/* =========================================================
                STEP 2: VISA BLOCK (COMPULSORY)
                ========================================================= */}
            {uploadStep === 2 && (
              <div className="doc-section-card fade-in">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--primary-fixed)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0
                    }}>📄</div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                        Step 2 of 4 — Visa Document Information
                      </h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Upload your Visa permit copy and fill details below
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-compulsory">Required</span>
                </div>

                {/* Visa Image Upload Box */}
                <div
                  className="doc-upload-box"
                  onClick={() => !visaVerifying && document.getElementById('visa-file-input').click()}>
                  <input
                    id="visa-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(
                        e.target.files[0],
                        setVisaImg,
                        setVisaFileName,
                        'Visa',
                        'visa-file-input',
                        setVisaVerifying,
                        setVisaDocError,
                        setVisaReady,
                        (d) => {
                          if (d.name) setVisaName(d.name);
                          if (d.visaNumber) setVisaNumber(d.visaNumber);
                          if (d.nationality) setVisaNationality(d.nationality);
                          if (d.dob) setVisaDob(d.dob);
                          if (d.doi) setVisaDoi(d.doi);
                          if (d.doe) setVisaDoe(d.doe);
                          if (d.gender) setVisaGender(d.gender);
                        }
                      )}
                    disabled={visaVerifying}
                  />
                  {visaImg ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                      <img src={visaImg} alt="Visa Preview" style={{ height: '76px', borderRadius: '4px', objectFit: 'contain', border: '1px solid var(--border)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>{visaFileName}</div>
                        {visaReady
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>✓ Verified & Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>⏳ {visaFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {visaVerifying
                        ? <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>⏳ {visaFileName}</div>
                        : <Upload size={22} style={{ color: 'var(--text-dim)', margin: '0 auto 6px auto' }} />
                      }
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>Click to Upload Visa Document / Permit Copy</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP</div>
                    </div>
                  )}
                </div>

                {/* Inline error below upload box */}
                {visaDocError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)', borderRadius: 'var(--radius-sm)', marginTop: '10px', marginBottom: '6px' }}>
                    <AlertCircle size={15} style={{ color: 'var(--danger, #ef4444)', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--danger, #ef4444)', fontWeight: '500' }}>{visaDocError}</span>
                  </div>
                )}

                {/* Visa Fields — locked until OCR done */}
                <div style={{ opacity: visaReady ? 1 : 0.45, pointerEvents: visaReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!visaReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span>
                      <span>{visaVerifying ? 'AI is verifying and extracting data from your document...' : 'Upload and verify your document above to unlock these fields.'}</span>
                    </div>
                  )}
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Full Name (as on Visa) *</label>
                    <input type="text" placeholder="e.g. Rahul Sharma" value={visaName} onChange={(e) => setVisaName(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Visa Number *</label>
                    <input type="text" placeholder="e.g. VISA-IND-904128" value={visaNumber} onChange={(e) => setVisaNumber(e.target.value.toUpperCase())} className="input-field" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Visa Type / Category *</label>
                    <select value={visaType} onChange={(e) => setVisaType(e.target.value)} className="input-field">
                      <option value="Tourist / Transit">Tourist / Transit Visa</option>
                      <option value="Business / Conference">Business / Conference Visa</option>
                      <option value="Student / Academic">Student / Academic Visa</option>
                      <option value="Employment / Work">Employment / Work Visa</option>
                      <option value="Diplomatic / Official">Diplomatic / Official Visa</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Entry Validation *</label>
                    <select value={visaEntryType} onChange={(e) => setVisaEntryType(e.target.value)} className="input-field">
                      <option value="Single Entry">Single Entry</option>
                      <option value="Double Entry">Double Entry</option>
                      <option value="Multiple Entry">Multiple Entry</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Nationality *</label>
                    <input type="text" placeholder="e.g. Indian (IND)" value={visaNationality} onChange={(e) => setVisaNationality(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Gender</label>
                    <select value={visaGender} onChange={(e) => setVisaGender(e.target.value)} className="input-field">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-grid-3" style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="input-label">Date of Birth</label>
                    <input type="date" value={visaDob} onChange={(e) => setVisaDob(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Date of Issue</label>
                    <input type="date" value={visaDoi} onChange={(e) => setVisaDoi(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Date of Expiry (Valid Until) *</label>
                    <input type="date" value={visaDoe} onChange={(e) => setVisaDoe(e.target.value)} className="input-field" />
                  </div>
                </div>
                </div>

                {/* Step 2 Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setUploadStep(1)}
                    className="btn-secondary"
                    style={{ padding: '10px 16px', gap: '6px' }}>
                    <ArrowLeft size={16} />
                    <span>Back to Passport</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextFromVisa}
                    className="btn-primary"
                    style={{ padding: '10px 20px', gap: '8px' }}>
                    <span>Next: National ID (Aadhaar)</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            )}

            {/* =========================================================
                STEP 3: NATIONAL ID / AADHAAR BLOCK (COMPULSORY)
                ========================================================= */}
            {uploadStep === 3 && (
              <div className="doc-section-card fade-in">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--primary-fixed)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0
                    }}>🪪</div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                        Step 3 of 4 — National ID (Aadhaar Card)
                      </h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Upload your Aadhaar card and fill resident details below
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-compulsory">Required</span>
                </div>

                {/* Aadhaar Image Upload Box */}
                <div
                  className="doc-upload-box"
                  onClick={() => !nationalIdVerifying && document.getElementById('national-id-file-input').click()}>
                  <input
                    id="national-id-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(
                        e.target.files[0],
                        setNationalIdImg,
                        setNationalIdFileName,
                        'Aadhaar or National ID',
                        'national-id-file-input',
                        setNationalIdVerifying,
                        setNationalIdDocError,
                        setNationalIdReady,
                        (d) => {
                          if (d.name) setNationalIdName(d.name);
                          if (d.aadhaarNumber) setNationalIdNumber(d.aadhaarNumber);
                          if (d.dob) setNationalIdDob(d.dob);
                          if (d.gender) setNationalIdGender(d.gender);
                          if (d.guardian) setNationalIdGuardian(d.guardian);
                          if (d.address) setNationalIdAddress(d.address);
                          if (d.pincode) setNationalIdPincode(d.pincode);
                        }
                      )}
                    disabled={nationalIdVerifying}
                  />
                  {nationalIdImg ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                      <img src={nationalIdImg} alt="National ID Preview" style={{ height: '76px', borderRadius: '4px', objectFit: 'contain', border: '1px solid var(--border)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>{nationalIdFileName}</div>
                        {nationalIdReady
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>✓ Verified & Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>⏳ {nationalIdFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {nationalIdVerifying
                        ? <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>⏳ {nationalIdFileName}</div>
                        : <Upload size={22} style={{ color: 'var(--text-dim)', margin: '0 auto 6px auto' }} />
                      }
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>Click to Upload Aadhaar Card (Front / Full Page)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP</div>
                    </div>
                  )}
                </div>

                {nationalIdDocError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)', borderRadius: 'var(--radius-sm)', marginTop: '10px', marginBottom: '6px' }}>
                    <AlertCircle size={15} style={{ color: 'var(--danger, #ef4444)', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--danger, #ef4444)', fontWeight: '500' }}>{nationalIdDocError}</span>
                  </div>
                )}

                {/* Aadhaar Fields — locked until OCR done */}
                <div style={{ opacity: nationalIdReady ? 1 : 0.45, pointerEvents: nationalIdReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!nationalIdReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span>
                      <span>{nationalIdVerifying ? 'AI is verifying and extracting data from your document...' : 'Upload and verify your document above to unlock these fields.'}</span>
                    </div>
                  )}
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Full Name (as per Aadhaar) *</label>
                    <input type="text" placeholder="e.g. Rahul Sharma" value={nationalIdName} onChange={(e) => setNationalIdName(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Aadhaar Card Number (12 Digits) *</label>
                    <input type="text" placeholder="e.g. 5489 9021 3418" value={nationalIdNumber} onChange={(e) => setNationalIdNumber(e.target.value)} className="input-field" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Date of Birth / Year of Birth *</label>
                    <input type="date" value={nationalIdDob} onChange={(e) => setNationalIdDob(e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Gender *</label>
                    <select value={nationalIdGender} onChange={(e) => setNationalIdGender(e.target.value)} className="input-field">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Transgender / Other">Transgender / Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Father's / Guardian's Name (C/O)</label>
                    <input type="text" placeholder="e.g. Suresh Sharma" value={nationalIdGuardian} onChange={(e) => setNationalIdGuardian(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Pincode *</label>
                    <input type="text" placeholder="e.g. 201301" value={nationalIdPincode} onChange={(e) => setNationalIdPincode(e.target.value)} className="input-field" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                </div>
                <div className="form-grid-1" style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="input-label">Complete Residential Address (as on Aadhaar) *</label>
                    <textarea placeholder="House/Flat No, Street, Landmark, Village/City, District, State" value={nationalIdAddress} onChange={(e) => setNationalIdAddress(e.target.value)} className="input-field" rows={2} style={{ resize: 'vertical' }} />
                  </div>
                </div>
                </div>

                {/* Step 3 Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setUploadStep(2)}
                    className="btn-secondary"
                    style={{ padding: '10px 16px', gap: '6px' }}>
                    <ArrowLeft size={16} />
                    <span>Back to Visa</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextFromNationalId}
                    className="btn-primary"
                    style={{ padding: '10px 20px', gap: '8px' }}>
                    <span>Next: Driving License (Optional)</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            )}

            {/* =========================================================
                STEP 4: DRIVING LICENSE BLOCK (OPTIONAL)
                ========================================================= */}
            {uploadStep === 4 && (
              <div className="doc-section-card fade-in">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--surface-container)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', flexShrink: 0
                    }}>🚗</div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)', margin: 0 }}>
                        Step 4 of 4 — Driving License
                      </h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Attach your Indian Driving License or skip this step
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-optional">Optional</span>
                </div>

                {/* DL Image Upload Box */}
                <div
                  className="doc-upload-box"
                  onClick={() => !dlVerifying && document.getElementById('dl-file-input').click()}>
                  <input
                    id="dl-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(
                        e.target.files[0],
                        setDlImg,
                        setDlFileName,
                        'Driving License',
                        'dl-file-input',
                        setDlVerifying,
                        setDlDocError,
                        setDlReady,
                        (d) => {
                          if (d.name) setDlName(d.name);
                          if (d.dlNumber) setDlNumber(d.dlNumber);
                          if (d.dob) setDlDob(d.dob);
                          if (d.bloodGroup) setDlBloodGroup(d.bloodGroup);
                          if (d.vehicleClass) setDlVehicleClass(d.vehicleClass);
                          if (d.doi) setDlDoi(d.doi);
                          if (d.doe) setDlDoe(d.doe);
                          if (d.rto) setDlRto(d.rto);
                        }
                      )}
                    disabled={dlVerifying}
                  />
                  {dlImg ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                      <img src={dlImg} alt="Driving License Preview" style={{ height: '76px', borderRadius: '4px', objectFit: 'contain', border: '1px solid var(--border)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>{dlFileName}</div>
                        {dlReady
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>✓ Verified & Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>⏳ {dlFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {dlVerifying
                        ? <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>⏳ {dlFileName}</div>
                        : <Upload size={22} style={{ color: 'var(--text-dim)', margin: '0 auto 6px auto' }} />
                      }
                      <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>Click to Upload Driving License Copy (Optional)</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supports JPG, PNG, WEBP</div>
                    </div>
                  )}
                </div>

                {dlDocError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger-border, #fecaca)', borderRadius: 'var(--radius-sm)', marginTop: '10px', marginBottom: '6px' }}>
                    <AlertCircle size={15} style={{ color: 'var(--danger, #ef4444)', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--danger, #ef4444)', fontWeight: '500' }}>{dlDocError}</span>
                  </div>
                )}

                <div style={{ opacity: dlReady ? 1 : 0.45, pointerEvents: dlReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!dlReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span>
                      <span>{dlVerifying ? 'AI is verifying and extracting data from your document...' : 'Upload your DL above to unlock these fields, or skip this step.'}</span>
                    </div>
                  )}
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Full Name (as on Driving License)</label>
                    <input type="text" placeholder="e.g. Rahul Sharma" value={dlName} onChange={(e) => setDlName(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Driving License Number</label>
                    <input type="text" placeholder="e.g. DL-1420110012345" value={dlNumber} onChange={(e) => setDlNumber(e.target.value.toUpperCase())} className="input-field" style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Date of Birth</label>
                    <input type="date" value={dlDob} onChange={(e) => setDlDob(e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="form-grid-3" style={{ marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="input-label">Blood Group</label>
                    <select value={dlBloodGroup} onChange={(e) => setDlBloodGroup(e.target.value)} className="input-field">
                      <option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option><option value="AB+">AB+</option>
                      <option value="A-">A-</option><option value="B-">B-</option><option value="O-">O-</option><option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Vehicle Class / Category</label>
                    <input type="text" placeholder="e.g. LMV, MCWG" value={dlVehicleClass} onChange={(e) => setDlVehicleClass(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Issuing RTO / Authority</label>
                    <input type="text" placeholder="e.g. DL-14 Janakpuri RTO" value={dlRto} onChange={(e) => setDlRto(e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="form-grid-2" style={{ marginBottom: '24px' }}>
                  <div className="form-group">
                    <label className="input-label">Date of Issue</label>
                    <input type="date" value={dlDoi} onChange={(e) => setDlDoi(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Valid Till / Expiry Date</label>
                    <input type="date" value={dlDoe} onChange={(e) => setDlDoe(e.target.value)} className="input-field" />
                  </div>
                </div>
                </div>


                {/* Step 4 Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setUploadStep(3)}
                    className="btn-secondary"
                    style={{ padding: '10px 16px', gap: '6px' }}>
                    <ArrowLeft size={16} />
                    <span>Back to National ID</span>
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setUploadStep(5)}
                      className="btn-secondary"
                      style={{ padding: '10px 16px' }}>
                      <span>Skip This Step</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextFromDl}
                      className="btn-primary"
                      style={{ padding: '10px 20px', gap: '8px' }}>
                      <span>Review & Submit</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* =========================================================
                STEP 5: REVIEW & FINAL SUBMIT APPLICATION
                ========================================================= */}
            {uploadStep === 5 && (
              <div className="doc-section-card fade-in">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--primary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.1rem', flexShrink: 0
                    }}>✅</div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>
                        Review & Submit Your Application
                      </h3>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        Verify all attached images and document details before final submission
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-traveller">Final Step</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  
                  {/* Passport Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>🛂 1. Passport</span>
                      <button type="button" onClick={() => setUploadStep(1)} className="btn-subtle" style={{ padding: '4px 10px', fontSize: '0.76rem' }}><Edit3 size={14} /> Edit</button>
                    </div>
                    {passportImg && <img src={passportImg} alt="Passport" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />}
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>No: <strong style={{ color: 'var(--text)' }}>{passportNumber || '—'}</strong></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Name: {passportName || userName}</div>
                  </div>

                  {/* Visa Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>📄 2. Visa Document</span>
                      <button type="button" onClick={() => setUploadStep(2)} className="btn-subtle" style={{ padding: '4px 10px', fontSize: '0.76rem' }}><Edit3 size={14} /> Edit</button>
                    </div>
                    {visaImg && <img src={visaImg} alt="Visa" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />}
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>No: <strong style={{ color: 'var(--text)' }}>{visaNumber || '—'}</strong></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Type: {visaType} ({visaEntryType})</div>
                  </div>

                  {/* National ID Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>🪪 3. Aadhaar Card</span>
                      <button type="button" onClick={() => setUploadStep(3)} className="btn-subtle" style={{ padding: '4px 10px', fontSize: '0.76rem' }}><Edit3 size={14} /> Edit</button>
                    </div>
                    {nationalIdImg && <img src={nationalIdImg} alt="National ID" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />}
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>No: <strong style={{ color: 'var(--text)' }}>{nationalIdNumber || '—'}</strong></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Pincode: {nationalIdPincode || '—'}</div>
                  </div>

                  {/* Driving License Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>🚗 4. Driving License</span>
                      <button type="button" onClick={() => setUploadStep(4)} className="btn-subtle" style={{ padding: '4px 10px', fontSize: '0.76rem' }}><Edit3 size={14} /> Edit</button>
                    </div>
                    {dlImg ? (
                      <img src={dlImg} alt="DL" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                    ) : (
                      <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container)', borderRadius: '8px', color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '16px' }}>Skipped (Optional)</div>
                    )}
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '4px' }}>No: <strong style={{ color: 'var(--text)' }}>{dlNumber || 'Not provided'}</strong></div>
                  </div>

                </div>

                {/* Final Submit Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setUploadStep(4)}
                    className="btn-secondary"
                    style={{ padding: '10px 16px', gap: '6px' }}>
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitApplication}
                    className="btn-primary"
                    style={{ padding: '11px 28px', fontSize: '0.94rem', fontWeight: '700', gap: '8px' }}>
                    {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                    <CheckCircle2 size={18} />
                  </button>
                </div>

              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* =========================================================
            PAGE 2: APPLICATION STATUS (NO HARDCODED/DEFAULT APPS)
            ========================================================= */}
        {activeTab === 'status' && (
          <div>
            
            {/* Filters and Search */}
            <div className="minimal-card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                
                {/* Filter Pills */}
                <div className="filter-pills-bar">
                  <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-dim)', marginRight: '4px' }}>
                    Status Filter:
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}>
                    <span>All Applications</span>
                    <span style={{ opacity: 0.7 }}>({applications.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('UNDER_REVIEW')}
                    className={`filter-pill ${statusFilter === 'UNDER_REVIEW' ? 'active-amber' : ''}`}>
                    <Clock size={12} />
                    <span>Currently Under Review</span>
                    <span style={{ opacity: 0.8 }}>({underReviewCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('PASSED')}
                    className={`filter-pill ${statusFilter === 'PASSED' ? 'active-emerald' : ''}`}>
                    <CheckCircle2 size={12} />
                    <span>Passed / Verified</span>
                    <span style={{ opacity: 0.8 }}>({passedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('REJECTED')}
                    className={`filter-pill ${statusFilter === 'REJECTED' ? 'active-rose' : ''}`}>
                    <XCircle size={12} />
                    <span>Rejected</span>
                    <span style={{ opacity: 0.8 }}>({applications.filter(a => a.status === 'REJECTED').length})</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    placeholder="Search Application..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '32px', fontSize: '0.82rem', padding: '6px 10px 6px 32px' }}
                  />
                </div>

              </div>
            </div>

            {/* Applications List */}
            {filteredApps.length === 0 ? (
              <div className="minimal-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <FileText size={36} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' }}>
                  No Applications Found
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  {searchQuery ? 'No applications match your search criteria.' : 'You have not submitted any document applications yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadStep(1);
                    setActiveTab('upload');
                  }}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
                  <Upload size={15} />
                  <span>Upload Documents</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredApps.map((app) => (
                  <div key={app.id} className="minimal-card" style={{ padding: '20px 24px' }}>
                    
                    {/* Top Row: App ID, Date, Status Badge */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                      
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: '700', color: 'var(--text)' }}>
                            {app.id}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                            • Submitted on {new Date(app.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Clean Status Badge */}
                      <div>
                        {app.status === 'PASSED' && (
                          <span className="status-badge status-passed">
                            <CheckCircle2 size={13} /> Passed & Verified
                          </span>
                        )}
                        {app.status === 'UNDER_REVIEW' && (
                          <span className="status-badge status-review">
                            <Clock size={13} /> Under Review
                          </span>
                        )}
                        {app.status === 'REJECTED' && (
                          <span className="status-badge status-rejected">
                            <XCircle size={13} /> Rejected
                          </span>
                        )}
                      </div>

                    </div>

                    {/* Middle: Document Particulars & Thumbnails */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      
                      {/* Passport Summary */}
                      <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>🛂 Passport</span>
                          {app.passport_image && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal({ title: 'Passport Image', url: app.passport_image, docNo: app.passport_number })}
                              className="btn-subtle"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                              <Eye size={12} /> View
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.passport_number || '—'}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Name: {app.passport_name || app.applicant_name}
                        </div>
                      </div>

                      {/* Visa Summary */}
                      <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>📄 Visa Document</span>
                          {app.visa_image && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal({ title: 'Visa Document', url: app.visa_image, docNo: app.visa_number })}
                              className="btn-subtle"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                              <Eye size={12} /> View
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.visa_number || '—'}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Type: {app.visa_type || 'Tourist'} ({app.visa_entry_type || 'Multiple'})
                        </div>
                      </div>

                      {/* National ID Summary */}
                      <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>🪪 Aadhaar / National ID</span>
                          {app.national_id_image && (
                            <button
                              type="button"
                              onClick={() => setPreviewImageModal({ title: 'Aadhaar / National ID', url: app.national_id_image, docNo: app.national_id_number })}
                              className="btn-subtle"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                              <Eye size={12} /> View
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.national_id_number || '—'}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Address: {app.national_id_address ? `${app.national_id_address.slice(0, 30)}...` : 'Provided'}
                        </div>
                      </div>

                      {/* Driving License Summary (if provided) */}
                      {app.driving_license_number && (
                        <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>🚗 Driving License</span>
                            {app.driving_license_image && (
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal({ title: 'Driving License', url: app.driving_license_image, docNo: app.driving_license_number })}
                                className="btn-subtle"
                                style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                                <Eye size={12} /> View
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.driving_license_number}</strong>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Class: {app.driving_license_vehicle_class || 'LMV'} • Blood: {app.driving_license_blood_group || 'O+'}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Bottom: Status Note & View Certificate Button */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>
                        {app.status_message || (app.status === 'PASSED' ? 'All compulsory documents verified and passed.' : 'Application is currently under verification.')}
                      </div>

                      {app.status === 'PASSED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCertAppId(app.id);
                            setActiveTab('certificate');
                          }}
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                          <Award size={14} />
                          <span>View Verification Certificate</span>
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* =========================================================
            PAGE 3: VERIFICATION CERTIFICATE (CLEAN, NO WATERMARK OVERLAY)
            ========================================================= */}
        {activeTab === 'certificate' && (
          <div>
            
            {/* Certificate Header Action Bar */}
            <div className="minimal-card no-print" style={{ padding: '14px 20px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                
                {/* Select Application if multiple */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label className="input-label" style={{ margin: 0, fontSize: '0.78rem' }}>Select Application:</label>
                  <select
                    value={currentCertApp?.id || ''}
                    onChange={(e) => setSelectedCertAppId(e.target.value)}
                    className="input-field"
                    style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem' }}>
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>
                        {app.id} — Status: {app.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: '0.8rem' }}>
                    <Printer size={14} />
                    <span>Download PDF / Print</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Verification Certificate */}
            {!currentCertApp ? (
              <div className="minimal-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Award size={36} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text)', marginBottom: '6px' }}>
                  No Verification Certificate Available
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Please submit your documents on Page 1 to receive your verification certificate.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadStep(1);
                    setActiveTab('upload');
                  }}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}>
                  <Upload size={15} />
                  <span>Upload Documents</span>
                </button>
              </div>
            ) : (
              <div className="gov-certificate-card" style={{ borderTop: '4px solid var(--primary)' }}>
                
                {/* Certificate Header */}
                <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{
                          width: '36px', height: '36px',
                          background: 'var(--primary)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: '800', fontSize: '1.1rem'
                        }}>Q</div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: '800', letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--primary)' }}>AuthentiQ</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identity Verification Portal</div>
                        </div>
                      </div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text)', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
                        Digital Verification Certificate
                      </h2>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        Cert ID: <strong style={{ color: 'var(--primary)' }}>{currentCertApp.certificate_id || `AUTH-CERT-2026-${userId.slice(-6)}`}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="status-badge status-passed pulse-green">
                        <ShieldCheck size={14} /> Verified & Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Certificate Body */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', alignItems: 'center', marginBottom: '22px' }}>
                  
                  {/* Left: Applicant and Verification Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Applicant Full Name:</span>
                      <span style={{ fontWeight: '700', color: 'var(--text)' }}>{currentCertApp.applicant_name || userName}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Assigned User ID:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text)' }}>{userId}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Passport Number:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text)' }}>{currentCertApp.passport_number || 'VERIFIED'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>National ID (Aadhaar):</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text)' }}>{currentCertApp.national_id_number || 'VERIFIED'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Visa Number:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text)' }}>{currentCertApp.visa_number || 'VERIFIED'}</span>
                    </div>

                    {currentCertApp.driving_license_number && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Driving License:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--text)' }}>{currentCertApp.driving_license_number}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Verification Status:</span>
                      <span style={{ fontWeight: '700', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> PASSED & VERIFIED
                      </span>
                    </div>

                    {/* Validity Period */}
                    <div style={{
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      marginTop: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Date of Issue:</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text)' }}>
                          {currentCertApp.issue_date || '28 Aug 2026'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Validity Date (1 Year):</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--success)' }}>
                          {currentCertApp.valid_until || '27 Aug 2027'} (Active)
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Right: Camera & Google Lens Scannable QR Code (Zero Watermark / Zero Obstruction) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <ScannableQRCode payload={qrPayloadString} size={180} />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500', textAlign: 'center' }}>
                      Scan with Google Lens or Camera Scanner
                    </div>
                  </div>

                </div>

                {/* Certificate Footer */}
                <div style={{
                  borderTop: '1.5px solid var(--border)',
                  paddingTop: '16px',
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--success)' }}></div>
                    AuthentiQ Digital Screening Gateway &nbsp;•&nbsp; E-Gate Identity Verified
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', color: 'var(--primary)' }}>
                    <ShieldCheck size={12} /> Digitally Sealed &amp; Verified
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* =========================================================
            USER ID SAFETY NOTICE POPUP MODAL (COMPACT)
            ========================================================= */}
        {showUserIdModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={handleDismissUserIdModal}>
            <div
              className="minimal-card"
              style={{
                maxWidth: '370px',
                width: '100%',
                padding: '20px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                border: '1.5px solid var(--border-focus)'
              }}
              onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning-border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  color: 'var(--warning)'
                }}>
                  <KeyRound size={18} />
                </div>

                <div style={{ fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--warning)' }}>
                  Important Login Notice
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)', margin: '2px 0 4px 0' }}>
                  Save Your Unique User ID
                </h3>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', margin: 0 }}>
                  Please save this User ID somewhere safe. You will need it to sign in to AuthentiQ in future sessions.
                </p>
              </div>

              {/* User ID Highlight Card */}
              <div style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned User ID
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.18rem',
                  fontWeight: '800',
                  color: 'var(--text)',
                  letterSpacing: '0.06em',
                  margin: '2px 0 8px 0'
                }}>
                  {userId}
                </div>

                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '6px 10px', fontSize: '0.76rem', gap: '6px' }}>
                  {copiedUserId ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                  <span style={{ fontWeight: '600' }}>{copiedUserId ? 'Copied to Clipboard!' : 'Copy User ID'}</span>
                </button>
              </div>

              {/* User Credentials Details */}
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--text-muted)',
                background: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Account:</span>
                  <strong style={{ color: 'var(--text)' }}>{userName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Email:</span>
                  <span style={{ color: 'var(--text)' }}>{userEmail}</span>
                </div>
              </div>

              {/* Confirm / Continue Button */}
              <button
                type="button"
                onClick={handleDismissUserIdModal}
                className="btn-primary"
                style={{ width: '100%', padding: '9px 16px', fontSize: '0.84rem', fontWeight: '600' }}>
                I Have Saved My ID â€” Continue
              </button>

            </div>
          </div>
        )}

        {/* =========================================================
            IMAGE PREVIEW MODAL
            ========================================================= */}
        {previewImageModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setPreviewImageModal(null)}>
            <div
              className="minimal-card"
              style={{ maxWidth: '560px', width: '100%', padding: '20px' }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, color: 'var(--text)' }}>
                  {previewImageModal.title} {previewImageModal.docNo ? `(${previewImageModal.docNo})` : ''}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewImageModal(null)}
                  className="btn-subtle"
                  style={{ padding: '4px 8px' }}>
                  âœ• Close
                </button>
              </div>
              <div style={{ textAlign: 'center', background: '#000', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                <img
                  src={previewImageModal.url}
                  alt={previewImageModal.title}
                  style={{ maxHeight: '360px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        )}
          </div>
        </main>
      </div>

    </div>
  );
}
