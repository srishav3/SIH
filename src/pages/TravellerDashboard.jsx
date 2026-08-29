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
  Sparkles, 
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

  // Page 1 Wizard Step: 1 = Passport, 2 = Visa, 3 = National ID, 4 = DL, 5 = Review & Submit
  const [uploadStep, setUploadStep] = useState(1);

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

  // 1-Click Demo Sample Autofill
  const handleLoadSampleDocuments = () => {
    const defaultName = userName !== 'Traveller' ? userName : 'Rahul Sharma';

    // 1. Passport
    setPassportImg('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80');
    setPassportFileName('sample_indian_passport.jpg');
    setPassportName(defaultName);
    setPassportNumber('Z9824102');
    setPassportNationality('Indian (IND)');
    setPassportDob('1996-05-14');
    setPassportDoi('2021-08-10');
    setPassportDoe('2031-08-09');
    setPassportGender('Male');
    setPassportPlaceOfIssue('Regional Passport Office, Delhi');

    // 2. Visa
    setVisaImg('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80');
    setVisaFileName('sample_visa_doc.jpg');
    setVisaName(defaultName);
    setVisaNumber('VISA-IND-904128');
    setVisaType('Tourist / Transit');
    setVisaEntryType('Multiple Entry');
    setVisaNationality('Indian (IND)');
    setVisaDob('1996-05-14');
    setVisaDoi('2026-01-15');
    setVisaDoe('2027-01-14');
    setVisaGender('Male');

    // 3. National ID (Aadhaar)
    setNationalIdImg('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80');
    setNationalIdFileName('sample_aadhaar_card.jpg');
    setNationalIdName(defaultName);
    setNationalIdNumber('5489 9021 3418');
    setNationalIdDob('1996-05-14');
    setNationalIdGender('Male');
    setNationalIdGuardian('Suresh Sharma (Father)');
    setNationalIdAddress('Flat 402, Green Valley Apartments, Sector 62, Noida, Uttar Pradesh');
    setNationalIdPincode('201301');

    // 4. Driving License
    setDlImg('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80');
    setDlFileName('sample_driving_license.jpg');
    setDlName(defaultName);
    setDlNumber('DL-1420110012345');
    setDlDob('1996-05-14');
    setDlBloodGroup('O+');
    setDlVehicleClass('LMV, MCWG');
    setDlDoi('2018-03-20');
    setDlDoe('2038-03-19');
    setDlRto('DL-14 Janakpuri RTO, New Delhi');

    setStepError('');
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
    <div style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: '48px' }}>
      
      {/* Tricolor National Header Strip */}
      <div className="gov-header-strip"></div>

      <div className="container" style={{ paddingTop: '20px' }}>
        
        {/* =========================================================
            HEADER & PORTAL BRANDING BANNER
            ========================================================= */}
        <div className="minimal-card" style={{ padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            
            {/* Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                  AuthentiQ
                </span>
                <span className="badge badge-traveller" style={{ fontSize: '0.68rem' }}>
                  Traveller Portal
                </span>
              </div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
                AI Based Fake Identity and Document Screening Portal
              </h1>
            </div>

            {/* User ID Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Assigned User ID
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)' }}>
                  {userId}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="btn-subtle"
                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                  title="Copy User ID">
                  {copiedUserId ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                  <span>{copiedUserId ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUserIdModal(true)}
                  className="btn-subtle"
                  style={{ padding: '4px 6px', fontSize: '0.72rem' }}
                  title="View User ID Safety Instructions">
                  <Info size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* =========================================================
            SIDEBAR + CONTENT LAYOUT
            ========================================================= */}
        <div className="dashboard-layout" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

          {/* LEFT SIDEBAR NAV */}
          <div className="dashboard-sidebar" style={{
            width: '220px',
            flexShrink: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            position: 'sticky',
            top: '84px'
          }}>
            {/* Tab 1: Upload Documents */}
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}>
              <Upload size={15} />
              <span>1. Upload Documents</span>
            </button>

            {/* Tab 2: Application Status */}
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}>
              <FileText size={15} />
              <span>2. Application Status</span>
              <span className="tab-badge" style={{ marginLeft: 'auto' }}>{applications.length}</span>
            </button>

            {/* Tab 3: Verification Certificate */}
            <button
              type="button"
              className={`portal-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
              onClick={() => setActiveTab('certificate')}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}>
              <Award size={15} />
              <span>3. Verification Certificate</span>
              {passedCount > 0 && (
                <span className="tab-badge" style={{ marginLeft: 'auto', background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }}>
                  {passedCount} Ready
                </span>
              )}
            </button>
          </div>

          {/* RIGHT CONTENT PANEL */}
          <div style={{ flex: 1, minWidth: 0 }}>
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

            {/* Wizard Step Progress Indicator */}
            <div className="wizard-progress-bar">
              <div
                className={`wizard-step-node ${uploadStep === 1 ? 'active' : uploadStep > 1 ? 'completed' : ''}`}
                onClick={() => setUploadStep(1)}>
                <span className="wizard-step-num">{uploadStep > 1 ? 'âœ“' : '1'}</span>
                <span>1. Passport</span>
              </div>

              <span className="wizard-arrow">â†’</span>

              <div
                className={`wizard-step-node ${uploadStep === 2 ? 'active' : uploadStep > 2 ? 'completed' : ''}`}
                onClick={() => { if (passportImg && passportNumber) setUploadStep(2); }}>
                <span className="wizard-step-num">{uploadStep > 2 ? 'âœ“' : '2'}</span>
                <span>2. Visa Document</span>
              </div>

              <span className="wizard-arrow">â†’</span>

              <div
                className={`wizard-step-node ${uploadStep === 3 ? 'active' : uploadStep > 3 ? 'completed' : ''}`}
                onClick={() => { if (visaImg && visaNumber) setUploadStep(3); }}>
                <span className="wizard-step-num">{uploadStep > 3 ? 'âœ“' : '3'}</span>
                <span>3. National ID (Aadhaar)</span>
              </div>

              <span className="wizard-arrow">â†’</span>

              <div
                className={`wizard-step-node ${uploadStep === 4 ? 'active' : uploadStep > 4 ? 'completed' : ''}`}
                onClick={() => { if (nationalIdImg && nationalIdNumber) setUploadStep(4); }}>
                <span className="wizard-step-num">{uploadStep > 4 ? 'âœ“' : '4'}</span>
                <span>4. Driving License</span>
              </div>

              <span className="wizard-arrow">â†’</span>

              <div
                className={`wizard-step-node ${uploadStep === 5 ? 'active' : ''}`}
                onClick={() => { if (nationalIdImg && nationalIdNumber) setUploadStep(5); }}>
                <span className="wizard-step-num">5</span>
                <span>5. Review & Submit</span>
              </div>
            </div>

            {/* Quick Demo Autofill Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={handleLoadSampleDocuments}
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '6px 12px', gap: '6px' }}>
                <Sparkles size={14} />
                <span>Fill Sample Details (Demo)</span>
              </button>
            </div>

            {/* =========================================================
                STEP 1: PASSPORT BLOCK (COMPULSORY)
                ========================================================= */}
            {uploadStep === 1 && (
              <div className="doc-section-card">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>ðŸ›‚</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                        Step 1 of 4: Passport Information
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Upload your Passport photo copy and fill details below
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-compulsory">Compulsory *</span>
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
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>âœ“ Verified &amp; Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>â³ {passportFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {passportVerifying ? (
                        <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>â³ {passportFileName}</div>
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

                {/* Passport Text Boxes Grid â€” locked until OCR done */}
                <div style={{ opacity: passportReady ? 1 : 0.45, pointerEvents: passportReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!passportReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>ðŸ”’</span>
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
              <div className="doc-section-card">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>ðŸ“„</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                        Step 2 of 4: Visa Document Information
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Upload your Visa permit copy and fill details below
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-compulsory">Compulsory *</span>
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
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>âœ“ Verified &amp; Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>â³ {visaFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {visaVerifying
                        ? <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>â³ {visaFileName}</div>
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

                {/* Visa Fields â€” locked until OCR done */}
                <div style={{ opacity: visaReady ? 1 : 0.45, pointerEvents: visaReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!visaReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>ðŸ”’</span>
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
              <div className="doc-section-card">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>ðŸªª</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                        Step 3 of 4: National ID (Indian Aadhaar Card)
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Upload your Aadhaar card and fill resident details below
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-compulsory">Compulsory *</span>
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
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>âœ“ Verified &amp; Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>â³ {nationalIdFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {nationalIdVerifying
                        ? <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>â³ {nationalIdFileName}</div>
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

                {/* Aadhaar Fields â€” locked until OCR done */}
                <div style={{ opacity: nationalIdReady ? 1 : 0.45, pointerEvents: nationalIdReady ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                  {!nationalIdReady && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>ðŸ”’</span>
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
              <div className="doc-section-card">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>ðŸš—</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                        Step 4 of 4: Driving License (Optional)
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        You can attach your Indian Driving License or skip this step
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
                          ? <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>&#x2713; Verified &amp; Data Extracted (Click to change)</span>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--warning, #f59e0b)', fontWeight: '600' }}>&#x23F3; {dlFileName}...</span>
                        }
                      </div>
                    </div>
                  ) : (
                    <div>
                      {dlVerifying
                        ? <div style={{ color: 'var(--text-dim)', marginBottom: '6px' }}>&#x23F3; {dlFileName}</div>
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
                      <span>&#x1F512;</span>
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
              <div className="doc-section-card">
                
                <div className="doc-section-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>ðŸ“‹</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>
                        Review Your Document Application
                      </h3>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        Verify the attached images and document particulars before submitting
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-traveller">Final Step</span>
                </div>

                {/* Summary Grid of 4 Documents */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  
                  {/* Passport Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)' }}>ðŸ›‚ 1. Passport</span>
                      <button
                        type="button"
                        onClick={() => setUploadStep(1)}
                        className="btn-subtle"
                        style={{ padding: '2px 6px', fontSize: '0.72rem' }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                    {passportImg && (
                      <img
                        src={passportImg}
                        alt="Passport thumbnail"
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border)' }}
                      />
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No: <strong style={{ color: 'var(--text)' }}>{passportNumber || 'â€”'}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      Name: {passportName || userName}
                    </div>
                  </div>

                  {/* Visa Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)' }}>ðŸ“„ 2. Visa Document</span>
                      <button
                        type="button"
                        onClick={() => setUploadStep(2)}
                        className="btn-subtle"
                        style={{ padding: '2px 6px', fontSize: '0.72rem' }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                    {visaImg && (
                      <img
                        src={visaImg}
                        alt="Visa thumbnail"
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border)' }}
                      />
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No: <strong style={{ color: 'var(--text)' }}>{visaNumber || 'â€”'}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      Type: {visaType} ({visaEntryType})
                    </div>
                  </div>

                  {/* National ID Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)' }}>ðŸªª 3. Aadhaar Card</span>
                      <button
                        type="button"
                        onClick={() => setUploadStep(3)}
                        className="btn-subtle"
                        style={{ padding: '2px 6px', fontSize: '0.72rem' }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                    {nationalIdImg && (
                      <img
                        src={nationalIdImg}
                        alt="National ID thumbnail"
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border)' }}
                      />
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No: <strong style={{ color: 'var(--text)' }}>{nationalIdNumber || 'â€”'}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                      Pincode: {nationalIdPincode || 'â€”'}
                    </div>
                  </div>

                  {/* Driving License Summary */}
                  <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text)' }}>ðŸš— 4. Driving License</span>
                      <button
                        type="button"
                        onClick={() => setUploadStep(4)}
                        className="btn-subtle"
                        style={{ padding: '2px 6px', fontSize: '0.72rem' }}>
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                    {dlImg ? (
                      <img
                        src={dlImg}
                        alt="DL thumbnail"
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', borderRadius: '4px', color: 'var(--text-dim)', fontSize: '0.76rem', marginBottom: '8px' }}>
                        Skipped (Optional)
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No: <strong style={{ color: 'var(--text)' }}>{dlNumber || 'Not provided'}</strong>
                    </div>
                  </div>

                </div>

                {/* Final Submit Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
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
                            â€¢ Submitted on {new Date(app.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Clean Status Badge */}
                      <div>
                        {app.status === 'PASSED' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            background: 'var(--success-bg)',
                            color: 'var(--success)',
                            border: '1px solid var(--success-border)'
                          }}>
                            <CheckCircle2 size={13} /> Passed & Verified
                          </span>
                        )}

                        {app.status === 'UNDER_REVIEW' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            background: 'var(--warning-bg)',
                            color: 'var(--warning)',
                            border: '1px solid var(--warning-border)'
                          }}>
                            <Clock size={13} /> Currently Under Review
                          </span>
                        )}

                        {app.status === 'REJECTED' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.76rem',
                            fontWeight: '700',
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger-border)'
                          }}>
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
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>ðŸ›‚ Passport</span>
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
                          No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.passport_number || 'â€”'}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Name: {app.passport_name || app.applicant_name}
                        </div>
                      </div>

                      {/* Visa Summary */}
                      <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>ðŸ“„ Visa Document</span>
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
                          No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.visa_number || 'â€”'}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Type: {app.visa_type || 'Tourist'} ({app.visa_entry_type || 'Multiple'})
                        </div>
                      </div>

                      {/* National ID Summary */}
                      <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>ðŸªª Aadhaar / National ID</span>
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
                          No: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{app.national_id_number || 'â€”'}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Address: {app.national_id_address ? `${app.national_id_address.slice(0, 30)}...` : 'Provided'}
                        </div>
                      </div>

                      {/* Driving License Summary (if provided) */}
                      {app.driving_license_number && (
                        <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--text)' }}>ðŸš— Driving License</span>
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
                            Class: {app.driving_license_vehicle_class || 'LMV'} â€¢ Blood: {app.driving_license_blood_group || 'O+'}
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
                        {app.id} â€” Status: {app.status}
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
              <div className="gov-certificate-card">
                
                {/* Certificate Header */}
                <div style={{ textAlign: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>
                    AuthentiQ
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    AI Based Fake Identity and Document Screening Portal
                  </div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text)', margin: '6px 0 4px 0' }}>
                    DIGITAL VERIFICATION CERTIFICATE
                  </h2>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    Certificate ID: <strong style={{ color: 'var(--text)' }}>{currentCertApp.certificate_id || `AUTH-CERT-2026-${userId.slice(-6)}`}</strong>
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
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)'
                }}>
                  <div>
                    AuthentiQ Digital Screening Gateway â€¢ E-Gate Identity Verified
                  </div>
                  <div style={{ fontWeight: '600', color: 'var(--text)' }}>
                    Digitally Sealed & Verified
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
          </div> {/* end right content panel */}
        </div> {/* end sidebar + content flex row */}

      </div>
    </div>
  );
}
